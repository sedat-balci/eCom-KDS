const db = require('../config/db');

// --- HESAPLAMA FONKSİYONU ---
exports.hesapla = (req, res) => {
    const buyumeOrani = parseFloat(req.body.buyumeOrani); 

    // 1. Önce Parametreleri Çek (YENİ SÜTUN YAPISINA GÖRE)
    // Eski kod: SELECT parametre_adi, deger...
    // Yeni kod: Direkt sütun isimlerini istiyoruz
    const sqlParametre = `SELECT personel_maliyeti, mesai_ucreti FROM sistem_parametreleri ORDER BY id DESC LIMIT 1`;

    db.query(sqlParametre, (err, paramResults) => {
        if (err) {
            console.error("Parametre Hatası:", err);
            return res.status(500).json({ error: 'Parametre okuma hatası' });
        }

        // Eğer veritabanı boşsa varsayılan değerleri kullan
        const paramRow = paramResults[0] || { personel_maliyeti: 30000, mesai_ucreti: 50 };
        
        // Veritabanından gelen değerleri alıyoruz
        const personelMaliyeti = parseFloat(paramRow.personel_maliyeti);
        const mesaiBirimMaliyet = parseFloat(paramRow.mesai_ucreti);

        // 2. Sipariş Verilerini Çek (BU KISIM SENİN KODUNLA AYNI)
        const sqlSiparis = `
            SELECT AVG(aylik_toplam) as ortalama_siparis FROM (
                SELECT DATE_FORMAT(siparis_tarihi, '%Y-%m') as ay, COUNT(*) as aylik_toplam 
                FROM gecmis_siparisler GROUP BY ay
            ) as aylik_veriler
        `;

        db.query(sqlSiparis, (err, siparisResults) => {
            if (err) return res.status(500).json({ error: 'Veritabanı hatası' });
            
            // Eğer sipariş geçmişi yoksa 1000 varsayalım (Hata vermesin)
            const mevcutAylikSiparis = siparisResults.length > 0 && siparisResults[0].ortalama_siparis 
                ? Math.floor(siparisResults[0].ortalama_siparis) 
                : 1000;
            
            // Gelecek Senaryosu
            const gelecekAylikSiparis = Math.floor(mevcutAylikSiparis * (1 + (buyumeOrani / 100)));
            const siparisFarki = gelecekAylikSiparis - mevcutAylikSiparis;

            // Karar Analizi
            const maliyetMesai = siparisFarki * mesaiBirimMaliyet;
            const gerekenYeniPersonel = Math.ceil(siparisFarki / 2000); // 1 personel = 2000 sipariş kapasitesi
            const maliyetYeniPersonel = gerekenYeniPersonel * personelMaliyeti;

            let mesaj;
            let durum; // Renk kodu için (success, warning vs.)

            if (siparisFarki <= 0) {
                mesaj = `🔵 <b>STABİL DURUM.</b><br>Büyüme beklenmediği için mevcut kadro yeterli.`;
                durum = 'primary';
            } else if (maliyetYeniPersonel < maliyetMesai) {
                // Yeni personel daha ucuzsa
                const fark = maliyetMesai - maliyetYeniPersonel;
                mesaj = `🟢 <b>ÖNERİ: YENİ PERSONEL ALIN.</b><br>
                         %${buyumeOrani} büyüme için ${gerekenYeniPersonel} kişi almak, mesai ödemekten <b>${fark.toLocaleString()} TL</b> daha kârlı.<br>
                         <small class="text-white-50">(Parametreler: Maaş ${personelMaliyeti.toLocaleString()} TL, Mesai ${mesaiBirimMaliyet} TL)</small>`;
                durum = 'success';
            } else {
                // Mesai daha ucuzsa
                const fark = maliyetYeniPersonel - maliyetMesai;
                mesaj = `🟡 <b>ÖNERİ: FAZLA MESAİ / OUTSOURCE.</b><br>
                         Yeni personel almak yerine mesai yaptırmak <b>${fark.toLocaleString()} TL</b> tasarruf sağlar.<br>
                         <small class="text-white-50">(Parametreler: Maaş ${personelMaliyeti.toLocaleString()} TL, Mesai ${mesaiBirimMaliyet} TL)</small>`;
                durum = 'warning';
            }

            res.json({
                mevcut: mevcutAylikSiparis,
                gelecek: gelecekAylikSiparis,
                mesaj: mesaj,
                durum: durum // Frontend bunu kullanabilir veya result-box class'ını ayarlayabilirsin
            });
        });
    });
};
