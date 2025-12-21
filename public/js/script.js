// ==========================================
// 1. GLOBAL DEĞİŞKENLER VE AYARLAR
// ==========================================
let chartPersonel, chartLojistik, chartRoi, chartTrend, chartIade, chartSunucu;

// Ortak Grafik Tasarım Ayarları
const commonOptions = {
    chart: { 
        height: 180, 
        toolbar: { show: false }, 
        foreColor: '#c9d1d9', 
        fontFamily: 'Segoe UI, sans-serif' 
    },
    dataLabels: { enabled: false },
    grid: { borderColor: '#30363d' },
    tooltip: { theme: 'dark' }
};

// ==========================================
// 2. GRAFİK BAŞLATMA (INIT) FONKSİYONLARI
// ==========================================

function initLojistikChart(mevcut, yeni) {
    document.querySelector("#lojistik-chart").innerHTML = "";
    const options = { 
        ...commonOptions, 
        chart: { ...commonOptions.chart, type: 'donut' }, 
        series: [mevcut, yeni], 
        labels: ['Mevcut', 'Simüle'], 
        colors: ['#FFC107', '#00bcd4'], 
        plotOptions: { pie: { donut: { size: '65%' } } }, 
        legend: { position: 'bottom' } 
    };
    chartLojistik = new ApexCharts(document.querySelector("#lojistik-chart"), options); 
    chartLojistik.render();
}

function initRoiChart(yatirim, ekKar) {
    document.querySelector("#roi-chart").innerHTML = "";
    const data = [];
    const labels = [];
    for(let i=0; i<=12; i++) {
        data.push(Math.max(0, yatirim - (ekKar * i)));
        labels.push(i === 0 ? 'Başlangıç' : i + '. Ay');
    }
    const options = {
        ...commonOptions,
        chart: { ...commonOptions.chart, type: 'area' },
        series: [{ name: 'Kalan Maliyet', data: data }],
        stroke: { curve: 'smooth', width: 3 },
        colors: ['#00E396'],
        fill: { type: 'gradient', gradient: { opacityFrom: 0.6, opacityTo: 0.1 } },
        xaxis: {
            categories: labels,
            labels: { style: { colors: '#8b949e', fontSize: '11px' }, rotate: -45 }
        },
        yaxis: {
            title: { text: 'Kalan Yatırım Tutarı (TL)', style: { color: '#c9d1d9', fontSize: '12px' } },
            labels: { formatter: function (val) { return val.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' ₺'; }, style: { colors: '#8b949e' } }
        }
    };
    chartRoi = new ApexCharts(document.querySelector("#roi-chart"), options);
    chartRoi.render();
}

function initTrendChart() {
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
    document.querySelector("#iade-chart").innerHTML = "";
    const options = { 
        ...commonOptions, 
        chart: { ...commonOptions.chart, type: 'bar', height: 200 }, 
        series: [{ name: 'Tutar', data: [0, 0, 0] }], 
        xaxis: { categories: ['Lojistik Tasarrufu', 'Satış Kaybı', 'NET ETKİ'] }, 
        colors: ['#00E396', '#FF4560', '#2f81f7'], 
        plotOptions: { bar: { distributed: true, borderRadius: 4 } } 
    };
    chartIade = new ApexCharts(document.querySelector("#iade-chart"), options); 
    chartIade.render();
}

function initSunucuChart() {
    document.querySelector("#sunucu-chart").innerHTML = "";
    const options = {
        series: [0],
        chart: { type: 'radialBar', height: 120, foreColor: '#c9d1d9', sparkline: { enabled: true } }, 
        plotOptions: {
            radialBar: {
                startAngle: -90, endAngle: 90,
                hollow: { size: '60%' },
                track: { background: '#30363d' },
                dataLabels: { value: { fontSize: '14px', color: '#fff', offsetY: -10, formatter: val => val + "%" }, name: { show: false } }
            }
        },
        fill: { type: 'gradient', gradient: { shade: 'dark', type: 'horizontal', gradientToColors: ['#FF4560'], stops: [0, 100] } },
        stroke: { lineCap: 'round' }, colors: ['#00E396']
    };
    chartSunucu = new ApexCharts(document.querySelector("#sunucu-chart"), options);
    chartSunucu.render();
}

// ==========================================
// 3. SİMÜLASYON API FONKSİYONLARI
// ==========================================

