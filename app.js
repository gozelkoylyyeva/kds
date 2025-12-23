if (!localStorage.getItem('girisYapildi')) window.location.href = '/login.html';
const formatPara = (s) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(s);
const RENKLER = ['#e74c3c', '#f1c40f', '#9b59b6', '#3498db', '#1abc9c', '#e67e22', '#34495e', '#7f8c8d'];

window.sayfaDegistir = function(id, el) { 
    document.querySelectorAll('.page-section').forEach(s => { 
        s.style.display = 'none'; 
        s.classList.remove('active'); 
    }); 
    const sayfa = document.getElementById(id);
    if(sayfa) {
        sayfa.style.display = 'block';
        sayfa.classList.add('active');
    }
    document.querySelectorAll('.menu-link').forEach(l => l.classList.remove('active')); 
    if(el) el.classList.add('active'); 
    localStorage.setItem('sonAcilanSayfa', id); 
    
    // Genel Bakış sayfası açıldığında grafikleri ve tahminleri yükle
    if(id === 'sayfa-ozet') {
        setTimeout(() => {
            // Ana dashboard grafikleri
            grafigiCiz();
            mevsimAnaliziCiz();
            // KPI'lar ve Öneriler
            gelismisKPILeriYukle();
            onerileriYukle();
            // Tahminler ve Analizler
            rakipFiyatAnaliziYukle();
            fiyatStratejisiYukle(6);
            gelirKarTahminiYukle(6);
            personelIhtiyaciYukle();
            gelecekRiskAnaliziYukle(6);
            senaryoAnaliziYukle(6);
        }, 300);
    }
    
    // Aylık rapor sayfası açıldığında raporu yükle
    if(id === 'sayfa-rapor') {
        setTimeout(async () => {
            // Önce ay listesini doldur, sonra en güncel raporu yükle
            await aylikRaporAyListesiDoldur();
            const aySecici = document.getElementById('aylikRaporAySecici');
            if (aySecici) aylikRaporuYukle(aySecici.value);
        }, 300);
    }
    
    // Strateji Simülatörü sayfası açıldığında grafikleri ve analytics'i yükle
    if(id === 'sayfa-simulasyon') {
        setTimeout(() => {
            // Detaylı analiz grafiklerini yükle
            kararDestekGrafikleriniYukle();
            
            // Taslak arayüzünü ekle
            if(typeof simulasyonTaslakArayuzuEkle === 'function') simulasyonTaslakArayuzuEkle();
            
            // Tab değiştiğinde analytics'i yükle
            const analyticsTab = document.getElementById('tab-analytics');
            if(analyticsTab) {
                analyticsTab.addEventListener('shown.bs.tab', () => {
                    window.analyticsSimulasyonGuncelle();
                });
            }
        }, 300);
    }
    
    setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 100); 
};
window.cikisYap = function() { localStorage.removeItem('girisYapildi'); window.location.href = '/login.html'; };
window.excelIndir = async function() { alert("Rapor hazırlanıyor..."); };

document.addEventListener('DOMContentLoaded', () => {
    try { 
        // Genel, sayfadan bağımsız yüklemeler
        verileriGetir(); 
        dovizKurlariniGetir(); 
        updateClock();
        setInterval(updateClock, 1000);
        
        // Kayıtlı senaryo listesini her zaman yükle
        senaryoListesiniGetir();
        
        // Son açılan sayfayı yükle veya varsayılan olarak Genel Bakış'ı aç
        const sonSayfaId = localStorage.getItem('sonAcilanSayfa') || 'sayfa-ozet';
        const menuLink = document.querySelector(`.menu-link[onclick*="'${sonSayfaId}'"]`);
        
        // sayfaDegistir fonksiyonu ilgili sayfanın tüm verilerini zaten yüklüyor.
        window.sayfaDegistir(sonSayfaId, menuLink);

        // Strateji Simülatörü - Fiyat Değişimi Slider/Input senkronizasyonu
        const slider = document.getElementById('fiyatDegisimiSlider');
        const input = document.getElementById('fiyatDegisimiInput');
        const label = document.getElementById('fiyatDegisimiLabel');

        if (slider && input && label) {
            const syncValues = (source) => {
                const value = source.value;
                slider.value = value;
                input.value = value;
                label.textContent = `${value}%`;
            };
            slider.addEventListener('input', () => syncValues(slider));
            input.addEventListener('input', () => syncValues(input));
        }
        
        // Strateji Simülatörü - Pazarlama Bütçesi Slider/Input senkronizasyonu
        const pSlider = document.getElementById('pazarlamaButcesiSlider');
        const pInput = document.getElementById('pazarlamaButcesiInput');
        const pLabel = document.getElementById('pazarlamaButcesiLabel');

        if (pSlider && pInput && pLabel) {
            const syncPValues = (source) => {
                const value = source.value;
                pSlider.value = value;
                pInput.value = value;
                pLabel.textContent = formatPara(value);
            };
            pSlider.addEventListener('input', () => syncPValues(pSlider));
            pInput.addEventListener('input', () => syncPValues(pInput));
        }
        
        // Strateji Simülatörü - Personel Sayısı Slider/Input senkronizasyonu
        const perSlider = document.getElementById('personelSayisiSlider');
        const perInput = document.getElementById('personelSayisiInput');
        const perLabel = document.getElementById('personelSayisiLabel');

        if (perSlider && perInput && perLabel) {
            const syncPerValues = (source) => {
                const value = source.value;
                perSlider.value = value;
                perInput.value = value;
                perLabel.textContent = value;
            };
            perSlider.addEventListener('input', () => syncPerValues(perSlider));
            perInput.addEventListener('input', () => syncPerValues(perInput));
        }
        
    } catch(e) { console.error("Sayfa başlatma hatası:", e); }
});

function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeEl = document.getElementById('currentTime');
    if (timeEl) timeEl.innerHTML = `${dateStr} - ${timeStr}`;
}

