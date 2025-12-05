const mysql = require('mysql2');

// Bağlantı ayarları
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',      
    password: '',      // WampServer şifresi genellikle boştur.
    database: 'eCom_dss' 
});

// Bağlantıyı aç ve terminale durumu yaz
connection.connect((err) => {
    if (err) {
        console.error('❌ Veritabanı bağlantı hatası: ' + err.stack);
        return;
    }
    console.log('✅ MySQL Veritabanına başarıyla bağlanıldı! ID: ' + connection.threadId);
});

module.exports = connection;