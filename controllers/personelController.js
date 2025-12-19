const db = require('../config/db');

exports.hesapla = (req, res) => {
    const hedefSiparis = parseInt(req.body.hedefSiparis);
    const yeniPersonelFarki = parseInt(req.body.yeniPersonel); 

    const sqlKapasite = `
        SELECT COUNT(id) AS mevcut_personel 
        FROM personel WHERE rol = 'Paketleyici'
    `;

    db.query(sqlKapasite, (err, results) => {
        if (err) {
            console.error('Veritabanı Hatası:', err);
            return res.status(500).json({ error: 'Veritabanı hatası' });
        }
        
        // Hesaplama Mantığı
        const ortalamaSure = 12; // dk
        const GUNLUK_CALISMA_DK = 8 * 60; 

        const mevcutPersonel = results[0].mevcut_personel || 2;
        const mevcutKapasite = Math.floor(mevcutPersonel * GUNLUK_CALISMA_DK / ortalamaSure);
        
        const yeniPersonelSayisi = mevcutPersonel + yeniPersonelFarki;
        const yeniKapasiteAdet = Math.floor(yeniPersonelSayisi * GUNLUK_CALISMA_DK / ortalamaSure);

        let sonuc_mesaj;
        
        if (yeniKapasiteAdet < hedefSiparis) {
            const acik = hedefSiparis - yeniKapasiteAdet;
            sonuc_mesaj = `🔴 RİSK: ${acik} adet sipariş kapasite dışı kalıyor.`;
        } else {
            const fazla = yeniKapasiteAdet - hedefSiparis;
            sonuc_mesaj = `🟢 UYGUN: Kapasite yeterli. (${fazla} adet rezerv)`;
        }

        // JSON Cevabı
        res.json({
            mevcutKapasite,
            hedefKapasite: yeniKapasiteAdet,
            mesaj: sonuc_mesaj
        });
    });
};