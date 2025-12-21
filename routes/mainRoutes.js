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
const maliyetController = require('../controllers/maliyetController');
const simulasyonController = require('../controllers/simulasyonController');
const parametreController = require('../controllers/parametreController');

// --- 1. GİRİŞ SAYFASI (ANA ROTA) ---
// Siteye (localhost:3000) girince Login ekranı açılır
router.get('/', (req, res) => {
    res.render('login'); 
});

// --- 2. DASHBOARD (PANEL) ---
// Login başarılı olunca buraya yönlendirilir
router.get('/panel', (req, res) => {
    // Personel listesini çekerek dashboard'u render ediyoruz (Eski yapı korundu)
    const sql = `SELECT id, ad_soyad, rol, saatlik_ucret FROM personel`;
    db.query(sql, (err, personel_results) => {
        if (err) {
            console.error("Dashboard veri hatası:", err);
            // Hata olsa bile sayfayı aç, boş liste gönder
            return res.render('dashboard', { personel_data: [], title: 'Hata' }); 
        }
        res.render('dashboard', { personel_data: personel_results, title: 'Genel Bakış' });
    });
});

// --- 3. API ROTALARI (HESAPLAMA MODÜLLERİ) ---

// Fulfillment / Personel Stratejisi
router.post('/api/personel', personelController.hesapla);

// Lojistik Simülasyonu
router.post('/api/lojistik', lojistikController.hesapla);

// Depo ROI Simülasyonu
router.post('/api/depo', depoController.hesapla);

// Trend Analizi (12 Aylık)
router.post('/api/depo-trend', trendController.hesapla);

// İade Politikası Analizi
router.post('/api/iade', iadeController.hesapla);

// Sunucu Yük Testi
router.post('/api/sunucu', sunucuController.hesapla);

// Maliyet Tasarrufu
router.post('/api/maliyet', maliyetController.hesapla);


// --- 4. SİMÜLASYON ROTALARI (CANLI OPERASYON) ---
router.post('/api/simulasyon/olustur', simulasyonController.siparisOlustur);
router.post('/api/simulasyon/guncelle', simulasyonController.durumGuncelle);
router.get('/api/simulasyon/liste', simulasyonController.sonSiparisleriGetir);


// --- 5. PARAMETRE YÖNETİMİ (AYARLAR) ---
router.post('/api/parametre-guncelle', parametreController.guncelle);
router.get('/api/parametre-getir', parametreController.getir);

module.exports = router;