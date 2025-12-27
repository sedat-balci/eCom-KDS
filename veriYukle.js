const fs = require('fs');
const csv = require('csv-parser');
const mysql = require('mysql2');

// --- VERİTABANI BAĞLANTISI ---
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',      // Kendi kullanıcı adın
    password: '',      // Kendi şifren
    database: 'eCom_dss'
});

// --- AYARLAR ---
const CSV_DOSYA_YOLU = 'data.csv'; 
const TABLO_ADI = 'gecmis_siparisler';
const BATCH_SIZE = 1000; // Her seferde 1000 satır ekleyeceğiz (RAM dostu)

// --- TABLO OLUŞTURMA ---
const createTableQuery = `
    CREATE TABLE IF NOT EXISTS ${TABLO_ADI} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        siparis_kodu VARCHAR(50),
        urun_kodu VARCHAR(50),
        urun_adi VARCHAR(255),
        adet INT,
        birim_fiyat DECIMAL(10, 2),
        toplam_tutar DECIMAL(10, 2),
        musteri_id VARCHAR(50),
        ulke VARCHAR(50),
        siparis_tarihi DATETIME,
        kargo_firmasi VARCHAR(50),
        teslim_tarihi DATETIME,
        durum VARCHAR(20)
    )
`;

// --- YARDIMCI FONKSİYONLAR ---
function rastgeleKargoSec() {
    const kargolar = ['Yurtiçi Kargo', 'Aras Kargo', 'MNG Kargo', 'PTT Kargo', 'Hızlı Kurye'];
    return kargolar[Math.floor(Math.random() * kargolar.length)];
}

function tarihEkle(date, days) {
    if (!date || isNaN(date.getTime())) return new Date(); // Hatalı tarih gelirse şu anı ver
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

// MySQL Tarih Formatı Düzeltici (YYYY-MM-DD HH:mm:ss)
function formatMySQLDate(date) {
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

// --- ANA İŞLEM ---
connection.connect(err => {
    if (err) throw err;
    console.log('✅ Veritabanına bağlanıldı.');

    connection.query(createTableQuery, (err) => {
        if (err) throw err;
        console.log(`✅ Tablo (${TABLO_ADI}) hazır.`);
        console.log('⏳ Toplu yükleme başlıyor... (RAM dostu mod)');

        let batch = [];
        let totalInserted = 0;

        // Okuma akışını oluştur
        const stream = fs.createReadStream(CSV_DOSYA_YOLU).pipe(csv());

        stream.on('data', (row) => {
            // Veri Temizleme & Türetme
            const isReturn = row['Invoice'] && row['Invoice'].startsWith('C');
            const qty = Math.abs(parseInt(row['Quantity']) || 0);
            const price = parseFloat(row['Price']) || 0;
            const orderDate = new Date(row['InvoiceDate']);

            const deliveryDays = Math.floor(Math.random() * 5) + 1;
            const deliveryDate = tarihEkle(orderDate, deliveryDays);
            const kargo = rastgeleKargoSec();
            
            let status = 'Teslim Edildi';
            if (isReturn) status = 'İade';
            else if (deliveryDays > 4) status = 'Gecikti';

            // Satırı dizi formatında hazırla (Bulk Insert için array of arrays gerekir)
            const values = [
                row['Invoice'],
                row['StockCode'],
                row['Description'] ? row['Description'].substring(0, 250) : 'Bilinmeyen',
                qty,
                price,
                qty * price,
                row['Customer ID'] || 'Anonim',
                row['Country'],
                isNaN(orderDate.getTime()) ? new Date() : orderDate, // Tarih hatası önlemi
                kargo,
                deliveryDate,
                status
            ];

            batch.push(values);

            // Paket dolduysa (1000 adet) veritabanına gönder
            if (batch.length >= BATCH_SIZE) {
                stream.pause(); // 🛑 OKUMAYI DURDUR (Veritabanı yazana kadar bekle)
                insertBatch(batch, () => {
                    batch = []; // Paketi boşalt
                    stream.resume(); // ▶️ OKUMAYA DEVAM ET
                });
            }
        });

        stream.on('end', () => {
            // Kalan son parçayı ekle
            if (batch.length > 0) {
                insertBatch(batch, () => {
                    console.log(`\n🎉 İŞLEM TAMAMLANDI! Toplam ${totalInserted} satır yüklendi.`);
                    connection.end();
                    process.exit();
                });
            } else {
                console.log(`\n🎉 İŞLEM TAMAMLANDI! Toplam ${totalInserted} satır yüklendi.`);
                connection.end();
                process.exit();
            }
        });

        // Toplu Ekleme Fonksiyonu
        function insertBatch(data, callback) {
            const query = `INSERT INTO ${TABLO_ADI} (siparis_kodu, urun_kodu, urun_adi, adet, birim_fiyat, toplam_tutar, musteri_id, ulke, siparis_tarihi, kargo_firmasi, teslim_tarihi, durum) VALUES ?`;
            
            connection.query(query, [data], (err) => {
                if (err) {
                    console.error('Batch hatası:', err.message);
                } else {
                    totalInserted += data.length;
                    process.stdout.write(`\r💾 ${totalInserted} satır yüklendi...`);
                }
                callback(); // İşlem bitince geri dön
            });
        }
    });
});