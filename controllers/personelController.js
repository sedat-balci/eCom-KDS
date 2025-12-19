const db = require('../config/db');

// --- HESAPLAMA FONKSİYONU ---
exports.hesapla = (req, res) => {
    const buyumeOrani = parseFloat(req.body.buyumeOrani); 

    // 1. Önce Parametreleri Çek (Canlı Veri)
    const sqlParametre = `SELECT parametre_adi, deger FROM sistem_parametreleri`;

    db.query(sqlParametre, (err, paramResults) => {
        if (err) {
            console.error("Parametre Hatası:", err);
            return res.status(500).json({ error: 'Parametre okuma hatası' });
        }

        // Gelen veriyi { anahtar: deger } formatına çevir
        const parametreler = {};
        paramResults.forEach(row => {
            parametreler[row.parametre_adi] = parseFloat(row.deger);
        });

        // 2. Sipariş Verilerini Çek
        const sqlSiparis = `
            SELECT AVG(aylik_toplam) as ortalama_siparis FROM (
                SELECT DATE_FORMAT(siparis_tarihi, '%Y-%m') as ay, COUNT(*) as aylik_toplam 
                FROM gecmis_siparisler GROUP BY ay
            ) as aylik_veriler
        `;

        db.query(sqlSiparis, (err, siparisResults) => {
            if (err) return res.status(500).json({ error: 'Veritabanı hatası' });
            
            const mevcutAylikSiparis = Math.floor(siparisResults[0].ortalama_siparis);
            
            // Gelecek Senaryosu
            const gelecekAylikSiparis = Math.floor(mevcutAylikSiparis * (1 + (buyumeOrani / 100)));
            const siparisFarki = gelecekAylikSiparis - mevcutAylikSiparis;

            // --- DİNAMİK DEĞERLER KULLANILIYOR ---
            const personelMaliyeti = parametreler['personel_maaliyet_aylik']; 
            const mesaiBirimMaliyet = parametreler['mesai_birim_ucret'];   

            // Karar Analizi
            const maliyetMesai = siparisFarki * mesaiBirimMaliyet;
            const gerekenYeniPersonel = Math.ceil(siparisFarki / 2000); // 1 personel = 2000 sipariş kapasitesi
            const maliyetYeniPersonel = gerekenYeniPersonel * personelMaliyeti;

            let mesaj;
            let durum;

            if (siparisFarki <= 0) {
                mesaj = `🔵 STABİL: Büyüme beklenmediği için mevcut kadro yeterli.`;
                durum = 'primary';
            } else if (maliyetYeniPersonel < maliyetMesai) {
                // Yeni personel daha ucuzsa
                const fark = maliyetMesai - maliyetYeniPersonel;
                mesaj = `🟢 ÖNERİ: <b>YENİ PERSONEL ALIN.</b><br>
                         %${buyumeOrani} büyüme için ${gerekenYeniPersonel} kişi almak, mesai ödemekten <b>${fark.toLocaleString()} TL</b> daha kârlı.<br>
                         <small class="text-white-50">(Parametreler: Maaş ${personelMaliyeti.toLocaleString()} TL, Mesai ${mesaiBirimMaliyet} TL)</small>`;
                durum = 'success';
            } else {
                // Mesai daha ucuzsa
                const fark = maliyetYeniPersonel - maliyetMesai;
                mesaj = `🟡 ÖNERİ: <b>FAZLA MESAİ / OUTSOURCE.</b><br>
                         Yeni personel almak yerine mesai yaptırmak <b>${fark.toLocaleString()} TL</b> tasarruf sağlar.<br>
                         <small class="text-white-50">(Parametreler: Maaş ${personelMaliyeti.toLocaleString()} TL, Mesai ${mesaiBirimMaliyet} TL)</small>`;
                durum = 'warning';
            }

            res.json({
                mevcut: mevcutAylikSiparis,
                gelecek: gelecekAylikSiparis,
                mesaj: mesaj,
                durum: durum
            });
        });
    });
};

// --- GÜNCELLEME FONKSİYONU (YENİ HALİ - Sunucu Kapasitesi Dahil) ---
exports.parametreGuncelle = (req, res) => {
    // Frontend'den gelen 3 değeri alıyoruz
    const { personelMaliyeti, mesaiUcreti, sunucuKapasitesi } = req.body;

    const sql = `
        UPDATE sistem_parametreleri 
        SET deger = CASE 
            WHEN parametre_adi = 'personel_maaliyet_aylik' THEN ? 
            WHEN parametre_adi = 'mesai_birim_ucret' THEN ? 
            WHEN parametre_adi = 'sunucu_anlik_kapasite' THEN ? 
        END
        WHERE parametre_adi IN ('personel_maaliyet_aylik', 'mesai_birim_ucret', 'sunucu_anlik_kapasite')
    `;

    db.query(sql, [personelMaliyeti, mesaiUcreti, sunucuKapasitesi], (err, result) => {
        if (err) {
            console.error(err);
            return res.json({ success: false, message: 'Veritabanı güncelleme hatası' });
        }
        res.json({ success: true, message: 'Parametreler başarıyla güncellendi!' });
    });
};