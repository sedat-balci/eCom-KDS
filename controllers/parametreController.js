const db = require('../config/db');

exports.guncelle = (req, res) => {
    const { personelMaliyeti, mesaiUcreti, sunucuKapasitesi, iadeKargoMaliyeti } = req.body;

    // Veritabanına yeni bir kayıt olarak ekliyoruz (Log tutmak gibi düşünelim, update yerine insert)
    // Böylece geçmiş parametreleri kaybetmeyiz. KDS mantığına uygun olan budur.
    const sql = `
        INSERT INTO sistem_parametreleri 
        (personel_maliyeti, mesai_ucreti, sunucu_kapasitesi, iade_kargo_maliyeti, guncelleme_tarihi) 
        VALUES (?, ?, ?, ?, NOW())
    `;

    db.query(sql, [personelMaliyeti, mesaiUcreti, sunucuKapasitesi, iadeKargoMaliyeti], (err, result) => {
        if (err) {
            console.error("Parametre Kayıt Hatası:", err);
            return res.json({ success: false, message: 'Veritabanı hatası' });
        }
        res.json({ success: true, message: 'Parametreler güncellendi.' });
    });
};

// Mevcut parametreleri çekmek için (Modal açılınca dolu gelsin diye)
exports.getir = (req, res) => {
    const sql = `SELECT * FROM sistem_parametreleri ORDER BY id DESC LIMIT 1`;
    db.query(sql, (err, results) => {
        if (err || results.length === 0) {
            // Veri yoksa varsayılanları dön
            return res.json({
                personel_maliyeti: 30000,
                mesai_ucreti: 50,
                sunucu_kapasitesi: 5000,
                iade_kargo_maliyeti: 60
            });
        }
        res.json(results[0]);
    });
};