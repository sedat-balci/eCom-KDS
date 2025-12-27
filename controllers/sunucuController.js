const db = require('../config/db');

exports.hesapla = (req, res) => {
    const buyumeOrani = parseFloat(req.body.buyumeOrani);
    
    // 1. Parametreleri Çek (YENİ SÜTUN YAPISINA GÖRE)
    // Eski kod: WHERE parametre_adi = 'sunucu_anlik_kapasite'
    // Yeni kod: SELECT sunucu_kapasitesi ...
    const sqlParam = `SELECT sunucu_kapasitesi FROM sistem_parametreleri ORDER BY id DESC LIMIT 1`;

    db.query(sqlParam, (err, paramResult) => {
        if (err) return res.json({ error: 'Parametre hatası' });

        // Veritabanından gelen değeri al, yoksa 5000 varsay
        const sunucuKapasitesi = paramResult.length > 0 ? parseInt(paramResult[0].sunucu_kapasitesi) : 5000;

        // 2. Geçmişteki En Yüksek Yükü (Peak Load) Bul (BU KISIM SENİN KODUNLA AYNI)
        const sqlPeak = `
            SELECT COUNT(*) as zirve_yuk 
            FROM gecmis_siparisler 
            GROUP BY DATE_FORMAT(siparis_tarihi, '%Y-%m-%d %H') 
            ORDER BY zirve_yuk DESC 
            LIMIT 1
        `;

        db.query(sqlPeak, (err, peakResult) => {
            if (err) return res.json({ error: 'Veri hatası' });

            const mevcutPeakLoad = peakResult.length > 0 ? peakResult[0].zirve_yuk : 0;

            // 3. Gelecek Senaryosu Hesapla
            const gelecekPeakLoad = Math.floor(mevcutPeakLoad * (1 + (buyumeOrani / 100)));
            
            // Doluluk Oranı
            // Sıfıra bölünme hatasını önlemek için kontrol
            const kapasite = sunucuKapasitesi > 0 ? sunucuKapasitesi : 1; 
            const dolulukOrani = (gelecekPeakLoad / kapasite) * 100;

            // 4. Karar Mantığı
            let mesaj;
            
            if (dolulukOrani > 100) {
                mesaj = `🔴 <b>KRİTİK RİSK: SİSTEM ÇÖKER!</b><br>
                         %${buyumeOrani} büyüme ile anlık yük <b>${gelecekPeakLoad}</b> isteğe çıkacak. 
                         Mevcut kapasite (${sunucuKapasitesi}) yetersiz. <br>
                         👉 <i>Aksiyon: Acil olarak "Load Balancer" eklenmeli ve sunucu kümesi (Cluster) genişletilmeli.</i>`;
            } else if (dolulukOrani > 80) {
                mesaj = `🟡 <b>UYARI: PERFORMANS DÜŞÜŞÜ.</b><br>
                         Sunucu doluluk oranı <b>%${dolulukOrani.toFixed(1)}</b> seviyesine ulaşacak. 
                         Yanıt süreleri uzayabilir.<br>
                         👉 <i>Aksiyon: "Auto-Scaling" (Otomatik Ölçekleme) devreye alınmalı.</i>`;
            } else {
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