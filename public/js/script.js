// public/js/script.js

// Ortak Grafik Ayarları (Figma Teması)
const commonOptions = {
    chart: {
        height: 180, // Yüksekliği azalttık, kartlara sığsın
        toolbar: { show: false },
        foreColor: '#c9d1d9',
        fontFamily: 'sans-serif'
    },
    dataLabels: { enabled: false }, // Kalabalık yapmasın
    grid: { borderColor: '#30363d' },
    tooltip: { theme: 'dark' }
};

function renderPersonelChart(mevcut, hedef) {
    const options = {
        ...commonOptions,
        chart: { ...commonOptions.chart, type: 'bar' },
        series: [{ name: 'Kapasite', data: [mevcut, hedef] }],
        plotOptions: { bar: { horizontal: true, borderRadius: 4, distributed: true } },
        xaxis: { categories: ['Mevcut', 'Hedef'] },
        colors: ['#00bcd4', '#F73D93']
    };
    new ApexCharts(document.querySelector("#personel-chart"), options).render();
}

function renderLojistikChart(mevcutChurn, yeniChurn) {
    const options = {
        ...commonOptions,
        chart: { ...commonOptions.chart, type: 'donut' },
        series: [parseFloat((mevcutChurn*100).toFixed(1)), parseFloat((yeniChurn*100).toFixed(1))],
        labels: ['Mevcut', 'Simüle'],
        colors: ['#FFC107', '#00bcd4'],
        plotOptions: { pie: { donut: { size: '65%' } } },
        legend: { position: 'bottom', fontSize: '12px' }
    };
    new ApexCharts(document.querySelector("#lojistik-chart"), options).render();
}

function renderRoiChart(yatirim, ekKar) {
    const roiAy = yatirim / ekKar;
    const data = [];
    const labels = [];
    for(let i=0; i<= Math.min(roiAy+2, 12); i++) {
        labels.push(i);
        data.push(Math.max(0, yatirim - (ekKar * i)));
    }
    
    const options = {
        ...commonOptions,
        chart: { ...commonOptions.chart, type: 'area' },
        series: [{ name: 'Kalan Borç', data: data }],
        stroke: { curve: 'smooth', width: 2 },
        colors: ['#00E396'],
        fill: { type: 'gradient', gradient: { opacityFrom: 0.6, opacityTo: 0.1 } }
    };
    new ApexCharts(document.querySelector("#roi-chart"), options).render();
}

document.addEventListener('DOMContentLoaded', function() {
    const simDataEl = document.getElementById('sim-data');
    if (!simDataEl) return;
    const simResult = JSON.parse(simDataEl.textContent);

    if (simResult.sonuc) alert(simResult.sonuc);

    if (simResult.module === 'personel') renderPersonelChart(simResult.data.mevcutKapasite, simResult.data.hedefKapasite);
    else if (simResult.module === 'lojistik') renderLojistikChart(simResult.data.temelChurn, simResult.data.yeniChurn);
    else if (simResult.module === 'depo') renderRoiChart(simResult.data.yatirimMaliyeti, simResult.data.ekAylikNetKar);
});