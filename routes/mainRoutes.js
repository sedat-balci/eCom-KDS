const express = require('express');
const router = express.Router(); // Express Router'ı başlatıyoruz
const db = require('../config/db'); // db.js'e bir klasör yukarıdan erişim

// --- ANA ROTASYON (GET İSTEĞİ - VERİ ÇEKME) ---
// app.get('/') yerine router.get('/') kullanılıyor
router.get('/', (req, res) => {
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
                title: 'Genel Bakış (HATA)' 
            }); 
        }

        res.render('dashboard', { 
            personel_data: personel_results, 
            title: 'Genel Bakış'
        });
    });
});

// --- POST ROTASI (MODÜL 1: İŞGÜCÜ SİMÜLASYONU VE KARAR MANTIĞI) ---
// app.post('/') yerine router.post('/') kullanılıyor
router.post('/', (req, res) => {
    // 1. Frontend'den gelen verileri al
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

        res.send(`
            <script>
                alert('${sonuc_mesaj}'); 
                window.location.href = '/';
            </script>
        `);
    });
});

// Bu rotaları dışa aktar ki, app.js bunları kullanabilsin
module.exports = router;