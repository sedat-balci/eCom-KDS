// public/js/script.js

// Ortak Grafik Ayarları
const commonOptions = {
    chart: { height: 180, toolbar: { show: false }, foreColor: '#c9d1d9', fontFamily: 'sans-serif' },
    dataLabels: { enabled: false },
    grid: { borderColor: '#30363d' },
    tooltip: { theme: 'dark' }
};

let chartPersonel, chartLojistik, chartRoi, chartTrend, chartIade, chartSunucu;

// --- INIT FONKSİYONLARI --- (DEĞİŞMEDİ)
function initPersonelChart(mevcut, hedef) {
    // Personel grafiği artık kullanılmıyor, sonuç metin olarak dönüyor. Bu fonksiyonu kaldırabiliriz veya boş bırakabiliriz.
}
function initLojistikChart(mevcut, yeni) {
    const options = { ...commonOptions, chart: { ...commonOptions.chart, type: 'donut' }, series: [mevcut, yeni], labels: ['Mevcut', 'Simüle'], colors: ['#FFC107', '#00bcd4'], plotOptions: { pie: { donut: { size: '65%' } } }, legend: { position: 'bottom' } };
    chartLojistik = new ApexCharts(document.querySelector("#lojistik-chart"), options); chartLojistik.render();
}
function initRoiChart(yatirim, ekKar) {
    const data = []; for(let i=0; i<=12; i++) data.push(Math.max(0, yatirim - (ekKar * i)));
    const options = { ...commonOptions, chart: { ...commonOptions.chart, type: 'area' }, series: [{ name: 'Kalan Borç', data }], stroke: { curve: 'smooth' }, colors: ['#00E396'], fill: { type: 'gradient', gradient: { opacityFrom: 0.6, opacityTo: 0.1 } } };
    chartRoi = new ApexCharts(document.querySelector("#roi-chart"), options); chartRoi.render();
}
function initTrendChart() {
    const options = { ...commonOptions, chart: { ...commonOptions.chart, type: 'line', height: 250 }, series: [], stroke: { width: [3, 3, 2], dashArray: [0, 5, 0] }, colors: ['#2f81f7', '#f778ba', '#ff4560'], noData: { text: 'Analiz Bekleniyor...' } };
    chartTrend = new ApexCharts(document.querySelector("#trend-chart"), options); chartTrend.render();
}
function initIadeChart() {
    const options = { ...commonOptions, chart: { ...commonOptions.chart, type: 'bar', height: 200 }, series: [{ name: 'Tutar', data: [0, 0, 0] }], xaxis: { categories: ['Tasarruf', 'Kayıp', 'NET'] }, colors: ['#00E396', '#FF4560', '#2f81f7'], plotOptions: { bar: { distributed: true, borderRadius: 4 } } };
    chartIade = new ApexCharts(document.querySelector("#iade-chart"), options); chartIade.render();
}
function initSunucuChart() {
    const options = {
        series: [0],
        chart: { type: 'radialBar', height: 120, foreColor: '#c9d1d9', sparkline: { enabled: true } }, // Sparkline ile küçülttük
        plotOptions: {
            radialBar: {
                startAngle: -90, endAngle: 90,
                hollow: { size: '60%' },
                track: { background: '#30363d' },
                dataLabels: {
                    value: { fontSize: '14px', color: '#fff', offsetY: -10, formatter: val => val + "%" },
                    name: { show: false }
                }
            }
        },
        fill: { type: 'gradient', gradient: { shade: 'dark', type: 'horizontal', gradientToColors: ['#FF4560'], stops: [0, 100] } },
        stroke: { lineCap: 'round' }, colors: ['#00E396']
    };
    chartSunucu = new ApexCharts(document.querySelector("#sunucu-chart"), options);
    chartSunucu.render();
}

// --- SİMÜLASYON FONKSİYONLARI --- (GÜNCELLENDİ)

// GÜNCELLENDİ: Personel artık büyüme oranı alıyor
async function runPersonelSim() {
    const buyumeOrani = document.getElementById('buyumeOraniPersonel').value;
    const res = await fetch('/api/personel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyumeOrani })
    });
    const data = await res.json();
    showResult('personel-result', data.mesaj);
}

// GÜNCELLENDİ: Sunucu artık büyüme oranı alıyor
async function runSunucuSim() {
    const buyumeOrani = document.getElementById('buyumeOraniSunucu').value;
    const res = await fetch('/api/sunucu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyumeOrani })
    });
    const data = await res.json();
    chartSunucu.updateSeries([data.dolulukOrani]);
    showResult('sunucu-result', data.mesaj);
}

// DİĞERLERİ AYNI KALDI
async function runLojistikSim() {
    const res = await fetch('/api/lojistik', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ hedefKargoHizi: document.getElementById('hedefKargoHizi').value }) });
    const data = await res.json();
    chartLojistik.updateSeries([data.temelChurn * 100, data.yeniChurn * 100]);
    showResult('lojistik-result', data.mesaj);
}
async function runDepoSim() {
    const res = await fetch('/api/depo', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ yatirimMaliyeti: document.getElementById('yatirimMaliyeti').value, ekKapasite: document.getElementById('ekKapasite').value }) });
    const data = await res.json();
    chartRoi.updateSeries([{ data: Array.from({length:13}, (_, i) => Math.max(0, data.yatirimMaliyeti - (data.ekAylikNetKar * i))) }]);
    showResult('depo-result', data.mesaj);
}
async function runTrendSim() {
    document.getElementById('trend-result').style.display = 'block'; document.getElementById('trend-result').innerText = '⏳ Hesaplanıyor...';
    const res = await fetch('/api/depo-trend', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ depoKapasitesi: document.getElementById('depoKapasitesi').value }) });
    const data = await res.json();
    chartTrend.updateOptions({ xaxis: { categories: data.labels } });
    chartTrend.updateSeries([{ name: 'Gerçekleşen', data: data.historical }, { name: 'Tahmin', data: data.forecast }, { name: 'Sınır', data: new Array(data.labels.length).fill(parseInt(data.capacity)) }]);
    showResult('trend-result', data.mesaj);
}
async function runIadeSim() {
    const res = await fetch('/api/iade', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ iadeMaliyeti: document.getElementById('iadeMaliyeti').value, satisKaybiOrani: document.getElementById('satisKaybiOrani').value }) });
    const data = await res.json();
    chartIade.updateSeries([{ data: [Math.floor(data.tasarruf), Math.floor(-data.zarar), Math.floor(data.netEtki)] }]);
    showResult('iade-result', data.mesaj);
}
async function runMaliyetSim() {
    const res = await fetch('/api/maliyet', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ tasarrufBirim: document.getElementById('tasarrufBirim').value }) });
    const data = await res.json();
    document.getElementById('kazancDisplay').innerText = data.yillikKazanc.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
    showResult('maliyet-result', data.mesaj);
}

function showResult(elementId, msg) {
    const el = document.getElementById(elementId);
    el.style.display = 'block';
    el.innerHTML = msg;
    el.className = 'result-box text-white mt-2 ' + (msg.includes('🟢') || msg.includes('GÜVENLİ') ? 'bg-success bg-opacity-25 border border-success' : (msg.includes('🔵') ? 'bg-primary bg-opacity-25 border border-primary' : (msg.includes('🟡') ? 'bg-warning bg-opacity-25 border border-warning' : 'bg-danger bg-opacity-25 border border-danger')));
}

document.addEventListener('DOMContentLoaded', () => {
    initLojistikChart(5, 5); initRoiChart(100000, 44000); initTrendChart(); initIadeChart(); initSunucuChart();
});