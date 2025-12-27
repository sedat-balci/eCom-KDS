const express = require('express');
const router = express.Router();

// Controller Import
// Dosya yolunun '../' ile başladığına emin ol (Routes klasöründen çıkmak için)
const parametreController = require('../controllers/parametreController');

// --- AYARLAR VE PARAMETRELER ---

// URL: /api/parametre/guncelle
router.post('/guncelle', parametreController.guncelle);

// URL: /api/parametre/getir
router.get('/getir', parametreController.getir);

module.exports = router;