const express = require('express');
const router = express.Router(); 
const db = require('../config/db'); 

// --- 1. ANA SAYFA ---
router.get('/', (req, res) => {
    const sql = `SELECT id, ad_soyad, rol, saatlik_ucret FROM personel`;
    db.query(sql, (err, personel_results) => {
        if (err) {
            console.error(err);
            return res.render('dashboard', { personel_data: [], title: 'Hata' }); 
        }
        res.render('dashboard', { personel_data: personel_results, title: 'Genel Bakış' });
    });
});

// --- 2. API: PERSONEL SİMÜLASYONU ---
router.post('/api/personel', (req, res) => {
    const hedefSiparis = parseInt(req.body.hedefSiparis);
    const yeniPersonelFarki = parseInt(req.body.yeniPersonel); 
    const sqlKapasite = `SELECT COUNT(id) AS mevcut_personel FROM personel WHERE rol = 'Paketleyici'`;

    db.query(sqlKapasite, (err, results) => {
        if (err) return res.status(500).json({ error: 'DB Hatası' });
        
        const ortalamaSure = 12; // dk
        const GUNLUK_CALISMA_DK = 8 * 60; 
        const mevcutPersonel = results[0].mevcut_personel || 2;
        const mevcutKapasite = Math.floor(mevcutPersonel * GUNLUK_CALISMA_DK / ortalamaSure);
        const yeniPersonelSayisi = mevcutPersonel + yeniPersonelFarki;
        const yeniKapasiteAdet = Math.floor(yeniPersonelSayisi * GUNLUK_CALISMA_DK / ortalamaSure);

        let sonuc_mesaj;
        if (yeniKapasiteAdet < hedefSiparis) {
            sonuc_mesaj = `🔴 RİSK: ${hedefSiparis - yeniKapasiteAdet} sipariş açıkta kalıyor.`;
        } else {
            sonuc_mesaj = `🟢 UYGUN: Kapasite yeterli.`;
        }

        res.json({ mevcutKapasite, hedefKapasite: yeniKapasiteAdet, mesaj: sonuc_mesaj });
    });
});

// --- 3. API: LOJİSTİK SİMÜLASYONU ---
router.post('/api/lojistik', (req, res) => {
    const hedefKargoHizi = parseFloat(req.body.hedefKargoHizi);
    const mevcutOrtHiz = 3; 
    const temelChurn = 0.05; 
    const hiz_degisimi = mevcutOrtHiz - hedefKargoHizi;
    const yeni_churn_orani = temelChurn - (hiz_degisimi * 0.01);
    const yuzde_churn = (yeni_churn_orani * 100).toFixed(2);
    
    let sonuc_mesaj;
    if (yeni_churn_orani < temelChurn) sonuc_mesaj = `🟢 İYİLEŞME: Churn %${yuzde_churn} oluyor.`;
    else if (yeni_churn_orani > temelChurn) sonuc_mesaj = `🔴 RİSK: Churn %${yuzde_churn} seviyesine çıkıyor.`;
    else sonuc_mesaj = `🔵 STABİL: Değişiklik yok.`;

    res.json({ temelChurn, yeniChurn: yeni_churn_orani, mesaj: sonuc_mesaj });
});

// --- 4. API: DEPO ROI SİMÜLASYONU ---
router.post('/api/depo', (req, res) => {
    const yatirimMaliyeti = parseFloat(req.body.yatirimMaliyeti);
    const ekKapasite = parseInt(req.body.ekKapasite);
    const ekAylikNetKar = ekKapasite * 40 * 22; // 40 TL Kar Marjı
    const roiAy = yatirimMaliyeti / ekAylikNetKar;

    let sonuc_mesaj;
    if (roiAy <= 12) sonuc_mesaj = `🟢 KÂRLI: ${roiAy.toFixed(1)} ayda geri dönüş.`;
    else sonuc_mesaj = `🟡 DİKKAT: ${roiAy.toFixed(1)} ayda geri dönüş.`;

    res.json({ yatirimMaliyeti, ekAylikNetKar, roiAy, mesaj: sonuc_mesaj });
});

// --- 5. API: TREND ANALİZİ ---
router.post('/api/depo-trend', (req, res) => {
    const depoKapasitesi = parseInt(req.body.depoKapasitesi); 
    const sql = `SELECT DATE_FORMAT(siparis_tarihi, '%Y-%m') as ay, SUM(adet) as toplam_satis FROM gecmis_siparisler GROUP BY ay ORDER BY ay ASC`;

    db.query(sql, (err, results) => {
        if (err || results.length < 2) return res.json({ labels: [], data: [], forecast: [], mesaj: "Yetersiz veri." });

        const n = results.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        const historicalData = results.map((row, i) => {
            const y = parseInt(row.toplam_satis);
            sumX += i; sumY += y; sumXY += (i * y); sumXX += (i * i);
            return y;
        });

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        const labels = results.map(r => r.ay); 
        const forecastData = []; 
        let patlamaayi = null;

        for (let i = 1; i <= 6; i++) {
            const prediction = Math.floor(slope * (n + i) + intercept);
            labels.push(`+${i} Ay`);
            forecastData.push(prediction);
            if (!patlamaayi && prediction > depoKapasitesi) patlamaayi = `+${i}. Ay`;
        }

        const mesaj = patlamaayi ? `🔴 KRİTİK: Depo **${patlamaayi}** sonra doluyor!` : `🟢 GÜVENLİ: Kapasite yeterli.`;
        res.json({ labels, historical: historicalData, forecast: new Array(n).fill(null).concat(forecastData), capacity: depoKapasitesi, mesaj });
    });
});

