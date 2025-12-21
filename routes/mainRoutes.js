const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Veritabanı bağlantısı

// --- CONTROLLER IMPORTLARI ---
const personelController = require('../controllers/personelController');
const lojistikController = require('../controllers/lojistikController');
const depoController = require('../controllers/depoController');
const trendController = require('../controllers/trendController');
const iadeController = require('../controllers/iadeController'); // İade (Güncel)
const sunucuController = require('../controllers/sunucuController');
const maliyetController = require('../controllers/maliyetController');
const simulasyonController = require('../controllers/simulasyonController');
const parametreController = require('../controllers/parametreController'); // [YENİ] Parametre

// --- 1. ANA SAYFA (Dashboard Render) ---
// Not: mainController oluşturmadığımız için eski çalışan yapıyı koruyoruz.
router.get('/', (req, res) => {
    // Personel listesini çekerek dashboard'u render ediyoruz
    const sql = `SELECT id, ad_soyad, rol, saatlik_ucret FROM personel`;
    db.query(sql, (err, personel_results) => {
        if (err) {
            console.error(err);
            return res.render('dashboard', { personel_data: [], title: 'Hata' }); 
        }
        res.render('dashboard', { personel_data: personel_results, title: 'Genel Bakış' });
    });
});

// --- 2. API ROTALARI (Hesaplama Modülleri) ---

// 1. Personel Simülasyonu
router.post('/api/personel', personelController.hesapla);

// 2. Lojistik Simülasyonu
router.post('/api/lojistik', lojistikController.hesapla);

// 3. Depo ROI Simülasyonu
router.post('/api/depo', depoController.hesapla);

// 4. Trend Analizi
router.post('/api/depo-trend', trendController.hesapla); // "hesapla" fonksiyonu eski dosyanda mevcut

// 5. İade Politikası Analizi (Bugün Güncelledik)
router.post('/api/iade', iadeController.hesapla);

// 6. Sunucu Yük Testi
router.post('/api/sunucu', sunucuController.hesapla);

// 7. Maliyet Tasarrufu
router.post('/api/maliyet', maliyetController.hesapla);


// --- 3. SİMÜLASYON ROTALARI (Canlı Operasyon) ---
router.post('/api/simulasyon/olustur', simulasyonController.siparisOlustur);
router.post('/api/simulasyon/guncelle', simulasyonController.durumGuncelle);
router.get('/api/simulasyon/liste', simulasyonController.sonSiparisleriGetir);


// --- 4. PARAMETRE YÖNETİMİ (YENİ EKLENEN KISIM) ---
// Ayarlar modalından gelen istekleri karşılar
router.post('/api/parametre-guncelle', parametreController.guncelle);
router.get('/api/parametre-getir', parametreController.getir);

module.exports = router;