async function runTrendSim() {
    const trendResultBox = document.getElementById('trend-result');
    trendResultBox.style.display = 'block'; 
    trendResultBox.innerHTML = '<span class="text-warning"><i class="fas fa-spinner fa-spin"></i> Hesaplanıyor...</span>';
    trendResultBox.className = 'result-box bg-dark border border-secondary text-white'; 

    try {
        const depoInput = document.getElementById('depoKapasitesi');
        const res = await fetch('/api/depo-trend', { 
            method: 'POST', 
            headers: {'Content-Type':'application/json'}, 
            body: JSON.stringify({ depoKapasitesi: depoInput.value }) 
        });
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

        if (data.buyumeYuzdesi) {
            const inputs = ['buyumeOraniPersonel', 'buyumeOraniSunucu'];
            inputs.forEach(id => {
                const el = document.getElementById(id);
                if(el) {
                    el.value = data.buyumeYuzdesi;
                    el.style.backgroundColor = 'rgba(47, 129, 247, 0.3)';
                    setTimeout(() => { el.style.backgroundColor = ''; }, 800);
                }
            });
        }
    } catch (err) { console.error("Trend Hatası:", err); }
}

// --- PERSONEL/FULFILLMENT STRATEJİSİ (GÜNCELLENDİ) ---
async function runPersonelSim() {
    const buyumeOrani = document.getElementById('buyumeOraniPersonel').value;
    const resultBox = document.getElementById('personel-result');
    
    // UX: Yükleniyor efekti
    resultBox.style.display = 'block';
    resultBox.innerHTML = '<span class="text-secondary"><i class="fa-solid fa-circle-notch fa-spin"></i> Analiz ediliyor...</span>';
    resultBox.className = 'result-box bg-dark border border-secondary text-white';

    try {
        const res = await fetch('/api/personel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ buyumeOrani })
        });
        const data = await res.json();
        showResult('personel-result', data.mesaj);
    } catch (err) {
        console.error("Personel Hata:", err);
        resultBox.innerHTML = "Bağlantı hatası.";
    }
}

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

async function runDepoSim() {
    const res = await fetch('/api/depo', { 
        method: 'POST', 
        headers: {'Content-Type':'application/json'}, 
        body: JSON.stringify({ 
            yatirimMaliyeti: document.getElementById('yatirimMaliyeti').value, 
            ekKapasite: document.getElementById('ekKapasite').value 
        }) 
    });
    const data = await res.json();
    if(chartRoi) {
        const newData = Array.from({length:13}, (_, i) => Math.max(0, data.yatirimMaliyeti - (data.ekAylikNetKar * i)));
        chartRoi.updateSeries([{ data: newData }]);
    }
    showResult('depo-result', data.mesaj);
}

async function runIadeSim() {
    const musteriUcreti = document.getElementById('musteriUcreti').value;
    try {
        const res = await fetch('/api/iade', { 
            method: 'POST', 
            headers: {'Content-Type':'application/json'}, 
            body: JSON.stringify({ musteriUcreti }) 
        });
        const data = await res.json();
        if (data.error) { alert(data.error); return; }
        if(chartIade) {
            chartIade.updateSeries([{ 
                name: 'Tutar (TL)', 
                data: [Math.floor(data.tasarruf), Math.floor(data.zarar), Math.floor(data.netEtki)] 
            }]);
        }
        showResult('iade-result', data.mesaj);
    } catch (err) { console.error("İade Simülasyon Hatası:", err); }
}

async function runLojistikSim() {
    const res = await fetch('/api/lojistik', { 
        method: 'POST', 
        headers: {'Content-Type':'application/json'}, 
        body: JSON.stringify({ hedefKargoHizi: document.getElementById('hedefKargoHizi').value }) 
    });
    const data = await res.json();
    if(chartLojistik) chartLojistik.updateSeries([data.temelChurn * 100, data.yeniChurn * 100]);
    showResult('lojistik-result', data.mesaj);
}

async function runMaliyetSim() {
    const res = await fetch('/api/maliyet', { 
        method: 'POST', 
        headers: {'Content-Type':'application/json'}, 
        body: JSON.stringify({ tasarrufBirim: document.getElementById('tasarrufBirim').value }) 
    });
    const data = await res.json();
    document.getElementById('kazancDisplay').innerText = data.yillikKazanc.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
    showResult('maliyet-result', data.mesaj);
}

// ==========================================
// 4. PARAMETRE YÖNETİMİ (REVİZE EDİLDİ)
// ==========================================