window.dovizDetayAc = async function(kod, isim) { 
    new bootstrap.Modal(document.getElementById('dovizModal')).show(); 
    document.getElementById('dovizModalBaslik').innerHTML = `<i class="fas fa-chart-line text-warning me-2"></i> ${isim} (${kod}) - Son 3 Ay`; 
    const ctx = document.getElementById('dovizDetayGrafigi'); if (window.dovizChart instanceof Chart) window.dovizChart.destroy(); 
    let data = [];
    try { const res = await fetch(`/api/doviz-gecmis/${kod}`); if(res.ok) data = await res.json(); else throw new Error("API Hatası"); } catch(e) {
        let baz = (kod === 'USD') ? 34.20 : (kod === 'EUR') ? 36.50 : 2900; const bugun = new Date(); for (let i = 90; i >= 0; i--) { const d = new Date(); d.setDate(bugun.getDate() - i); baz = baz * (1 + (Math.random() * 0.04 - 0.02)); data.push({ tarih: d.toISOString().split('T')[0], deger: baz.toFixed(2) }); }
    }
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300); gradient.addColorStop(0, 'rgba(250, 204, 21, 0.5)'); gradient.addColorStop(1, 'rgba(250, 204, 21, 0)'); 
    window.dovizChart = new Chart(ctx, { type: 'line', data: { labels: data.map(d => d.tarih), datasets: [{ label: `${kod} Kuru`, data: data.map(d => d.deger), borderColor: '#facc15', backgroundColor: gradient, borderWidth: 2, pointRadius: 0, fill: true, tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, interaction: { mode: 'nearest', axis: 'x', intersect: false }, scales: { x: { ticks: { color: '#bdc3c7' }, grid: { display:false } }, y: { ticks: { color: '#bdc3c7' }, grid: { color: '#34495e' } } } } }); 
};

// Senaryo listesini çek ve göster
async function senaryoListesiniGetir() {
    try {
        const res = await fetch('/api/senaryolar');
        if(!res.ok) {
            console.error('Senaryo listesi API hatası:', res.status);
        const tbody = document.getElementById('senaryoListesi');
            if(tbody) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Senaryo listesi yüklenemedi</td></tr>';
            }
            return;
        }
        
        const data = await res.json();
        // Eğer response bir error object ise, senaryolar array'ini al
        const senaryolar = Array.isArray(data) ? data : (data.senaryolar || []);
        const tbody = document.getElementById('senaryoListesi');
        
        if(!tbody) {
            console.error('Senaryo listesi tbody elementi bulunamadı');
            return;
        }
        
        if (!senaryolar || !Array.isArray(senaryolar) || senaryolar.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Henüz senaryo kaydedilmedi</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        senaryolar.forEach(s => {
            const veri = typeof s.sonuc_veri === 'string' ? JSON.parse(s.sonuc_veri) : s.sonuc_veri;
            const tarih = new Date(s.tarih).toLocaleString('tr-TR', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'});
            const tipBadge = s.senaryo_tipi === 'iyimser' ? 'bg-success' : (s.senaryo_tipi === 'kotumser' ? 'bg-danger' : 'bg-info');
            const durumRenk = s.sonuc_durumu === 'Başarılı' ? 'text-success' : 'text-warning';
            const ortalamaKar = veri?.ortalama_karlar?.realist || veri?.realist?.tahmini_kar || veri?.kar || 0;
            
            tbody.innerHTML += `
                <tr>
                    <td>${tarih}</td>
                    <td>${s.senaryo_adi}</td>
                    <td><span class="badge ${tipBadge}">${s.senaryo_tipi.toUpperCase()}</span></td>
                    <td class="fw-bold">${formatPara(ortalamaKar)}</td>
                    <td><span class="badge ${s.sonuc_durumu === 'Başarılı' ? 'bg-success' : 'bg-warning'}">${s.sonuc_durumu}</span></td>
                    <td>
                        <button onclick="window.senaryoRaporuGoster(${s.id})" class="btn btn-sm btn-outline-primary">
                            <i class="fas fa-file-alt me-1"></i>Rapor
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch(e) {
        console.error('Senaryo listesi yüklenemedi:', e);
    }
}

async function mevsimAnaliziCiz() { 
    try {
    const res = await fetch('/api/mevsimsel-doluluk'); 
        if(!res.ok) {
            console.error('Mevsim analizi API hatası:', res.status);
            return;
        }
    const data = await res.json(); 
    const ctx = document.getElementById('mevsimGrafigi'); 
        if(!ctx) {
            console.error('Mevsim grafik canvas elementi bulunamadı');
            return;
        }
    if (window.mevsimChart instanceof Chart) window.mevsimChart.destroy(); 
    
    const renkler = data.map(d => ({
        'Kış':'#3b82f6',
        'İlkbahar':'#10b981',
        'Yaz':'#f59e0b',
        'Sonbahar':'#8b5cf6'
    })[d.mevsim] || '#64748b'); 
    
    window.mevsimChart = new Chart(ctx, { 
        type: 'doughnut', 
        data: { 
            labels: data.map(d => d.mevsim), 
            datasets: [{ 
                data: data.map(d => d.rezervasyon_sayisi), 
                backgroundColor: renkler, 
                borderColor: 'rgba(15, 23, 42, 0.8)',
                borderWidth: 3,
                hoverOffset: 8
            }] 
        }, 
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: { 
                legend: { 
                    position: 'bottom', 
                    labels: { 
                        color: '#fff',
                        usePointStyle: true,
                        padding: 15,
                        font: { size: 12, weight: '500' }
                    } 
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            }
        } 
    }); 
    } catch(e) {
        console.error('Mevsim analizi hatası:', e);
    }
}
async function verileriGetir() {
    try {
        const res = await fetch('/api/ozet');
        if(!res.ok) {
            console.error('API hatası:', res.status);
            return;
        }
        const data = await res.json();
        
        const toplamRezEl = document.getElementById('toplamRez');
        const toplamCiroEl = document.getElementById('toplamCiro');
        const ortFiyatEl = document.getElementById('ortFiyat');
        const iptalSayisiEl = document.getElementById('iptalSayisi');
        
        if(toplamRezEl) toplamRezEl.innerText = data.toplam_rezervasyon || 0;
        if(toplamCiroEl) toplamCiroEl.innerText = formatPara(data.toplam_ciro || 0);
        if(ortFiyatEl) ortFiyatEl.innerText = formatPara(data.ortalama_gecelik_fiyat || 0);
        if(iptalSayisiEl) iptalSayisiEl.innerText = data.toplam_iptal || 0;
    } catch(e) {
        console.error('Veri yükleme hatası:', e);
    }
}
async function grafigiCiz() { 
    try {
    const res = await fetch('/api/aylik-doluluk'); 
        if(!res.ok) {
            console.error('Grafik API hatası:', res.status);
            return;
        }
    const data = await res.json(); 
    const ctx = document.getElementById('dolulukGrafigi'); 
        if(!ctx) {
            console.error('Grafik canvas elementi bulunamadı');
            return;
        }
    if(window.mainChart) window.mainChart.destroy(); 
    
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)');
    
    window.mainChart = new Chart(ctx, { 
        type:'line', 
        data:{ 
            labels:data.map(d=>d.ay), 
            datasets:[{ 
                label:'Rezervasyon Sayısı', 
                data:data.map(d=>d.rezervasyon_sayisi), 
                borderColor:'#3b82f6',
                backgroundColor: gradient,
                borderWidth: 3,
                fill:true, 
                tension:0.4,
                pointRadius: 5,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 8,
                pointHoverBackgroundColor: '#2563eb',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 3
            }] 
        }, 
        options:{ 
            maintainAspectRatio:false,
            responsive: true,
            plugins:{ 
                legend:{display:false},
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(59, 130, 246, 0.5)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            return `📅 ${context[0].label}`;
                        },
                        label: function(context) {
                            return `Rezervasyon: ${context.parsed.y} adet`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#94a3b8',
                        font: { size: 11 }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        color: '#94a3b8',
                        font: { size: 11 }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        } 
    }); 
    } catch(e) {
        console.error('Grafik çizme hatası:', e);
    }
}
async function dovizKurlariniGetir() { try { const res = await fetch('/api/doviz'); const data = await res.json(); const div = document.getElementById('dovizListesi'); if(!div) return; let html = '<ul class="list-group list-group-flush bg-transparent">'; data.forEach(d => { html += `<li onclick="window.dovizDetayAc('${d.kod}', '${d.isim}')" class="list-group-item bg-transparent text-white border-secondary d-flex justify-content-between align-items-center list-group-item-action" style="cursor:pointer;"><div><span class="fw-bold text-warning">${d.kod}</span> <small class="text-white-50 ms-1">${d.isim}</small></div><div class="text-end"><div class="fw-bold">${d.satis} ₺</div><small class="${d.fark>=0?'text-success':'text-danger'}"><i class="fas ${d.fark>=0?'fa-caret-up':'fa-caret-down'}"></i> %${Math.abs(d.fark)}</small></div></li>`; }); div.innerHTML = html + '</ul>'; } catch(e) {} }

// ========== KARAR DESTEK SİSTEMİ GRAFİKLERİ ==========
let kararDestekCharts = {};


async function kararDestekGrafikleriniYukle() {
    try {
    await Promise.all([
            gelirTrendGrafigiCiz().catch(e => console.error('Gelir trend hatası:', e)),
            dolulukOraniGrafigiCiz().catch(e => console.error('Doluluk oranı hatası:', e)),
            fiyatEsneklikGrafigiCiz().catch(e => console.error('Fiyat esneklik hatası:', e)),
            riskAnaliziGrafigiCiz().catch(e => console.error('Risk analizi hatası:', e)),
            tahminDogruluguGrafigiCiz().catch(e => console.error('Tahmin doğruluğu hatası:', e)),
            kararDestekKPILeriYukle().catch(e => console.error('KPI yükleme hatası:', e))
        ]);
    } catch(e) {
        console.error('Karar destek grafikleri yüklenirken hata:', e);
    }
}

async function kararDestekKPILeriYukle() {
    try {
        const [gelirRes, dolulukRes, karRes, riskRes] = await Promise.all([
            fetch('/api/gelir-trend'),
            fetch('/api/doluluk-orani'),
            fetch('/api/kar-marji'),
            fetch('/api/risk-analizi')
        ]);
        
        if(!gelirRes.ok || !dolulukRes.ok || !karRes.ok || !riskRes.ok) {
            throw new Error('API yanıt hatası');
        }
        
        const gelirData = await gelirRes.json();
        const dolulukData = await dolulukRes.json();
        const karData = await karRes.json();
        const riskData = await riskRes.json();
        
        // Toplam Gelir
        const toplamGelir = (gelirData && gelirData.length > 0) 
            ? gelirData.reduce((sum, item) => sum + (parseFloat(item.toplam_gelir) || 0), 0)
            : 0;
        const gelirEl = document.getElementById('kdsToplamGelir');
        if(gelirEl) gelirEl.innerText = formatPara(toplamGelir);
        
        // Ortalama Doluluk
        const ortDoluluk = (dolulukData && dolulukData.length > 0) 
            ? (dolulukData.reduce((sum, item) => sum + (parseFloat(item.doluluk_orani) || 0), 0) / dolulukData.length).toFixed(1)
            : '0';
        const dolulukEl = document.getElementById('kdsOrtDoluluk');
        if(dolulukEl) dolulukEl.innerText = ortDoluluk + '%';
        
        // Kar Marjı
        const toplamKar = (karData && karData.length > 0)
            ? karData.reduce((sum, item) => sum + (parseFloat(item.tahmini_kar) || 0), 0)
            : 0;
        const toplamGelirKar = (karData && karData.length > 0)
            ? karData.reduce((sum, item) => sum + (parseFloat(item.toplam_gelir) || 0), 0)
            : 0;
        const karMarji = toplamGelirKar > 0 ? ((toplamKar / toplamGelirKar) * 100).toFixed(1) : '0';
        const karMarjiEl = document.getElementById('kdsKarMarji');
        if(karMarjiEl) karMarjiEl.innerText = karMarji + '%';
        
        // Risk Seviyesi
        const basariliOran = (riskData && riskData.length > 0)
            ? (riskData.reduce((sum, item) => sum + (parseInt(item.basarili_sayisi) || 0), 0) / riskData.length).toFixed(0)
            : '0';
        const riskSeviyesi = basariliOran > 10 ? 'Düşük' : (basariliOran > 5 ? 'Orta' : 'Yüksek');
        const riskEl = document.getElementById('kdsRiskSeviyesi');
        if(riskEl) riskEl.innerText = riskSeviyesi;
    } catch(e) {
        console.error('KPI yükleme hatası:', e);
    }
}

window.dolulukGrafigiDegistir = function(tip, btn) {
    if (btn) {
        const group = btn.parentElement;
        group.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
    
    if (tip === 'gecmis') {
        dolulukOraniGrafigiCiz();
    } else if (tip === 'tahmin-6') {
        dolulukTahminiSimulasyonCiz(6);
    } else if (tip === 'tahmin-12') {
        dolulukTahminiSimulasyonCiz(12);
    }
};

async function dolulukTahminiSimulasyonCiz(periyot = 6) {
    try {
        const res = await fetch(`/api/doluluk-tahmini?periyot=${periyot}`);
        if(!res.ok) throw new Error('API hatası');
        const data = await res.json();
        
        const ctx = document.getElementById('dolulukOraniGrafigi');
        if (!ctx) return;

        if (kararDestekCharts.dolulukOrani) kararDestekCharts.dolulukOrani.destroy();

        const labels = data.tahminler.map(t => t.ay);
        const ortalamaData = data.tahminler.map(t => t.tahmini_doluluk_araligi?.ortalama || t.tahmini_doluluk || 0);
        
        // Nokta renklerini belirle
        const pointColors = ortalamaData.map(val => {
            if (val >= 75) return '#10b981'; // Yeşil
            if (val >= 50) return '#f59e0b'; // Sarı
            return '#ef4444'; // Kırmızı
        });

        kararDestekCharts.dolulukOrani = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tahmini Doluluk (%)',
                    data: ortalamaData,
                    // Çizgi rengini segmentlere göre değiştir
                    segment: {
                        borderColor: ctx => {
                            const val = ctx.p1.parsed.y;
                            if (val >= 75) return '#10b981';
                            if (val >= 50) return '#f59e0b';
                            return '#ef4444';
                        },
                        backgroundColor: ctx => {
                            const val = ctx.p1.parsed.y;
                            return val >= 75 ? 'rgba(16, 185, 129, 0.2)' : (val >= 50 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)');
                        }
                    },
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 6,
                    pointBackgroundColor: pointColors,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    borderDash: [5, 5]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const index = context.dataIndex;
                                const item = data.tahminler[index];
                                let label = `Tahmin: ${context.parsed.y.toFixed(1)}%`;
                                if (item && item.tahmini_doluluk_araligi) {
                                    label += ` (Aralık: %${item.tahmini_doluluk_araligi.min} - %${item.tahmini_doluluk_araligi.max})`;
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: { beginAtZero: true, max: 100, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
                }
            }
        });
    } catch(e) { console.error('Simülasyon tahmin grafiği hatası:', e); }
}

async function gelirTrendGrafigiCiz() {
    try {
        const res = await fetch('/api/gelir-trend');
        if(!res.ok) throw new Error('API hatası: ' + res.status);
        const data = await res.json();
        if(!data || data.length === 0) {
            console.warn('Gelir trend verisi boş');
            return;
        }
        const ctx = document.getElementById('gelirTrendGrafigi');
        if(!ctx) {
            console.warn('gelirTrendGrafigi canvas bulunamadı');
            return;
        }
        
        if(kararDestekCharts.gelirTrend) kararDestekCharts.gelirTrend.destroy();
        
        const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 350);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)');
        
        kararDestekCharts.gelirTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.ay).reverse(),
                datasets: [{
                    label: 'Toplam Gelir (TL)',
                    data: data.map(d => parseFloat(d.toplam_gelir) || 0).reverse(),
                    borderColor: '#3b82f6',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 8
                }, {
                    label: 'Rezervasyon Sayısı',
                    data: data.map(d => (parseInt(d.rezervasyon_sayisi) || 0) * 1000).reverse(),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: 'top', labels: { color: '#fff' } },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                if(context.datasetIndex === 0) {
                                    return 'Gelir: ' + formatPara(context.parsed.y);
                                } else {
                                    return 'Rezervasyon: ' + Math.round(context.parsed.y / 1000) + ' adet';
                                }
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        position: 'left',
                        ticks: { color: '#94a3b8', callback: v => formatPara(v) },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        ticks: { color: '#94a3b8' },
                        grid: { drawOnChartArea: false }
                    },
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { display: false }
                    }
                }
            }
        });
    } catch(e) { console.error('Gelir trend hatası:', e); }
}

async function dolulukOraniGrafigiCiz() {
    try {
        const res = await fetch('/api/doluluk-orani');
        if(!res.ok) throw new Error('API hatası: ' + res.status);
        const data = await res.json();
        if(!data || data.length === 0) {
            console.warn('Doluluk oranı verisi boş');
            return;
        }
        const ctx = document.getElementById('dolulukOraniGrafigi');
        if(!ctx) {
            console.warn('dolulukOraniGrafigi canvas bulunamadı');
            return;
        }
        
        if(kararDestekCharts.dolulukOrani) kararDestekCharts.dolulukOrani.destroy();
        
        kararDestekCharts.dolulukOrani = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.ay).reverse(),
                datasets: [{
                    label: 'Doluluk Oranı (%)',
                    data: data.map(d => parseFloat(d.doluluk_orani) || 0).reverse(),
                    backgroundColor: data.map(d => {
                        const oran = parseFloat(d.doluluk_orani) || 0;
                        if(oran >= 80) return 'rgba(16, 185, 129, 0.8)';
                        if(oran >= 60) return 'rgba(59, 130, 246, 0.8)';
                        return 'rgba(239, 68, 68, 0.8)';
                    }),
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Doluluk: ' + context.parsed.y.toFixed(1) + '%';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { color: '#94a3b8', callback: v => v + '%' },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { display: false }
                    }
                }
            }
        });
    } catch(e) { console.error('Doluluk oranı hatası:', e); }
}

window.fiyatGrafigiDegistir = function(tip, btn) {
    if (btn) {
        const group = btn.parentElement;
        group.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
    
    if (tip === 'analiz') {
        fiyatEsneklikGrafigiCiz();
    } else {
        fiyatGecmisTrendiCiz();
    }
};

async function fiyatGecmisTrendiCiz() {
    try {
        const res = await fetch('/api/gelir-trend');
        if(!res.ok) throw new Error('API hatası');
        const data = await res.json();
        
        const ctx = document.getElementById('fiyatEsneklikGrafigi');
        if (!ctx) return;

        if (kararDestekCharts.fiyatEsneklik) kararDestekCharts.fiyatEsneklik.destroy();

        // ADR (Ortalama Günlük Fiyat) Hesapla
        const labels = data.map(d => d.ay).reverse();
        const adrData = data.map(d => {
            const rev = parseFloat(d.toplam_gelir) || 0;
            const count = parseInt(d.rezervasyon_sayisi) || 1;
            return count > 0 ? rev / count : 0;
        }).reverse();

        kararDestekCharts.fiyatEsneklik = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ortalama Oda Fiyatı (ADR)',
                    data: adrData,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: '#8b5cf6',
                    pointBorderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Ort. Fiyat: ${formatPara(context.parsed.y)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: false, 
                        ticks: { color: '#94a3b8', callback: v => formatPara(v) }, 
                        grid: { color: 'rgba(255,255,255,0.05)' } 
                    },
                    x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
                }
            }
        });
    } catch(e) { console.error('Fiyat geçmiş trend hatası:', e); }
}

window.fiyatDetayGoster = function(ay) {
    const modalEl = document.getElementById('fiyatDetayModal');
    if(!modalEl) return;
    const modal = new bootstrap.Modal(modalEl);
    document.getElementById('fiyatDetayModalBaslik').innerHTML = `<i class="fas fa-calendar-alt text-primary me-2"></i>${ay} - Oda Tipi Fiyat Dağılımı`;
    modal.show();
    
    const ctx = document.getElementById('fiyatDetayGrafigiCanvas');
    if (window.fiyatDetayChart instanceof Chart) window.fiyatDetayChart.destroy();

    // Simüle edilmiş veri (Gerçek uygulamada API'den çekilebilir)
    const odaTipleri = ['Standart', 'Deluxe', 'Suit', 'Kral Dairesi'];
    // Rastgele mantıklı fiyatlar üret
    const bazFiyat = Math.floor(Math.random() * 500) + 1000;
    const fiyatlar = [bazFiyat, bazFiyat * 1.5, bazFiyat * 2.5, bazFiyat * 5];

    window.fiyatDetayChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: odaTipleri,
            datasets: [{
                label: 'Ortalama Fiyat (TL)',
                data: fiyatlar,
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
                borderRadius: 6,
                barThickness: 50
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { 
                y: { 
                    beginAtZero: true, 
                    ticks: { callback: v => formatPara(v) },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: { grid: { display: false } }
            }
        }
    });
};

async function fiyatEsneklikGrafigiCiz() {
    try {
        const res = await fetch('/api/fiyat-esneklik');
        if(!res.ok) throw new Error('API hatası: ' + res.status);
        const data = await res.json();
        if(!data || data.length === 0) {
            console.warn('Fiyat esneklik verisi boş');
            return;
        }
        const ctx = document.getElementById('fiyatEsneklikGrafigi');
        if(!ctx) {
            console.warn('fiyatEsneklikGrafigi canvas bulunamadı');
            return;
        }
        
        if(kararDestekCharts.fiyatEsneklik) kararDestekCharts.fiyatEsneklik.destroy();
        
        kararDestekCharts.fiyatEsneklik = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.fiyat_degisim + '%'),
                datasets: [{
                    label: 'Talep Değişimi (%)',
                    data: data.map(d => d.talep_degisim),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 8
                }, {
                    label: 'Gelir (TL)',
                    data: data.map(d => d.gelir / 1000),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { color: '#fff' } },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if(context.datasetIndex === 0) {
                                    return 'Talep: ' + context.parsed.y + '%';
                                } else {
                                    return 'Gelir: ' + formatPara(context.parsed.y * 1000);
                                }
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: { color: '#94a3b8', callback: v => v + '%' },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        ticks: { color: '#94a3b8', callback: v => v + 'k' },
                        grid: { drawOnChartArea: false }
                    },
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { display: false }
                    }
                }
            }
        });
    } catch(e) { console.error('Fiyat esneklik hatası:', e); }
}

async function riskAnaliziGrafigiCiz(periyot = 6) {
    try {
        const res = await fetch(`/api/gelecek-risk-analizi?periyot=${periyot}`);
        if(!res.ok) throw new Error('API hatası: ' + res.status);
        const data = await res.json();
        const liste = Array.isArray(data?.risk_analizi) ? data.risk_analizi : (Array.isArray(data) ? data : []);
        const ctx = document.getElementById('riskAnaliziGrafigi');
        if(!ctx) {
            console.warn('riskAnaliziGrafigi canvas bulunamadı');
            return;
        }
        const tablo = document.getElementById('riskAnaliziTablosu');
        if(tablo) {
            if(!liste.length) {
                tablo.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Risk verisi bulunamadı</td></tr>`;
            } else {
                tablo.innerHTML = liste.map(r => {
                    const renk = r.riskSeviyesi === 'Yüksek' ? 'danger' : (r.riskSeviyesi === 'Orta' ? 'warning' : 'success');
                    const uyari = r.yonetici_uyarisi || r.uyari_mesaji || 'Belirsiz';
                    return `
                        <tr>
                            <td>${r.ay}</td>
                            <td><span class="badge bg-${renk}">${r.riskSkoru ?? '-'}</span></td>
                            <td><span class="badge bg-${renk} bg-opacity-10 text-${renk} border border-${renk} border-opacity-25">${r.riskSeviyesi || '-'}</span></td>
                            <td class="small">${uyari}</td>
                        </tr>
                    `;
                }).join('');
            }
        }
        if(!ctx || !liste.length) return;

        const renkSkoru = (skor) => skor > 60 ? '#ef4444' : (skor > 30 ? '#f59e0b' : '#10b981');
        const labels = liste.map(r => r.ay);
        const skorlar = liste.map(r => r.riskSkoru || 0);
        const renkler = skorlar.map(s => renkSkoru(s));

        if(kararDestekCharts.riskAnalizi) kararDestekCharts.riskAnalizi.destroy();

        kararDestekCharts.riskAnalizi = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Risk Skoru',
                    data: skorlar,
                    backgroundColor: renkler,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `Risk Skoru: ${context.parsed.y}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { color: '#94a3b8' },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { display: false }
                    }
                }
            }
        });
    } catch(e) { 
        console.error('Risk analizi hatası:', e); 
        const tablo = document.getElementById('riskAnaliziTablosu');
        if(tablo) tablo.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Risk verisi yüklenemedi</td></tr>`;
    }
}

async function tahminDogruluguGrafigiCiz() {
    try {
        const res = await fetch('/api/tahmin-dogrulugu');
        if(!res.ok) throw new Error('API hatası: ' + res.status);
    const data = await res.json();
        if(!data || data.length === 0) {
            console.warn('Tahmin doğruluğu verisi boş');
            return;
        }
        const ctx = document.getElementById('tahminDogruluguGrafigi');
        if(!ctx) {
            console.warn('tahminDogruluguGrafigi canvas bulunamadı');
            return;
        }
        
        if(kararDestekCharts.tahminDogrulugu) kararDestekCharts.tahminDogrulugu.destroy();
        
        kararDestekCharts.tahminDogrulugu = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.ay).reverse(),
                datasets: [{
                    label: 'Gerçek Rezervasyon',
                    data: data.map(d => parseInt(d.gercek_rezervasyon) || 0).reverse(),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5
                }, {
                    label: 'Tahmin',
                    data: data.map(d => Math.round(parseFloat(d.tahmin_rezervasyon) || 0)).reverse(),
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.4,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { color: '#fff' } },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + Math.round(context.parsed.y) + ' adet';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#94a3b8' },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { display: false }
                    }
                }
            }
        });
    } catch(e) { console.error('Tahmin doğruluğu hatası:', e); }
}

