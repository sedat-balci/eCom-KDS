const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',      // Kendi kullanıcı adın
    password: '',      // Kendi şifren
    database: 'eCom_dss'
});

connection.connect(err => {
    if (err) throw err;
    console.log('🔍 Veritabanı kontrol ediliyor...');

    connection.query('SELECT COUNT(*) AS toplam FROM gecmis_siparisler', (err, results) => {
        if (err) {
            console.log('❌ Hata veya Tablo Yok:', err.message);
        } else {
            console.log('✅ Toplam Kayıt Sayısı:', results[0].toplam);
            console.log('Durum:', results[0].toplam > 0 ? 'HARİKA! Veriler hazır.' : 'Veri yok.');
        }
        connection.end();
    });
});