async function parametreleriKaydet() {
    const btn = document.querySelector('#parametreModal .btn-info');
    const originalText = btn.innerHTML;
    
    // YENİ INPUT DEĞERLERİNİ AL (Dashboard'daki yeni ID'ler)
    const depoSabitGider = document.getElementById('inputDepoSabitGider').value;
    const depoPersonelGideri = document.getElementById('inputDepoPersonelGideri').value;
    const ucplBirimMaliyet = document.getElementById('inputUcplBirimMaliyet').value;
    const iadeKargoMaliyeti = document.getElementById('inputIadeKargoMaliyeti').value;
    const sunucuKapasitesi = document.getElementById('inputSunucuKapasitesi').value;

    // Basit Validasyon
    if (!depoSabitGider || !depoPersonelGideri || !ucplBirimMaliyet || !iadeKargoMaliyeti) {
        alert("Lütfen tüm alanları doldurunuz!");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Kaydediliyor...';

    try {
        const res = await fetch('/api/parametre-guncelle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                depoSabitGider, 
                depoPersonelGideri, 
                ucplBirimMaliyet, 
                iadeKargoMaliyeti, 
                sunucuKapasitesi 
            }) 
        });
        
        const data = await res.json();
        
        if (data.success) {
            const modalEl = document.getElementById('parametreModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
            
            alert("✅ Ayarlar güncellendi!");

            // Etkilenen simülasyonları anında yenile
            if(document.getElementById('musteriUcreti').value) runIadeSim();
            if(document.getElementById('buyumeOraniPersonel').value) runPersonelSim();
            if(document.getElementById('buyumeOraniSunucu').value) runSunucuSim();

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

async function loadParameters() {
    try {
        const res = await fetch('/api/parametre-getir');
        const data = await res.json();
        
        // Yeni inputları veritabanından gelen verilerle doldur
        // Not: Controller'da "depo_sabit_gider" olarak dönüyoruz
        document.getElementById('inputDepoSabitGider').value = data.depo_sabit_gider;
        document.getElementById('inputDepoPersonelGideri').value = data.depo_personel_gideri;
        document.getElementById('inputUcplBirimMaliyet').value = data.ucpl_birim_maliyet;
        document.getElementById('inputIadeKargoMaliyeti').value = data.iade_kargo_maliyeti;
        document.getElementById('inputSunucuKapasitesi').value = data.sunucu_kapasitesi;
        
    } catch (err) {
        console.error("Parametreler çekilemedi:", err);
    }
}

// ==========================================
// 5. CANLI OPERASYON
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
                <td class="text-end">${getNextActionBtn(s.id, s.durum)}</td>
            </tr>
        `).join('');
    } catch (err) { console.error("Liste hatası:", err); }
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
    let next='', txt='', cls='btn-outline-secondary', ico='fa-arrow-right';
    if(durum === 'Bekliyor') { next='Onaylandı'; txt='Onayla'; cls='btn-outline-info'; ico='fa-check'; }
    else if(durum === 'Onaylandı') { next='Hazırlanıyor'; txt='Hazırla'; cls='btn-outline-warning'; ico='fa-box-open'; }
    else if(durum === 'Hazırlanıyor') { next='Kargoda'; txt='Kargola'; cls='btn-outline-primary'; ico='fa-truck'; }
    else if(durum === 'Kargoda') { next='Teslim Edildi'; txt='Teslim Et'; cls='btn-outline-success'; ico='fa-handshake'; }
    else return '<span class="text-success small"><i class="fa-solid fa-circle-check"></i> Tamamlandı</span>';
    return `<button class="btn btn-sm ${cls} py-0 px-2" style="font-size: 0.75rem;" onclick="durumDegistir(${id}, '${next}')">${txt} <i class="fa-solid ${ico} ms-1"></i></button>`;
}

async function yeniSiparisYarat() {
    const btn = document.querySelector('button[onclick="yeniSiparisYarat()"]');
    const originalContent = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    try { await fetch('/api/simulasyon/olustur', { method: 'POST' }); await siparisleriGetir(); } catch (err) { alert("Sipariş oluşturulamadı!"); } finally { btn.disabled = false; btn.innerHTML = originalContent; }
}

async function durumDegistir(id, yeniDurum) {
    try { await fetch('/api/simulasyon/guncelle', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id, yeniDurum }) }); await siparisleriGetir(); } catch (err) { console.error(err); }
}

function showResult(elementId, msg) {
    const el = document.getElementById(elementId);
    if(el) {
        el.style.display = 'block';
        el.innerHTML = msg;
        el.className = 'result-box text-white mt-2 ' + 
            (msg.includes('🟢') || msg.includes('OPTIMAL') || msg.includes('STRATEJİ') ? 'bg-success bg-opacity-25 border border-success' : 
            (msg.includes('🔵') ? 'bg-primary bg-opacity-25 border border-primary' : 
            (msg.includes('🟡') ? 'bg-warning bg-opacity-25 border border-warning' : 
            'bg-danger bg-opacity-25 border border-danger')));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initTrendChart(); initLojistikChart(5, 5); initRoiChart(100000, 44000); initIadeChart(); initSunucuChart();
    siparisleriGetir();
    const modalEl = document.getElementById('parametreModal');
    if(modalEl) { modalEl.addEventListener('show.bs.modal', loadParameters); }
});