const db = require('../config/db');

exports.hesapla = (req, res) => {
    const buyumeOrani = parseFloat(req.body.buyumeOrani);

    // 1. Yeni Parametreleri Çek
    const sqlParam = `SELECT * FROM sistem_parametreleri ORDER BY id DESC LIMIT 1`;

    db.query(sqlParam, (err, paramResults) => {
        if (err) return res.status(500).json({ error: 'Veritabanı hatası' });

        const params = paramResults[0] || { depo_sabit_gider: 20000, depo_personel_gideri: 90000, ucpl_birim_maliyet: 45 };
        
        // Parametreleri Sayıya Çevir
        const depoSabit = parseFloat(params.depo_sabit_gider);
        const depoPersonel = parseFloat(params.depo_personel_gideri);
        const birimTeklif3PL = parseFloat(params.ucpl_birim_maliyet);

        // 2. Sipariş Hacmini Çek
        const sqlSiparis = `
            SELECT AVG(aylik_toplam) as ortalama_siparis FROM (
                SELECT DATE_FORMAT(siparis_tarihi, '%Y-%m') as ay, COUNT(*) as aylik_toplam 
                FROM gecmis_siparisler GROUP BY ay
            ) as aylik_veriler
        `;

        db.query(sqlSiparis, (err, siparisResults) => {
            if (err) return res.status(500).json({ error: 'Veri hatası' });

            const mevcutHacim = siparisResults.length > 0 && siparisResults[0].ortalama_siparis 
                ? Math.floor(siparisResults[0].ortalama_siparis) 
                : 1000;

            // --- STRATEJİK HESAPLAMA (Düzeltilmiş Mantık) ---
            
            const gelecekHacim = Math.floor(mevcutHacim * (1 + (buyumeOrani / 100)));

            // MODEL A: IN-HOUSE (Kendi Depomuz)
            // Maliyet = Sabit Kira + Sabit Personel + (Hacim * Küçük Bir Sarf Malzeme Gideri)
            // Not: Kendi deponda paket başı maliyet düşüktür (koli bandı vs.), ama sabit giderin vardır.
            const inHouseBirimSarf = 10; // Koli, etiket vb. (Ucuz)
            const toplamMaliyetInHouse = depoSabit + depoPersonel + (gelecekHacim * inHouseBirimSarf);

            // MODEL B: 3PL (Dış Kaynak)
            // Maliyet = Hacim * 3PL Teklifi (Sabit gider yok!)
            const toplamMaliyet3PL = gelecekHacim * birimTeklif3PL;

            // KARAR
            const fark = Math.abs(toplamMaliyetInHouse - toplamMaliyet3PL);
            let mesaj, durum;

            // Eğer büyüme çok düşükse veya negatifse -> Risk alma
            if (buyumeOrani < 5 && buyumeOrani > -5) {
                 mesaj = `🔵 <b>STABİL DURUM.</b><br>Hacim değişmiyor. Mevcut yapıyı korumak en güvenlisi.<br>Operasyonel değişiklik riski almaya gerek yok.`;
                 durum = 'primary';
            }
            else if (toplamMaliyet3PL < toplamMaliyetInHouse) {
                // 3PL daha ucuzsa (Genelde düşük-orta hacimde)
                mesaj = `🟡 <b>STRATEJİ: 3PL (DIŞ KAYNAK).</b><br>
                         Sabit giderleriniz (Kira+Personel) hacme göre çok yüksek kalıyor.<br>
                         Operasyonu 3PL'e devretmek <b>Aylık ${fark.toLocaleString()} TL</b> tasarruf sağlar.<br>
                         <small>Sabit giderlerden kurtulun.</small>`;
                durum = 'warning';
            } else {
                // Kendi depon daha ucuzsa (Yüksek hacimde)
                mesaj = `🟢 <b>STRATEJİ: IN-HOUSE (KENDİ DEPONUZ).</b><br>
                         Hacminiz yüksek olduğu için "Birim Maliyet" avantajınız var.<br>
                         3PL firmasına komisyon ödemek yerine kendi deponuzu işletmek <b>${fark.toLocaleString()} TL</b> daha kârlı.`;
                durum = 'success';
            }

            res.json({
                mesaj,
                durum,
                inHouse: Math.floor(toplamMaliyetInHouse),
                outsource: Math.floor(toplamMaliyet3PL)
            });
        });
    });
};