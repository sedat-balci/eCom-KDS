const express = require('express');
const router = express.Router();

// Controller Importları
const personelController = require('../controllers/personelController');
const lojistikController = require('../controllers/lojistikController');
const depoController = require('../controllers/depoController');
const trendController = require('../controllers/trendController');
const iadeController = require('../controllers/iadeController');
const sunucuController = require('../controllers/sunucuController');
const maliyetController = require('../controllers/maliyetController');

// --- HESAPLAMA API ENDPOINTLERİ ---

router.post('/personel', personelController.hesapla);   // Fulfillment Stratejisi
router.post('/lojistik', lojistikController.hesapla);   // Lojistik Simülasyonu
router.post('/depo', depoController.hesapla);           // Depo ROI
router.post('/depo-trend', trendController.hesapla);    // Trend Analizi
router.post('/iade', iadeController.hesapla);           // İade Politikası
router.post('/sunucu', sunucuController.hesapla);       // Sunucu Yük Testi
router.post('/maliyet', maliyetController.hesapla);     // Maliyet Tasarrufu

module.exports = router;