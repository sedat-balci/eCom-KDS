const express = require('express');
const router = express.Router(); // Express Router'ı başlatıyoruz
const db = require('../config/db'); // db.js'e bir klasör yukarıdan erişim

// --- ANA ROTASYON (GET İSTEĞİ - VERİ ÇEKME VE SİMÜLASYON SONUÇLARINI YAKALAMA) ---
router.get('/', (req, res) => {
    // URL'den gelen simülasyon sonuçlarını yakalar (Örn: ?module=personel&hedefKapasite=500...)
    const simResult = {
        module: req.query.module,
        sonuc: req.query.sonuc,
        data: req.query // Tüm query parametrelerini data olarak gönder
    };
    
    // Tüm personel verilerini çekiyoruz
    const sql = `SELECT 
                    id, 
                    ad_soyad, 
                    rol, 
                    saatlik_ucret 
                 FROM personel`;

    db.query(sql, (err, personel_results) => {
        if (err) {
            console.error('Veri çekme hatası:', err);
            return res.render('dashboard', { 
                personel_data: [], 
                simResult: null, // Hata durumunda boş
                title: 'Genel Bakış (HATA)' 
            }); 
        }

        // Simülasyon sonuçlarını (simResult) dashboard'a gönderiyoruz
        res.render('dashboard', { 
            personel_data: personel_results, 
            simResult: simResult, // YENİ: JS'in kullanacağı simülasyon verisi
            title: 'Genel Bakış'
        });
    });
});

// --- POST ROTASI (MODÜL 1: İŞGÜCÜ SİMÜLASYONU VE KARAR MANTIĞI) ---
router.post('/', (req, res) => {
    const hedefSiparis = parseInt(req.body.hedefSiparis);
    const yeniPersonelFarki = parseInt(req.body.yeniPersonel); 

    const sqlKapasite = `
        SELECT 
            (SELECT AVG(saatlik_ucret) FROM personel WHERE rol = 'Paketleyici') AS ort_saatlik_ucret,
            COUNT(id) AS mevcut_personel
        FROM personel WHERE rol = 'Paketleyici'
    `;

    db.query(sqlKapasite, (err, results) => {
        if (err) {
            console.error('Simülasyon Veri Çekme Hatası:', err);
            return res.redirect('/'); 
        }
        
        // --- KDS SABİTLERİ VE HESAPLAMA ---
        const ortalamaSure = 12; // dk/paket
        const mevcutPersonel = results[0].mevcut_personel || 2;
        const ortSaatlikUcret = results[0].ort_saatlik_ucret || 120;
        const OT_Carpan = 1.5; 
        const GUNLUK_CALISMA_DK = 8 * 60; 

        const personelSayisiMevcut = mevcutPersonel; // Grafik için gerekli
        const mevcutKapasite = Math.floor(personelSayisiMevcut * GUNLUK_CALISMA_DK / ortalamaSure);
        
        const yeniPersonelSayisi = mevcutPersonel + yeniPersonelFarki;
        const yeniKapasiteAdet = Math.floor(yeniPersonelSayisi * GUNLUK_CALISMA_DK / ortalamaSure);

        let sonuc_mesaj;
        
        if (yeniKapasiteAdet < hedefSiparis) {
            // DARBOĞAZ VAR: Maliyet Simülasyonu
            const acik_adet = hedefSiparis - yeniKapasiteAdet;
            const gereken_ek_sure_saat = (acik_adet * ortalamaSure) / 60;
            
            const fazla_mesai_maliyeti = gereken_ek_sure_saat * (ortSaatlikUcret * OT_Carpan);
            const yeni_personel_maliyeti_haftalik = (1 * 8 * 5) * ortSaatlikUcret; 

            if (fazla_mesai_maliyeti * 5 < yeni_personel_maliyeti_haftalik) { 
                sonuc_mesaj = `🔴 RİSK: ${hedefSiparis} sipariş için ${acik_adet} adet açık var. Geçici çözüm olarak Fazla Mesai (Tahmini ${fazla_mesai_maliyeti.toFixed(0)} TL/gün) daha ekonomiktir.`;
            } else {
                sonuc_mesaj = `🟢 ÇÖZÜM: Acilen personel alımı planlanmalı! Fazla mesai çok pahalıya mal oluyor. (Yeni personel alımı daha kârlı.)`;
            }

        } else {
            // KAPASİTE YETERLİ
            sonuc_mesaj = `🟢 BAŞARILI: ${yeniPersonelSayisi} personel ile kapasite yeterlidir. ${yeniKapasiteAdet - hedefSiparis} adet fazla kapasiteniz var.`;
        }

        // YENİ ÇÖZÜM: Alert yerine veriyi Query String ile gönder
        res.redirect(`/?module=personel&mevcutKapasite=${mevcutKapasite}&hedefKapasite=${yeniKapasiteAdet}&sonuc=${encodeURIComponent(sonuc_mesaj)}`);
    });
});

