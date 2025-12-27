const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./config/db'); // Veritabanı bağlantısı

// --- YENİ: Modüler Rota Dosyalarının Çağrılması ---
const viewRoutes = require('./routes/viewRoutes');
const analysisRoutes = require('./routes/analysisRoutes');
const simulationRoutes = require('./routes/simulationRoutes');
const settingRoutes = require('./routes/settingRoutes');

// const mainRoutes = require('./routes/mainRoutes'); // ESKİ: Artık devre dışı bırakıldı (Yedek olarak dursun)

const app = express();
const PORT = 3000; // .env kullanıyorsan process.env.PORT || 3000 yapabilirsin

// EJS Görüntü Motoru ve Views Klasörü Ayarı
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Statik Dosyalar (CSS, JS, Resim) Ayarı
app.use(express.static(path.join(__dirname, 'public')));

// Form verilerini okumak için body-parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// --- ROTA YÖNLENDİRMELERİ (ROUTING) ---

// 1. Sayfa Görüntüleme Rotaları (Login, Dashboard)
// Örnek: localhost:3000/ veya localhost:3000/panel
app.use('/', viewRoutes);

// 2. Analiz ve Hesaplama API'leri
// Örnek: localhost:3000/api/personel, localhost:3000/api/depo
app.use('/api', analysisRoutes); 

// 3. Simülasyon Operasyonları
// Örnek: localhost:3000/api/simulasyon/olustur
app.use('/api/simulasyon', simulationRoutes);

// 4. Sistem Ayarları
// Örnek: localhost:3000/api/parametre-guncelle
app.use('/api/parametre', settingRoutes); // Dikkat: settingRoutes içindeki url'ler artık sadece '/guncelle' olacak

// ... app.use rotalarının en altına ...

// 404 Handler (Eşleşmeyen tüm rotalar için)
app.use((req, res) => {
    res.status(404).render('login', { 
        error: 'Aradığınız sayfa bulunamadı, lütfen tekrar giriş yapın.' 
    });
    // Veya basitçe: res.status(404).send("<h1>404 - Sayfa Bulunamadı</h1>");
});

// Sunucuyu Başlat
app.listen(PORT, () => {
    console.log(`🚀 Sunucu http://localhost:${PORT} adresinde çalışıyor...`);
    console.log(`📂 Modüler Mimari: Aktif`);
});