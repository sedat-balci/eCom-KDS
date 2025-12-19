// --- GLOBAL DEĞİŞKENLER ---
let chartPersonel, chartLojistik, chartRoi, chartTrend, chartIade, chartSunucu;

// Ortak Grafik Ayarları
const commonOptions = {
    chart: { height: 180, toolbar: { show: false }, foreColor: '#c9d1d9', fontFamily: 'sans-serif' },
    dataLabels: { enabled: false },
    grid: { borderColor: '#30363d' },
    tooltip: { theme: 'dark' }
};

// --- INIT FONKSİYONLARI (BAŞLATMA) ---

function initLojistikChart(mevcut, yeni) {
    // ÖNCE TEMİZLİK (Dublörleşmeyi önler)
    document.querySelector("#lojistik-chart").innerHTML = "";
    
    const options = { ...commonOptions, chart: { ...commonOptions.chart, type: 'donut' }, series: [mevcut, yeni], labels: ['Mevcut', 'Simüle'], colors: ['#FFC107', '#00bcd4'], plotOptions: { pie: { donut: { size: '65%' } } }, legend: { position: 'bottom' } };
    chartLojistik = new ApexCharts(document.querySelector("#lojistik-chart"), options); chartLojistik.render();
}

function initRoiChart(yatirim, ekKar) {
    // ÖNCE TEMİZLİK
    document.querySelector("#roi-chart").innerHTML = "";

    const data = []; for(let i=0; i<=12; i++) data.push(Math.max(0, yatirim - (ekKar * i)));
    const options = { ...commonOptions, chart: { ...commonOptions.chart, type: 'area' }, series: [{ name: 'Kalan Borç', data }], stroke: { curve: 'smooth' }, colors: ['#00E396'], fill: { type: 'gradient', gradient: { opacityFrom: 0.6, opacityTo: 0.1 } } };
    chartRoi = new ApexCharts(document.querySelector("#roi-chart"), options); chartRoi.render();
}

function initTrendChart() {
    // ÖNCE TEMİZLİK
    document.querySelector("#trend-chart").innerHTML = "";

    const options = { 
        ...commonOptions, 
        chart: { ...commonOptions.chart, type: 'line', height: 250 }, 
        series: [], 
        stroke: { width: [3, 3, 2], dashArray: [0, 5, 0] }, 
        colors: ['#2f81f7', '#f778ba', '#ff4560'], 
        noData: { text: 'Analiz Bekleniyor...' } 
    };
    chartTrend = new ApexCharts(document.querySelector("#trend-chart"), options); 
    chartTrend.render();
}

function initIadeChart() {
    // ÖNCE TEMİZLİK
    document.querySelector("#iade-chart").innerHTML = "";

    const options = { ...commonOptions, chart: { ...commonOptions.chart, type: 'bar', height: 200 }, series: [{ name: 'Tutar', data: [0, 0, 0] }], xaxis: { categories: ['Tasarruf', 'Kayıp', 'NET'] }, colors: ['#00E396', '#FF4560', '#2f81f7'], plotOptions: { bar: { distributed: true, borderRadius: 4 } } };
    chartIade = new ApexCharts(document.querySelector("#iade-chart"), options); chartIade.render();
}

