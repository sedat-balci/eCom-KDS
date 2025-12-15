const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./config/db'); // db.js'i tutuyoruz
const mainRoutes = require('./routes/mainRoutes'); // YENİ: Rota dosyasını çağırıyoruz

const app = express();
const PORT = 3000;

// EJS Görüntü Motoru ve Views Klasörü Ayarı
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Statik Dosyalar (CSS, JS, Resim) Ayarı
app.use(express.static(path.join(__dirname, 'public')));

// Form verilerini okumak için body-parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// --- YENİ: Rotaları Entegre Etme ---
// '/' adresine gelen tüm istekleri (GET, POST) mainRoutes dosyasına yönlendir.
app.use('/', mainRoutes); 


// Sunucuyu Başlat
app.listen(PORT, () => {
    console.log(`🚀 Sunucu http://localhost:${PORT} adresinde çalışıyor...`);
});