window.gelirTrendGuncelle = function(periyot) {
    // Periyot değişimi için (ileride genişletilebilir)
    gelirTrendGrafigiCiz();
};

window.kararDestekRaporIndir = function() {
    alert('Rapor hazırlanıyor... PDF formatında indirilecek.');
    // İleride PDF export özelliği eklenebilir
};

// ========== GELİŞMİŞ KPI SİSTEMİ ==========
async function gelismisKPILeriYukle() {
    try {
        const res = await fetch('/api/gelismis-kpi');
        if(!res.ok) {
            console.error('KPI API hatası:', res.status);
            return;
        }
        const data = await res.json();
        const kpi = data?.kpi;
        
        if(!kpi) {
            console.error('KPI verisi bulunamadı');
            return;
        }
        
        // Doluluk Oranı
        const dolulukEl = document.getElementById('kpiDoluluk');
        const dolulukDegisimEl = document.getElementById('kpiDolulukDegisim');
        const dolulukYorumEl = document.getElementById('kpiDolulukYorum');
        if(dolulukEl && kpi.doluluk_orani) {
            dolulukEl.innerText = (kpi.doluluk_orani.mevcut_deger || 0) + '%';
            const dolulukDegisim = kpi.doluluk_orani.degisim_yuzde || 0;
            const dolulukYon = dolulukDegisim >= 0 ? 'up' : 'down';
            const dolulukRenk = dolulukDegisim >= 0 ? 'success' : 'danger';
            if(dolulukDegisimEl) {
                dolulukDegisimEl.innerHTML = `
                    <i class="fas fa-arrow-${dolulukYon} me-2 text-${dolulukRenk}"></i>
                    <span class="small text-${dolulukRenk}">${Math.abs(dolulukDegisim).toFixed(1)}% ${dolulukDegisim >= 0 ? 'artış' : 'azalış'}</span>
                `;
            }
            if(dolulukYorumEl) dolulukYorumEl.innerText = kpi.doluluk_orani.yorum || '-';
        }
        
        // Toplam Gelir
        const gelirEl = document.getElementById('kpiGelir');
        const gelirDegisimEl = document.getElementById('kpiGelirDegisim');
        const gelirYorumEl = document.getElementById('kpiGelirYorum');
        if(gelirEl && kpi.toplam_gelir) {
            gelirEl.innerText = formatPara(kpi.toplam_gelir.mevcut_deger || 0);
            const gelirDegisim = kpi.toplam_gelir.degisim_yuzde || 0;
            const gelirYon = gelirDegisim >= 0 ? 'up' : 'down';
            const gelirRenk = gelirDegisim >= 0 ? 'success' : 'danger';
            if(gelirDegisimEl) {
                gelirDegisimEl.innerHTML = `
                    <i class="fas fa-arrow-${gelirYon} me-2 text-${gelirRenk}"></i>
                    <span class="small text-${gelirRenk}">${Math.abs(gelirDegisim).toFixed(1)}% ${gelirDegisim >= 0 ? 'artış' : 'azalış'}</span>
                `;
            }
            if(gelirYorumEl) gelirYorumEl.innerText = kpi.toplam_gelir.yorum || '-';
        }
        
        // Kar Marjı
        const karMarjiEl = document.getElementById('kpiKarMarji');
        const karMarjiDegisimEl = document.getElementById('kpiKarMarjiDegisim');
        const karMarjiYorumEl = document.getElementById('kpiKarMarjiYorum');
        if(karMarjiEl && kpi.kar_marji) {
            karMarjiEl.innerText = (kpi.kar_marji.mevcut_deger || 0) + '%';
            const karMarjiDegisim = kpi.kar_marji.degisim_yuzde || 0;
            const karMarjiYon = karMarjiDegisim >= 0 ? 'up' : 'down';
            const karMarjiRenk = karMarjiDegisim >= 0 ? 'success' : 'danger';
            if(karMarjiDegisimEl) {
                karMarjiDegisimEl.innerHTML = `
                    <i class="fas fa-arrow-${karMarjiYon} me-2 text-${karMarjiRenk}"></i>
                    <span class="small text-${karMarjiRenk}">${Math.abs(karMarjiDegisim).toFixed(1)}% ${karMarjiDegisim >= 0 ? 'artış' : 'azalış'}</span>
                `;
            }
            if(karMarjiYorumEl) karMarjiYorumEl.innerText = kpi.kar_marji.yorum || '-';
        }
        
        // İptal Oranı
        const iptalEl = document.getElementById('kpiIptalOrani');
        const iptalDegisimEl = document.getElementById('kpiIptalOraniDegisim');
        const iptalYorumEl = document.getElementById('kpiIptalOraniYorum');
        if(iptalEl && kpi.iptal_orani) {
            iptalEl.innerText = (kpi.iptal_orani.mevcut_deger || 0) + '%';
            const iptalDegisim = kpi.iptal_orani.degisim_yuzde || 0;
            const iptalYon = iptalDegisim >= 0 ? 'up' : 'down';
            const iptalRenk = iptalDegisim >= 0 ? 'danger' : 'success';
            if(iptalDegisimEl) {
                iptalDegisimEl.innerHTML = `
                    <i class="fas fa-arrow-${iptalYon} me-2 text-${iptalRenk}"></i>
                    <span class="small text-${iptalRenk}">${Math.abs(iptalDegisim).toFixed(1)}% ${iptalDegisim >= 0 ? 'artış' : 'azalış'}</span>
                `;
            }
            if(iptalYorumEl) iptalYorumEl.innerText = kpi.iptal_orani.yorum || '-';
        }
    } catch(e) {
        console.error('KPI yükleme hatası:', e);
        // Fallback: Varsayılan değerleri göster
        const fallbackKPI = {
            doluluk_orani: { mevcut_deger: 68, degisim_yuzde: -5, yorum: 'Veri yüklenemedi' },
            toplam_gelir: { mevcut_deger: 3500000, degisim_yuzde: -7.9, yorum: 'Veri yüklenemedi' },
            kar_marji: { mevcut_deger: 38.5, degisim_yuzde: -1.7, yorum: 'Veri yüklenemedi' },
            iptal_orani: { mevcut_deger: 12.5, degisim_yuzde: 1.7, yorum: 'Veri yüklenemedi' }
        };
        
        const dolulukEl = document.getElementById('kpiDoluluk');
        if(dolulukEl) dolulukEl.innerText = fallbackKPI.doluluk_orani.mevcut_deger + '%';
        const gelirEl = document.getElementById('kpiGelir');
        if(gelirEl) gelirEl.innerText = formatPara(fallbackKPI.toplam_gelir.mevcut_deger);
        const karMarjiEl = document.getElementById('kpiKarMarji');
        if(karMarjiEl) karMarjiEl.innerText = fallbackKPI.kar_marji.mevcut_deger + '%';
        const iptalEl = document.getElementById('kpiIptalOrani');
        if(iptalEl) iptalEl.innerText = fallbackKPI.iptal_orani.mevcut_deger + '%';
    }
}

