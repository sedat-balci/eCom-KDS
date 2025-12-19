const db = require('../config/db');

exports.hesapla = (req, res) => {
    // Girdi artık günlük sipariş değil, BÜYÜME BEKLENTİSİ (%)
    const buyumeOrani = parseFloat(req.body.buyumeOrani); // Örn: 20 (%20)

    // Veritabanından mevcut aylık ortalama sipariş hacmini çekiyoruz
    const sql = `
        SELECT AVG(aylik_toplam) as ortalama_siparis FROM (
            SELECT DATE_FORMAT(siparis_tarihi, '%Y-%m') as ay, COUNT(*) as aylik_toplam 
            FROM gecmis_siparisler GROUP BY ay
        ) as aylik_veriler
    `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: 'Veritabanı hatası' });
        
        // --- 6 AYLIK PROJEKSİYON ---
        const mevcutAylikSiparis = Math.floor(results[0].ortalama_siparis);
        
        // Gelecek senaryosu (Kullanıcının girdiği % oranında artış)
        const gelecekAylikSiparis = Math.floor(mevcutAylikSiparis * (1 + (buyumeOrani / 100)));
        const siparisFarki = gelecekAylikSiparis - mevcutAylikSiparis;

        // Maliyet Sabitleri (Taktiksel)
        const personelMaliyeti = 30000; // Maaş + SGK + Yemek (Aylık)
        const mesaiBirimMaliyet = 50;   // Sipariş başına outsource/mesai maliyeti

        // Karar Analizi:
        // A) Mevcut kadroyla devam edip artışı "Fazla Mesai / Dış Kaynak" ile çözmek
        const maliyetMesai = siparisFarki * mesaiBirimMaliyet;

        // B) Yeni personel alıp maaşa bağlamak (1 Personel ayda ort. 2000 sipariş çözer varsayalım)
        const gerekenYeniPersonel = Math.ceil(siparisFarki / 2000); 
        const maliyetYeniPersonel = gerekenYeniPersonel * personelMaliyeti;

        let mesaj;
        let durum;

        if (siparisFarki <= 0) {
            mesaj = `🔵 STABİL: Büyüme beklenmediği için mevcut kadro yeterli. Ekstra maliyet yok.`;
            durum = 'primary';
        } else if (maliyetYeniPersonel < maliyetMesai) {
            mesaj = `🟢 ÖNERİ: <b>YENİ PERSONEL ALIN.</b> <br> %${buyumeOrani} büyüme için ${gerekenYeniPersonel} kişi almak, mesai ödemekten <b>${(maliyetMesai - maliyetYeniPersonel).toLocaleString()} TL</b> daha kârlı.`;
            durum = 'success';
        } else {
            mesaj = `🟡 ÖNERİ: <b>FAZLA MESAİ / OUTSOURCE.</b> <br> Büyüme hacmi için personel almak maliyetli. Mesai ile çözmek <b>${(maliyetYeniPersonel - maliyetMesai).toLocaleString()} TL</b> tasarruf sağlar.`;
            durum = 'warning';
        }

        res.json({
            mevcut: mevcutAylikSiparis,
            gelecek: gelecekAylikSiparis,
            mesaj: mesaj,
            durum: durum
        });
    });
};