function initSunucuChart() {
    // ÖNCE TEMİZLİK
    document.querySelector("#sunucu-chart").innerHTML = "";

    const options = {
        series: [0],
        chart: { type: 'radialBar', height: 120, foreColor: '#c9d1d9', sparkline: { enabled: true } }, 
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

// ==========================================
// SİMÜLASYON API FONKSİYONLARI
// ==========================================

// 1. TREND SİMÜLASYONU
async function runTrendSim() {
    const trendResultBox = document.getElementById('trend-result');
    trendResultBox.style.display = 'block'; 
    trendResultBox.innerHTML = '<span class="text-warning"><i class="fas fa-spinner fa-spin"></i> Hesaplanıyor...</span>';
    trendResultBox.className = 'result-box bg-dark border border-secondary text-white'; 

    try {
        const depoInput = document.getElementById('depoKapasitesi');
        if(!depoInput) throw new Error("Kapasite giriş kutusu bulunamadı!");

        const res = await fetch('/api/depo-trend', { 
            method: 'POST', 
            headers: {'Content-Type':'application/json'}, 
            body: JSON.stringify({ depoKapasitesi: depoInput.value }) 
        });

        if (!res.ok) throw new Error(`Sunucu Hatası: ${res.status}`);
        const data = await res.json();
        
        if (chartTrend) {
            chartTrend.updateOptions({ xaxis: { categories: data.labels } });
            chartTrend.updateSeries([
                { name: 'Gerçekleşen', data: data.historical }, 
                { name: 'Tahmin', data: data.forecast }, 
                { name: 'Sınır', data: new Array(data.labels.length).fill(parseInt(data.capacity)) }
            ]);
        }
        
        showResult('trend-result', data.mesaj);

        // OTOMASYON
        if (data.buyumeYuzdesi) {
            const personelInput = document.getElementById('buyumeOraniPersonel');
            if(personelInput) {
                personelInput.value = data.buyumeYuzdesi;
                personelInput.style.backgroundColor = 'rgba(47, 129, 247, 0.3)';
                setTimeout(() => { personelInput.style.backgroundColor = ''; }, 800);
            }
            const sunucuInput = document.getElementById('buyumeOraniSunucu');
            if(sunucuInput) {
                sunucuInput.value = data.buyumeYuzdesi;
                sunucuInput.style.backgroundColor = 'rgba(47, 129, 247, 0.3)';
                setTimeout(() => { sunucuInput.style.backgroundColor = ''; }, 800);
            }
        }

    } catch (err) {
        console.error("Trend Hatası:", err);
        trendResultBox.innerHTML = `<span class="text-danger"><i class="fas fa-exclamation-triangle"></i> Hata: ${err.message}</span>`;
        trendResultBox.className = 'result-box bg-danger bg-opacity-25 border border-danger text-white mt-2';
    }
}

// 2. PERSONEL SİMÜLASYONU
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

// 3. SUNUCU SİMÜLASYONU
async function runSunucuSim() {
    const buyumeOrani = document.getElementById('buyumeOraniSunucu').value;
    const res = await fetch('/api/sunucu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyumeOrani })
    });
    const data = await res.json();
    if(chartSunucu) chartSunucu.updateSeries([data.dolulukOrani]);
    showResult('sunucu-result', data.mesaj);
}

// 4. PARAMETRE GÜNCELLEME
async function parametreleriKaydet() {
    const btn = document.querySelector('#parametreModal .btn-info');
    const originalText = btn.innerHTML;
    
    const personelMaliyeti = document.getElementById('inputPersonelMaliyeti').value;
    const mesaiUcreti = document.getElementById('inputMesaiUcreti').value;
    const sunucuKapasitesi = document.getElementById('inputSunucuKapasitesi').value; 

    if (!personelMaliyeti || !mesaiUcreti || !sunucuKapasitesi) {
        alert("Lütfen tüm alanları doldurunuz!");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Kaydediliyor...';

    try {
        const res = await fetch('/api/parametre-guncelle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ personelMaliyeti, mesaiUcreti, sunucuKapasitesi }) 
        });
        
        const data = await res.json();
        
        if (data.success) {
            const modalEl = document.getElementById('parametreModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
            
            alert("✅ Parametreler başarıyla güncellendi!");

            const mevcutGirdi = document.getElementById('buyumeOraniPersonel').value;
            if (mevcutGirdi) runPersonelSim();
            
            const sunucuGirdi = document.getElementById('buyumeOraniSunucu').value;
            if(sunucuGirdi) runSunucuSim();

        } else {
            alert("Hata: " + data.message);
        }
    } catch (err) {
        console.error(err);
        alert("Sunucu bağlantı hatası!");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// DİĞER SİMÜLASYONLAR
async function runLojistikSim() {
    const res = await fetch('/api/lojistik', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ hedefKargoHizi: document.getElementById('hedefKargoHizi').value }) });
    const data = await res.json();
    if(chartLojistik) chartLojistik.updateSeries([data.temelChurn * 100, data.yeniChurn * 100]);
    showResult('lojistik-result', data.mesaj);
}
async function runDepoSim() {
    const res = await fetch('/api/depo', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ yatirimMaliyeti: document.getElementById('yatirimMaliyeti').value, ekKapasite: document.getElementById('ekKapasite').value }) });
    const data = await res.json();
    if(chartRoi) chartRoi.updateSeries([{ data: Array.from({length:13}, (_, i) => Math.max(0, data.yatirimMaliyeti - (data.ekAylikNetKar * i))) }]);
    showResult('depo-result', data.mesaj);
}
async function runIadeSim() {
    const res = await fetch('/api/iade', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ iadeMaliyeti: document.getElementById('iadeMaliyeti').value, satisKaybiOrani: document.getElementById('satisKaybiOrani').value }) });
    const data = await res.json();
    if(chartIade) chartIade.updateSeries([{ data: [Math.floor(data.tasarruf), Math.floor(-data.zarar), Math.floor(data.netEtki)] }]);
    showResult('iade-result', data.mesaj);
}
async function runMaliyetSim() {
    const res = await fetch('/api/maliyet', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ tasarrufBirim: document.getElementById('tasarrufBirim').value }) });
    const data = await res.json();
    document.getElementById('kazancDisplay').innerText = data.yillikKazanc.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
    showResult('maliyet-result', data.mesaj);
}