// --- 6. API: İADE POLİTİKASI ---
router.post('/api/iade', (req, res) => {
    const iadeMaliyeti = parseFloat(req.body.iadeMaliyeti); 
    const satisKaybiOrani = parseFloat(req.body.satisKaybiOrani) / 100; 

    const sql = `SELECT COUNT(*) as toplam, SUM(CASE WHEN siparis_kodu LIKE 'C%' THEN 1 ELSE 0 END) as iade, SUM(toplam_tutar) as ciro FROM gecmis_siparisler`;
    
    db.query(sql, (err, results) => {
        if (err) return res.json({ error: 'Hata' });
        const data = results[0];
        const kazanilanTasarruf = data.iade * iadeMaliyeti;
        const kaybedilenNetKar = (data.ciro * satisKaybiOrani) * 0.30; // %30 Kar marjı
        const netEtki = kazanilanTasarruf - kaybedilenNetKar;

        const mesaj = netEtki > 0 ? `🟢 KÂRLI: **${netEtki.toFixed(0)} TL** kazanç.` : `🔴 ZARARLI: **${Math.abs(netEtki).toFixed(0)} TL** kayıp.`;
        res.json({ tasarruf: kazanilanTasarruf, zarar: kaybedilenNetKar, netEtki, mesaj });
    });
});

// --- 7. API: SUNUCU YÜK TESTİ (YENİ!) ---
router.post('/api/sunucu', (req, res) => {
    const beklenenKullanici = parseInt(req.body.beklenenKullanici);
    
    // Geçmişteki en yoğun saati bul (Peak Time)
    const sql = `SELECT COUNT(*) as siparis_sayisi FROM gecmis_siparisler GROUP BY DATE_FORMAT(siparis_tarihi, '%Y-%m-%d %H') ORDER BY siparis_sayisi DESC LIMIT 1`;

    db.query(sql, (err, results) => {
        if (err) return res.json({ error: 'Hata' });
        
        const maxSiparisSaatte = results[0] ? results[0].siparis_sayisi : 100;
        // Basit Mantık: Her sipariş ortalama 50 sayfa görüntüleme (request) yaratsın.
        const maxRequestDakika = Math.floor((maxSiparisSaatte * 50) / 60);
        
        // Sunucu Kapasitesi (Statik varsayım)
        const sunucuKapasitesi = 5000; // Dakikada 5000 istek kaldırır
        
        const tahminiYuk = beklenenKullanici * 10; // Her kullanıcı 10 istek yapsa
        const dolulukOrani = (tahminiYuk / sunucuKapasitesi) * 100;

        let mesaj;
        if (dolulukOrani > 100) mesaj = `🔴 ÇÖKME RİSKİ: Sunucu kapasitesi %${dolulukOrani.toFixed(0)} oranında aşılacak!`;
        else if (dolulukOrani > 80) mesaj = `🟡 RİSKLİ: Sunucu %${dolulukOrani.toFixed(0)} yük altında zorlanacak.`;
        else mesaj = `🟢 GÜVENLİ: Sistem yükü %${dolulukOrani.toFixed(0)} seviyesinde stabil kalır.`;

        res.json({ dolulukOrani: Math.min(dolulukOrani, 100), mesaj });
    });
});

// --- 8. API: SARF MALZEME TASARRUFU (YENİ!) ---
router.post('/api/maliyet', (req, res) => {
    const tasarrufBirim = parseFloat(req.body.tasarrufBirim); // Kutu başı indirim
    
    // Gelecek 6 ayın tahmini sipariş adedini bul (Basitçe son 6 ayın ortalamasını alalım)
    const sql = `SELECT COUNT(*) as toplam FROM gecmis_siparisler`;
    
    db.query(sql, (err, results) => {
        const toplamSiparis = results[0].toplam;
        // Veri setimiz yaklaşık 2 yıllık. Yıllık ortalama:
        const yillikSiparis = toplamSiparis / 2;
        
        const yillikKazanc = yillikSiparis * tasarrufBirim;
        
        const mesaj = `💰 TASARRUF: Koli maliyetini ${tasarrufBirim} TL düşürmek, şirkete yılda **${yillikKazanc.toLocaleString()} TL** net kâr bırakır!`;
        
        res.json({ yillikKazanc, mesaj });
    });
});

module.exports = router;