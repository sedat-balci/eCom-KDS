const db = require('../config/db');

exports.hesapla = (req, res) => {
    const iadeMaliyeti = parseFloat(req.body.iadeMaliyeti); 
    const satisKaybiOrani = parseFloat(req.body.satisKaybiOrani) / 100; 

    const sql = `
        SELECT 
            COUNT(*) as toplam, 
            SUM(CASE WHEN siparis_kodu LIKE 'C%' THEN 1 ELSE 0 END) as iade, 
            SUM(toplam_tutar) as ciro 
        FROM gecmis_siparisler
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Veritabanı Hatası:', err);
            return res.json({ error: 'Veritabanı hatası' });
        }

        const data = results[0];
        
        // Hesaplamalar
        const kazanilanTasarruf = data.iade * iadeMaliyeti;
        const kaybedilenNetKar = (data.ciro * satisKaybiOrani) * 0.30; // %30 Kar marjı varsayımı
        const netEtki = kazanilanTasarruf - kaybedilenNetKar;

        // Mesaj Oluşturma
        let mesaj;
        if (netEtki > 0) {
            mesaj = `🟢 KÂRLI: **${netEtki.toFixed(0)} TL** kazanç.`;
        } else {
            mesaj = `🔴 ZARARLI: **${Math.abs(netEtki).toFixed(0)} TL** kayıp.`;
        }

        // JSON Cevabı
        res.json({
            tasarruf: kazanilanTasarruf,
            zarar: kaybedilenNetKar,
            netEtki,
            mesaj
        });
    });
};