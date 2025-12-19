const db = require('../config/db');

exports.hesapla = (req, res) => {
    const buyumeOrani = parseFloat(req.body.buyumeOrani);
    
    // 1. Parametreleri Çek (Sunucu Kapasitesini Veritabanından Al)
    const sqlParam = `SELECT deger FROM sistem_parametreleri WHERE parametre_adi = 'sunucu_anlik_kapasite'`;

    db.query(sqlParam, (err, paramResult) => {
        if (err) return res.json({ error: 'Parametre hatası' });

        // Eğer veritabanında parametre yoksa varsayılan 5000 kabul et
        const sunucuKapasitesi = paramResult.length > 0 ? parseFloat(paramResult[0].deger) : 5000;

        // 2. Geçmişteki En Yüksek Yükü (Peak Load) Bul
        // "Tarih boyunca en yoğun saatte kaç sipariş aldık?"
        const sqlPeak = `
            SELECT COUNT(*) as zirve_yuk 
            FROM gecmis_siparisler 
            GROUP BY DATE_FORMAT(siparis_tarihi, '%Y-%m-%d %H') 
            ORDER BY zirve_yuk DESC 
            LIMIT 1
        `;

        db.query(sqlPeak, (err, peakResult) => {
            if (err) return res.json({ error: 'Veri hatası' });

            // Eğer veritabanı boşsa 0, değilse zirve değeri al
            const mevcutPeakLoad = peakResult.length > 0 ? peakResult[0].zirve_yuk : 0;

            // 3. Gelecek Senaryosu Hesapla
            // Mevcut zirvenin üzerine % büyüme ekliyoruz
            const gelecekPeakLoad = Math.floor(mevcutPeakLoad * (1 + (buyumeOrani / 100)));
            
            // Doluluk Oranı
            const dolulukOrani = (gelecekPeakLoad / sunucuKapasitesi) * 100;

            // 4. Karar Mantığı
            let mesaj;
            
            if (dolulukOrani > 100) {
                // Kapasite aşıldı -> Kesinti kaçınılmaz
                mesaj = `🔴 <b>KRİTİK RİSK: SİSTEM ÇÖKER!</b><br>
                         %${buyumeOrani} büyüme ile anlık yük <b>${gelecekPeakLoad}</b> isteğe çıkacak. 
                         Mevcut kapasite (${sunucuKapasitesi}) yetersiz. <br>
                         👉 <i>Aksiyon: Acil olarak "Load Balancer" eklenmeli ve sunucu kümesi (Cluster) genişletilmeli.</i>`;
            } else if (dolulukOrani > 80) {
                // Kritik eşik -> Yavaşlama başlar
                mesaj = `🟡 <b>UYARI: PERFORMANS DÜŞÜŞÜ.</b><br>
                         Sunucu doluluk oranı <b>%${dolulukOrani.toFixed(1)}</b> seviyesine ulaşacak. 
                         Yanıt süreleri uzayabilir.<br>
                         👉 <i>Aksiyon: "Auto-Scaling" (Otomatik Ölçekleme) devreye alınmalı.</i>`;
            } else {
                // Güvenli bölge
                mesaj = `🟢 <b>GÜVENLİ: ALTYAPI YETERLİ.</b><br>
                         Beklenen yük (${gelecekPeakLoad} anlık istek), mevcut kapasitenin altında (%${dolulukOrani.toFixed(1)}).<br>
                         👉 <i>Ekstra bir yatırıma gerek yoktur.</i>`;
            }

            res.json({
                dolulukOrani: Math.min(dolulukOrani, 100), // Grafik 100'ü geçmesin
                mesaj
            });
        });
    });
};