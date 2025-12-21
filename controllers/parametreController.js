const db = require('../config/db');

// Yardımcı: Virgül/Nokta temizleyici
const parseCurrency = (value) => {
    if (value === undefined || value === null || value === '') return 0;
    let strVal = value.toString().replace(',', '.');
    let num = parseFloat(strVal);
    return isNaN(num) ? 0 : num;
};

exports.guncelle = (req, res) => {
    // Yeni inputları alıyoruz
    const depoSabitGider = parseCurrency(req.body.depoSabitGider);
    const depoPersonelGideri = parseCurrency(req.body.depoPersonelGideri);
    const ucplBirimMaliyet = parseCurrency(req.body.ucplBirimMaliyet);
    const iadeKargoMaliyeti = parseCurrency(req.body.iadeKargoMaliyeti);
    const sunucuKapasitesi = parseInt(req.body.sunucuKapasitesi) || 5000;

    const sql = `
        INSERT INTO sistem_parametreleri 
        (depo_sabit_gider, depo_personel_gideri, ucpl_birim_maliyet, iade_kargo_maliyeti, sunucu_kapasitesi, guncelleme_tarihi) 
        VALUES (?, ?, ?, ?, ?, NOW())
    `;

    db.query(sql, [depoSabitGider, depoPersonelGideri, ucplBirimMaliyet, iadeKargoMaliyeti, sunucuKapasitesi], (err, result) => {
        if (err) {
            console.error("SQL Hatası:", err);
            return res.json({ success: false, message: 'Veritabanı hatası: ' + err.sqlMessage });
        }
        res.json({ success: true, message: 'Ayarlar güncellendi.' });
    });
};

exports.getir = (req, res) => {
    const sql = `SELECT * FROM sistem_parametreleri ORDER BY id DESC LIMIT 1`;
    db.query(sql, (err, results) => {
        if (err || results.length === 0) {
            // Varsayılanlar
            return res.json({
                depo_sabit_gider: 20000,
                depo_personel_gideri: 90000,
                ucpl_birim_maliyet: 45,
                iade_kargo_maliyeti: 60,
                sunucu_kapasitesi: 5000
            });
        }
        res.json(results[0]);
    });
};