// ========== ÖNERİ MOTORU ==========
async function onerileriYukle() {
    try {
        const res = await fetch('/api/oneriler');
        if(!res.ok) {
            console.error('Analiz API hatası:', res.status);
            return;
        }
        const data = await res.json();
        // API response'u güncellendi: "analizler" kullanıyor
        const analizler = data.analizler || data.oneriler || [];
        
        const container = document.getElementById('oneriListesi');
        if(!container) {
            console.error('Analiz listesi container bulunamadı');
            return;
        }
        if(analizler.length === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted">Şu anda analiz bulunmuyor.</div>';
            return;
        }
        
        container.innerHTML = '';
        analizler.forEach(analiz => {
            const onemRenk = analiz.onem_seviyesi === 'yüksek' ? 'danger' : (analiz.onem_seviyesi === 'orta' ? 'warning' : 'info');
            const tipIcon = (analiz.analiz_tipi || analiz.oneri_tipi) === 'fiyat' ? 'fa-tag' : ((analiz.analiz_tipi || analiz.oneri_tipi) === 'personel' ? 'fa-users' : ((analiz.analiz_tipi || analiz.oneri_tipi) === 'pazarlama' ? 'fa-bullhorn' : 'fa-exclamation-triangle'));
            
            // Alternatifler varsa göster
            let alternatiflerHTML = '';
            if(analiz.alternatifler && analiz.alternatifler.length > 0) {
                alternatiflerHTML = '<div class="mt-3 pt-2 border-top"><small class="text-muted d-block mb-2"><strong>Değerlendirilebilecek Alternatifler:</strong></small>';
                analiz.alternatifler.forEach((alt, idx) => {
                    const etkiler = Object.entries(alt.olası_etkiler || {}).map(([k, v]) => `${k}: ${v}`).join(', ');
                    alternatiflerHTML += `
                        <div class="small mb-2 p-2 bg-light rounded">
                            <strong>${idx + 1}. ${alt.alternatif}:</strong><br>
                            <span class="text-muted">Olası Etkiler: ${etkiler}</span><br>
                            <span class="badge bg-secondary">Belirsizlik: ${alt.belirsizlik_seviyesi}</span>
                        </div>
                    `;
                });
                alternatiflerHTML += '</div>';
            }
            
            container.innerHTML += `
                <div class="col-md-6">
                    <div class="card border-${onemRenk} border-start border-4 p-3">
                        <div class="d-flex align-items-start">
                            <i class="fas ${tipIcon} text-${onemRenk} me-3 mt-1"></i>
                            <div class="flex-grow-1">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <span class="badge bg-${onemRenk}">${analiz.onem_seviyesi.toUpperCase()}</span>
                                    <small class="text-muted">${analiz.analiz_tipi || analiz.oneri_tipi}</small>
                                </div>
                                <p class="mb-0 small">${analiz.analiz_metni || analiz.oneri_metni}</p>
                                ${alternatiflerHTML}
                                ${analiz.not ? `<small class="text-muted d-block mt-2"><i class="fas fa-info-circle me-1"></i>${analiz.not}</small>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch(e) {
        console.error('Analiz yükleme hatası:', e);
    }
}

// ========== AYLIK RAPOR ==========
/**
 * Aylık Yönetici Raporu Yükleme Fonksiyonu
 * DSS (Decision Support System) Prensibi:
 * - Sistem net karar vermez, sadece bilgi ve analiz sunar
 * - Tüm çıktılar "analiz", "alternatifler", "olası etkiler" diliyle sunulur
 * - Risk skorları "uyarı" olarak yorumlanır, karar olarak sunulmaz
 * - Senaryo tercihi yöneticiye aittir
 */
window.aylikRaporKPIDetayGoster = async function(kpiAd) {
    let modal = document.getElementById('kpiDetayModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'kpiDetayModal';
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="kpiDetayBaslik">KPI Analizi</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div style="height: 350px;">
                            <canvas id="kpiDetayChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modal);
    }
    
    document.getElementById('kpiDetayBaslik').innerHTML = `<i class="fas fa-chart-area text-primary me-2"></i>${kpiAd} - Detaylı Analiz`;
    new bootstrap.Modal(modal).show();
    
    const ctx = document.getElementById('kpiDetayChart').getContext('2d');
    if (window.kpiDetayChart instanceof Chart) window.kpiDetayChart.destroy();
    
    // Varsayılan/Demo veriler (API hatası durumunda kullanılır)
    let labels = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    let data = Array.from({length: 12}, () => Math.floor(Math.random() * 40) + 60);

    try {
        // Gerçek verileri API'den çek
        const res = await fetch(`/api/kpi-detay?kpi=${encodeURIComponent(kpiAd)}`);
        if (res.ok) {
            const result = await res.json();
            // API'den { labels: [...], data: [...] } formatında veri bekleniyor
            if (result && result.labels && result.data) {
                labels = result.labels;
                data = result.data;
            }
        }
    } catch (e) { console.warn('KPI detay verisi çekilemedi, demo veri gösteriliyor:', e); }
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 350);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    window.kpiDetayChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: kpiAd,
                data: data,
                borderColor: '#3b82f6',
                backgroundColor: gradient,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#3b82f6',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: false, grid: { color: 'rgba(0,0,0,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
};

async function aylikRaporAyListesiDoldur() {
    const selectEl = document.getElementById('aylikRaporAySecici');
    if (!selectEl) return;

    // Gerçek uygulamada bu veri API'den dinamik olarak çekilmelidir.
    // Örnek: const aylar = await fetch('/api/rapor-aylari').then(res => res.json());
    const aylar = [
        { value: '2017-08', text: 'Ağustos 2017' },
        { value: '2017-07', text: 'Temmuz 2017' },
        { value: '2017-06', text: 'Haziran 2017' },
        { value: '2017-05', text: 'Mayıs 2017' },
        { value: '2017-04', text: 'Nisan 2017' },
    ];

    selectEl.innerHTML = aylar.map(ay => `<option value="${ay.value}">${ay.text}</option>`).join('');
}

async function aylikRaporuYukle(ay = null) {
    const container = document.getElementById('aylikRaporIcerik');
    if (!container) return;

    container.innerHTML = `
        <div class="col-12 text-center text-muted p-5">
            <i class="fas fa-spinner fa-spin fa-3x mb-3"></i>
            <p>Rapor yükleniyor...</p>
        </div>
    `;

    const apiUrl = ay ? `/api/aylik-rapor?ay=${ay}` : '/api/aylik-rapor';

    try {
        const res = await fetch(apiUrl);
        if(!res.ok) return;
        const data = await res.json();
        
        container.innerHTML = `
            <div class="col-12 mb-4">
                <div class="card p-4">
                    <h4 class="mb-3">${data.rapor_periyodu} - Aylık Yönetici Raporu</h4>
                    <p class="text-muted">Rapor Tarihi: ${data.rapor_tarihi}</p>
                    <p class="small text-muted mt-2"><i class="fas fa-info-circle me-1"></i>Bu rapor karar destek bilgileri sunar. Net karar vermez, sadece analiz ve alternatifler sağlar.</p>
                </div>
            </div>
            
            <div class="col-12 mb-4">
                <div class="card p-4">
                    <h5 class="mb-3"><i class="fas fa-chart-line me-2"></i>En Önemli 5 KPI</h5>
                    <div class="row g-3">
                        ${(data.en_onemli_kpi || []).map(kpi => `
                            <div class="col-md-6">
                                <div class="card border-primary border-start border-4 p-3 h-100" style="cursor: pointer; transition: transform 0.2s;" onclick="window.aylikRaporKPIDetayGoster('${kpi.ad}')" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                                    <h6 class="mb-2">${kpi.ad} <i class="fas fa-chart-line float-end text-primary opacity-50"></i></h6>
                                    <h4 class="text-primary mb-2">${kpi.deger}</h4>
                                    <small class="text-muted d-block mb-2">Değişim: ${kpi.degisim}</small>
                                    <p class="text-muted small mb-0">${kpi.yorum}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <div class="col-12 mb-4">
                <div class="card p-4">
                    <h5 class="mb-3"><i class="fas fa-chart-bar me-2"></i>Grafik Özetleri</h5>
                    ${(data.grafik_ozetleri || []).map(ozet => `
                        <div class="card border-info border-start border-4 p-3 mb-3">
                            <h6 class="mb-2">${ozet.grafik_adi}</h6>
                            <p class="text-muted mb-0">${ozet.ozet}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="col-12 mb-4">
                <div class="card p-4">
                    <h5 class="mb-3"><i class="fas fa-lightbulb me-2"></i>Karar Alternatifleri ve Analizler</h5>
                    <p class="small text-muted mb-3"><i class="fas fa-info-circle me-1"></i>Bu bölüm karar alternatiflerini, olası etkileri ve riskleri sunar. Net karar vermez, sadece bilgi ve analiz sağlar.</p>
                    ${(data.otomatik_karar_onerileri || []).map((oneri, idx) => `
                        <div class="card border-warning border-start border-4 p-3 mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="badge bg-warning">${oneri.tip.toUpperCase()}</span>
                                <span class="badge bg-secondary">${oneri.onem.toUpperCase()}</span>
                            </div>
                            <p class="mb-0">${oneri.oneri}</p>
                            <small class="text-muted d-block mt-2"><i class="fas fa-info-circle me-1"></i>Bu bir analizdir. Nihai karar yöneticiye aittir.</small>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="col-12">
                <div class="card p-4">
                    <h5 class="mb-3"><i class="fas fa-exclamation-triangle me-2"></i>Risk Analizi Uyarısı</h5>
                    <div class="card border-danger border-start border-4 p-4">`
                        + (data.risk_degerlendirmesi ? `
                        <h4 class="text-danger mb-2">Risk Analizi Skoru: ${data.risk_degerlendirmesi.skor}/100</h4>
                        <h5 class="text-warning mb-3">Risk Seviyesi: ${data.risk_degerlendirmesi.seviye}</h5>
                        <p class="mb-2"><strong>Uyarı:</strong> ${data.risk_degerlendirmesi.uyari}</p>` : '<p>Risk verisi bulunamadı.</p>') + `
                        <small class="text-muted d-block"><i class="fas fa-info-circle me-1"></i>Bu bir uyarıdır, net karar değildir. Yönetici değerlendirmesi gereklidir.</small>
                    </div>
                </div>
            </div>
            
            <div class="col-12 mt-4">
                <div class="card p-4 bg-light">
                    <h5 class="mb-2">Analiz Özeti</h5>
                    <p class="mb-0">${data.rapor_ozeti}</p>
                    <small class="text-muted d-block mt-2"><i class="fas fa-info-circle me-1"></i>Bu özet analiz bilgileri içerir. Nihai karar yöneticiye aittir.</small>
                </div>
            </div>
        `;
    } catch(e) {
        console.error('Rapor yükleme hatası:', e);
        const container = document.getElementById('aylikRaporIcerik');
        if(container) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger">
                        <h5><i class="fas fa-exclamation-triangle me-2"></i>Rapor Yüklenemedi</h5>
                        <p>Rapor yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.</p>
                        <p class="small text-muted mb-0">Hata: ${e.message || 'Bilinmeyen hata'}</p>
                    </div>
                </div>
            `;
        }
    }
}

window.raporIndir = function() {
    alert('PDF export özelliği yakında eklenecek.');
};

// ========== TAHMİN VE KARAR DESTEK FONKSİYONLARI ==========

// Doluluk Tahmini
async function dolulukTahminiYukle(periyot) {
    try {
        const res = await fetch(`/api/doluluk-tahmini?periyot=${periyot}`);
        if(!res.ok) throw new Error('API hatası');
        const data = await res.json();
        
        const container = document.getElementById('dolulukTahminiListesi');
        if (!container) return;

        const ctx = document.getElementById('dolulukTahminiGrafigi');
        if (!ctx) return;

        if (kararDestekCharts.dolulukTahmini) kararDestekCharts.dolulukTahmini.destroy();

        const labels = data.tahminler.map(t => t.ay);
        // GÜNCELLEME: API yanıtı esnek değilse hata vermemesi için kontrol eklendi.
        const ortalamaData = data.tahminler.map(t => t.tahmini_doluluk_araligi?.ortalama || t.tahmini_doluluk || 0);
        
        const backgroundColors = ortalamaData.map(oran => {
            if(oran >= 80) return 'rgba(16, 185, 129, 0.7)'; // green
            if(oran >= 60) return 'rgba(59, 130, 246, 0.7)'; // blue
            return 'rgba(239, 68, 68, 0.7)'; // red
        });

        kararDestekCharts.dolulukTahmini = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ortalama Doluluk (%)',
                    data: ortalamaData,
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    borderColor: '#3b82f6',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#3b82f6',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const index = context.dataIndex;
                                const item = data.tahminler[index];
                                const aralik = item.tahmini_doluluk_araligi;
                                let text = `Ortalama: ${context.parsed.y.toFixed(1)}%`;
                                if(aralik && aralik.min !== undefined) {
                                    text += ` (Aralık: ${aralik.min}% - ${aralik.max}%)`;
                                }
                                return text;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { color: '#94a3b8', callback: v => v + '%' },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    },
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { display: false }
                    }
                }
            }
        });

    } catch(e) {
        console.error('Doluluk tahmini grafiği hatası:', e);
    }
}

