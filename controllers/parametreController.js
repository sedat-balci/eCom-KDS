const db = require('../config/db');

// Yardımcı Fonksiyon: Virgül veya Nokta fark etmeksizin sayıyı düzeltir
const parseCurrency = (value) => {
    if (value === undefined || value === null || value === '') return 0;
    
    // Gelen değeri string'e çevir
    let strVal = value.toString();
    
    // Virgülleri noktaya çevir (Örn: "60,50" -> "60.50")
    strVal = strVal.replace(',', '.');
    
    // Sayıya çevir
    let num = parseFloat(strVal);
    
    // Eğer sayı değilse 0 döndür
    return isNaN(num) ? 0 : num;
};

exports.guncelle = (req, res) => {
    // 1. Gelen verileri temizle (Virgül -> Nokta)
    const personelMaliyeti = parseCurrency(req.body.personelMaliyeti);
    const mesaiUcreti = parseCurrency(req.body.mesaiUcreti);
    const sunucuKapasitesi = parseInt(req.body.sunucuKapasitesi) || 5000;
    const iadeKargoMaliyeti = parseCurrency(req.body.iadeKargoMaliyeti);

    // 2. SQL Sorgusu (Sütun isimleri ADIM 1'deki tabloyla birebir aynı)
    const sql = `
        INSERT INTO sistem_parametreleri 
        (personel_maliyeti, mesai_ucreti, sunucu_kapasitesi, iade_kargo_maliyeti, guncelleme_tarihi) 
        VALUES (?, ?, ?, ?, NOW())
    `;

    // 3. Verileri kaydet
    db.query(sql, [personelMaliyeti, mesaiUcreti, sunucuKapasitesi, iadeKargoMaliyeti], (err, result) => {
        if (err) {
            console.error("SQL Hatası Detayı:", err); 
            // Kullanıcıya hatayı net gösterelim
            return res.json({ 
                success: false, 
                message: 'Veritabanı sütun hatası! SQL tablosunu güncellediniz mi?' 
            });
        }
        res.json({ success: true, message: 'Parametreler başarıyla güncellendi.' });
    });
};

exports.getir = (req, res) => {
    const sql = `SELECT * FROM sistem_parametreleri ORDER BY id DESC LIMIT 1`;
    db.query(sql, (err, results) => {
        if (err || results.length === 0) {
            // Veri yoksa varsayılan
            return res.json({
                personel_maliyeti: 30000,
                mesai_ucreti: 60,
                sunucu_kapasitesi: 5000,
                iade_kargo_maliyeti: 60
            });
        }
        // Veritabanındaki sütun isimlerini frontend'in beklediği isimlere eşlemezsek kutular boş gelir!
        // Frontend JS tarafı (script.js) bu isimleri bekliyor:
        res.json({
            personel_maliyeti: results[0].personel_maliyeti,
            mesai_ucreti: results[0].mesai_ucreti,
            sunucu_kapasitesi: results[0].sunucu_kapasitesi,
            iade_kargo_maliyeti: results[0].iade_kargo_maliyeti
        });
    });
};