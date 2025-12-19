const db = require('../config/db');

exports.hesapla = (req, res) => {
    // Girdi artık anlık kullanıcı değil, YILLIK BÜYÜME HEDEFİ (%)
    const buyumeOrani = parseFloat(req.body.buyumeOrani); // Örn: 50 (%50)
    
    // Geçmişteki en yoğun anı (Peak) buluyoruz
    const sql = `
        SELECT COUNT(*) as siparis_sayisi 
        FROM gecmis_siparisler 
        GROUP BY DATE_FORMAT(siparis_tarihi, '%Y-%m-%d %H') 
        ORDER BY siparis_sayisi DESC 
        LIMIT 1
    `;

    db.query(sql, (err, results) => {
        if (err) return res.json({ error: 'Veritabanı hatası' });
        
        const mevcutPeakLoad = results[0] ? results[0].siparis_sayisi : 100;
        
        // Gelecek Senaryosu
        const gelecekPeakLoad = Math.floor(mevcutPeakLoad * (1 + (buyumeOrani / 100)));
        
        // Sunucu Paketleri (Statik Kapasiteler)
        const kapasiteStandard = 150; // Standart Paket Limiti
        const kapasitePro = 300;      // Pro Paket Limiti
        
        // Doluluk Oranı
        const dolulukOrani = (gelecekPeakLoad / kapasiteStandard) * 100;

        let mesaj;
        if (gelecekPeakLoad > kapasitePro) {
            mesaj = `🔴 KRİTİK YATIRIM: %${buyumeOrani} büyüme ile <b>Enterprise Cloud</b> mimarisine geçiş şart! Mevcut altyapı bu yükü taşıyamaz.`;
        } else if (gelecekPeakLoad > kapasiteStandard) {
            mesaj = `🟡 UPGRADE GEREKLİ: Standart paket yetersiz kalacak (%${dolulukOrani.toFixed(0)}). <b>Pro Pakete</b> geçiş planlanmalı.`;
        } else {
            mesaj = `🟢 YATIRIM GEREKSİZ: Mevcut altyapı %${buyumeOrani} büyümeyi rahatlıkla karşılar. (%${dolulukOrani.toFixed(0)} Doluluk).`;
        }

        res.json({
            dolulukOrani: Math.min(dolulukOrani, 100), // Grafik 100'ü geçmesin
            mesaj
        });
    });
};