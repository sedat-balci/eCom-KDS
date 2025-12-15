// public/js/script.js

// --- A. GRAFİK FONKSİYONLARI ---

// MODÜL 1: PERSONEL VE KAPASİTE ANALİZİ GRAFİĞİ
function renderPersonelChart(mevcutKapasite, hedefKapasite) {
    const options = {
        series: [{
            name: 'Kapasite (Adet/Gün)',
            data: [mevcutKapasite, hedefKapasite]
        }],
        chart: {
            type: 'bar',
            height: 250,
            toolbar: { show: false },
            foreColor: '#c9d1d9'
        },
        plotOptions: {
            bar: {
                horizontal: true,
                distributed: true
            },
        },
        dataLabels: {
            enabled: true,
            formatter: function (val) {
                return val.toFixed(0) + " Sipariş";
            }
        },
        xaxis: {
            categories: ['Mevcut Kapasite', 'Hedef Kapasite'],
            labels: { style: { colors: '#c9d1d9' } }
        },
        yaxis: { labels: { style: { colors: '#c9d1d9' } } },
        colors: ['#00bcd4', '#FF4560'] // Mavi (Mevcut), Kırmızı (Hedef)
    };

    document.getElementById('personel-chart').innerHTML = '';
    const chart = new ApexCharts(document.querySelector("#personel-chart"), options);
    chart.render();
}


// MODÜL 2: LOJİSTİK VE CHURN ANALİZİ GRAFİĞİ
function renderLojistikChart(temelChurn, yeniChurn) {
    // Verileri % formatına çevir
    const mevcut = (temelChurn * 100).toFixed(2);
    const yeni = (yeniChurn * 100).toFixed(2);
    
    // Grafik Seçenekleri (Halka/Donut Grafik - Churn Kıyaslaması)
    const options = {
        series: [parseFloat(mevcut), parseFloat(yeni)],
        chart: {
            type: 'donut',
            height: 250,
            foreColor: '#c9d1d9'
        },
        labels: ['Mevcut Churn (%)', 'Simüle Edilen Churn (%)'],
        colors: ['#FFC107', '#00bcd4'], // Sarı (Mevcut), Mavi (Yeni)
        plotOptions: {
            pie: {
                donut: {
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: 'Churn Farkı',
                            formatter: function (w) {
                                // Yüzdesel farkı hesapla
                                const fark = parseFloat(yeni) - parseFloat(mevcut);
                                return `${fark > 0 ? '+' : ''}${fark.toFixed(2)} %`;
                            }
                        }
                    }
                }
            }
        },
    };

    document.getElementById('lojistik-chart').innerHTML = '';
    const chart = new ApexCharts(document.querySelector("#lojistik-chart"), options);
    chart.render();
}


// MODÜL 3: DEPO VE ROI ANALİZİ GRAFİĞİ
function renderRoiChart(yatirimMaliyeti, ekAylikNetKar) {
    const roiAy = yatirimMaliyeti / ekAylikNetKar;
    const labels = [];
    const data = [];
    // Geri dönüş süresi veya en fazla 18 ayı gösterelim
    const totalAy = Math.ceil(Math.min(roiAy, 18)); 
    let maxTutar = yatirimMaliyeti;

    for (let i = 1; i <= totalAy; i++) {
        labels.push(`${i}. Ay`);
        // Geriye Kalan Borç
        const kalanBorc = yatirimMaliyeti - (ekAylikNetKar * i);
        data.push(Math.max(0, kalanBorc)); // Borç 0'ın altına düşmesin
    }
    
    // ROI noktasına 0 (sıfır) ekleme
    labels.push(`${roiAy.toFixed(1)}. Ay (ROI)`);
    data.push(0);


    const options = {
        series: [{
            name: "Geriye Kalan Borç (₺)",
            data: data
        }],
        chart: {
            height: 250,
            type: 'area',
            foreColor: '#c9d1d9',
            toolbar: { show: false }
        },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth' },
        title: {
            text: `ROI Tahmini: ${roiAy.toFixed(1)} Ay`,
            align: 'left',
            style: { color: '#00bcd4' }
        },
        xaxis: {
            categories: labels,
            title: { text: "Ay", style: { color: '#c9d1d9' } },
             labels: { style: { colors: '#c9d1d9' } }
        },
        yaxis: {
            title: { text: "Kalan Yatırım (₺)", style: { color: '#c9d1d9' } },
            min: 0,
            max: maxTutar * 1.05,
             labels: { style: { colors: '#c9d1d9' } }
        },
        tooltip: {
            y: {
                formatter: function (val) {
                    return val.toFixed(0) + " ₺"
                }
            }
        },
        colors: ['#F73D93'] 
    };

    document.getElementById('roi-chart').innerHTML = '';
    const chart = new ApexCharts(document.querySelector("#roi-chart"), options);
    chart.render();
}

// --- B. GRAFİK YÖNETİMİ (SAYFA YÜKLENDİĞİNDE ÇALIŞIR) ---

document.addEventListener('DOMContentLoaded', function() {
    // 1. EJS ile gönderilen simResult objesini kontrol et (mainRoutes.js'ten geliyor)
    // Bu veri, <script> bloğu içinde EJS tarafından tanımlanmalıdır.
    const simDataElement = document.getElementById('sim-data');
    if (!simDataElement || !simDataElement.textContent) return;

    // JSON verisini parse et
    const simResult = JSON.parse(simDataElement.textContent);
    
    // Alert mesajını göster (Grafikle birlikte bilgilendirme)
    if (simResult.sonuc) {
        alert(simResult.sonuc);
    }

    // 2. Modüle göre ilgili grafik fonksiyonunu çağır
    if (simResult.module === 'personel') {
        renderPersonelChart(
            parseFloat(simResult.data.mevcutKapasite),
            parseFloat(simResult.data.hedefKapasite)
        );
    } else if (simResult.module === 'lojistik') {
        renderLojistikChart(
            parseFloat(simResult.data.temelChurn),
            parseFloat(simResult.data.yeniChurn)
        );
    } else if (simResult.module === 'depo') {
        renderRoiChart(
            parseFloat(simResult.data.yatirimMaliyeti),
            parseFloat(simResult.data.ekAylikNetKar)
        );
    }
});