// --- POST ROTASI (MODÜL 2: LOJİSTİK SİMÜLASYONU VE KARAR MANTIĞI) ---
router.post('/lojistik-simulasyon', (req, res) => {
    const hedefKargoHizi = parseFloat(req.body.hedefKargoHizi);
    
    // KDS Sabitleri
    const mevcutOrtHiz = 3; 
    const temelChurn = 0.05; 
    const HIZ_CHURN_HASSASIYETI = 0.01; 
    
    // Simülasyon Hesaplaması:
    const hiz_degisimi_gun = mevcutOrtHiz - hedefKargoHizi;
    const yeni_churn_orani = temelChurn - (hiz_degisimi_gun * HIZ_CHURN_HASSASIYETI);

    let sonuc_mesaj;
    const yuzde_churn = (yeni_churn_orani * 100).toFixed(2);
    
    if (yeni_churn_orani < temelChurn) {
        const indirim = ((temelChurn - yeni_churn_orani) * 100).toFixed(2);
        sonuc_mesaj = `🟢 ÇÖZÜM: Kargo hızını ${hedefKargoHizi} güne düşürmek, aylık Churn oranını %${yuzde_churn}'a indirerek %${indirim} müşteri kaybı engellenir. (Hızlanma kârlı.)`;
    } else if (yeni_churn_orani > temelChurn) {
        const artis = ((yeni_churn_orani - temelChurn) * 100).toFixed(2);
        sonuc_mesaj = `🔴 RİSK: Kargo hızını ${hedefKargoHizi} güne çıkarmak, aylık Churn oranını %${yuzde_churn}'a yükselterek %${artis} ek müşteri kaybına neden olabilir!`;
    } else {
         sonuc_mesaj = `🔵 BİLGİ: Kargo hızını değiştirmemek Churn oranını (%${yuzde_churn}) sabit tutacaktır.`;
    }

    // YENİ ÇÖZÜM: Alert yerine veriyi Query String ile gönder
    res.redirect(`/?module=lojistik&temelChurn=${temelChurn}&yeniChurn=${yeni_churn_orani}&sonuc=${encodeURIComponent(sonuc_mesaj)}`);
});

// --- POST ROTASI (MODÜL 3: DEPO VE ROI ANALİZİ) ---
router.post('/depo-simulasyon', (req, res) => {
    // 1. Frontend'den gelen veriyi al
    const yatirimMaliyeti = parseFloat(req.body.yatirimMaliyeti);
    const ekKapasite = parseInt(req.body.ekKapasite);
    
    // KDS Sabitleri
    const ortalamaKarMarjiTL = 40; 
    const GUNLUK_CALISMA_GUNU = 22; 
    
    // Simülasyon Hesaplaması:
    const ekGunlukNetKar = ekKapasite * ortalamaKarMarjiTL;
    const ekAylikNetKar = ekGunlukNetKar * GUNLUK_CALISMA_GUNU;
    const roiAy = yatirimMaliyeti / ekAylikNetKar;

    let sonuc_mesaj;
    
    if (roiAy <= 12) {
        sonuc_mesaj = `🟢 ÇÖZÜM: Depo yatırımınız ${roiAy.toFixed(1)} ay (yaklaşık ${Math.ceil(roiAy)} ay) gibi kısa bir sürede geri dönecektir. Yatırım Kârlıdır!`;
    } else if (roiAy > 12 && roiAy <= 24) {
        sonuc_mesaj = `🟡 UYARI: Depo yatırımınız ${roiAy.toFixed(1)} ayda (yaklaşık ${Math.ceil(roiAy)} ay) geri dönecektir. Geri dönüş süresi uzundur. Daha dikkatli değerlendirilmelidir.`;
    } else {
        sonuc_mesaj = `🔴 RİSK: Depo yatırımınız ${roiAy.toFixed(1)} ayda (2 yıldan fazla) geri dönecektir. Bu yatırım, mevcut şartlarda çok riskli ve uzun vadelidir.`;
    }

    // YENİ ÇÖZÜM: Alert yerine veriyi Query String ile gönder
    res.redirect(`/?module=depo&yatirimMaliyeti=${yatirimMaliyeti}&ekAylikNetKar=${ekAylikNetKar}&sonuc=${encodeURIComponent(sonuc_mesaj)}`);
});


// Bu rotaları dışa aktar ki, app.js bunları kullanabilsin
module.exports = router;