// YARDIMCI FONKSİYONLAR
function showResult(elementId, msg) {
    const el = document.getElementById(elementId);
    if(el) {
        el.style.display = 'block';
        el.innerHTML = msg;
        el.className = 'result-box text-white mt-2 ' + (msg.includes('🟢') || msg.includes('GÜVENLİ') ? 'bg-success bg-opacity-25 border border-success' : (msg.includes('🔵') ? 'bg-primary bg-opacity-25 border border-primary' : (msg.includes('🟡') ? 'bg-warning bg-opacity-25 border border-warning' : 'bg-danger bg-opacity-25 border border-danger')));
    }
}

// ==========================================
// CANLI OPERASYON SİMÜLATÖRÜ
// ==========================================

async function siparisleriGetir() {
    try {
        const res = await fetch('/api/simulasyon/liste');
        const siparisler = await res.json();
        
        const tbody = document.getElementById('siparisListesiBody');
        if(!tbody) return;

        tbody.innerHTML = siparisler.map(s => `
            <tr>
                <td><span class="text-muted">#${s.id}</span></td>
                <td><span class="fw-bold text-white">${s.ad_soyad}</span></td>
                <td><small class="text-secondary">${s.saat}</small></td>
                <td>${s.toplam_tutar} ₺</td>
                <td><span class="badge ${getDurumRenk(s.durum)}">${s.durum}</span></td>
                <td class="text-end">
                    ${getNextActionBtn(s.id, s.durum)}
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error("Liste hatası:", err);
    }
}

function getDurumRenk(durum) {
    if(durum === 'Bekliyor') return 'bg-secondary bg-opacity-50 text-light';
    if(durum === 'Onaylandı') return 'bg-info text-dark';
    if(durum === 'Hazırlanıyor') return 'bg-warning text-dark';
    if(durum === 'Kargoda') return 'bg-primary';
    if(durum === 'Teslim Edildi') return 'bg-success';
    return 'bg-dark';
}

function getNextActionBtn(id, durum) {
    let nextDurum = '', btnText = '', btnClass = 'btn-outline-secondary', icon = 'fa-arrow-right';

    if(durum === 'Bekliyor') { nextDurum = 'Onaylandı'; btnText = 'Onayla'; btnClass='btn-outline-info'; icon='fa-check'; }
    else if(durum === 'Onaylandı') { nextDurum = 'Hazırlanıyor'; btnText = 'Hazırla'; btnClass='btn-outline-warning'; icon='fa-box-open'; }
    else if(durum === 'Hazırlanıyor') { nextDurum = 'Kargoda'; btnText = 'Kargola'; btnClass='btn-outline-primary'; icon='fa-truck'; }
    else if(durum === 'Kargoda') { nextDurum = 'Teslim Edildi'; btnText = 'Teslim Et'; btnClass='btn-outline-success'; icon='fa-handshake'; }
    else return '<span class="text-success small"><i class="fa-solid fa-circle-check"></i> Tamamlandı</span>';

    return `<button class="btn btn-sm ${btnClass} py-0 px-2" style="font-size: 0.75rem;" onclick="durumDegistir(${id}, '${nextDurum}')">${btnText} <i class="fa-solid ${icon} ms-1"></i></button>`;
}

async function yeniSiparisYarat() {
    const btn = document.querySelector('button[onclick="yeniSiparisYarat()"]');
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
        await fetch('/api/simulasyon/olustur', { method: 'POST' });
        await siparisleriGetir(); 
    } catch (err) { alert("Sipariş oluşturulamadı!"); } 
    finally { btn.disabled = false; btn.innerHTML = originalContent; }
}

async function durumDegistir(id, yeniDurum) {
    try {
        await fetch('/api/simulasyon/guncelle', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id, yeniDurum }) });
        await siparisleriGetir();
    } catch (err) { console.error(err); }
}

// --- BAŞLATICI ---
document.addEventListener('DOMContentLoaded', () => {
    initTrendChart(); 
    initLojistikChart(5, 5); 
    initRoiChart(100000, 44000); 
    initIadeChart(); 
    initSunucuChart();
    
    // Simülasyon Listesini Çek
    siparisleriGetir();
});