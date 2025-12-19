const db = require('../config/db');

exports.hesapla = (req, res) => {
    const beklenenKullanici = parseInt(req.body.beklenenKullanici);
    
    // Geçmişteki en yoğun saati bul (Peak Time)
    const sql = `
        SELECT COUNT(*) as siparis_sayisi 
        FROM gecmis_siparisler 
        GROUP BY DATE_FORMAT(siparis_tarihi, '%Y-%m-%d %H') 
        ORDER BY siparis_sayisi DESC 
        LIMIT 1
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Veritabanı Hatası:', err);
            return res.json({ error: 'Veritabanı hatası' });
        }
        
        const maxSiparisSaatte = results[0] ? results[0].siparis_sayisi : 100;
        
        // Mantık: Her sipariş ortalama 50 sayfa görüntüleme (request) yaratsın.
        const maxRequestDakika = Math.floor((maxSiparisSaatte * 50) / 60);
        
        // Sunucu Kapasitesi (Statik varsayım)
        const sunucuKapasitesi = 5000; // Dakikada 5000 istek kaldırır
        
        const tahminiYuk = beklenenKullanici * 10; // Her kullanıcı 10 istek yapsa
        const dolulukOrani = (tahminiYuk / sunucuKapasitesi) * 100;

        let mesaj;
        if (dolulukOrani > 100) {
            mesaj = `🔴 ÇÖKME RİSKİ: Sunucu kapasitesi %${dolulukOrani.toFixed(0)} oranında aşılacak!`;
        } else if (dolulukOrani > 80) {
            mesaj = `🟡 RİSKLİ: Sunucu %${dolulukOrani.toFixed(0)} yük altında zorlanacak.`;
        } else {
            mesaj = `🟢 GÜVENLİ: Sistem yükü %${dolulukOrani.toFixed(0)} seviyesinde stabil kalır.`;
        }

        res.json({
            dolulukOrani: Math.min(dolulukOrani, 100),
            mesaj
        });
    });
};