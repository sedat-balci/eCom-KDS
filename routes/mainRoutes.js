const express = require('express');
const router = express.Router(); 
const db = require('../config/db'); 

// --- 1. ANA SAYFA (SADECE HTML RENDER EDER) ---
router.get('/', (req, res) => {
    // Sadece personel listesini çekiyoruz, hesaplama yapmıyoruz.
    const sql = `SELECT id, ad_soyad, rol, saatlik_ucret FROM personel`;

    db.query(sql, (err, personel_results) => {
        if (err) {
            console.error(err);
            return res.render('dashboard', { personel_data: [], title: 'Hata' }); 
        }
        res.render('dashboard', { 
            personel_data: personel_results, 
            title: 'Genel Bakış'
        });
    });
});

// --- 2. API: PERSONEL SİMÜLASYONU (JSON DÖNER) ---
router.post('/api/personel', (req, res) => {
    const hedefSiparis = parseInt(req.body.hedefSiparis);
    const yeniPersonelFarki = parseInt(req.body.yeniPersonel); 

    const sqlKapasite = `
        SELECT COUNT(id) AS mevcut_personel 
        FROM personel WHERE rol = 'Paketleyici'
    `;

    db.query(sqlKapasite, (err, results) => {
        if (err) return res.status(500).json({ error: 'Veritabanı hatası' });
        
        // Sabitler
        const ortalamaSure = 12; // dk
        const GUNLUK_CALISMA_DK = 8 * 60; 

        const mevcutPersonel = results[0].mevcut_personel || 2;
        const mevcutKapasite = Math.floor(mevcutPersonel * GUNLUK_CALISMA_DK / ortalamaSure);
        
        const yeniPersonelSayisi = mevcutPersonel + yeniPersonelFarki;
        const yeniKapasiteAdet = Math.floor(yeniPersonelSayisi * GUNLUK_CALISMA_DK / ortalamaSure);

        let sonuc_mesaj;
        let durum; // 'success', 'warning', 'danger'

        if (yeniKapasiteAdet < hedefSiparis) {
            const acik = hedefSiparis - yeniKapasiteAdet;
            sonuc_mesaj = `🔴 RİSK: ${acik} adet sipariş kapasite dışı kalıyor.`;
            durum = 'danger';
        } else {
            const fazla = yeniKapasiteAdet - hedefSiparis;
            sonuc_mesaj = `🟢 UYGUN: Kapasite yeterli. (${fazla} adet rezerv)`;
            durum = 'success';
        }

        // JSON Olarak Cevap Ver
        res.json({
            mevcutKapasite,
            hedefKapasite: yeniKapasiteAdet,
            mesaj: sonuc_mesaj,
            durum: durum
        });
    });
});

// --- 3. API: LOJİSTİK SİMÜLASYONU (JSON DÖNER) ---
router.post('/api/lojistik', (req, res) => {
    const hedefKargoHizi = parseFloat(req.body.hedefKargoHizi);
    
    const mevcutOrtHiz = 3; 
    const temelChurn = 0.05; 
    const HIZ_CHURN_HASSASIYETI = 0.01; 
    
    const hiz_degisimi = mevcutOrtHiz - hedefKargoHizi;
    const yeni_churn_orani = temelChurn - (hiz_degisimi * HIZ_CHURN_HASSASIYETI);

    let sonuc_mesaj;
    const yuzde_churn = (yeni_churn_orani * 100).toFixed(2);
    
    if (yeni_churn_orani < temelChurn) {
        sonuc_mesaj = `🟢 İYİLEŞME: Churn oranı %${yuzde_churn} seviyesine düşüyor.`;
    } else if (yeni_churn_orani > temelChurn) {
        sonuc_mesaj = `🔴 RİSK: Yavaş teslimat müşteri kaybını (%${yuzde_churn}) artırabilir.`;
    } else {
         sonuc_mesaj = `🔵 STABİL: Churn oranı (%${yuzde_churn}) değişmedi.`;
    }

    res.json({
        temelChurn,
        yeniChurn: yeni_churn_orani,
        mesaj: sonuc_mesaj
    });
});

// --- 4. API: DEPO ROI SİMÜLASYONU (JSON DÖNER) ---
router.post('/api/depo', (req, res) => {
    const yatirimMaliyeti = parseFloat(req.body.yatirimMaliyeti);
    const ekKapasite = parseInt(req.body.ekKapasite);
    
    const ortalamaKarMarjiTL = 40; 
    const GUNLUK_CALISMA_GUNU = 22; 
    
    const ekAylikNetKar = ekKapasite * ortalamaKarMarjiTL * GUNLUK_CALISMA_GUNU;
    const roiAy = yatirimMaliyeti / ekAylikNetKar;

    let sonuc_mesaj;
    if (roiAy <= 12) {
        sonuc_mesaj = `🟢 KÂRLI: Yatırım ${roiAy.toFixed(1)} ayda geri dönüyor.`;
    } else {
        sonuc_mesaj = `🟡 DİKKAT: Geri dönüş süresi ${roiAy.toFixed(1)} ay.`;
    }

    res.json({
        yatirimMaliyeti,
        ekAylikNetKar,
        roiAy,
        mesaj: sonuc_mesaj
    });
});

module.exports = router;