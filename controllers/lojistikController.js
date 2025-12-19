exports.hesapla = (req, res) => {
    const hedefKargoHizi = parseFloat(req.body.hedefKargoHizi);
    
    // Sabit Varsayımlar
    const mevcutOrtHiz = 3; 
    const temelChurn = 0.05; 
    const HIZ_CHURN_HASSASIYETI = 0.01; 
    
    // Hesaplama Mantığı
    const hiz_degisimi = mevcutOrtHiz - hedefKargoHizi;
    const yeni_churn_orani = temelChurn - (hiz_degisimi * HIZ_CHURN_HASSASIYETI);

    let sonuc_mesaj;
    const yuzde_churn = (yeni_churn_orani * 100).toFixed(2);
    
    if (yeni_churn_orani < temelChurn) {
        sonuc_mesaj = `🟢 İYİLEŞME: Churn oranı %${yuzde_churn} seviyesine düşüyor.`;
    } else if (yeni_churn_orani > temelChurn) {
        sonuc_mesaj = `🔴 RİSK: Yavaş teslimat müşteri kaybını (%${yuzde_churn}) artırabilir.`;
    } else {
         sonuc_mesaj = `🔵 STABİL: Churn oranı (%${yuzde_churn}) değişmedi.`;
    }

    // JSON Cevabı
    res.json({
        temelChurn,
        yeniChurn: yeni_churn_orani,
        mesaj: sonuc_mesaj
    });
};