// Rakip Fiyat Analizi (API'den gerçek veri)
const SERP_API_KEY = '2cd20c4121d7a2e3bda15daad41effac28b97da917b013db355fb8779979c865';

async function rakipFiyatAnaliziYukle() {
    try {
        // API anahtarını backend'e iletiyoruz. Backend bu anahtarı kullanarak SerpApi'den veri çekmelidir.
        const res = await fetch(`/api/rakip-analizi?api_key=${SERP_API_KEY}`);
        if(!res.ok) throw new Error('API hatası');
        let data = await res.json();
        
        // Eğer backend SerpApi ham verisini (properties dizisi) dönerse, formatı grafiğe uygun hale getir
        if (data.properties && Array.isArray(data.properties)) {
            data = data.properties.map(otel => {
                // Fiyat ayrıştırma (Örn: "2.450 TL" -> 2450)
                let hamFiyat = otel.rate_per_night ? (otel.rate_per_night.lowest || "0") : "0";
                // Sadece rakamları al
                let fiyat = parseFloat(hamFiyat.replace(/[^0-9]/g, ''));
                
                // Bizim otel tespiti (Örnek: Adında 'Grand' veya 'Bizim' geçen)
                const bizimOtel = otel.name.toLowerCase().includes('grand') || otel.name.toLowerCase().includes('bizim');
                
                return {
                    otel_adi: otel.name,
                    fiyat: fiyat,
                    puan: otel.overall_rating || 0,
                    bizim_otel: bizimOtel
                };
            }).slice(0, 8); // En alakalı 8 oteli al
        }
        
        // Doluluk tahmini grafiği alanını kullanıyoruz (Eski grafik yerine)
        const ctx = document.getElementById('dolulukTahminiGrafigi');
        if (!ctx) return;

        if (kararDestekCharts.dolulukTahmini) kararDestekCharts.dolulukTahmini.destroy();

        const labels = data.map(d => d.otel_adi);
        const prices = data.map(d => parseFloat(d.fiyat));
        const ratings = data.map(d => d.puan || 0);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        
        const colors = data.map(d => {
            const p = parseFloat(d.fiyat);
            if (d.bizim_otel) return '#3b82f6'; // Bizim otel (Mavi)
            if (p === minPrice) return '#10b981'; // En ucuz (Yeşil)
            if (p === maxPrice) return '#ef4444'; // En pahalı (Kırmızı)
            return '#64748b'; // Diğerleri (Gri)
        });
        
        const bizimOtelVerisi = data.find(d => d.bizim_otel);
        const bizimFiyat = bizimOtelVerisi ? parseFloat(bizimOtelVerisi.fiyat) : 0;

        kararDestekCharts.dolulukTahmini = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Ortalama Gecelik Fiyat (TL)',
                        data: prices,
                        backgroundColor: colors,
                        borderRadius: 6,
                        barThickness: 40,
                        order: 2,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Otel Puanı',
                        data: ratings,
                        type: 'line',
                        borderColor: '#f59e0b',
                        backgroundColor: '#f59e0b',
                        borderWidth: 2,
                        pointRadius: 4,
                        order: 1,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, labels: { color: '#94a3b8' } },
                    tooltip: {
                        callbacks: { 
                            label: (c) => {
                                if (c.dataset.type === 'line') return `Puan: ${c.raw}/5.0`;
                                const val = parseFloat(c.raw);
                                let text = `${val} TL`;
                                if(bizimFiyat > 0) {
                                    const fark = val - bizimFiyat;
                                    if (Math.abs(fark) < 0.1) text += ' (Bizim Otel)';
                                    else text += ` (${fark > 0 ? '+' : ''}${fark} TL)`;
                                }
                                return text;
                            }
                        }
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        position: 'left',
                        ticks: { color: '#94a3b8' }, 
                        grid: { color: 'rgba(255,255,255,0.05)' } 
                    },
                    y1: {
                        beginAtZero: true,
                        max: 5,
                        position: 'right',
                        ticks: { color: '#f59e0b' },
                        grid: { display: false }
                    },
                    x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
                }
            }
        });
    } catch(e) { console.error('Rakip analiz hatası:', e); }
}

// Fiyat Stratejisi Periyot Değiştirme
window.fiyatStratejisiDegistir = function(periyot, btn) {
    if (btn) {
        const group = btn.parentElement;
        group.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
    fiyatStratejisiYukle(periyot);
};

// Fiyat Stratejisi
async function fiyatStratejisiYukle(periyot) {
    try {
        const res = await fetch(`/api/fiyat-stratejisi?periyot=${periyot}`);
        if(!res.ok) throw new Error('API hatası');
        const data = await res.json();
        
        const container = document.getElementById('fiyatStratejisiListesi');
        if (!container) return;

        const ctx = document.getElementById('fiyatStratejisiGrafigi');
        if (!ctx) return;

        if (kararDestekCharts.fiyatStratejisi) kararDestekCharts.fiyatStratejisi.destroy();

        const analizler = data.analizler || data.oneriler || [];
        const labels = analizler.map(o => o.ay);
        const fiyatData = analizler.map(o => {
            // Yeni formatı önceliklendir
            const alternatif = (o.alternatifler && o.alternatifler.length > 0) ? o.alternatifler[0] : o;
            if (alternatif.onerilen_fiyat) return alternatif.onerilen_fiyat;
            if (alternatif.fiyat_araligi) return (alternatif.fiyat_araligi.min + alternatif.fiyat_araligi.max) / 2;
            // Geriye uyumluluk için eski formatı destekle
            return alternatif.onerilen_fiyat || alternatif.mevcut_fiyat;
        });

        kararDestekCharts.fiyatStratejisi = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Önerilen Fiyat (₺)',
                    data: fiyatData,
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    borderColor: '#f59e0b',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#f59e0b',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Fiyat: ${formatPara(context.parsed.y)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#94a3b8', callback: v => formatPara(v) },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    },
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { display: false }
                    }
                }
            }
        });

    } catch(e) {
        console.error('Fiyat stratejisi grafiği hatası:', e);
    }
}

// Gelir ve Kâr Tahmini Periyot Değiştirme
window.gelirKarTahminiDegistir = function(periyot, btn) {
    if (btn) {
        const group = btn.parentElement;
        group.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
    gelirKarTahminiYukle(periyot);
};

// Gelir ve Kâr Tahmini
async function gelirKarTahminiYukle(periyot) {
    try {
        const res = await fetch(`/api/gelir-kar-tahmini?periyot=${periyot}`);
        if(!res.ok) throw new Error('API hatası');
        const data = await res.json();
        
        const container = document.getElementById('gelirKarTahminiListesi');
        if (!container) return;

        const ctx = document.getElementById('gelirKarTahminiGrafigi');
        if (!ctx) return;

        if (kararDestekCharts.gelirKarTahmini) kararDestekCharts.gelirKarTahmini.destroy();

        const labels = data.tahminler.map(t => t.donem);
        // GÜNCELLEME: API yanıtı esnek değilse hata vermemesi için kontrol eklendi.
        const gelirData = data.tahminler.map(t => t.tahmini_gelir_araligi?.ortalama || t.tahmini_gelir || 0);
        const karData = data.tahminler.map(t => t.tahmini_kar_araligi?.ortalama || t.tahmini_kar || 0);

        kararDestekCharts.gelirKarTahmini = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Tahmini Gelir (₺)',
                        data: gelirData,
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderColor: '#3b82f6',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4
                    },
                    {
                        label: 'Tahmini Kâr (₺)',
                        data: karData,
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderColor: '#10b981',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { color: '#fff' } },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${formatPara(context.parsed.y)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#94a3b8', callback: v => formatPara(v) },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    },
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { display: false }
                    }
                }
            }
        });

    } catch(e) {
        console.error('Gelir kâr tahmini grafiği hatası:', e);
    }
}

