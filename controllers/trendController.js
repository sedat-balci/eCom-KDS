const db = require('../config/db');

exports.hesapla = (req, res) => {
    const depoKapasitesi = parseInt(req.body.depoKapasitesi); 
    
    // Geçmiş veriyi çek
    const sql = `
        SELECT 
            DATE_FORMAT(siparis_tarihi, '%Y-%m') as ay, 
            SUM(adet) as toplam_satis 
        FROM gecmis_siparisler 
        GROUP BY ay 
        ORDER BY ay ASC
    `;

    db.query(sql, (err, results) => {
        if (err || !results || results.length < 2) {
            return res.json({ labels: [], data: [], forecast: [], mesaj: "Yetersiz veri." });
        }

        // Lineer Regresyon Hesaplaması
        const n = results.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        
        const historicalData = results.map((row, i) => {
            const y = parseInt(row.toplam_satis);
            sumX += i; 
            sumY += y; 
            sumXY += (i * y); 
            sumXX += (i * i);
            return y;
        });

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        const labels = results.map(r => r.ay); 
        const forecastData = []; 
        let patlamaayi = null;

        // Gelecek 6 ayın tahmini
        for (let i = 1; i <= 6; i++) {
            const prediction = Math.floor(slope * (n + i) + intercept);
            labels.push(`+${i} Ay`);
            forecastData.push(prediction);
            if (!patlamaayi && prediction > depoKapasitesi) {
                patlamaayi = `+${i}. Ay`;
            }
        }

        let mesaj;
        if (patlamaayi) {
            mesaj = `🔴 KRİTİK: Depo **${patlamaayi}** sonra doluyor!`;
        } else {
            mesaj = `🟢 GÜVENLİ: Kapasite yeterli.`;
        }

        res.json({
            labels,
            historical: historicalData,
            forecast: new Array(n).fill(null).concat(forecastData),
            capacity: depoKapasitesi,
            mesaj
        });
    });
};