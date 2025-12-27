const db = require('../config/db');

exports.hesapla = (req, res) => {
    const tasarrufBirim = parseFloat(req.body.tasarrufBirim); // Kutu başı indirim
    
    // Veritabanındaki toplam sipariş sayısını çekiyoruz
    const sql = `SELECT COUNT(*) as toplam FROM gecmis_siparisler`;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Veritabanı Hatası:', err);
            return res.json({ error: 'Veritabanı hatası' });
        }

        const toplamSiparis = results[0].toplam;
        
        // Veri setimiz yaklaşık 2 yıllık olduğu için yıllık ortalamayı bulmak adına 2'ye bölüyoruz
        const yillikSiparis = toplamSiparis / 2;
        
        const yillikKazanc = yillikSiparis * tasarrufBirim;
        
        const mesaj = `💰 TASARRUF: Koli maliyetini ${tasarrufBirim} TL düşürmek, şirkete yılda **${yillikKazanc.toLocaleString()} TL** net kâr bırakır!`;
        
        res.json({
            yillikKazanc,
            mesaj
        });
    });
};