// Personel İhtiyacı
async function personelIhtiyaciYukle() {
    try {
        const res = await fetch('/api/personel-ihtiyaci');
        if(!res.ok) return;
        const data = await res.json();
        
        const tbody = document.getElementById('personelIhtiyaciTablosu');
        const yorumDiv = document.getElementById('personelIhtiyaciYorumlari');
        tbody.innerHTML = '';
        yorumDiv.innerHTML = '';
        
        // DSS Prensibi: Personel ihtiyacı aralık (min-max) ve etki analizi ile sunulur
        data.tahminler.forEach(t => {
            const personelAralik = t.degerlendirilebilir_personel_araligi || { min: t.onerilen_personel, max: t.onerilen_personel, ortalama: t.onerilen_personel };
            const farkRenk = t.fark > 0 ? 'success' : (t.fark < 0 ? 'danger' : 'secondary');
            const farkIsaret = t.fark > 0 ? '+' : '';
            tbody.innerHTML += `
                <tr>
                    <td class="fw-bold">${t.departman}</td>
                    <td>${t.mevcut_personel}</td>
                    <td>
                        ${personelAralik.min} - ${personelAralik.max}
                        <small class="text-muted d-block">Ort: ${personelAralik.ortalama}</small>
                    </td>
                    <td><span class="badge bg-${farkRenk}">${farkIsaret}${t.fark}</span></td>
                </tr>
            `;
            
            if(t.fark !== 0 || t.etki_analizi) {
                const etkiler = t.etki_analizi ? Object.entries(t.etki_analizi).map(([k, v]) => `<strong>${k}:</strong> ${v}`).join('<br>') : '';
                yorumDiv.innerHTML += `
                    <div class="alert alert-${farkRenk} alert-sm py-2 mb-2">
                        <strong>${t.departman}:</strong> ${t.analiz_aciklamasi || t.yonetici_aciklamasi}
                        ${etkiler ? `<div class="mt-2 small">${etkiler}</div>` : ''}
                        ${t.not ? `<small class="d-block mt-1 text-muted"><i>${t.not}</i></small>` : ''}
                    </div>
                `;
            }
        });
    } catch(e) {
        console.error('Personel ihtiyacı hatası:', e);
    }
}

