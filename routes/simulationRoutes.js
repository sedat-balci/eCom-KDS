const express = require('express');
const router = express.Router();

// Controller Import
const simulasyonController = require('../controllers/simulasyonController');

// --- SİMÜLASYON YÖNETİMİ ---

// URL: /api/simulasyon/olustur
router.post('/olustur', simulasyonController.siparisOlustur);

// URL: /api/simulasyon/guncelle
router.post('/guncelle', simulasyonController.durumGuncelle);

// URL: /api/simulasyon/liste
router.get('/liste', simulasyonController.sonSiparisleriGetir);

module.exports = router;