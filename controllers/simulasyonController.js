const db = require('../config/db');

// 1. Rastgele Sipariş Oluşturma (Butona basınca çalışır)
exports.siparisOlustur = (req, res) => {
    // Rastgele Veri Üretimi
    const musteriId = Math.floor(Math.random() * 5) + 1; // 1-5 arası müşteri
    const kargoId = Math.floor(Math.random() * 4) + 1;   // 1-4 arası kargo
    const tutar = (Math.random() * 2000 + 100).toFixed(2); // 100-2100 TL arası tutar

    const sql = `INSERT INTO siparisler (musteri_id, siparis_tarihi, durum, toplam_tutar, kargo_firma_id) 
                 VALUES (?, NOW(), 'Bekliyor', ?, ?)`;

    db.query(sql, [musteriId, tutar, kargoId], (err, result) => {
        if (err) {
            console.error("Sipariş Oluşturma Hatası:", err);
            return res.json({ success: false, message: 'Veritabanı hatası' });
        }
        res.json({ success: true, message: 'Yeni sipariş simüle edildi.', id: result.insertId });
    });
};

// 2. Durum Güncelleme (Tablodaki butonlara basınca çalışır)
exports.durumGuncelle = (req, res) => {
    const { id, yeniDurum } = req.body;
    
    const sql = `UPDATE siparisler SET durum = ? WHERE id = ?`;
    
    db.query(sql, [yeniDurum, id], (err, result) => {
        if (err) {
            console.error("Durum Güncelleme Hatası:", err);
            return res.json({ success: false });
        }
        res.json({ success: true });
    });
};

// 3. Son Siparişleri Listeleme (Tabloyu doldurmak için)
exports.sonSiparisleriGetir = (req, res) => {
    const sql = `
        SELECT s.id, m.ad_soyad, s.durum, s.toplam_tutar, 
               DATE_FORMAT(s.siparis_tarihi, '%H:%i:%s') as saat 
        FROM siparisler s
        JOIN musteriler m ON s.musteri_id = m.id
        ORDER BY s.id DESC LIMIT 5
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Liste Hatası:", err);
            return res.json([]);
        }
        res.json(results);
    });
};