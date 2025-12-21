// Basit yardımcılar
const fmtTL = (v) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v || 0);
const percent = (v) => `${(v ?? 0)}%`;

// Grafik referansları
let charts = {
    dolulukTrend: null,
    gelirTrend: null,
    tahminAralik: null,
    senaryo: null,
    risk: null,
};

async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API hata: ${res.status}`);
    return res.json();
}

// KPI’lar
async function loadKpis() {
    try {
        const data = await fetchJSON('/api/dashboard/kpis');
        setKpi('kpiDoluluk', 'kpiDolulukDelta', data.doluluk);
        setKpi('kpiGelir', 'kpiGelirDelta', data.gelir, true);
        setKpi('kpiKarMarji', 'kpiKarMarjiDelta', data.kar_marji);
        setKpi('kpiIptal', 'kpiIptalDelta', data.iptal);
    } catch (e) {
        console.error('KPI yükleme hatası', e);
    }
}

function setKpi(valId, deltaId, item, money = false) {
    if (!item) return;
    const valEl = document.getElementById(valId);
    const deltaEl = document.getElementById(deltaId);
    if (valEl) valEl.innerText = money ? fmtTL(item.value) : percent(item.value);
    if (deltaEl) {
        const renk = item.trend === 'up' ? 'success' : (item.trend === 'down' ? 'danger' : 'secondary');
        deltaEl.className = `badge bg-${renk}-subtle text-${renk}`;
        deltaEl.innerText = item.delta != null ? `${item.delta > 0 ? '+' : ''}${item.delta}${money ? '' : '%'}` : '-';
    }
}

// Trend grafikleri
async function loadTrends(months) {
    const data = await fetchJSON(`/api/dashboard/trends?months=${months}`);
    drawDolulukTrend(data.doluluk || []);
    drawGelirTrend(data.gelir || []);
}

function drawDolulukTrend(rows) {
    const ctx = document.getElementById('dolulukTrendChart');
    if (!ctx) return;
    if (charts.dolulukTrend) charts.dolulukTrend.destroy();
    charts.dolulukTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: rows.map(r => r.ay),
            datasets: [{
                label: 'Doluluk (%)',
                data: rows.map(r => r.doluluk || 0),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59,130,246,0.15)',
                fill: true,
                tension: 0.35
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true,max:100}} }
    });
}

function drawGelirTrend(rows) {
    const ctx = document.getElementById('gelirTrendChart');
    if (!ctx) return;
    if (charts.gelirTrend) charts.gelirTrend.destroy();
    charts.gelirTrend = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: rows.map(r => r.ay),
            datasets: [{
                label: 'Gelir (TL)',
                data: rows.map(r => r.gelir || 0),
                backgroundColor: '#10b981'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}} }
    });
}

// Tahmin aralığı (band chart)
async function loadForecast(months) {
    const data = await fetchJSON(`/api/dashboard/risk?months=${months}`);
    drawTahminAralik(data.tahmin || []);
    drawRisk(data.risk || []);
}

function drawTahminAralik(rows) {
    const ctx = document.getElementById('tahminAralikChart');
    if (!ctx) return;
    if (charts.tahminAralik) charts.tahminAralik.destroy();
    const labels = rows.map(r => r.ay);
    charts.tahminAralik = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Doluluk Min',
                    data: rows.map(r => r.doluluk?.min ?? null),
                    borderColor: '#22c55e',
                    fill: '+1',
                    backgroundColor: 'rgba(34,197,94,0.15)',
                    tension: 0.3
                },
                {
                    label: 'Doluluk Max',
                    data: rows.map(r => r.doluluk?.max ?? null),
                    borderColor: '#16a34a',
                    fill: false,
                    tension: 0.3
                },
                {
                    label: 'Gelir Min',
                    data: rows.map(r => r.gelir?.min ?? null),
                    borderColor: '#3b82f6',
                    fill: false,
                    tension: 0.3
                },
                {
                    label: 'Gelir Max',
                    data: rows.map(r => r.gelir?.max ?? null),
                    borderColor: '#1d4ed8',
                    fill: false,
                    tension: 0.3
                }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// Senaryo grafiği
async function loadScenario(type) {
    const data = await fetchJSON(`/api/dashboard/senaryo?type=${type}`);
    drawSenaryo(data);
}

function drawSenaryo(data) {
    const ctx = document.getElementById('senaryoChart');
    if (!ctx) return;
    if (charts.senaryo) charts.senaryo.destroy();
    const labels = ['İyimser', 'Gerçekçi', 'Kötümser'];
    charts.senaryo = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Net Kâr (TL)',
                data: [data?.optimistic?.kar, data?.realistic?.kar, data?.pessimistic?.kar],
                backgroundColor: ['#22c55e', '#0ea5e9', '#ef4444']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins:{legend:{display:false}} }
    });
}

// Risk grafiği
function drawRisk(rows) {
    const ctx = document.getElementById('riskChart');
    if (!ctx) return;
    if (charts.risk) charts.risk.destroy();
    charts.risk = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: rows.map(r => r.ay),
            datasets: [{
                label: 'Risk Skoru',
                data: rows.map(r => r.risk_skoru || 0),
                backgroundColor: rows.map(r => r.risk_skoru > 60 ? '#ef4444' : r.risk_skoru > 30 ? '#f59e0b' : '#22c55e')
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true,max:100}} }
    });
}

// Başlat
async function initDashboard() {
    const monthSel = document.getElementById('monthSelector');
    const scenSel = document.getElementById('scenarioSelector');
    const loadAll = () => {
        const months = monthSel.value;
        const scen = scenSel.value;
        loadKpis();
        loadTrends(months);
        loadForecast(months);
        loadScenario(scen);
    };
    monthSel.addEventListener('change', loadAll);
    scenSel.addEventListener('change', loadAll);
    loadAll();
}

document.addEventListener('DOMContentLoaded', initDashboard);

