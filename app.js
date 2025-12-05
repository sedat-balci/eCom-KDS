const express = require('express'); // Hata veren kısım burasıydı!
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./config/db'); // Veritabanı bağlantısını çağır

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

// --- ANA ROTASYON (GET İSTEĞİ - VERİ ÇEKME) ---
app.get('/', (req, res) => {
    // Tüm personel verilerini çekiyoruz (Sorun 1: İşgücü Planlama için temel)
    const sql = `SELECT 
                    id, 
                    ad_soyad, 
                    rol, 
                    saatlik_ucret 
                 FROM personel`;

    db.query(sql, (err, personel_results) => {
        if (err) {
            console.error('Veri çekme hatası:', err);
            // Hata durumunda boş veri seti gönder
            return res.render('dashboard', { 
                personel_data: [], 
                title: 'Genel Bakış (HATA)' 
            }); 
        }

        // Veri çekimi başarılıysa dashboard.ejs sayfasına gönderiyoruz
        res.render('dashboard', { 
            personel_data: personel_results, // Frontend'de bu değişkeni kullanacağız
            title: 'Genel Bakış'
        });
    });
});

// --- POST ROTASI (SIMÜLASYON VERİLERİNİ YAKALAMAK İÇİN) ---
app.post('/', (req, res) => {
    // Formdan gelen veriyi yakalar, ileride burada simülasyon hesabı yaparız
    res.redirect('/'); 
});


// Sunucuyu Başlat
app.listen(PORT, () => {
    console.log(`🚀 Sunucu http://localhost:${PORT} adresinde çalışıyor...`);
});