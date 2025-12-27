const db = require('../config/db');

exports.hesapla = (req, res) => {
    const depoKapasitesi = parseInt(req.body.depoKapasitesi);

    // 1. Geçmiş Veriyi Çek (Son 12 Ay)
    const sql = `
        SELECT 
            DATE_FORMAT(siparis_tarihi, '%Y-%m') as ay, 
            COUNT(*) as siparis_sayisi 
        FROM gecmis_siparisler 
        GROUP BY ay 
        ORDER BY ay ASC 
        LIMIT 12
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.json({ mesaj: "Veri hatası", historical: [], forecast: [], labels: [] });
        }

        // Veri yoksa dummy veri oluştur (Hata almamak için)
        if (results.length < 2) {
            return res.json({ 
                mesaj: "Yeterli geçmiş veri yok.", 
                historical: [1000, 1100], 
                forecast: [], 
                labels: ['Ocak', 'Şubat'] 
            });
        }

        // 2. Veriyi Hazırla (X: Zaman, Y: Sipariş)
        const xValues = [];
        const yValues = [];
        const labels = [];

        results.forEach((row, index) => {
            xValues.push(index + 1); // 1, 2, 3...
            yValues.push(row.siparis_sayisi);
            labels.push(row.ay); // '2023-10', '2023-11'...
        });

        // 3. Lineer Regresyon Hesapla (y = mx + b)
        // Geleceği tahmin etmek için eğimi (m) ve kesişimi (b) buluyoruz.
        const n = xValues.length;
        const sumX = xValues.reduce((a, b) => a + b, 0);
        const sumY = yValues.reduce((a, b) => a + b, 0);
        const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
        const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX); // Eğim (m)
        const intercept = (sumY - slope * sumX) / n; // Kesişim (b)

        // 4. Gelecek Tahmini (STRATEJİK DÜZELTME: 6 Ay -> 12 Ay)
        const forecastData = [];
        const futureLabels = [];
        
        // Şimdiki zamandan 12 ay sonrasına kadar döngü
        for (let i = 1; i <= 12; i++) {
            const futureX = n + i;
            const forecastVal = Math.floor(slope * futureX + intercept); // y = mx + b
            forecastData.push(forecastVal);
            futureLabels.push(`+${i} Ay`);
        }

        // 5. Büyüme Oranı Hesabı (Yıllık Projeksiyon)
        const sonGercekVeri = yValues[yValues.length - 1];
        const onIkinciAyTahmini = forecastData[11]; // 12. ayın tahmini
        const buyumeYuzdesi = ((onIkinciAyTahmini - sonGercekVeri) / sonGercekVeri) * 100;

        // 6. Mesaj Oluştur
        let mesaj;
        if (onIkinciAyTahmini > depoKapasitesi) {
            // Kaçıncı ayda patlıyor?
            const patlamaAyi = forecastData.findIndex(val => val > depoKapasitesi) + 1;
            mesaj = `🔴 <b>KAPASİTE UYARISI!</b><br>
                     Mevcut trende göre, <b>${patlamaAyi}. ayda</b> depo kapasitesi (${depoKapasitesi}) aşılacak.<br>
                     12 ay sonunda talep <b>${onIkinciAyTahmini}</b> adede ulaşabilir.<br>
                     <i>Stratejik Öneri: Yeni depo yatırımı için ROI analizi yapın.</i>`;
        } else {
            mesaj = `🟢 <b>SÜRDÜRÜLEBİLİR BÜYÜME.</b><br>
                     Önümüzdeki 12 ay boyunca mevcut depo kapasitesi yeterli.<br>
                     Yıllık beklenen büyüme: <b>%${buyumeYuzdesi.toFixed(1)}</b>.<br>
                     <i>Stratejik Öneri: Nakit akışını pazarlamaya yönlendirebilirsiniz.</i>`;
        }

        res.json({
            historical: yValues,
            forecast: forecastData,
            labels: [...labels, ...futureLabels], // Geçmiş + Gelecek etiketleri
            capacity: depoKapasitesi,
            buyumeYuzdesi: Math.floor(buyumeYuzdesi),
            mesaj
        });
    });
};