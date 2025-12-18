// public/js/script.js

// Ortak Grafik Ayarları
const commonOptions = {
    chart: { height: 180, toolbar: { show: false }, foreColor: '#c9d1d9', fontFamily: 'sans-serif' },
    dataLabels: { enabled: false },
    grid: { borderColor: '#30363d' },
    tooltip: { theme: 'dark' }
};

// --- CHART INSTANCE'LARI (Güncellemek için global tutuyoruz) ---
let chartPersonel, chartLojistik, chartRoi;

// --- 1. RENDER FONKSİYONLARI ---

function initPersonelChart(mevcut, hedef) {
    const options = {
        ...commonOptions,
        chart: { ...commonOptions.chart, type: 'bar' },
        series: [{ name: 'Kapasite', data: [mevcut, hedef] }],
        plotOptions: { bar: { horizontal: true, borderRadius: 4, distributed: true } },
        xaxis: { categories: ['Mevcut', 'Hedef'] },
        colors: ['#00bcd4', '#F73D93']
    };
    chartPersonel = new ApexCharts(document.querySelector("#personel-chart"), options);
    chartPersonel.render();
}

function initLojistikChart(mevcut, yeni) {
    const options = {
        ...commonOptions,
        chart: { ...commonOptions.chart, type: 'donut' },
        series: [mevcut, yeni],
        labels: ['Mevcut', 'Simüle'],
        colors: ['#FFC107', '#00bcd4'],
        plotOptions: { pie: { donut: { size: '65%' } } },
        legend: { position: 'bottom', fontSize: '12px' }
    };
    chartLojistik = new ApexCharts(document.querySelector("#lojistik-chart"), options);
    chartLojistik.render();
}

function initRoiChart(yatirim, ekKar) {
    const roiAy = yatirim / ekKar;
    const data = [];
    const labels = [];
    // Varsayılan ilk çizim için basit veri
    for(let i=0; i<= 12; i++) {
        labels.push(i);
        data.push(Math.max(0, yatirim - (ekKar * i)));
    }
    
    const options = {
        ...commonOptions,
        chart: { ...commonOptions.chart, type: 'area' },
        series: [{ name: 'Kalan Borç', data: data }],
        stroke: { curve: 'smooth', width: 2 },
        colors: ['#00E396'],
        fill: { type: 'gradient', gradient: { opacityFrom: 0.6, opacityTo: 0.1 } },
        xaxis: { categories: labels }
    };
    chartRoi = new ApexCharts(document.querySelector("#roi-chart"), options);
    chartRoi.render();
}

// --- 2. SİMÜLASYON FONKSİYONLARI (AJAX) ---

async function runPersonelSim() {
    const hedefSiparis = document.getElementById('hedefSiparis').value;
    const yeniPersonel = document.getElementById('yeniPersonel').value;

    const res = await fetch('/api/personel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hedefSiparis, yeniPersonel })
    });
    const data = await res.json();

    // Grafiği Güncelle
    chartPersonel.updateSeries([{ data: [data.mevcutKapasite, data.hedefKapasite] }]);
    
    // Mesajı Göster
    const resultBox = document.getElementById('personel-result');
    resultBox.style.display = 'block';
    resultBox.innerHTML = data.mesaj;
}

async function runLojistikSim() {
    const hedefKargoHizi = document.getElementById('hedefKargoHizi').value;

    const res = await fetch('/api/lojistik', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hedefKargoHizi })
    });
    const data = await res.json();

    chartLojistik.updateSeries([data.temelChurn * 100, data.yeniChurn * 100]);
    
    const resultBox = document.getElementById('lojistik-result');
    resultBox.style.display = 'block';
    resultBox.innerHTML = data.mesaj;
}

async function runDepoSim() {
    const yatirimMaliyeti = document.getElementById('yatirimMaliyeti').value;
    const ekKapasite = document.getElementById('ekKapasite').value;

    const res = await fetch('/api/depo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yatirimMaliyeti, ekKapasite })
    });
    const data = await res.json();

    // ROI Grafiğini yeniden hesapla ve çiz
    const newData = [];
    const newLabels = [];
    for(let i=0; i<= Math.min(data.roiAy + 2, 24); i++) {
        newLabels.push(i);
        newData.push(Math.max(0, data.yatirimMaliyeti - (data.ekAylikNetKar * i)));
    }
    
    chartRoi.updateOptions({ xaxis: { categories: newLabels } });
    chartRoi.updateSeries([{ data: newData }]);

    const resultBox = document.getElementById('depo-result');
    resultBox.style.display = 'block';
    resultBox.innerHTML = data.mesaj;
}

// --- 3. BAŞLANGIÇ (Sayfa Yüklendiğinde Varsayılan Grafikler) ---
document.addEventListener('DOMContentLoaded', () => {
    // Sayfa açılır açılmaz boş grafikler yerine varsayılan dolu grafikler gösteriyoruz
    // Böylece kullanıcı hesaplama yapmadan önce de bir şeyler görür.
    
    // Personel: Varsayılan 400 kapasite
    initPersonelChart(350, 400); 

    // Lojistik: Varsayılan %5 ve %4 churn
    initLojistikChart(5, 5); 

    // Depo: Varsayılan 100k yatırım
    initRoiChart(100000, 50 * 40 * 22); 
});