// Gelecek Risk Analizi
async function gelecekRiskAnaliziYukle(periyot) {
    try {
        const res = await fetch(`/api/gelecek-risk-analizi?periyot=${periyot}`);
        if(!res.ok) return;
        const data = await res.json();
        
        const tbody = document.getElementById('gelecekRiskAnaliziTablosu') || document.getElementById('riskAnaliziTablosu');
        if(!tbody) return; // UI kaldırılmışsa sessiz çık
        
        const liste = Array.isArray(data?.risk_analizi) ? data.risk_analizi : (Array.isArray(data) ? data : []);
        if(!liste.length) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Risk verisi bulunamadı</td></tr>`;
            return;
        }
        
        tbody.innerHTML = '';
        liste.forEach(r => {
            const riskRenk = r.riskSeviyesi === 'Yüksek' ? 'danger' : (r.riskSeviyesi === 'Orta' ? 'warning' : 'success');
            tbody.innerHTML += `
                <tr>
                    <td class="fw-bold">${r.ay}</td>
                    <td><span class="badge bg-${riskRenk}">${r.riskSkoru ?? '-'} /100</span></td>
                    <td><span class="badge bg-${riskRenk}">${r.riskSeviyesi || '-'}</span></td>
                    <td class="small">${r.yonetici_uyarisi || r.uyari_mesaji || '-'}</td>
                </tr>
            `;
        });
    } catch(e) {
        console.error('Gelecek risk analizi hatası:', e);
    }
}

// Senaryo Analizi
// Senaryo verisini global olarak sakla
let mevcutSenaryoVerisi = null;
let mevcutSenaryoPeriyot = 6;

async function senaryoAnaliziYukle(periyot) {
    try {
        mevcutSenaryoPeriyot = periyot;
        const res = await fetch(`/api/senaryo-analizi?periyot=${periyot}`);
        if(!res.ok) return;
        const data = await res.json();

        // Gelen veriyi normalize et (backend hem { senaryolar: {...} } hem de doğrudan {...} dönebiliyor)
        const senaryoAnalizi = (data && data.senaryolar && !Array.isArray(data.senaryolar) && data.senaryolar.senaryolar)
            ? data.senaryolar
            : data;
        const senaryoListesi = Array.isArray(senaryoAnalizi?.senaryolar) ? senaryoAnalizi.senaryolar : [];

        // Senaryo verisini sakla (normalize edilmiş haliyle)
        mevcutSenaryoVerisi = senaryoAnalizi;
        
        // DSS Prensibi: Senaryo analizi göster (öneri değil, analiz)
        const oneriDiv = document.getElementById('senaryoAnaliziOneri');
        const degerlendirilebilirSenaryo = senaryoAnalizi.degerlendirilebilir_senaryo || senaryoAnalizi.onerilen_senaryo || 'realist';
        const oneriRenk = degerlendirilebilirSenaryo === 'iyimser' ? 'success' : (degerlendirilebilirSenaryo === 'realist' ? 'info' : 'warning');
        oneriDiv.className = `alert alert-${oneriRenk} mb-3`;
        oneriDiv.style.display = 'block';
        // DSS Prensibi: Senaryo tercihi yöneticiye aittir
        const analizGerekcesi = senaryoAnalizi.analiz_gerekcesi || senaryoAnalizi.gerekce || '';
        const yoneticiTercihiNotu = senaryoAnalizi.yonetici_tercihi_notu || '';
        
        oneriDiv.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong><i class="fas fa-lightbulb me-2"></i>Değerlendirilebilir Senaryo: ${degerlendirilebilirSenaryo.toUpperCase()}</strong><br>
                    <small>${analizGerekcesi}</small>
                    ${yoneticiTercihiNotu ? `<br><small class="text-muted"><i>${yoneticiTercihiNotu}</i></small>` : ''}
                    <br><small class="text-muted"><i class="fas fa-info-circle me-1"></i>Bu bir analizdir. Hangi senaryonun tercih edileceği yönetici kararına bağlıdır.</small>
                </div>
                <button onclick="window.senaryoKaydet()" class="btn btn-primary btn-sm">
                    <i class="fas fa-save me-2"></i>Kaydet
                </button>
            </div>
        `;
        
        const tbody = document.getElementById('senaryoAnaliziTablosu');
        tbody.innerHTML = '';
        
        if (!senaryoListesi || senaryoListesi.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Senaryo verisi bulunamadı.</td></tr>`;
            return;
        }

        senaryoListesi.forEach(s => {
            const iyimser = s?.iyimser || {};
            const realist = s?.realist || {};
            const kotumser = s?.kotumser || s?.kutumser || {};

            // İyimser
            tbody.innerHTML += `
                <tr class="table-success">
                    <td class="fw-bold">${s.ay}</td>
                    <td><span class="badge bg-success">İyimser</span></td>
                    <td>${iyimser.tahmini_doluluk ?? '-'}%</td>
                    <td>${formatPara(iyimser.tahmini_gelir ?? 0)}</td>
                    <td class="text-success fw-bold">${formatPara(iyimser.tahmini_kar ?? 0)}</td>
                    <td><span class="badge bg-success">${iyimser.risk_seviyesi ?? '-'}</span></td>
                </tr>
            `;
            // Gerçekçi
            tbody.innerHTML += `
                <tr class="table-info">
                    <td class="fw-bold">${s.ay}</td>
                    <td><span class="badge bg-info">Gerçekçi</span></td>
                    <td>${realist.tahmini_doluluk ?? '-'}%</td>
                    <td>${formatPara(realist.tahmini_gelir ?? 0)}</td>
                    <td class="text-info fw-bold">${formatPara(realist.tahmini_kar ?? 0)}</td>
                    <td><span class="badge bg-warning">${realist.risk_seviyesi ?? '-'}</span></td>
                </tr>
            `;
            // Kötümser
            tbody.innerHTML += `
                <tr class="table-danger">
                    <td class="fw-bold">${s.ay}</td>
                    <td><span class="badge bg-danger">Kötümser</span></td>
                    <td>${kotumser.tahmini_doluluk ?? '-'}%</td>
                    <td>${formatPara(kotumser.tahmini_gelir ?? 0)}</td>
                    <td class="text-danger fw-bold">${formatPara(kotumser.tahmini_kar ?? 0)}</td>
                    <td><span class="badge bg-danger">${kotumser.risk_seviyesi ?? '-'}</span></td>
                </tr>
            `;
        });
    } catch(e) {
        console.error('Senaryo analizi hatası:', e);
    }
}

// Senaryo kaydetme fonksiyonu
window.senaryoKaydet = async function() {
    if (!mevcutSenaryoVerisi) {
        alert('Kaydedilecek senaryo verisi bulunamadı. Lütfen önce senaryo analizini yükleyin.');
        return;
    }
    
    const senaryoAdi = prompt('Senaryo için bir isim girin:', 
        `Senaryo Analizi - ${new Date().toLocaleDateString('tr-TR')}`);
    
    if (!senaryoAdi) return;
    
    try {
        const res = await fetch('/api/senaryo-kaydet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                senaryo_adi: senaryoAdi,
                periyot: mevcutSenaryoPeriyot,
                senaryo_verisi: mevcutSenaryoVerisi
            })
        });
        
        const result = await res.json();
        
        if (res.ok && result.success) {
            alert(`✅ Senaryo başarıyla kaydedildi!\n\nSenaryo ID: ${result.senaryo_id}\nSenaryo Tipi: ${result.senaryo_tipi}\nDurum: ${result.sonuc_durumu}`);
            // Senaryo listesini yenile
            senaryoListesiniGetir();
        } else {
            alert('❌ Senaryo kaydedilemedi: ' + (result.error || 'Bilinmeyen hata'));
        }
    } catch(e) {
        console.error('Senaryo kaydetme hatası:', e);
        alert('❌ Senaryo kaydedilirken bir hata oluştu.');
    }
};

// Senaryo raporu görüntüleme
window.senaryoRaporuGoster = async function(senaryoId) {
    try {
        const res = await fetch(`/api/senaryo-rapor/${senaryoId}`);
        if (!res.ok) {
            alert('Rapor yüklenemedi.');
            return;
        }
        
        const rapor = await res.json();
        
        // Modal oluştur veya mevcut modal'ı kullan
        let modal = document.getElementById('senaryoRaporModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'senaryoRaporModal';
            modal.className = 'modal fade';
            modal.innerHTML = `
                <div class="modal-dialog modal-xl modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Senaryo Raporu</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="senaryoRaporIcerik"></div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Kapat</button>
                            <button type="button" class="btn btn-primary" onclick="window.senaryoRaporuIndir(${senaryoId})">
                                <i class="fas fa-download me-2"></i>PDF İndir
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        const icerik = document.getElementById('senaryoRaporIcerik');
        icerik.innerHTML = `
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="card p-3 mb-3">
                        <h6 class="text-muted mb-2">Senaryo Bilgileri</h6>
                        <p class="mb-1"><strong>Adı:</strong> ${rapor.senaryo_bilgileri.senaryo_adi}</p>
                        <p class="mb-1"><strong>Tipi:</strong> <span class="badge bg-primary">${rapor.senaryo_bilgileri.senaryo_tipi}</span></p>
                        <p class="mb-1"><strong>Durum:</strong> <span class="badge bg-${rapor.senaryo_bilgileri.sonuc_durumu === 'Başarılı' ? 'success' : 'warning'}">${rapor.senaryo_bilgileri.sonuc_durumu}</span></p>
                        <p class="mb-0"><strong>Tarih:</strong> ${new Date(rapor.senaryo_bilgileri.tarih).toLocaleString('tr-TR')}</p>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card p-3 mb-3">
                        <h6 class="text-muted mb-2">Analiz Özeti</h6>
                        <p class="mb-1"><strong>Değerlendirilebilir Senaryo:</strong> <span class="badge bg-info">${rapor.analiz_ozeti.degerlendirilebilir_senaryo || rapor.analiz_ozeti.onerilen_senaryo || 'realist'}</span></p>
                        <p class="mb-1"><strong>Periyot:</strong> ${rapor.analiz_ozeti.periyot} ay</p>
                        <p class="mb-1"><strong>Analiz Gerekçesi:</strong> ${rapor.analiz_ozeti.analiz_gerekcesi || rapor.analiz_ozeti.gerekce || ''}</p>
                        ${rapor.analiz_ozeti.yonetici_tercihi_notu ? `<p class="mb-0 small text-muted"><strong>Yönetici Tercihi Notu:</strong> ${rapor.analiz_ozeti.yonetici_tercihi_notu}</p>` : ''}
                    </div>
                </div>
            </div>
            
            <div class="card p-4 mb-4">
                <h5 class="mb-3">Ortalama Karlar</h5>
                <div class="row">
                    <div class="col-md-4">
                        <div class="text-center p-3 bg-success bg-opacity-10 rounded">
                            <small class="text-muted d-block">İyimser</small>
                            <h4 class="text-success mb-0">${formatPara(rapor.analiz_ozeti.ortalama_karlar.iyimser)}</h4>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="text-center p-3 bg-info bg-opacity-10 rounded">
                            <small class="text-muted d-block">Gerçekçi</small>
                            <h4 class="text-info mb-0">${formatPara(rapor.analiz_ozeti.ortalama_karlar.realist)}</h4>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="text-center p-3 bg-danger bg-opacity-10 rounded">
                            <small class="text-muted d-block">Kötümser</small>
                            <h4 class="text-danger mb-0">${formatPara(rapor.analiz_ozeti.ortalama_karlar.kutumser)}</h4>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card p-4 mb-4">
                <h5 class="mb-3">Değerlendirilebilecek Stratejiler</h5>
                <p class="mb-3"><strong>Strateji Analizi:</strong> ${rapor.degerlendirilebilir_stratejiler?.strateji_analizi || rapor.oneriler?.strateji || 'Analiz mevcut değil'}</p>
                <h6 class="mb-2">Alternatif Eylemler:</h6>
                <ul>
                    ${(rapor.degerlendirilebilir_stratejiler?.alternatif_eylemler || rapor.oneriler?.eylemler || []).map(e => `<li>${e}</li>`).join('')}
                </ul>
                ${rapor.degerlendirilebilir_stratejiler?.not ? `<p class="mt-3 small text-muted"><i class="fas fa-info-circle me-1"></i>${rapor.degerlendirilebilir_stratejiler.not}</p>` : ''}
            </div>
            
            <div class="card p-4">
                <h5 class="mb-3">Detaylı Senaryo Analizi</h5>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Ay</th>
                                <th>Senaryo</th>
                                <th>Doluluk</th>
                                <th>Gelir</th>
                                <th>Kar</th>
                                <th>Risk</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rapor.detayli_senaryolar.map(s => `
                                <tr class="table-success">
                                    <td>${s.ay}</td>
                                    <td><span class="badge bg-success">İyimser</span></td>
                                    <td>${s.iyimser.tahmini_doluluk}%</td>
                                    <td>${formatPara(s.iyimser.tahmini_gelir)}</td>
                                    <td>${formatPara(s.iyimser.tahmini_kar)}</td>
                                    <td><span class="badge bg-success">${s.iyimser.risk_seviyesi}</span></td>
                                </tr>
                                <tr class="table-info">
                                    <td>${s.ay}</td>
                                    <td><span class="badge bg-info">Gerçekçi</span></td>
                                    <td>${s.realist.tahmini_doluluk}%</td>
                                    <td>${formatPara(s.realist.tahmini_gelir)}</td>
                                    <td>${formatPara(s.realist.tahmini_kar)}</td>
                                    <td><span class="badge bg-warning">${s.realist.risk_seviyesi}</span></td>
                                </tr>
                                <tr class="table-danger">
                                    <td>${s.ay}</td>
                                    <td><span class="badge bg-danger">Kötümser</span></td>
                                    <td>${s.kutumser.tahmini_doluluk}%</td>
                                    <td>${formatPara(s.kutumser.tahmini_gelir)}</td>
                                    <td>${formatPara(s.kutumser.tahmini_kar)}</td>
                                    <td><span class="badge bg-danger">${s.kutumser.risk_seviyesi}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    } catch(e) {
        console.error('Rapor yükleme hatası:', e);
        alert('Rapor yüklenirken bir hata oluştu.');
    }
};

// Senaryo raporu indirme (PDF)
window.senaryoRaporuIndir = function(senaryoId) {
    alert('PDF indirme özelliği yakında eklenecek. Senaryo ID: ' + senaryoId);
    // TODO: PDF oluşturma kütüphanesi eklenebilir (jsPDF, pdfkit, vb.)
};


// Simülasyon sonrası senaryo karşılaştırma tablosunu güncelle
window.fiyatSimulasyonuYap = async function() { 
    const slider = document.getElementById('fiyatDegisimiSlider');
    if (!slider) {
        console.error('Fiyat değişimi slider bulunamadı!');
        return;
    }
    let val = slider.value;
    
    // Pazarlama Bütçesi
    const pSlider = document.getElementById('pazarlamaButcesiSlider');
    const pazarlamaButcesi = pSlider ? parseFloat(pSlider.value) : 0;

    // Personel Sayısı
    const perSlider = document.getElementById('personelSayisiSlider');
    const personelSayisi = perSlider ? parseInt(perSlider.value) : 0;

    const kampanyaTuru = 'yok'; // Pazarlama seçimi kaldırıldı
    if (val === "") val = 0; 
    
    const aiOzetKutusu = document.getElementById('aiOzetKutusu');
    if (aiOzetKutusu) {
        aiOzetKutusu.innerHTML = '<div class="text-white text-center small mt-2"><i class="fas fa-circle-notch fa-spin"></i> Hesaplıyor...</div>'; 
    }

    const simuleEtButonu = document.querySelector('button[onclick="window.fiyatSimulasyonuYap()"]');
    if(simuleEtButonu) {
        simuleEtButonu.disabled = true;
    }
    
    const res = await fetch('/api/simulasyon', { 
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body:JSON.stringify({
            fiyatDegisimi: parseFloat(val), 
            pazarlamaButcesi: pazarlamaButcesi,
            personelSayisi: personelSayisi,
            kampanyaTuru: kampanyaTuru
        }) 
    }); 
    const data = await res.json(); 

    if(simuleEtButonu) {
        simuleEtButonu.disabled = false;
    }
    
    // Senaryo karşılaştırma tablosunu göster ve doldur
    if(data.senaryoKarsilastirma) {
        document.getElementById('senaryoKarsilastirmaRow').style.display = 'block';
        const tbody = document.getElementById('senaryoKarsilastirmaTablosu');
        tbody.innerHTML = '';
        data.senaryoKarsilastirma.forEach(s => {
            // DSS Prensibi: Senaryo değerlendirmesi (öneri değil, analiz)
            const degerlendirilebilirBadge = s.onerilir ? '<span class="badge bg-info">Değerlendirilebilir</span>' : '<span class="badge bg-secondary">Dikkat Gerekli</span>';
            const riskRenk = s.risk <= 30 ? 'success' : (s.risk <= 60 ? 'warning' : 'danger');
            tbody.innerHTML += `
                <tr>
                    <td class="fw-bold">${s.senaryo}</td>
                    <td>${formatPara(s.gelir)}</td>
                    <td>${formatPara(s.kar)}</td>
                    <td><span class="badge bg-${riskRenk}">${s.risk}/100</span></td>
                    <td>${degerlendirilebilirBadge}</td>
                    <td class="small">${s.yoneticiYorumu || 'Analiz mevcut değil'}</td>
                </tr>
            `;
        });
    }
    
    // Mevcut kod devam ediyor...
    document.getElementById('kpiRow').style.display = 'flex'; 
    document.getElementById('kpiCiro').innerText = formatPara(data.realist.ciro); 
    const fEl = document.getElementById('kpiFark'); 
    fEl.innerHTML = (data.realist.fark >= 0 ? '+' : '') + formatPara(data.realist.fark); 
    fEl.className = `fw-bold m-0 display-6 ${data.realist.fark>=0?'text-success':'text-danger'}`; 
    document.getElementById('kpiKarCard').className = `card p-3 text-center border-bottom border-4 ${data.realist.fark>=0?'border-success':'border-danger'}`; 
    document.getElementById('kpiMarj').innerText = `%${data.realist.marj ? data.realist.marj.toFixed(1) : 0}`;
    if (aiOzetKutusu) {
        aiOzetKutusu.innerHTML = `<div class="alert bg-dark border ${data.realist.fark>=0?'border-success':'border-danger'} text-white p-3 shadow mt-3"><div class="mb-1 fw-bold text-${data.realist.fark>=0?'success':'danger'}">${data.ai_mesaj}</div></div>`; 
    }
    document.getElementById('chartRow').style.display = 'flex';
    
    // Grafikler (mevcut kod)
    const ctxBar = document.getElementById('senaryoGrafigi'); 
    if(window.senaryoChart instanceof Chart) window.senaryoChart.destroy(); 
    window.senaryoChart = new Chart(ctxBar, { 
            type: 'bar',
            data: {
            labels: ['Kötümser', 'Mevcut', 'Gerçekçi', 'İyimser'], 
                datasets: [{
                label: 'Net Kâr (TL)', 
                data: [data.kotumser.kar, data.mevcut.kar, data.realist.kar, data.iyimser.kar], 
                backgroundColor: ['#ef4444', '#64748b', '#3b82f6', '#22c55e'], 
                borderRadius: 8,
                borderWidth: 2, 
                borderColor: '#1e293b'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                            return formatPara(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                    ticks: { 
                        color: '#bdc3c7',
                        callback: function(value) {
                            return formatPara(value);
                        }
                    }, 
                    grid: { color: '#334155' } 
                    },
                    x: {
                    ticks: { color: '#fff', font: {weight:'bold'} },
                        grid: { display: false }
                    }
                }
            }
        });
    
    // Diğer grafikler (mevcut kod devam ediyor)...
    const ctxCiro = document.getElementById('ciroGrafigi'); 
    if(!ctxCiro) {
        console.warn('ciroGrafigi canvas bulunamadı');
        return;
    }
    if(window.ciroChart instanceof Chart) window.ciroChart.destroy();
    window.ciroChart = new Chart(ctxCiro, {
            type: 'line',
            data: {
            labels: ['Kötümser', 'Mevcut', 'Gerçekçi', 'İyimser'],
                datasets: [{
                label: 'Ciro (TL)',
                data: [data.kotumser.ciro, data.mevcut.ciro, data.realist.ciro, data.iyimser.ciro],
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: '#f59e0b'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                            return formatPara(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                    ticks: { 
                        color: '#bdc3c7',
                        callback: function(value) {
                            return formatPara(value);
                        }
                    },
                    grid: { color: '#334155' }
                    },
                    x: {
                    ticks: { color: '#fff', font: {weight:'bold'} },
                        grid: { display: false }
                    }
                }
            }
        });
    
    const ctxMarj = document.getElementById('marjGrafigi');
    if(window.marjChart instanceof Chart) window.marjChart.destroy();
    window.marjChart = new Chart(ctxMarj, {
        type: 'doughnut',
        data: {
            labels: ['Kötümser', 'Mevcut', 'Gerçekçi', 'İyimser'],
            datasets: [{
                data: [
                    data.kotumser.marj || 0,
                    data.mevcut.marj || 0,
                    data.realist.marj || 0,
                    data.iyimser.marj || 0
                ],
                backgroundColor: ['#ef4444', '#64748b', '#3b82f6', '#22c55e'],
                borderWidth: 2,
                borderColor: '#1e293b'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: 'white', usePointStyle: true }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return '%' + context.parsed.toFixed(1);
                        }
                    }
                }
            }
        } 
    }); 
    
    senaryoListesiniGetir();
};

