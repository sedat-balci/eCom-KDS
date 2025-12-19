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

// --- 1. ANA SAYFA (View Render) ---
router.get('/', (req, res) => {
    // Ana sayfa için temel personel listesini çekiyoruz (View Model)
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

// 1. Personel Simülasyonu (İşgücü Bütçeleme)
router.post('/api/personel', personelController.hesapla);

// [YENİ] Parametre Güncelleme (Maaş/Mesai Ayarları)
router.post('/api/parametre-guncelle', personelController.parametreGuncelle);

// 2. Lojistik Simülasyonu
router.post('/api/lojistik', lojistikController.hesapla);

// 3. Depo ROI Simülasyonu
router.post('/api/depo', depoController.hesapla);

// 4. Trend Analizi (Gelecek Tahmini)
router.post('/api/depo-trend', trendController.hesapla);

// 5. İade Politikası Analizi
router.post('/api/iade', iadeController.hesapla);

// 6. Sunucu Yük Testi (IT Altyapı)
router.post('/api/sunucu', sunucuController.hesapla);

// 7. Sarf Malzeme (Maliyet) Tasarrufu
router.post('/api/maliyet', maliyetController.hesapla);

// ... (Üstteki diğer importlar ve rotalar aynen kalsın) ...

// SİMÜLASYON CONTROLLER İMPORTU
const simulasyonController = require('../controllers/simulasyonController');

// --- SİMÜLASYON API ROTALARI ---
// 1. Yeni sipariş yarat
router.post('/api/simulasyon/olustur', simulasyonController.siparisOlustur);

// 2. Sipariş durumu güncelle
router.post('/api/simulasyon/guncelle', simulasyonController.durumGuncelle);

// 3. Sipariş listesini çek
router.get('/api/simulasyon/liste', simulasyonController.sonSiparisleriGetir);

module.exports = router;

module.exports = router;