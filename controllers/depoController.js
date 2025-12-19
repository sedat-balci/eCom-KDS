exports.hesapla = (req, res) => {
    const yatirimMaliyeti = parseFloat(req.body.yatirimMaliyeti);
    const ekKapasite = parseInt(req.body.ekKapasite);
    
    // Varsayımlar
    const ortalamaKarMarjiTL = 40; 
    const GUNLUK_CALISMA_GUNU = 22; 
    
    // Hesaplamalar
    const ekAylikNetKar = ekKapasite * ortalamaKarMarjiTL * GUNLUK_CALISMA_GUNU;
    const roiAy = yatirimMaliyeti / ekAylikNetKar;

    let sonuc_mesaj;
    if (roiAy <= 12) {
        sonuc_mesaj = `🟢 KÂRLI: Yatırım ${roiAy.toFixed(1)} ayda geri dönüyor.`;
    } else {
        sonuc_mesaj = `🟡 DİKKAT: Geri dönüş süresi ${roiAy.toFixed(1)} ay.`;
    }

    // JSON Cevabı
    res.json({
        yatirimMaliyeti,
        ekAylikNetKar,
        roiAy,
        mesaj: sonuc_mesaj
    });
};