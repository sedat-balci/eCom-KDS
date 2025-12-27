const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Dashboard verisi için gerekli

// --- SAYFA YÖNLENDİRMELERİ ---

// 1. Giriş Sayfası (Landing Page)
router.get('/', (req, res) => {
    res.render('login'); 
});

// 2. Dashboard (Panel) Sayfası
router.get('/panel', (req, res) => {
    // Personel listesini çekerek dashboard'u render ediyoruz
    const sql = `SELECT id, ad_soyad, rol, saatlik_ucret FROM personel`;
    db.query(sql, (err, personel_results) => {
        if (err) {
            console.error("Dashboard veri hatası:", err);
            return res.render('dashboard', { personel_data: [], title: 'Hata' }); 
        }
        res.render('dashboard', { personel_data: personel_results, title: 'Genel Bakış' });
    });
});

module.exports = router;