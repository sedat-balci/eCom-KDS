const express = require('express');
const router = express.Router(); 
const db = require('../config/db'); 

// --- CONTROLLER IMPORTLARI ---
const personelController = require('../controllers/personelController');
const lojistikController = require('../controllers/lojistikController');
const depoController = require('../controllers/depoController');
const trendController = require('../controllers/trendController');
const iadeController = require('../controllers/iadeController');
const sunucuController = require('../controllers/sunucuController');
const maliyetController = require('../controllers/maliyetController'); // SON MODÜL EKLENDİ ✅

// --- 1. ANA SAYFA (View Render) ---
router.get('/', (req, res) => {
    // Sadece ana sayfa verisi için burada küçük bir sorgu bıraktık (View Model)
    const sql = `SELECT id, ad_soyad, rol, saatlik_ucret FROM personel`;
    db.query(sql, (err, personel_results) => {
        if (err) {
            console.error(err);
            return res.render('dashboard', { personel_data: [], title: 'Hata' }); 
        }
        res.render('dashboard', { personel_data: personel_results, title: 'Genel Bakış' });
    });
});

// --- API ROTALARI (Hepsi Controller'a Bağlandı) ---

// 1. Personel Simülasyonu
router.post('/api/personel', personelController.hesapla);

// 2. Lojistik Simülasyonu
router.post('/api/lojistik', lojistikController.hesapla);

// 3. Depo ROI Simülasyonu
router.post('/api/depo', depoController.hesapla);

// 4. Trend Analizi (Gelecek Tahmini)
router.post('/api/depo-trend', trendController.hesapla);

// 5. İade Politikası Analizi
router.post('/api/iade', iadeController.hesapla);

// 6. Sunucu Yük Testi
router.post('/api/sunucu', sunucuController.hesapla);

// 7. Sarf Malzeme (Maliyet) Tasarrufu
router.post('/api/maliyet', maliyetController.hesapla);

module.exports = router;