const db = require('../config/db');

exports.hesapla = (req, res) => {
    // Frontend'den gelen veriler
    const yatirimMaliyeti = parseFloat(req.body.yatirimMaliyeti);
    const ekKapasite = parseInt(req.body.ekKapasite); 

    // 1. ADIM: Brüt Kârı Çek
    const sql = `SELECT AVG(satis_fiyati - birim_maliyet) as ort_brut_kar FROM urunler`;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("ROI Hesaplama Hatası:", err);
            return res.json({ 
                mesaj: "Veritabanı hatası!",
                yatirimMaliyeti: yatirimMaliyeti,
                ekAylikNetKar: 0 
            });
        }

        let brutKar = 50; // Varsayılan
        if (results && results.length > 0 && results[0].ort_brut_kar !== null) {
            brutKar = parseFloat(results[0].ort_brut_kar);
        }

        // --- KRİTİK DÜZELTME: GERÇEKÇİLİK KATSAYILARI ---
        
        // 1. Net Kâr Marjı (%35): 
        // E-ticarette brüt kârın %65'i pazarlama (CAC), vergi, kargo sübvansiyonu ve genel gidere gider.
        // Elimize net %35 kalır.
        const netKarKatsayisi = 0.35; 
        const gercekNetKar = brutKar * netKarKatsayisi;

        // 2. Kapasite Doluluk Oranı (%75):
        // Eklenen 50 kapasitenin her gün %100 dolması imkansızdır. Ortalama %75 doluluk varsayılır.
        const dolulukOrani = 0.75;
        const gerceklesenEkSiparis = ekKapasite * dolulukOrani;

        // 3. ADIM: Aylık Gerçek Net Nakit Girişi
        const ekAylikNetKar = gerceklesenEkSiparis * 30 * gercekNetKar;

        // 4. ADIM: Amorti Süresi
        let amortiSuresi = 0;
        if (ekAylikNetKar > 0) {
            amortiSuresi = yatirimMaliyeti / ekAylikNetKar;
        }

        // 5. ADIM: Karar Mesajı
        let mesaj;
        
        // Formatlama
        const formatTL = (tutar) => tutar.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' TL';

        if (amortiSuresi <= 12) {
            mesaj = `🟢 <b>YATIRIM ONAYLANDI.</b><br>
                     Yatırım kendini <b>${amortiSuresi.toFixed(1)} ayda</b> amorti ediyor.<br>
                     <span class="text-white-50" style="font-size: 0.8em;">
                     *Brüt kârın %65'i operasyonel gider ve pazarlama olarak düşüldü.<br>
                     *Kapasite doluluk oranı %75 baz alındı.</span>`;
        } else if (amortiSuresi <= 24) {
            mesaj = `🟡 <b>ORTA VADELİ DÖNÜŞ.</b><br>
                     Geri dönüş süresi: <b>${amortiSuresi.toFixed(1)} ay</b>.<br>
                     Stratejik olarak değerlendirilebilir ancak nakit akışını zorlayabilir.<br>
                     <small>Aylık Beklenen Net Katkı: ${formatTL(ekAylikNetKar)}</small>`;
        } else {
            mesaj = `🔴 <b>VERİMSİZ YATIRIM.</b><br>
                     Amorti süresi <b>${amortiSuresi.toFixed(1)} ay</b> ile çok uzun.<br>
                     Bu yatırım maliyeti, sağlanan ek kapasiteye göre çok yüksek.<br>
                     <small>Yatırım tutarını düşürmeyi deneyin.</small>`;
        }

        res.json({
            yatirimMaliyeti,
            ekAylikNetKar,
            mesaj
        });
    });
};