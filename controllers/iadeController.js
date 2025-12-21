const db = require('../config/db');

exports.hesapla = (req, res) => {
    // Frontend'den gelen: Sadece müşteriden kesilecek ücret
    const musteriUcreti = parseFloat(req.body.musteriUcreti); 

    // 1. Veritabanından Operasyonel Maliyet ve Sepet Ortalamasını Çek
    const sql = `
        SELECT 
            (SELECT iade_kargo_maliyeti FROM sistem_parametreleri ORDER BY id DESC LIMIT 1) as operasyon_maliyeti,
            (SELECT AVG(toplam_tutar) FROM siparisler) as ort_sepet,
            (SELECT AVG(toplam_tutar * 0.35) FROM siparisler) as ort_net_kar
        `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.json({ error: "Veritabanı hatası" });
        }

        // Veritabanı boşsa varsayılan değerler (Güvenlik)
        const operasyonelMaliyet = parseFloat(results[0].operasyon_maliyeti) || 60;
        const ortSepet = parseFloat(results[0].ort_sepet) || 500;
        const ortKar = parseFloat(results[0].ort_net_kar) || 175;

        // --- YENİ ALGORİTMA: CAYDIRICILIK ETKİSİ ---
        
        // Baz Senaryo (Ücretsiz İade)
        const bazIadeOrani = 0.15; // %15 standart iade oranı
        const toplamSiparis = 1000;

        // ETKİ 1: İADE ORANINDAKİ DÜŞÜŞ (DETERRENCE)
        // Müşteriden para istemek, "keyfi siparişleri" (bunu da deneyeyim diyenleri) engeller.
        // Her 1 TL ücret, iade isteğini binde 5 azaltır (Logaritmik zorlaştırma).
        // Örn: 30 TL ücret -> İade oranı %15'ten %9'a düşer.
        let yeniIadeOrani = bazIadeOrani;
        if (musteriUcreti > 0) {
            const caydiricilik = Math.min(0.10, (musteriUcreti * 0.002)); 
            yeniIadeOrani = Math.max(0.05, bazIadeOrani - caydiricilik);
        }

        // ETKİ 2: SATIŞ KAYBI (CHURN - PRICE ELASTICITY)
        // Müşteri 30 TL ödeyeceğini görünce sepeti terk edebilir.
        let satisKaybiOrani = 0;
        if (musteriUcreti > 0) {
            // Ücretin sepet tutarına oranı ne kadar yüksekse, kayıp o kadar artar.
            // Duyarlılık katsayısını 0.5 yaptık (Daha gerçekçi).
            const ucretOrani = (musteriUcreti / ortSepet) * 100; 
            satisKaybiOrani = ucretOrani * 0.5; 
        }

        // --- SİMÜLASYON HESAPLAMASI ---

        // SENARYO A: MEVCUT DURUM (Ücretsiz İade Varsayımıyla Baz)
        // Şirket tüm kargo parasını (operasyonelMaliyet) öder.
        const bazSiparis = toplamSiparis;
        const bazCiro = bazSiparis * ortKar;
        const bazIadeSayisi = bazSiparis * bazIadeOrani;
        const bazIadeGideri = bazIadeSayisi * operasyonelMaliyet; 
        const bazNetKasa = bazCiro - bazIadeGideri;

        // SENARYO B: YENİ POLİTİKA
        // 1. Satışlar düşer
        const yeniSiparis = toplamSiparis * (1 - (satisKaybiOrani / 100));
        const yeniCiro = yeniSiparis * ortKar;
        
        // 2. İade sayısı CİDDİ oranda düşer (Hem sipariş azaldı hem oran düştü)
        const yeniIadeSayisi = yeniSiparis * yeniIadeOrani;
        
        // 3. İade Gideri: Şirket kargoyu öder AMA müşteriden ücreti tahsil eder.
        // Şirketin cebinden çıkan net para = (Kargo Ücreti - Müşteriden Alınan)
        const iadeBasinaNetMaliyet = operasyonelMaliyet - musteriUcreti;
        const yeniIadeGideri = yeniIadeSayisi * iadeBasinaNetMaliyet;

        const yeniNetKasa = yeniCiro - yeniIadeGideri;
        
        // SONUÇLARI KARŞILAŞTIR
        const fark = yeniNetKasa - bazNetKasa;
        const operasyonelTasarruf = bazIadeGideri - yeniIadeGideri; // Lojistikten kurtarılan para
        const ciroKaybi = bazCiro - yeniCiro; // Müşteri kaçtığı için kaybedilen para

        let mesaj;

        if (musteriUcreti === 0) {
            mesaj = `🔵 <b>ÜCRETSİZ İADE (Baz Senaryo)</b><br>
                     Müşteri kaybı yok. Ancak iade oranı yüksek (%${(bazIadeOrani*100).toFixed(1)}).<br>
                     Tüm kargo masrafı (${operasyonelMaliyet} TL/İade) şirkete ait.`;
        } else if (fark > 0) {
            mesaj = `🟢 <b>OPTIMAL STRATEJİ!</b><br>
                     Müşteriden <b>${musteriUcreti} TL</b> almak, gereksiz iadeleri <b>%${(yeniIadeOrani*100).toFixed(1)}</b> seviyesine indirdi.<br>
                     Satış kaybına rağmen, lojistik masraflarından <b>${Math.floor(operasyonelTasarruf)} TL</b> tasarruf edildi.<br>
                     <b>Net Kâr Artışı: +${Math.floor(fark)} TL</b>`;
        } else {
            mesaj = `🔴 <b>DİKKAT!</b><br>
                     İade ücreti çok yüksek. Müşteri kaybı (%${satisKaybiOrani.toFixed(1)}) kazancın önüne geçti.<br>
                     Tasarruf edilen kargo parası, kaybedilen ciroyu kurtarmıyor.<br>
                     <b>Net Zarar: ${Math.floor(fark)} TL</b>`;
        }

        res.json({
            tasarruf: operasyonelTasarruf, // Grafik için: Lojistikten kurtarılan
            zarar: -ciroKaybi,             // Grafik için: Satış kaybı
            netEtki: fark,                 // Grafik için: Sonuç
            mesaj,
            parametreMaliyeti: operasyonelMaliyet // Bilgi amaçlı geri dönüyoruz
        });
    });
};