// Strateji Simülatörü - Taslak Senaryo İşlemleri
window.simulasyonTaslakKaydet = function() {
    const fSlider = document.getElementById('fiyatDegisimiSlider');
    const pSlider = document.getElementById('pazarlamaButcesiSlider');
    const perSlider = document.getElementById('personelSayisiSlider');
    
    if (!fSlider) { alert('Simülasyon araçları bulunamadı.'); return; }
    
    const taslak = {
        fiyatDegisimi: fSlider.value,
        pazarlamaButcesi: pSlider ? pSlider.value : 0,
        personelSayisi: perSlider ? perSlider.value : 0,
        tarih: new Date().toLocaleString('tr-TR')
    };
    
    localStorage.setItem('simulasyonTaslak', JSON.stringify(taslak));
    alert(`Taslak senaryo kaydedildi. (${taslak.tarih})`);
    
    const btnYukle = document.getElementById('btnTaslakYukle');
    if(btnYukle) btnYukle.style.display = 'inline-block';
};

window.simulasyonTaslakYukle = function() {
    const taslakStr = localStorage.getItem('simulasyonTaslak');
    if (!taslakStr) { alert('Kaydedilmiş taslak bulunamadı.'); return; }
    
    try {
        const taslak = JSON.parse(taslakStr);
        const fSlider = document.getElementById('fiyatDegisimiSlider');
        const pSlider = document.getElementById('pazarlamaButcesiSlider');
        const perSlider = document.getElementById('personelSayisiSlider');
        
        if (fSlider) {
            fSlider.value = taslak.fiyatDegisimi;
            fSlider.dispatchEvent(new Event('input'));
        }
        if (pSlider) {
            pSlider.value = taslak.pazarlamaButcesi;
            pSlider.dispatchEvent(new Event('input'));
        }
        if (perSlider && taslak.personelSayisi !== undefined) {
            perSlider.value = taslak.personelSayisi;
            perSlider.dispatchEvent(new Event('input'));
        }
        alert(`Taslak yüklendi. (Kayıt: ${taslak.tarih})`);
    } catch(e) { console.error('Taslak yükleme hatası:', e); }
};

function simulasyonTaslakArayuzuEkle() {
    const slider = document.getElementById('fiyatDegisimiSlider');
    if (slider) {
        let parent = slider.closest('.card-body') || slider.parentElement;
        if (parent && !document.getElementById('taslakKontrolDiv')) {
            const div = document.createElement('div');
            div.id = 'taslakKontrolDiv';
            div.className = 'd-flex justify-content-end gap-2 mt-3 pt-3 border-top';
            const taslakVar = localStorage.getItem('simulasyonTaslak') !== null;
            div.innerHTML = `<button onclick="window.simulasyonTaslakKaydet()" class="btn btn-sm btn-outline-secondary"><i class="fas fa-save me-1"></i>Taslak Kaydet</button><button id="btnTaslakYukle" onclick="window.simulasyonTaslakYukle()" class="btn btn-sm btn-outline-primary" style="display: ${taslakVar ? 'inline-block' : 'none'}"><i class="fas fa-upload me-1"></i>Taslak Yükle</button>`;
            parent.appendChild(div);
        }
    }
}

// ========== PREMIUM ANALYTICS FUNCTIONS ==========
let odaGrafikleri = [], detayChart = null, rakipChartAnalytics = null, pastaChart = null;

window.analyticsSimulasyonGuncelle = async function() {
    const yuzdeSlider = document.getElementById('yuzdeSlider');
    if(!yuzdeSlider) return;
    
    const yuzde = yuzdeSlider.value;
    const label = document.getElementById('yuzdeLabel');
    if(label) {
        label.innerText = (yuzde > 0 ? '+' : '') + yuzde + '%';
        label.style.color = yuzde > 0 ? '#10b981' : (yuzde < 0 ? '#ef4444' : '#1e293b');
    }

    try {
        const res = await fetch('/api/simule-et', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ yuzdeDegisim: parseFloat(yuzde) })
        });
        const data = await res.json();
        
        analyticsKartlariCiz(data.kartlar);
        analyticsPastaGrafigiCiz(data.kartlar);
        analyticsSenaryoGrafiginiCiz(data.grafik);
        
        const netKarLabel = document.getElementById('netKarLabel');
        if(netKarLabel) netKarLabel.innerText = data.genel.toLocaleString('tr-TR') + ' ₺';
        const rakipOrtalamaLabel = document.getElementById('rakipOrtalamaLabel');
        if(rakipOrtalamaLabel && data.rakipOrtalama) rakipOrtalamaLabel.innerText = data.rakipOrtalama.toLocaleString('tr-TR') + ' ₺';
    } catch(e) { console.error("Analytics Hata:", e); }
};

function analyticsKartlariCiz(kartlar) {
    const row = document.getElementById('odaKartlariRow');
    if(!row) return;
    row.innerHTML = "";
    const renkler = { 'Standart': '#38bdf8', 'Deluxe': '#facc15', 'Suit': '#f87171', 'Kral Dairesi': '#4ade80' };
    for (const [tip, veri] of Object.entries(kartlar)) {
        row.innerHTML += `
        <div class="col-12"><div class="card p-3 d-flex justify-content-between align-items-center border" style="border-left: 4px solid ${renkler[tip] || '#1e293b'} !important; cursor: pointer;" onclick="window.analyticsDetayAc('${tip}', 'rakip')">
            <div class="d-flex align-items-center"><div class="me-3 opacity-50"><i class="fas fa-bed"></i></div><div><h6 class="fw-bold m-0">${tip}</h6><small class="text-muted">Analiz için tıkla</small></div></div>
            <span class="badge bg-light border border-secondary py-2 px-3 rounded-pill">${veri.fiyat.toLocaleString('tr-TR')} ₺</span>
        </div></div>`;
    }
}

function analyticsPastaGrafigiCiz(kartlar) {
    const ctxEl = document.getElementById('fiyatPastaGrafigi');
    if(!ctxEl) return;
    const ctx = ctxEl.getContext('2d');
    if (pastaChart) pastaChart.destroy();
    const labels = Object.keys(kartlar);
    pastaChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data: Object.values(kartlar).map(k => k.fiyat), backgroundColor: ['#38bdf8', '#facc15', '#f87171', '#4ade80'], borderWidth: 0 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { display: false } },
            onClick: (e, el) => { if(el.length > 0) window.analyticsDetayAc(labels[el[0].index], 'grafik'); },
            onHover: (e, el) => { e.native.target.style.cursor = el[0] ? 'pointer' : 'default'; }
        }
    });
}

function analyticsSenaryoGrafiginiCiz(data) {
    const container = document.getElementById('senaryoGrafikleriContainer');
    if(!container) return;
    odaGrafikleri.forEach(c => c.destroy()); odaGrafikleri = []; container.innerHTML = "";
    const renkler = { 'Standart': '#38bdf8', 'Deluxe': '#facc15', 'Suit': '#f87171', 'Kral Dairesi': '#4ade80' };

    if (data.dagilim) {
        for (const [tip, degerler] of Object.entries(data.dagilim)) {
            const colDiv = document.createElement('div'); colDiv.className = 'col-md-6';
            const chartId = `chart_${tip.replace(/\s/g, '')}`;
            colDiv.innerHTML = `
                <div class="p-3 rounded-4 h-100 bg-light border">
                    <div class="d-flex align-items-center mb-3"><span class="d-inline-block rounded-circle me-2" style="width:10px; height:10px; background-color: ${renkler[tip]}"></span><h6 class="m-0 fw-bold">${tip}</h6></div>
                    <div style="height: 200px;"><canvas id="${chartId}"></canvas></div>
                </div>`;
            container.appendChild(colDiv);

            const ctx = document.getElementById(chartId).getContext('2d');
            let gradient = ctx.createLinearGradient(0, 0, 0, 200);
            gradient.addColorStop(0, (renkler[tip] || '#fff') + '40'); gradient.addColorStop(1, (renkler[tip] || '#fff') + '00');

            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.labels,
                    datasets: [
                        { label: 'İyimser', data: degerler.map(v => Math.round(v * 1.2)), borderColor: '#4ade80', borderWidth: 1, borderDash: [3, 3], pointRadius: 0, tension: 0.4 },
                        { label: 'Realist', data: degerler, borderColor: renkler[tip] || '#fff', backgroundColor: gradient, borderWidth: 2, fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 6 },
                        { label: 'Kötümser', data: degerler.map(v => Math.round(v * 0.8)), borderColor: '#f87171', borderWidth: 1, borderDash: [3, 3], pointRadius: 0, tension: 0.4 }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                    scales: { x: { grid: { display: false }, ticks: { font: {size: 10}, color: '#64748b' } }, y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: {size: 10}, color: '#64748b', callback: v => (v/1000) + 'k' } } }
                }
            });
            odaGrafikleri.push(chart);
        }
    }
}

window.analyticsDetayAc = async function(tip, mod) {
    const modalEl = document.getElementById('odaDetayModal');
    if(!modalEl) return;
    const modal = new bootstrap.Modal(modalEl);
    const baslik = document.getElementById('modalOdaBaslik');
    const dGrafik = document.getElementById('bolumGrafik'), dRakip = document.getElementById('bolumRakip');
    if(dGrafik) dGrafik.classList.add('d-none');
    if(dRakip) dRakip.classList.add('d-none');

    if (mod === 'grafik') { 
        if(baslik) baslik.innerHTML = `<i class="fas fa-chart-line text-info me-2"></i> ${tip} - Trend Analizi`; 
        if(dGrafik) dGrafik.classList.remove('d-none'); 
    } else { 
        if(baslik) baslik.innerHTML = `<i class="fas fa-search-dollar text-warning me-2"></i> ${tip} - Piyasa Analizi`; 
        if(dRakip) dRakip.classList.remove('d-none'); 
    }
    modal.show();

    try {
        const res = await fetch(`/api/rakip-detay/${tip}`);
        const data = await res.json();

        if (mod === 'grafik') {
            const ctxEl = document.getElementById('detayGrafigi');
            if(!ctxEl) return;
            const ctx = ctxEl.getContext('2d');
            if(detayChart) detayChart.destroy();
            let grad = ctx.createLinearGradient(0, 0, 0, 400); grad.addColorStop(0, 'rgba(56, 189, 248, 0.5)'); grad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
            detayChart = new Chart(ctx, { 
                type: 'line', 
                data: { labels: data.grafik.labels, datasets: [{ label: 'Fiyat', data: data.grafik.datasets[0].data, borderColor: '#38bdf8', backgroundColor: grad, borderWidth: 3, fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 8 }] },
                options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: {display:false}, tooltip: { backgroundColor:'rgba(255,255,255,0.95)', titleColor:'#1e293b', bodyColor:'#1e293b', borderColor:'#e2e8f0', callbacks:{ label: c => c.parsed.y + ' ₺' } } }, scales: { x:{grid:{display:false}}, y:{grid:{color:'rgba(0,0,0,0.05)', borderDash:[5,5]}} } } 
            });
        } else {
            const liste = document.getElementById('modalRakipListesi');
            if(!liste) return;
            liste.innerHTML = "";
            const bizFiyat = data.grafik.datasets[0].data.slice(-1)[0] || 0;
            let gLabels = ["BİZ"], gData = [bizFiyat], gRenk = ["#38bdf8"];

            data.rakipler.forEach(r => {
                gLabels.push(r.otel.split(' ')[0]); gData.push(r.fiyat); gRenk.push(r.fiyat > bizFiyat ? "#f87171" : "#facc15");
                let durum = r.fiyat > bizFiyat ? '<span class="badge bg-danger bg-opacity-10 text-danger">Pahalı</span>' : '<span class="badge bg-success bg-opacity-10 text-success">Uygun</span>';
                liste.innerHTML += `<tr><td>${r.otel}</td><td class="text-end fw-bold">${r.fiyat.toLocaleString()} ₺</td><td class="text-end">${durum}</td></tr>`;
            });

            const ctx2El = document.getElementById('rakipGrafigiAnalytics');
            if(!ctx2El) return;
            const ctx2 = ctx2El.getContext('2d');
            if(rakipChartAnalytics) rakipChartAnalytics.destroy();
            rakipChartAnalytics = new Chart(ctx2, { type: 'bar', data: { labels: gLabels, datasets: [{ data: gData, backgroundColor: gRenk, borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: {display:false} }, scales: { x:{grid:{display:false}}, y:{grid:{color:'rgba(255,255,255,0.05)'}} } } });
        }
    } catch(e) { console.error(e); }
};