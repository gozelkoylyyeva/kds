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
            // KPI'lar ve Öneriler
            gelismisKPILeriYukle();
            onerileriYukle();
            // Tahminler ve Analizler - Cache'i bypass etmek için timestamp ekle
            dolulukTahminiPeriyotDegistir(6); // Doluluk tahmini tablosunu yükle
            rakipFiyatAnaliziYukle();
            gelirKarTahminiPeriyotDegistir(6);
            personelIhtiyaciYukle();
            gelecekRiskAnaliziYukle(6);
            senaryoAnaliziYukle(6);
            // Yıllık karşılaştırma - Canvas'ın hazır olması için biraz daha bekleyelim
            setTimeout(() => {
                yillikKarsilastirmaYukle();
            }, 500);
        }, 300);
    }
    
    
    // Strateji Simülatörü sayfası açıldığında grafikleri ve analytics'i yükle
    if(id === 'sayfa-simulasyon') {
        setTimeout(() => {
            // Detaylı analiz grafiklerini yükle
            kararDestekGrafikleriniYukle();
            
            // Taslak arayüzü kaldırıldı
            
            // Tab değiştiğinde analytics'i yükle
            const analyticsTab = document.getElementById('tab-analytics');
            if(analyticsTab) {
                analyticsTab.addEventListener('shown.bs.tab', () => {
                    window.analyticsSimulasyonGuncelle();
                });
            }
            
            // Kaydedilen Senaryolar listesini yükle
            senaryoListesiniGetir();
        }, 300);
    }
    
    setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 100); 
};
window.cikisYap = function() { localStorage.removeItem('girisYapildi'); window.location.href = '/login.html'; };
window.excelIndir = async function() { alert("Rapor hazırlanıyor..."); };

// Dashboard Export ve Yenileme Fonksiyonları - Power BI/Excel Style
window.exportDashboardToExcel = function() {
    try {
        // Tüm KPI verilerini topla
        const kpiData = {
            'Doluluk Oranı': document.getElementById('kpiDoluluk')?.textContent || '-',
            'Toplam Gelir': document.getElementById('kpiGelir')?.textContent || '-',
            'Kar Marjı': document.getElementById('kpiKarMarji')?.textContent || '-',
            'İptal Oranı': document.getElementById('kpiIptalOrani')?.textContent || '-'
        };
        
        // Excel formatında veri hazırla
        const wsData = [
            ['HotelVision - Karar Destek Platformu', '', '', ''],
            ['Dashboard Verileri', '', '', ''],
            ['Oluşturulma Tarihi', new Date().toLocaleString('tr-TR'), '', ''],
            ['', '', '', ''],
            ['KPI Metrikleri', '', '', ''],
            ['Metrik', 'Değer', '', ''],
            ['Doluluk Oranı', kpiData['Doluluk Oranı'], '', ''],
            ['Toplam Gelir', kpiData['Toplam Gelir'], '', ''],
            ['Kar Marjı', kpiData['Kar Marjı'], '', ''],
            ['İptal Oranı', kpiData['İptal Oranı'], '', '']
        ];
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, 'Dashboard');
        
        const dosyaAdi = `Dashboard_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, dosyaAdi);
        
        console.log('✅ Dashboard Excel\'e aktarıldı:', dosyaAdi);
    } catch(e) {
        console.error('Excel export hatası:', e);
        alert('Excel\'e aktarılırken bir hata oluştu.');
    }
};

window.refreshDashboard = function() {
    // Dashboard'u yenile
    const sayfaId = document.querySelector('.page-section.active')?.id;
    if (sayfaId === 'sayfa-ozet') {
        // Genel Bakış sayfasındaki tüm verileri yenile
        gelismisKPILeriYukle();
        grafigiCiz();
        dolulukTahminiYukle(6);
        gelirKarTahminiYukle(6);
        personelIhtiyaciYukle();
        rakipFiyatAnaliziYukle();
        
        // Son güncelleme zamanını güncelle
        document.getElementById('dashboardLastUpdate').textContent = new Date().toLocaleTimeString('tr-TR');
        
        // Visual feedback
        const refreshBtn = event?.target?.closest('button');
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Yenileniyor...';
            setTimeout(() => {
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt me-1"></i>Yenile';
            }, 1000);
        }
    }
};

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
        // Pazarlama Bütçesi - Manuel giriş (kısıt yok)
        const pInput = document.getElementById('pazarlamaButcesiInput');

        if (pInput) {
            // Sadece input alanını dinle, kısıt yok
            pInput.addEventListener('input', function() {
                // Herhangi bir değer girilebilir, kısıt yok
                const value = parseFloat(this.value) || 0;
                // Negatif değer kontrolü (opsiyonel - kullanıcı isterse negatif de girebilir)
                // if (value < 0) this.value = 0;
            });
        }
        
        // Personel Sayısı - Manuel giriş (sadece tam sayı, kısıt yok)
        const personelSayisiInput = document.getElementById('personelSayisiInput');
        
        if (personelSayisiInput) {
            // Sadece sayısal değerleri kabul et
            personelSayisiInput.addEventListener('input', function() {
                // Sadece tam sayı kabul et (ondalık sayıları temizle)
                let value = this.value.replace(/[^0-9]/g, '');
                if (value === '') value = '0';
                this.value = value;
            });
            
            // Paste event'i için de temizleme
            personelSayisiInput.addEventListener('paste', function(e) {
                e.preventDefault();
                const pastedText = (e.clipboardData || window.clipboardData).getData('text');
                const numbersOnly = pastedText.replace(/[^0-9]/g, '');
                this.value = numbersOnly || '0';
            });
            
            // Blur event'i - boşsa varsayılan değer
            personelSayisiInput.addEventListener('blur', function() {
                if (this.value === '' || this.value === '0') {
                    this.value = '20'; // Varsayılan değer
                }
            });
        }
        
        // Eski slider kodları için fallback (eğer hala varsa)
        // Eski slider kodları kaldırıldı - sadece input alanları kullanılıyor (kısıt yok)
        
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
        const tumSenaryolar = Array.isArray(data) ? data : (data.senaryolar || []);
        
        // Son 5 senaryoyu al (tarihe göre sıralanmış, en yeni en üstte)
        const senaryolar = tumSenaryolar
            .sort((a, b) => new Date(b.tarih) - new Date(a.tarih)) // En yeni en üstte
            .slice(0, 5); // Sadece ilk 5 tanesini al
        
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
            try {
                const veri = typeof s.sonuc_veri === 'string' ? JSON.parse(s.sonuc_veri) : (s.sonuc_veri || {});
            const tarih = new Date(s.tarih).toLocaleString('tr-TR', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'});
                
                // Senaryo tipi badge rengi
                let tipBadge = 'bg-secondary';
                let tipText = 'Bilinmiyor';
                if (s.senaryo_tipi === 'iyimser') {
                    tipBadge = 'bg-success';
                    tipText = 'İyimser';
                } else if (s.senaryo_tipi === 'kotumser') {
                    tipBadge = 'bg-danger';
                    tipText = 'Kötümser';
                } else if (s.senaryo_tipi === 'realist' || s.senaryo_tipi === 'gerçekçi') {
                    tipBadge = 'bg-info';
                    tipText = 'Gerçekçi';
                } else if (s.senaryo_tipi === 'simulasyon') {
                    tipBadge = 'bg-primary';
                    tipText = 'Simülasyon';
                }
                
                // Kâr değerini hesapla (simülasyon veya senaryo analizi)
                let ortalamaKar = 0;
                if (veri.net_kar !== undefined) {
                    // Simülasyon verisi
                    ortalamaKar = veri.net_kar || 0;
                } else if (veri.ortalama_karlar) {
                    // Senaryo analizi verisi
                    ortalamaKar = veri.ortalama_karlar.realist || veri.ortalama_karlar.gerçekçi || 
                                 veri.ortalama_karlar.iyimser || veri.ortalama_karlar.kotumser || 0;
                } else if (veri.realist) {
                    ortalamaKar = veri.realist.tahmini_kar || veri.realist.kar || 0;
                } else if (veri.kar !== undefined) {
                    ortalamaKar = veri.kar;
                }
                
                const durumBadge = s.sonuc_durumu === 'Başarılı' ? 'bg-success' : 
                                  (s.sonuc_durumu === 'Orta' ? 'bg-warning' : 'bg-danger');
                const durumText = s.sonuc_durumu || 'Kaydedildi';
            
            tbody.innerHTML += `
                <tr>
                    <td>${tarih}</td>
                        <td>${s.senaryo_adi || 'İsimsiz Senaryo'}</td>
                        <td><span class="badge ${tipBadge}">${tipText}</span></td>
                    <td class="fw-bold">${formatPara(ortalamaKar)}</td>
                        <td><span class="badge ${durumBadge}">${durumText}</span></td>
                    <td>
                        <button onclick="window.senaryoRaporuGoster(${s.id})" class="btn btn-sm btn-outline-primary">
                            <i class="fas fa-file-alt me-1"></i>Rapor
                        </button>
                    </td>
                </tr>
            `;
            } catch (err) {
                console.error('Senaryo listesi render hatası:', err, s);
                // Hatalı senaryo için basit bir satır göster
                tbody.innerHTML += `
                    <tr>
                        <td colspan="6" class="text-center text-muted small">Hatalı senaryo verisi (ID: ${s.id})</td>
                    </tr>
                `;
            }
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
        
        // Mevcut chart'ı temizle
        if (window.mevsimChart instanceof Chart) {
            try {
                window.mevsimChart.destroy();
            } catch(e) {
                console.warn('Mevsim chart destroy hatası:', e);
            }
        }
        if (Chart.getChart(ctx)) {
            try {
                Chart.getChart(ctx).destroy();
            } catch(e) {
                console.warn('Chart registry destroy hatası:', e);
            }
        }
    
    const renkler = data.map(d => ({
        'Kış':'#3b82f6',
        'İlkbahar':'#10b981',
        'Yaz':'#f59e0b',
        'Sonbahar':'#8b5cf6'
    })[d.mevsim] || '#64748b'); 
        
        // Geliştirilmiş tooltip için veri hazırla
        const toplamRezervasyon = data.reduce((sum, d) => sum + (d.rezervasyon_sayisi || 0), 0);
        const toplamGelir = data.reduce((sum, d) => sum + (parseFloat(d.toplam_gelir) || 0), 0);
    
    window.mevsimChart = new Chart(ctx, { 
        type: 'doughnut', 
        data: { 
            labels: data.map(d => d.mevsim), 
            datasets: [{ 
                    data: data.map(d => d.rezervasyon_sayisi || 0), 
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
                            title: function(context) {
                                return context[0].label;
                            },
                        label: function(context) {
                                const index = context.dataIndex;
                                const item = data[index];
                                const rezervasyonSayisi = item.rezervasyon_sayisi || 0;
                                const percentage = toplamRezervasyon > 0 ? ((rezervasyonSayisi / toplamRezervasyon) * 100).toFixed(1) : 0;
                                const gelir = parseFloat(item.toplam_gelir) || 0;
                                const ortalamaFiyat = parseFloat(item.ortalama_fiyat) || 0;
                                const ortalamaKonaklama = parseFloat(item.ortalama_konaklama_suresi) || 0;
                                
                                return [
                                    `Rezervasyon: ${rezervasyonSayisi.toLocaleString('tr-TR')} (${percentage}%)`,
                                    `Toplam Gelir: ${gelir.toLocaleString('tr-TR')} ₺`,
                                    `Ortalama Fiyat: ${ortalamaFiyat.toLocaleString('tr-TR')} ₺`,
                                    `Ort. Konaklama: ${ortalamaKonaklama.toFixed(1)} gece`
                                ];
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
        // Cache'i bypass etmek için timestamp ekle
        const timestamp = new Date().getTime();
        const res = await fetch(`/api/aylik-doluluk?_t=${timestamp}`); 
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
        const res = await fetch(`/api/doluluk-tahmini?months=${periyot}`);
        if(!res.ok) throw new Error('API hatası');
        const data = await res.json();
        
        const ctx = document.getElementById('dolulukOraniGrafigi');
        if (!ctx) return;

        if (kararDestekCharts.dolulukOrani) kararDestekCharts.dolulukOrani.destroy();

        // Null check ekle
        if (!data || !data.tahminler || !Array.isArray(data.tahminler) || data.tahminler.length === 0) {
            console.warn('Doluluk tahmini verisi bulunamadı (simülasyon), fallback veri kullanılıyor');
            // Fallback veri oluştur
            const fallbackLabels = [];
            const fallbackData = [];
            for (let i = 0; i < periyot; i++) {
                const tarih = new Date();
                tarih.setMonth(tarih.getMonth() + i);
                fallbackLabels.push(tarih.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' }));
                fallbackData.push(65 + Math.random() * 10);
            }
            data = { tahminler: fallbackLabels.map((label, i) => ({ ay: label, tahmini_doluluk: fallbackData[i] })) };
        }

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
        const res = await fetch('/api/fiyat-trend-oda-tipi');
        if(!res.ok) throw new Error('API hatası');
        const data = await res.json();
        
        const ctx = document.getElementById('fiyatEsneklikGrafigi');
        if (!ctx) return;

        if (kararDestekCharts.fiyatEsneklik) kararDestekCharts.fiyatEsneklik.destroy();

        // Oda tipine göre verileri hazırla
        const labels = data.aylar || [];
        const odaTipleri = data.oda_tipleri || ['Standart', 'Deluxe', 'Suit', 'Kral Dairesi'];
        const renkler = {
            'Standart': '#3b82f6',
            'Deluxe': '#10b981',
            'Suit': '#f59e0b',
            'Kral Dairesi': '#ef4444'
        };

        const datasets = odaTipleri.map(tip => {
            const fiyatlar = data.veriler[tip] || [];
            return {
                label: tip,
                data: fiyatlar,
                borderColor: renkler[tip] || '#64748b',
                backgroundColor: renkler[tip] ? `${renkler[tip]}20` : 'rgba(100, 116, 139, 0.1)',
                borderWidth: 2,
                fill: false,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: renkler[tip] || '#64748b',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            };
        });

        kararDestekCharts.fiyatEsneklik = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: { size: 12, weight: '500' }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y;
                                if (value === null || value === undefined) {
                                    return `${context.dataset.label}: Veri yok`;
                                }
                                return `${context.dataset.label}: ${formatPara(value)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: false, 
                        ticks: { 
                            color: '#94a3b8', 
                            callback: v => formatPara(v) 
                        }, 
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        title: {
                            display: true,
                            text: 'Fiyat (TL)',
                            color: '#94a3b8'
                        }
                    },
                    x: { 
                        ticks: { color: '#94a3b8' }, 
                        grid: { display: false },
                        title: {
                            display: true,
                            text: 'Ay',
                            color: '#94a3b8'
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                }
            }
        });
    } catch(e) { 
        console.error('Fiyat geçmiş trend hatası:', e);
        // Hata durumunda fallback göster
        const ctx = document.getElementById('fiyatEsneklikGrafigi');
        if (ctx && !kararDestekCharts.fiyatEsneklik) {
            kararDestekCharts.fiyatEsneklik = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: []
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
    }
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
        if(!res.ok) {
            console.error('Risk analizi API hatası:', res.status, res.statusText);
            // Fallback veri göster
            const ctx = document.getElementById('riskAnaliziGrafigi');
            if(ctx) {
                const tablo = document.getElementById('riskAnaliziTablosu');
                if(tablo) {
                    tablo.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Risk analizi şu anda yapılamıyor</td></tr>`;
                }
            }
            return;
        }
        const data = await res.json();
        const liste = Array.isArray(data?.risk_analizi) ? data.risk_analizi : (Array.isArray(data) ? data : []);
        const ctxEl = document.getElementById('riskAnaliziGrafigi');
        if(!ctxEl) {
            console.warn('riskAnaliziGrafigi canvas bulunamadı - grafik atlanıyor');
            // Canvas yoksa sadece tabloyu göster
            const tablo = document.getElementById('riskAnaliziTablosu');
            if(tablo && liste.length > 0) {
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
            return;
        }
        // Canvas context kontrolü
        let ctx;
        try {
            ctx = ctxEl.getContext('2d');
        if(!ctx) {
                console.warn('riskAnaliziGrafigi canvas context alınamadı');
                return;
            }
        } catch(e) {
            console.warn('Canvas context hatası:', e);
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
        if(!ctxEl || !ctx || !liste.length) return;
        
        // Mevcut chart'ı temizle
        if (window.riskAnaliziChart) {
            try {
                window.riskAnaliziChart.destroy();
            } catch(e) {
                console.warn('Risk analizi chart destroy hatası:', e);
            }
            window.riskAnaliziChart = null;
        }
        
        // Chart.js'in internal registry'sinden de temizle
        if (Chart.getChart(ctx)) {
            try {
                Chart.getChart(ctx).destroy();
            } catch(e) {
                console.warn('Chart registry destroy hatası:', e);
            }
        }

        const renkSkoru = (skor) => skor > 60 ? '#ef4444' : (skor > 30 ? '#f59e0b' : '#10b981');
        const labels = liste.map(r => r.ay);
        const skorlar = liste.map(r => r.riskSkoru || 0);
        const renkler = skorlar.map(s => renkSkoru(s));

        // Mevcut chart'ı temizle (zaten yukarıda temizlendi ama tekrar kontrol)
        if(kararDestekCharts.riskAnalizi) {
            try {
                kararDestekCharts.riskAnalizi.destroy();
            } catch(e) {
                console.warn('Risk analizi chart destroy hatası (ikinci):', e);
            }
            kararDestekCharts.riskAnalizi = null;
        }

        // Chart instance'ını oluştur ve kaydet
        const riskChartInstance = new Chart(ctx, {
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
        
        // Chart instance'larını kaydet
        kararDestekCharts.riskAnalizi = riskChartInstance;
        window.riskAnaliziChart = riskChartInstance;
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
        if(dolulukEl && kpi.doluluk_orani) {
            const dolulukDeger = kpi.doluluk_orani.mevcut_deger || 0;
            dolulukEl.innerText = `${dolulukDeger.toFixed(1)}%`;
            
            const dolulukDegisim = kpi.doluluk_orani.degisim_yuzde || 0;
            const dolulukYon = dolulukDegisim >= 0 ? 'up' : 'down';
            const dolulukRenk = dolulukDegisim >= 0 ? 'success' : 'danger';
            if(dolulukDegisimEl) {
                dolulukDegisimEl.innerHTML = `
                    <i class="fas fa-arrow-${dolulukYon} me-2 text-${dolulukRenk}"></i>
                    <span class="small text-${dolulukRenk}">${Math.abs(dolulukDegisim).toFixed(1)}% ${dolulukDegisim >= 0 ? 'artış' : 'azalış'}</span>
                `;
            }
        }
        
        // Toplam Gelir
        const gelirEl = document.getElementById('kpiGelir');
        const gelirDegisimEl = document.getElementById('kpiGelirDegisim');
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
        }
        
        // Kar Marjı
        const karMarjiEl = document.getElementById('kpiKarMarji');
        const karMarjiDegisimEl = document.getElementById('kpiKarMarjiDegisim');
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
        }
        
        // İptal Oranı
        const iptalEl = document.getElementById('kpiIptalOrani');
        const iptalDegisimEl = document.getElementById('kpiIptalOraniDegisim');
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
            // Element bulunamadıysa sadece uyarı ver, hata fırlatma
            console.warn('Analiz listesi container bulunamadı (sayfa-simulasyon sayfasında olmayabilir)');
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
// Aylık rapor fonksiyonları kaldırıldı

// ========== TAHMİN VE KARAR DESTEK FONKSİYONLARI ==========

// Doluluk Tahmini
// Doluluk Tahmini Periyot Değiştirme
window.dolulukTahminiPeriyotDegistir = function(periyot, btn) {
    if (btn) {
        const group = btn.parentElement;
        group.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    } else {
        // Manuel çağrı durumunda butonları güncelle
        document.getElementById('dolulukTahminiBtn6')?.classList.remove('active');
        document.getElementById('dolulukTahminiBtn12')?.classList.remove('active');
        if (periyot === 6) {
            document.getElementById('dolulukTahminiBtn6')?.classList.add('active');
        } else {
            document.getElementById('dolulukTahminiBtn12')?.classList.add('active');
        }
    }
    dolulukTahminiYukle(periyot);
};

async function dolulukTahminiYukle(periyot) {
    try {
        console.log(`📊 Doluluk tahmini yükleniyor: ${periyot} ay`);
        // Cache'i bypass etmek için timestamp ekle
        const timestamp = new Date().getTime();
        const res = await fetch(`/api/doluluk-tahmini?months=${periyot}&_t=${timestamp}`);
        if(!res.ok) throw new Error('API hatası');
        const data = await res.json();
        console.log(`📊 Doluluk tahmini verisi alındı:`, {
            tahminler_sayisi: data.tahminler?.length || 0,
            gecmis_veriler_sayisi: data.gecmis_veriler?.length || 0,
            toplam: (data.tahminler?.length || 0) + (data.gecmis_veriler?.length || 0)
        });
        
        const container = document.getElementById('dolulukTahminiListesi');
        if (!container) return;

        const ctx = document.getElementById('dolulukTahminiGrafigi');
        if (!ctx) return;

        // Mevcut chart'ı temizle
        if (kararDestekCharts.dolulukTahmini) {
            try {
                kararDestekCharts.dolulukTahmini.destroy();
    } catch(e) {
                console.warn('Doluluk tahmini chart destroy hatası:', e);
            }
            kararDestekCharts.dolulukTahmini = null;
        }
        if (Chart.getChart(ctx)) {
            try {
                Chart.getChart(ctx).destroy();
            } catch(e) {
                console.warn('Chart registry destroy hatası:', e);
            }
        }

        // Null check ekle - tahminler yoksa fallback oluştur ama gecmis_veriler varsa onları kullan
        if (!data || (!data.tahminler || !Array.isArray(data.tahminler) || data.tahminler.length === 0)) {
            console.warn('⚠️ Doluluk tahmini gelecek verisi bulunamadı, fallback veri oluşturuluyor');
            // Fallback veri oluştur
            const fallbackLabels = [];
            const fallbackData = [];
            for (let i = 0; i < periyot; i++) {
                const tarih = new Date();
                tarih.setMonth(tarih.getMonth() + i + 1);
                fallbackLabels.push(tarih.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' }));
                fallbackData.push(65 + Math.random() * 10); // 65-75 arası rastgele
            }
            data = {
                tahminler: fallbackLabels.map((label, i) => ({
                    ay: label,
                    tahmini_doluluk: fallbackData[i],
                    tahmini_doluluk_araligi: {
                        min: fallbackData[i] - 5,
                        max: fallbackData[i] + 5,
                        ortalama: fallbackData[i]
                    }
                })),
                gecmis_veriler: data.gecmis_veriler || []
            };
        }

        // Sadece gelecek tahminleri kullan (geçmiş verileri kaldır)
        const gelecekTahminler = data.tahminler || [];
        
        console.log(`📊 Veri durumu:`, {
            gelecek_tahminler_sayisi: gelecekTahminler.length,
            beklenen_periyot: periyot
        });
        
        // Eğer gelecek tahminler eksikse, uyarı ver
        if (gelecekTahminler.length < periyot) {
            console.warn(`⚠️ Beklenen ${periyot} ay tahmin, ancak sadece ${gelecekTahminler.length} ay veri geldi`);
        }
        
        // Sadece gelecek tahminler için labels oluştur
        const labels = gelecekTahminler.map(t => {
            // Ay formatını düzenle - artık backend'den gelen veriler zaten formatlanmış
            if (t.ay) {
                // Eğer hala YYYY-MM formatındaysa dönüştür
                if (t.ay.includes('-') && t.ay.length === 7) {
                    const [yil, ay] = t.ay.split('-');
                    const ayAdi = new Date(parseInt(yil), parseInt(ay) - 1, 1).toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });
                    return ayAdi;
                }
                return t.ay;
            }
            return 'Bilinmeyen';
        });
        
        // Veri kontrolü ve işleme
        if (gelecekTahminler.length === 0) {
            console.warn('⚠️ Doluluk tahmini için veri bulunamadı');
            return;
        }

        // Sadece gelecek tahminler için veri hazırla
        const ortalamaData = gelecekTahminler.map(t => {
            return t.tahmini_doluluk_araligi?.ortalama || t.tahmini_doluluk || 0;
        });
        const minData = gelecekTahminler.map(t => {
            return t.tahmini_doluluk_araligi?.min || t.tahmini_doluluk || 0;
        });
        const maxData = gelecekTahminler.map(t => {
            return t.tahmini_doluluk_araligi?.max || t.tahmini_doluluk || 0;
        });
        
        console.log(`📊 Grafik verisi hazırlandı:`, {
            gelecek_veri: gelecekTahminler.length,
            ortalama_data_uzunlugu: ortalamaData.length,
            ilk_veri: ortalamaData[0],
            son_veri: ortalamaData[ortalamaData.length - 1]
        });

        // Grafik verilerini hazırla - Veri uzunluklarını kontrol et
        if (labels.length !== ortalamaData.length) {
            console.warn(`⚠️ Label ve veri uzunlukları eşleşmiyor: labels=${labels.length}, data=${ortalamaData.length}`);
            // Uzunlukları eşitle
            const minLength = Math.min(labels.length, ortalamaData.length);
            labels.splice(minLength);
            ortalamaData.splice(minLength);
            minData.splice(minLength);
            maxData.splice(minLength);
        }
        
        console.log(`📊 Grafik dataset'leri hazırlandı:`, {
            gelecek_data_uzunlugu: ortalamaData.length,
            labels_uzunlugu: labels.length
        });
        
        // Eğer hiç veri yoksa uyarı ver
        if (ortalamaData.length === 0) {
            console.error('❌ Grafik için hiç veri yok!');
            return;
        }

        kararDestekCharts.dolulukTahmini = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Tahmini Doluluk (%)',
                    data: ortalamaData,
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    borderColor: '#3b82f6',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#3b82f6',
                        pointBorderWidth: 2,
                        spanGaps: false
                    },
                    {
                        label: 'Min Tahmin',
                        data: minData,
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0,
                        tension: 0.4,
                        spanGaps: false
                    },
                    {
                        label: 'Max Tahmin',
                        data: maxData,
                        borderColor: 'rgba(16, 185, 129, 0.3)',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0,
                        tension: 0.4,
                        spanGaps: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        display: true,
                        position: 'top',
                        labels: { color: '#94a3b8' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const index = context.dataIndex;
                                const item = gelecekTahminler[index];
                                const aralik = item?.tahmini_doluluk_araligi;
                                let text = `${context.dataset.label}: ${context.parsed.y?.toFixed(1) || 'N/A'}%`;
                                
                                if (context.datasetIndex === 0 && aralik && aralik.min !== undefined) {
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
        console.error('❌ Doluluk tahmini grafiği hatası:', e);
        console.error('Hata detayları:', {
            message: e.message,
            stack: e.stack,
            periyot: periyot
        });
        
        // Hata durumunda kullanıcıya bilgi ver
        const container = document.getElementById('dolulukTahminiListesi');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-warning m-3">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Doluluk tahmini grafiği yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.
                    <br><small>Hata: ${e.message}</small>
                </div>
            `;
        }
    }
}

// Rakip Fiyat Analizi (API'den gerçek veri)
const SERP_API_KEY = '2cd20c4121d7a2e3bda15daad41effac28b97da917b013db355fb8779979c865';

async function rakipFiyatAnaliziYukle() {
    try {
        const res = await fetch('/api/rakip-analizi');
        if(!res.ok) throw new Error('API hatası');
        const response = await res.json();
        
        if (!response.properties || !Array.isArray(response.properties)) {
            console.error('Geçersiz veri formatı');
            return;
        }
        
        // Tüm otelleri al (slice kaldırıldı - tüm verileri göster)
        const data = response.properties || [];
        console.log(`📊 Toplam ${data.length} otel verisi alındı`);
        console.log(`📊 API'den gelen otel verileri:`, data.map(d => ({ 
            otel: d.otel_adi, 
            fiyat: d.fiyat, 
            tip: typeof d.fiyat,
            rating: d.rating 
        })));
        const bizimFiyat = response.bizim_fiyatlar?.Standart || 3000;
        const pazarAnalizi = response.pazar_analizi || {};
        
        // Pazar analizi verisini global değişkene kaydet (modal'da oda tipi değiştiğinde kullanmak için)
        window.pazarAnaliziData = pazarAnalizi;
        
        // Pazar analizi bilgilerini göster
        if (pazarAnalizi.ortalama_fiyat) {
            const pazarBilgiDiv = document.getElementById('pazarAnaliziBilgi');
            if (pazarBilgiDiv) {
                // Backend'den gelen ortalama fiyat ham değer (örn: 2.71)
                // Grafikte rakip fiyatlar 1000 ile çarpılıyor, bu yüzden ortalama fiyatı da 1000 ile çarpmalıyız
                const ortalamaFiyatHam = parseFloat(pazarAnalizi.ortalama_fiyat) || 0;
                const ortalamaFiyat = ortalamaFiyatHam * 1000; // Grafikteki gibi 1000 ile çarp
                
                // Bizim fiyat (değişmez)
                const bizimFiyatNum = typeof bizimFiyat === 'number' ? bizimFiyat : parseFloat(bizimFiyat) || 0;
                
                // Fark yüzdesini yeniden hesapla (1000 ile çarpılmış ortalama fiyat ile)
                const farkYuzde = ortalamaFiyat > 0 
                    ? parseFloat((((bizimFiyatNum - ortalamaFiyat) / ortalamaFiyat) * 100).toFixed(1))
                    : 0;
                
                // Pazar pozisyonunu yeniden hesapla
                const bizimPazarPozisyonu = bizimFiyatNum < ortalamaFiyat * 0.9 ? 'ucuz' : 
                                            (bizimFiyatNum > ortalamaFiyat * 1.1 ? 'pahali' : 'orta');
                
                const pozisyonRenk = bizimPazarPozisyonu === 'ucuz' ? 'success' : 
                                    (bizimPazarPozisyonu === 'pahali' ? 'danger' : 'warning');
                const pozisyonText = bizimPazarPozisyonu === 'ucuz' ? 'Ucuz' : 
                                    (bizimPazarPozisyonu === 'pahali' ? 'Pahalı' : 'Orta');
                pazarBilgiDiv.innerHTML = `
                    <div class="alert alert-info mb-3">
                        <h6 class="mb-2"><i class="fas fa-chart-line me-2"></i>Pazar Analizi Özeti</h6>
                        <div class="row g-2">
                            <div class="col-md-3">
                                <small class="text-muted">Ortalama Fiyat</small>
                                <div class="fw-bold">${ortalamaFiyat.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} ₺</div>
                            </div>
                            <div class="col-md-3">
                                <small class="text-muted">Bizim Fiyat (Standart)</small>
                                <div class="fw-bold" id="pazarAnaliziBizimFiyat">${bizimFiyatNum.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} ₺</div>
                            </div>
                            <div class="col-md-3">
                                <small class="text-muted">Pazar Pozisyonu</small>
                                <div><span class="badge bg-${pozisyonRenk}">${pozisyonText}</span></div>
                            </div>
                            <div class="col-md-3">
                                <small class="text-muted">Fiyat Farkı</small>
                                <div class="fw-bold text-${farkYuzde > 0 ? 'danger' : 'success'}">
                                    ${farkYuzde > 0 ? '+' : ''}${farkYuzde}%
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
        
        // Canvas elementi bul (rakipFiyatGrafigi öncelikli)
        const ctx = document.getElementById('rakipFiyatGrafigi') || document.getElementById('dolulukTahminiGrafigi');
        if (!ctx) {
            console.warn('Rakip analizi grafiği için canvas bulunamadı');
            return;
        }

        // Mevcut chart'ları temizle - tüm olası chart instance'larını kontrol et
        if (kararDestekCharts.dolulukTahmini) {
            try {
                kararDestekCharts.dolulukTahmini.destroy();
            } catch(e) {
                console.warn('Doluluk tahmini chart destroy hatası:', e);
            }
            kararDestekCharts.dolulukTahmini = null;
        }
        if (window.rakipFiyatChart) {
            try {
                window.rakipFiyatChart.destroy();
            } catch(e) {
                console.warn('Rakip fiyat chart destroy hatası:', e);
            }
            window.rakipFiyatChart = null;
        }
        
        // Chart.js'in internal registry'sinden de temizle
        if (Chart.getChart(ctx)) {
            try {
                Chart.getChart(ctx).destroy();
            } catch(e) {
                console.warn('Chart registry destroy hatası:', e);
            }
        }

        const labels = data.map(d => d.otel_adi);
        // Google'dan çekilen fiyatları kullan - eksik olanlar boş (null) kalacak
        // API'den gelen ham veriyi olduğu gibi kullan (değiştirmeden)
        console.log(`\n📊 Grafik için fiyatlar hazırlanıyor...`);
        const prices = data.map((d, index) => {
            let fiyat = null; // Başlangıçta null (boş)
            
            // API'den gelen ham fiyatı al
            if (d.fiyat !== null && d.fiyat !== undefined && d.fiyat !== '') {
                // Ham fiyatı al
                const hamFiyat = typeof d.fiyat === 'number' ? d.fiyat : parseFloat(d.fiyat);
                // Geçersiz sayı kontrolü
                if (isNaN(hamFiyat) || hamFiyat <= 0) {
                    console.warn(`⚠️  [${index + 1}] ${d.otel_adi}: Geçersiz fiyat (${d.fiyat})`);
                    fiyat = null;
                } else {
                    // Sadece RAKİP otellerin fiyatını 1000 ile çarp (bizim otel değişmez)
                    if (d.bizim_otel) {
                        // Bizim otel - fiyatı olduğu gibi kullan
                        fiyat = hamFiyat;
                        console.log(`✅ [${index + 1}] ${d.otel_adi}: ${fiyat} TL (Bizim Otel - değiştirilmedi)`);
                    } else {
                        // Rakip otel - fiyatı 1000 ile çarp - 1.918 TL -> 1918 TL
                        fiyat = hamFiyat * 1000;
                        console.log(`✅ [${index + 1}] ${d.otel_adi}: ${hamFiyat} TL -> ${fiyat} TL (Rakip - 1000 ile çarpıldı)`);
                    }
                }
            } else {
                console.warn(`⚠️  [${index + 1}] ${d.otel_adi}: Fiyat yok (null/undefined)`);
            }
            
            // Google'dan fiyat çekilemediyse null döndür (boş kalacak)
            return fiyat;
        });
        console.log(`📊 Hazırlanan fiyatlar array'i:`, prices);
        const ratings = data.map(d => parseFloat(d.rating) || 0);
        const reviewCounts = data.map(d => parseInt(d.review_count) || 0);
        
        // En ucuz ve en pahalı otelleri bul (bizim otel hariç, null değerleri hariç tut)
        const rakipFiyatlar = prices.filter((p, i) => !data[i].bizim_otel && p !== null && p !== undefined && p > 0);
        const minPrice = rakipFiyatlar.length > 0 ? Math.min(...rakipFiyatlar) : 0;
        const maxPrice = rakipFiyatlar.length > 0 ? Math.max(...rakipFiyatlar) : 0;
        
        // Google Hotels fiyat istatistikleri
        const googleFiyatSayisi = prices.filter(p => p !== null && p !== undefined && p > 0).length;
        const toplamOtelSayisi = data.length;
        console.log(`📊 Google Hotels Fiyat İstatistikleri: ${googleFiyatSayisi}/${toplamOtelSayisi} otel için fiyat mevcut`);
        
        // Renk ve ikon belirleme (point renkleri için) - Google Hotels fiyatlarına göre
        const pointColors = data.map((d, i) => {
            const p = prices[i];
            // Eğer Google'dan fiyat çekilemediyse (null) açık gri göster
            if (p === null || p === undefined) return '#cbd5e1';
            if (d.bizim_otel) return '#3b82f6'; // Bizim otel (Mavi) - vurgulu
            if (d.en_ucuz || p === minPrice) return '#10b981'; // En ucuz (Yeşil)
            if (d.en_pahali || p === maxPrice) return '#ef4444'; // En pahalı (Kırmızı)
            return '#64748b'; // Diğerleri (Gri)
        });
        
        // Border renkleri (vurgu için) - Google Hotels fiyatlarına göre
        const pointBorderColors = data.map((d, i) => {
            const p = prices[i];
            // Eğer Google'dan fiyat çekilemediyse (null) border gösterme
            if (p === null || p === undefined) return '#e2e8f0';
            if (d.bizim_otel) return '#1e40af'; // Koyu mavi border
            if (d.en_ucuz || prices[i] === minPrice) return '#059669'; // Koyu yeşil
            if (d.en_pahali || prices[i] === maxPrice) return '#dc2626'; // Koyu kırmızı
            return '#475569';
        });
        
        const pointBorderWidths = data.map((d, i) => {
            const p = prices[i];
            // Eğer Google'dan fiyat çekilemediyse (null) border gösterme
            if (p === null || p === undefined) return 0;
            if (d.bizim_otel || d.en_ucuz || d.en_pahali) return 3;
            return 2;
        });

        // İlk grafik çizimi (Standart oda tipi ile)
        rakipFiyatGrafikGuncelle(data, response, 'Standart', ctx);
    } catch(e) { 
        console.error('Rakip analiz hatası:', e); 
    }
}

// Rakip Fiyat Grafik Güncelleme Fonksiyonu
function rakipFiyatGrafikGuncelle(data, response, odaTipi, ctx) {
    const bizimFiyatlar = response.bizim_fiyatlar || {};
    const bizimFiyat = bizimFiyatlar[odaTipi] || 3000;
    const pazarAnalizi = response.pazar_analizi || {};
    
    // Google Hotels fiyatlarını baz alarak grafiği güncelle
    console.log(`\n📊 Rakip Fiyat Analizi Grafik Güncelleme - Oda Tipi: ${odaTipi}`);
    console.log(`Toplam ${data.length} otel verisi işleniyor...`);
    
    const prices = data.map((d, index) => {
        let fiyat = null; // Başlangıçta null (boş)
        
        // Google Hotels API'den çekilen ham fiyatı direkt kullan
        // Standart oda için: d.fiyat (Google'dan direkt çekilen)
        // Diğer oda tipleri için: fiyat_karsilastirmalari[odaTipi].rakip_fiyat (Google standart fiyatından scale edilmiş)
        
        if (odaTipi === 'Standart') {
            // Standart oda için Google'dan çekilen ham fiyatı kullan
            if (d.fiyat !== null && d.fiyat !== undefined && d.fiyat !== '') {
                // API'den gelen değeri al
                const hamFiyat = typeof d.fiyat === 'number' ? d.fiyat : parseFloat(d.fiyat);
                if (!isNaN(hamFiyat) && hamFiyat > 0) {
                    // Sadece RAKİP otellerin fiyatını 1000 ile çarp (bizim otel değişmez)
                    if (d.bizim_otel) {
                        // Bizim otel - fiyatı olduğu gibi kullan
                        fiyat = hamFiyat;
                        console.log(`  ✅ [${index + 1}] ${d.otel_adi}: ${fiyat} TL (Bizim Otel - Standart, değiştirilmedi)`);
                    } else {
                        // Rakip otel - fiyatı 1000 ile çarp - 1.918 TL -> 1918 TL
                        fiyat = hamFiyat * 1000;
                        console.log(`  ✅ [${index + 1}] ${d.otel_adi}: ${hamFiyat} TL -> ${fiyat} TL (Rakip - Standart, 1000 ile çarpıldı)`);
                    }
                } else {
                    console.warn(`  ⚠️  [${index + 1}] ${d.otel_adi}: Google'dan fiyat çekilemedi (fiyat: ${d.fiyat})`);
                    fiyat = null;
                }
            } else {
                fiyat = null;
            }
        } else {
            // Diğer oda tipleri için fiyat_karsilastirmalari'ndan al
            if (d.fiyat_karsilastirmalari && d.fiyat_karsilastirmalari[odaTipi]) {
                const rakipFiyatRaw = d.fiyat_karsilastirmalari[odaTipi].rakip_fiyat;
                // API'den gelen değeri al
                if (rakipFiyatRaw !== null && rakipFiyatRaw !== undefined && rakipFiyatRaw !== '') {
                    const hamFiyat = typeof rakipFiyatRaw === 'number' ? rakipFiyatRaw : parseFloat(rakipFiyatRaw);
                    if (!isNaN(hamFiyat) && hamFiyat > 0) {
                        // Sadece RAKİP otellerin fiyatını 1000 ile çarp (bizim otel değişmez)
                        if (d.bizim_otel) {
                            // Bizim otel - fiyatı olduğu gibi kullan
                            fiyat = hamFiyat;
                            console.log(`  ✅ [${index + 1}] ${d.otel_adi}: ${fiyat} TL (Bizim Otel - ${odaTipi}, değiştirilmedi)`);
                        } else {
                            // Rakip otel - fiyatı 1000 ile çarp - 1.918 TL -> 1918 TL
                            fiyat = hamFiyat * 1000;
                            console.log(`  ✅ [${index + 1}] ${d.otel_adi}: ${hamFiyat} TL -> ${fiyat} TL (Rakip - ${odaTipi}, 1000 ile çarpıldı)`);
                        }
                    } else {
                        console.warn(`  ⚠️  [${index + 1}] ${d.otel_adi}: ${odaTipi} için Google fiyatı geçersiz`);
                        fiyat = null;
                    }
                } else {
                    fiyat = null;
                }
            } else {
                console.warn(`  ⚠️  [${index + 1}] ${d.otel_adi}: ${odaTipi} için fiyat_karsilastirmalari bulunamadı`);
                fiyat = null;
            }
        }
        
        return fiyat;
    });
    
    const fiyatSayisi = prices.filter(p => p !== null && p !== undefined && p > 0).length;
    console.log(`📊 Grafik için ${fiyatSayisi}/${data.length} otel fiyatı hazırlandı`);
    console.log(`Fiyatlar (HAM VERİ - değiştirilmeden):`, prices);
    console.log(`Fiyatlar detaylı:`, prices.map((p, i) => ({ 
        otel: data[i]?.otel_adi, 
        fiyat: p, 
        tip: typeof p,
        ham: data[i]?.fiyat 
    })));
    
    const ratings = data.map(d => parseFloat(d.rating) || 0);
    const reviewCounts = data.map(d => parseInt(d.review_count) || 0);
    const labels = data.map(d => d.otel_adi);
    
    // En ucuz ve en pahalı otelleri bul (null değerleri hariç tut)
    const rakipFiyatlar = prices.filter((p, i) => !data[i].bizim_otel && p !== null && p !== undefined && p > 0);
    const minPrice = rakipFiyatlar.length > 0 ? Math.min(...rakipFiyatlar) : 0;
    const maxPrice = rakipFiyatlar.length > 0 ? Math.max(...rakipFiyatlar) : 0;
    
    console.log(`📊 Min Fiyat: ${minPrice} TL, Max Fiyat: ${maxPrice} TL (${rakipFiyatlar.length} rakip otel)`);
    
    // Renk ve ikon belirleme (null değerler için varsayılan renk)
    const pointColors = data.map((d, i) => {
        const p = prices[i];
        // Eğer fiyat null ise (Google'dan çekilemediyse) gri göster
        if (p === null || p === undefined) return '#94a3b8';
        if (d.bizim_otel) return '#3b82f6';
        if (d.en_ucuz || p === minPrice) return '#10b981';
        if (d.en_pahali || p === maxPrice) return '#ef4444';
        return '#64748b';
    });
    
    const pointBorderColors = data.map((d, i) => {
        const p = prices[i];
        // Eğer fiyat null ise (Google'dan çekilemediyse) açık gri göster
        if (p === null || p === undefined) return '#cbd5e1';
        if (d.bizim_otel) return '#1e40af';
        if (d.en_ucuz || prices[i] === minPrice) return '#059669';
        if (d.en_pahali || prices[i] === maxPrice) return '#dc2626';
        return '#475569';
    });
    
    const pointBorderWidths = data.map((d, i) => {
        const p = prices[i];
        // Eğer fiyat null ise (Google'dan çekilemediyse) nokta gösterme
        if (p === null || p === undefined) return 0;
        if (d.bizim_otel || d.en_ucuz || d.en_pahali) return 3;
        return 2;
    });
    
    // Mevcut chart'ı temizle
    if (window.rakipFiyatChart) {
        try {
            window.rakipFiyatChart.destroy();
        } catch(e) {
            console.warn('Rakip fiyat chart destroy hatası:', e);
        }
    }
    if (Chart.getChart(ctx)) {
        try {
            Chart.getChart(ctx).destroy();
        } catch(e) {
            console.warn('Chart registry destroy hatası:', e);
        }
    }
    
    // Grafik verilerini kontrol et
    console.log(`\n📊 Grafik Verileri Kontrolü:`);
    console.log(`Labels (${labels.length}):`, labels);
    console.log(`Prices (${prices.length}):`, prices);
    console.log(`Ratings (${ratings.length}):`, ratings);
    console.log(`Min Price: ${minPrice}, Max Price: ${maxPrice}`);
    
    // Yeni chart oluştur
    console.log(`\n🎨 Chart oluşturuluyor...`);
    console.log(`📊 Chart'a verilecek prices array'i:`, prices);
    console.log(`📊 Chart'a verilecek labels array'i:`, labels);
    console.log(`📊 Chart'a verilecek ratings array'i:`, ratings);
    
    // Veri kontrolü - eğer prices array'i boşsa veya tüm değerler null ise uyarı ver
    const gecerliFiyatSayisiChart = prices.filter(p => p !== null && p !== undefined && p > 0).length;
    if (gecerliFiyatSayisiChart === 0) {
        console.error('❌ HATA: Grafik için geçerli fiyat bulunamadı! Tüm fiyatlar null veya 0.');
        console.error('Data:', data);
        console.error('Prices:', prices);
    } else {
        console.log(`✅ ${gecerliFiyatSayisiChart} geçerli fiyat bulundu, grafik oluşturuluyor...`);
    }
    
    const chartInstance = new Chart(ctx, {
        type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                    label: `${odaTipi} Oda Fiyatı (TL) - Google'dan (Ham Veri)`,
                        data: prices.map(p => {
                            // API'den gelen ham değeri olduğu gibi kullan - hiçbir değişiklik yapma
                            // p zaten backend'den gelen ham değer (1.918, 2.312, vb.)
                            if (p === null || p === undefined) return null;
                            // Number olarak direkt kullan - Chart.js'e olduğu gibi ver
                            return typeof p === 'number' ? p : parseFloat(p);
                        }), // API'den gelen ham fiyatlar - değiştirilmeden (1.918, 2.312, vb.)
                    spanGaps: false, // Null değerler arasında çizgi çizme (Google'dan fiyat çekilemeyen oteller için)
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    borderColor: '#f59e0b',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: prices.map((p, i) => {
                        // Google'dan fiyat çekilen oteller için nokta göster, çekilemeyenler için gösterme
                        return (p !== null && p !== undefined && p > 0) ? 6 : 0;
                    }),
                    pointHoverRadius: 8,
                    pointBackgroundColor: pointColors,
                    pointBorderColor: pointBorderColors,
                    pointBorderWidth: pointBorderWidths,
                    order: 1,
                        yAxisID: 'y'
                    },
                    {
                    label: 'Otel Puanı (Rating)',
                        data: ratings,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    borderDash: [5, 5],
                    order: 2,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const otel = data[index];
                    rakipOtelDetayGoster(otel, odaTipi, bizimFiyatlar);
                }
            },
                plugins: {
                legend: { 
                    display: true, 
                    labels: { 
                        color: '#94a3b8',
                        usePointStyle: true,
                        padding: 15
                    },
                    position: 'top'
                },
                    tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    padding: 12,
                    titleColor: '#f1f5f9',
                    bodyColor: '#cbd5e1',
                    borderColor: '#334155',
                    borderWidth: 1,
                        callbacks: { 
                        title: (items) => {
                            const index = items[0].dataIndex;
                            const otel = data[index];
                            let title = otel.otel_adi;
                            if (otel.bizim_otel) title += ' ⭐ (Bizim Otel)';
                            if (otel.en_ucuz) title += ' 💰 (En Ucuz)';
                            if (otel.en_pahali) title += ' 💎 (En Pahalı)';
                            return title;
                        },
                        label: (context) => {
                            const index = context.dataIndex;
                            const otel = data[index];
                            
                            if (context.datasetIndex === 0) {
                                const val = context.raw;
                                // Eğer fiyat null ise (Google'dan çekilemediyse) bilgi ver
                                if (val === null || val === undefined) {
                                    return `${odaTipi} Fiyat: Google'dan fiyat çekilemedi`;
                                }
                                // API'den gelen ham değeri olduğu gibi göster (değiştirmeden)
                                // Tüm ondalık basamakları koru
                                let formattedFiyat;
                                if (typeof val === 'number') {
                                    // Tüm ondalık basamakları göster (gereksiz sıfırları temizle)
                                    formattedFiyat = val.toString().replace('.', ',');
                                } else {
                                    formattedFiyat = val;
                                }
                                let text = `${odaTipi} Fiyat: ${formattedFiyat} TL (Google'dan - Ham Veri)`;
                                
                                if (otel.fiyat_karsilastirmalari && otel.fiyat_karsilastirmalari[odaTipi]) {
                                    const karsilastirma = otel.fiyat_karsilastirmalari[odaTipi];
                                    const bizimFiyatOda = parseFloat(bizimFiyatlar[odaTipi] || bizimFiyat) || 0;
                                    const rakipFiyatHam = parseFloat(karsilastirma.rakip_fiyat) || 0;
                                    
                                    // Sadece rakip otellerin fiyatını 1000 ile çarp (bizim otel değişmez)
                                    const rakipFiyatGoster = otel.bizim_otel ? rakipFiyatHam : (rakipFiyatHam * 1000);
                                    
                                    // Farkı yeniden hesapla: (1000 ile çarpılmış) rakip fiyat - bizim fiyat
                                    const fark = rakipFiyatGoster - bizimFiyatOda;
                                    
                                    // Fark yüzdesini yeniden hesapla
                                    const farkYuzde = bizimFiyatOda > 0 
                                        ? parseFloat(((fark / bizimFiyatOda) * 100).toFixed(1))
                                        : null;
                                    
                                    // API'den gelen ham değerleri göster
                                    const formattedBizimFiyat = typeof bizimFiyatOda === 'number' 
                                        ? bizimFiyatOda.toString().replace('.', ',')
                                        : bizimFiyatOda;
                                    const formattedRakipFiyat = typeof rakipFiyatGoster === 'number' 
                                        ? rakipFiyatGoster.toString().replace('.', ',')
                                        : rakipFiyatGoster;
                                    text += `\nBizim ${odaTipi}: ${formattedBizimFiyat} TL`;
                                    text += `\nRakip ${odaTipi}: ${formattedRakipFiyat} TL`;
                                    if (fark !== null && Math.abs(fark) > 0.01) {
                                        // Pozitif fark = Rakip daha pahalı, Negatif fark = Rakip daha ucuz
                                        const formattedFark = typeof fark === 'number' 
                                            ? fark.toString().replace('.', ',')
                                            : fark;
                                        const farkText = fark > 0 
                                            ? `+${formattedFark} TL (+%${farkYuzde !== null ? Math.abs(farkYuzde).toFixed(1) : '-'} - Rakip daha pahalı)`
                                            : `${formattedFark} TL (%${farkYuzde !== null ? Math.abs(farkYuzde).toFixed(1) : '-'} - Rakip daha ucuz)`;
                                        text += `\nFark: ${farkText}`;
                                    }
                                }
                                
                                return text;
                            } else {
                                const rating = parseFloat(context.raw);
                                const reviewCount = reviewCounts[index];
                                return `Rating: ${rating.toFixed(1)}/5.0 (${reviewCount.toLocaleString('tr-TR')} değerlendirme)`;
                            }
                        },
                        afterBody: (items) => {
                            const index = items[0].dataIndex;
                            const otel = data[index];
                            const lines = [];
                            
                            if (otel.review_count) {
                                lines.push(`Değerlendirme: ${otel.review_count.toLocaleString('tr-TR')} adet`);
                            }
                            
                            lines.push('💡 Grafikteki noktaya tıklayarak detaylı fiyat karşılaştırması görebilirsiniz');
                            
                            return lines;
                        }
                        }
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: false, // Sıfırdan başlamayı kapat (daha hassas görüntüleme için)
                        position: 'left',
                        type: 'linear', // Linear scale kullan (logaritmik değil)
                        // Min ve max değerleri otomatik belirle (verilerden)
                        // Min ve max değerleri verilerden otomatik hesapla
                        // Chart.js'in otomatik scale'ini kullan, sadece beginAtZero: false ile
                    ticks: { 
                        color: '#94a3b8',
                        stepSize: undefined, // Otomatik step size
                        precision: undefined, // Precision'ı kaldır - Chart.js'in varsayılan davranışını kullan
                        maxTicksLimit: 15, // Maksimum tick sayısı
                        callback: function(value, index, ticks) {
                            // Null değerler için boş göster
                            if (value === null || value === undefined || isNaN(value)) return '';
                            // API'den gelen ham değeri olduğu gibi göster (değiştirmeden)
                            // Tüm ondalık basamakları koru
                            const val = parseFloat(value);
                            // toString() ile tüm basamakları koru, sadece noktayı virgülle değiştir
                            const formatted = val.toString().replace('.', ',');
                            return formatted + ' TL';
                        }
                    }, 
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    title: {
                        display: true,
                        text: `${odaTipi} Fiyat (TL) - Google Hotels`,
                        color: '#f59e0b'
                    }
                    },
                    y1: {
                        beginAtZero: true,
                        max: 5,
                        position: 'right',
                    ticks: { 
                        color: '#3b82f6',
                        stepSize: 0.5
                    },
                    grid: { display: false },
                    title: {
                        display: true,
                        text: 'Rating (1-5)',
                        color: '#3b82f6'
                    }
                },
                x: { 
                    ticks: { 
                        color: '#94a3b8',
                        maxRotation: 45,
                        minRotation: 45
                    }, 
                        grid: { display: false }
                }
                }
            }
        });
    
    window.rakipFiyatChart = chartInstance;
    console.log(`✅ Rakip Fiyat Analizi grafiği başarıyla oluşturuldu!`);
    console.log(`Chart ID: ${chartInstance.id}`);
    const gecerliFiyatSayisi = prices.filter(p => p !== null && p !== undefined && p > 0).length;
    console.log(`Data points: ${gecerliFiyatSayisi}/${prices.length} fiyat gösteriliyor`);
    console.log(`Grafik başarıyla güncellendi!\n`);
}

// Rakip Otel Detay Gösterme Fonksiyonu
function rakipOtelDetayGoster(otel, seciliOdaTipi, bizimFiyatlar) {
    let guncelOdaTipi = seciliOdaTipi || 'Standart';
    
    const modalHTML = `
        <div class="modal fade" id="rakipOtelDetayModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content" style="background: #ffffff; border: 2px solid #3b82f6; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                    <div class="modal-header border-bottom" style="border-color: #3b82f6 !important; background: #f8f9fa;">
                        <h5 class="modal-title fw-bold" style="color: #0f172a !important; font-size: 1.25rem;">
                            <i class="fas fa-hotel me-2" style="color: #3b82f6 !important;"></i>${otel.otel_adi}
                            ${otel.bizim_otel ? '<span class="badge bg-primary ms-2" style="background: #3b82f6 !important; color: #ffffff !important;">Bizim Otel</span>' : ''}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" style="background: #ffffff; color: #0f172a;">
                        <div class="row mb-4">
                            <div class="col-md-6">
                                <div class="d-flex align-items-center p-3 rounded" style="background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6;">
                                    <i class="fas fa-star me-2 fs-5" style="color: #fbbf24 !important;"></i>
                                    <div>
                                        <small class="d-block mb-1" style="color: #64748b !important; font-size: 0.75rem;">Rating</small>
                                        <strong style="color: #0f172a !important; font-size: 1.1rem;">${otel.rating?.toFixed(1) || 'N/A'}/5.0</strong>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="d-flex align-items-center p-3 rounded" style="background: rgba(16, 185, 129, 0.1); border-left: 4px solid #10b981;">
                                    <i class="fas fa-comments me-2 fs-5" style="color: #10b981 !important;"></i>
                                    <div>
                                        <small class="d-block mb-1" style="color: #64748b !important; font-size: 0.75rem;">Değerlendirme</small>
                                        <strong style="color: #0f172a !important; font-size: 1.1rem;">${otel.review_count?.toLocaleString('tr-TR') || 0} adet</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Oda Tipi Seçici -->
                        <div class="mb-4">
                            <label class="form-label fw-bold mb-2" style="color: #0f172a !important; font-size: 1rem;"><i class="fas fa-bed me-2" style="color: #3b82f6 !important;"></i>Oda Tipi Seçin:</label>
                            <div class="btn-group btn-group-sm w-100" role="group">
                                <input type="radio" class="btn-check" name="modalRakipOdaTipi" id="modalRakipOdaStandart" value="Standart" ${guncelOdaTipi === 'Standart' ? 'checked' : ''}>
                                <label class="btn" for="modalRakipOdaStandart" style="background: ${guncelOdaTipi === 'Standart' ? '#3b82f6' : 'transparent'}; color: ${guncelOdaTipi === 'Standart' ? '#ffffff' : '#3b82f6'} !important; border: 2px solid #3b82f6; font-weight: 600;">Standart</label>
                                
                                <input type="radio" class="btn-check" name="modalRakipOdaTipi" id="modalRakipOdaDeluxe" value="Deluxe" ${guncelOdaTipi === 'Deluxe' ? 'checked' : ''}>
                                <label class="btn" for="modalRakipOdaDeluxe" style="background: ${guncelOdaTipi === 'Deluxe' ? '#3b82f6' : 'transparent'}; color: ${guncelOdaTipi === 'Deluxe' ? '#ffffff' : '#3b82f6'} !important; border: 2px solid #3b82f6; font-weight: 600;">Deluxe</label>
                                
                                <input type="radio" class="btn-check" name="modalRakipOdaTipi" id="modalRakipOdaSuit" value="Suit" ${guncelOdaTipi === 'Suit' ? 'checked' : ''}>
                                <label class="btn" for="modalRakipOdaSuit" style="background: ${guncelOdaTipi === 'Suit' ? '#3b82f6' : 'transparent'}; color: ${guncelOdaTipi === 'Suit' ? '#ffffff' : '#3b82f6'} !important; border: 2px solid #3b82f6; font-weight: 600;">Suit</label>
                                
                                <input type="radio" class="btn-check" name="modalRakipOdaTipi" id="modalRakipOdaKral" value="Kral Dairesi" ${guncelOdaTipi === 'Kral Dairesi' ? 'checked' : ''}>
                                <label class="btn" for="modalRakipOdaKral" style="background: ${guncelOdaTipi === 'Kral Dairesi' ? '#3b82f6' : 'transparent'}; color: ${guncelOdaTipi === 'Kral Dairesi' ? '#ffffff' : '#3b82f6'} !important; border: 2px solid #3b82f6; font-weight: 600;">Kral Dairesi</label>
                            </div>
                        </div>
                        
                        <h6 class="mb-3 fw-bold" style="color: #0f172a !important; font-size: 1.1rem;"><i class="fas fa-chart-line me-2" style="color: #3b82f6 !important;"></i>Oda Tipine Göre Fiyat Karşılaştırması</h6>
                        <div class="table-responsive">
                            <table class="table table-hover" style="background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
                                <thead style="background: #f1f5f9;">
                                    <tr>
                                        <th class="fw-bold border-0" style="color: #0f172a !important; padding: 16px; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px;">Oda Tipi</th>
                                        <th class="fw-bold border-0" style="color: #0f172a !important; padding: 16px; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px;">Bizim Fiyat</th>
                                        <th class="fw-bold border-0" style="color: #0f172a !important; padding: 16px; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px;">Rakip Fiyat</th>
                                        <th class="fw-bold border-0" style="color: #0f172a !important; padding: 16px; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px;">Fark</th>
                                        <th class="fw-bold border-0" style="color: #0f172a !important; padding: 16px; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px;">Durum</th>
                                    </tr>
                                </thead>
                                <tbody id="rakipOtelFiyatTablosu">
                                    ${Object.keys(bizimFiyatlar).map(odaTipi => {
                                        const karsilastirma = otel.fiyat_karsilastirmalari?.[odaTipi];
                                        if (!karsilastirma || karsilastirma.rakip_fiyat === null) {
                                            const bizimFiyatGoster = karsilastirma?.bizim_fiyat || bizimFiyatlar[odaTipi];
                                            return `
                                                <tr class="fiyat-satir-${odaTipi}" style="background: #ffffff; border-bottom: 1px solid #e2e8f0;">
                                                    <td class="fw-bold" style="color: #0f172a !important; padding: 16px;">${odaTipi}</td>
                                                    <td class="fw-bold" style="color: #0f172a !important; padding: 16px;">${typeof bizimFiyatGoster === 'number' ? parseFloat(bizimFiyatGoster).toFixed(2).replace('.', ',') : bizimFiyatGoster} ₺</td>
                                                    <td class="fw-bold" style="color: #64748b !important; padding: 16px;">-</td>
                                                    <td class="fw-bold" style="color: #64748b !important; padding: 16px;">-</td>
                                                    <td style="padding: 16px;"><span class="badge px-3 py-2 fw-bold" style="background: #94a3b8 !important; color: #ffffff !important;">Veri Yok</span></td>
                                                </tr>
                                            `;
                                        }
                                        
                                        // Rakip fiyatı 1000 ile çarp (bizim otel değişmez)
                                        const bizimFiyatNum = parseFloat(karsilastirma.bizim_fiyat) || 0;
                                        const rakipFiyatHam = parseFloat(karsilastirma.rakip_fiyat) || 0;
                                        
                                        // Sadece rakip otellerin fiyatını 1000 ile çarp (bizim otel değişmez)
                                        const rakipFiyatGoster = otel.bizim_otel ? rakipFiyatHam : (rakipFiyatHam * 1000);
                                        
                                        // Farkı yeniden hesapla: (1000 ile çarpılmış) rakip fiyat - bizim fiyat
                                        const fark = rakipFiyatGoster - bizimFiyatNum;
                                        
                                        // Fark yüzdesini yeniden hesapla
                                        const farkYuzde = bizimFiyatNum > 0 
                                            ? parseFloat(((fark / bizimFiyatNum) * 100).toFixed(1))
                                            : null;
                                        
                                        // Renk belirleme: Pozitif fark = Rakip daha pahalı (kırmızı), Negatif fark = Rakip daha ucuz (yeşil)
                                        const farkRenk = fark !== null && fark > 0 ? 'text-danger' : (fark !== null && fark < 0 ? 'text-success' : 'text-secondary');
                                        const farkIcon = fark !== null && fark > 0 ? 'fa-arrow-up' : (fark !== null && fark < 0 ? 'fa-arrow-down' : 'fa-equals');
                                        
                                        const durumBadge = karsilastirma.rekabet_durumu === 'pahali' 
                                            ? 'bg-danger' 
                                            : (karsilastirma.rekabet_durumu === 'ucuz' 
                                                ? 'bg-success' 
                                                : 'bg-warning');
                                        const durumText = karsilastirma.rekabet_durumu === 'pahali' 
                                            ? 'Pahalı' 
                                            : (karsilastirma.rekabet_durumu === 'ucuz' 
                                                ? 'Ucuz' 
                                                : 'Benzer');
                                        
                                        const isSelected = odaTipi === guncelOdaTipi;
                                        
                                        return `
                                            <tr class="fiyat-satir-${odaTipi}" 
                                                style="background: ${isSelected ? 'rgba(59, 130, 246, 0.1)' : '#ffffff'}; transition: all 0.2s; border-bottom: 1px solid #e2e8f0;">
                                                <td class="fw-bold" style="color: #0f172a !important; padding: 16px; font-size: 1rem;">
                                                    ${isSelected ? '<i class="fas fa-check-circle me-2" style="color: #3b82f6 !important;"></i>' : '<i class="fas fa-circle me-2" style="color: #cbd5e1 !important; font-size: 0.5rem;"></i>'}${odaTipi}
                                                </td>
                                                <td class="bizim-fiyat-${odaTipi} fw-bold" style="color: #0f172a !important; padding: 16px; font-size: 1.05rem;">
                                                    ${typeof karsilastirma.bizim_fiyat === 'number' ? parseFloat(karsilastirma.bizim_fiyat).toFixed(2).replace('.', ',') : karsilastirma.bizim_fiyat} ₺
                                                </td>
                                                <td class="fw-bold" style="color: #0f172a !important; padding: 16px; font-size: 1.05rem;">
                                                    ${typeof rakipFiyatGoster === 'number' ? parseFloat(rakipFiyatGoster).toFixed(2).replace('.', ',') : rakipFiyatGoster} ₺
                                                </td>
                                                <td class="fw-bold" style="color: ${fark !== null && fark > 0 ? '#dc2626' : (fark !== null && fark < 0 ? '#059669' : '#64748b')} !important; padding: 16px; font-size: 1.05rem;">
                                                    ${fark !== null ? `
                                                        <i class="fas ${farkIcon} me-1"></i>
                                                        ${fark > 0 ? '+' : ''}${parseFloat(fark).toFixed(2).replace('.', ',')} ₺
                                                        <br>
                                                        <small style="color: ${fark > 0 ? '#dc2626' : (fark < 0 ? '#059669' : '#64748b')} !important; font-size: 0.85rem; opacity: 0.8;">(${farkYuzde !== null ? (farkYuzde > 0 ? '+' : '') + farkYuzde.toFixed(1) : '-'}%)</small>
                                                    ` : '-'}
                                                </td>
                                                <td style="padding: 16px;">
                                                    <span class="badge ${durumBadge} px-3 py-2 fw-bold" style="font-size: 0.85rem; ${durumBadge === 'bg-danger' ? 'background: #dc2626 !important; color: #ffffff !important;' : (durumBadge === 'bg-success' ? 'background: #059669 !important; color: #ffffff !important;' : 'background: #f59e0b !important; color: #ffffff !important;')}">${durumText}</span>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer border-top" style="border-color: #e2e8f0 !important; background: #f8f9fa;">
                        <button type="button" class="btn fw-bold" data-bs-dismiss="modal" style="background: #3b82f6; color: #ffffff; padding: 10px 24px; border-radius: 8px;">
                            <i class="fas fa-times me-2"></i>Kapat
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Eski modal varsa kaldır
    const eskiModal = document.getElementById('rakipOtelDetayModal');
    if (eskiModal) eskiModal.remove();
    
    // Yeni modal ekle ve göster
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('rakipOtelDetayModal'));
    modal.show();
    
    // Oda tipi değiştiğinde "Bizim Fiyat" güncelle
    document.querySelectorAll('input[name="modalRakipOdaTipi"]').forEach(radio => {
        radio.addEventListener('change', function() {
            guncelOdaTipi = this.value;
            
            // Seçili oda tipine göre satırları vurgula
            document.querySelectorAll('#rakipOtelFiyatTablosu tr').forEach(tr => {
                tr.classList.remove('table-primary');
                tr.style.background = '';
                tr.style.opacity = '0.85';
            });
            const seciliSatir = document.querySelector(`.fiyat-satir-${guncelOdaTipi}`);
            if (seciliSatir) {
                seciliSatir.classList.add('table-primary');
                seciliSatir.style.background = 'rgba(59, 130, 246, 0.15) !important';
                seciliSatir.style.opacity = '1';
            }
            
                // "Bizim Fiyat" başlığını ve değerlerini güncelle (seçili oda tipine göre)
                const seciliKarsilastirma = otel.fiyat_karsilastirmalari?.[guncelOdaTipi];
                if (seciliKarsilastirma) {
                // Pazar Analizi Özeti'ndeki "Bizim Fiyat" değerini güncelle
                const bizimFiyatDiv = document.getElementById('pazarAnaliziBizimFiyat');
                if (bizimFiyatDiv) {
                    const bizimFiyatGoster = typeof seciliKarsilastirma.bizim_fiyat === 'number' 
                        ? parseFloat(seciliKarsilastirma.bizim_fiyat).toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2})
                        : seciliKarsilastirma.bizim_fiyat;
                    bizimFiyatDiv.textContent = `${bizimFiyatGoster} ₺`;
                }
                
                // Pazar Analizi Özeti'ndeki başlığı ve ortalama fiyatı da güncelle
                const pazarBilgiDiv = document.getElementById('pazarAnaliziBilgi');
                if (pazarBilgiDiv && window.pazarAnaliziData) {
                    const bizimFiyatLabel = pazarBilgiDiv.querySelector('.col-md-3:nth-child(2) small');
                    if (bizimFiyatLabel) {
                        bizimFiyatLabel.textContent = `Bizim Fiyat (${guncelOdaTipi})`;
                    }
                    
                    // Ortalama fiyatı ve fark yüzdesini yeniden hesapla
                    const ortalamaFiyatHam = parseFloat(window.pazarAnaliziData.ortalama_fiyat) || 0;
                    const ortalamaFiyat = ortalamaFiyatHam * 1000; // Grafikteki gibi 1000 ile çarp
                    const bizimFiyatNum = typeof seciliKarsilastirma.bizim_fiyat === 'number' 
                        ? parseFloat(seciliKarsilastirma.bizim_fiyat) 
                        : parseFloat(seciliKarsilastirma.bizim_fiyat) || 0;
                    
                    const farkYuzde = ortalamaFiyat > 0 
                        ? parseFloat((((bizimFiyatNum - ortalamaFiyat) / ortalamaFiyat) * 100).toFixed(1))
                        : 0;
                    
                    const bizimPazarPozisyonu = bizimFiyatNum < ortalamaFiyat * 0.9 ? 'ucuz' : 
                                                (bizimFiyatNum > ortalamaFiyat * 1.1 ? 'pahali' : 'orta');
                    
                    // Ortalama fiyat gösterimini güncelle
                    const ortalamaFiyatDiv = pazarBilgiDiv.querySelector('.col-md-3:nth-child(1) .fw-bold');
                    if (ortalamaFiyatDiv) {
                        ortalamaFiyatDiv.textContent = `${ortalamaFiyat.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} ₺`;
                    }
                    
                    // Fark yüzdesini güncelle
                    const farkYuzdeDiv = pazarBilgiDiv.querySelector('.col-md-3:nth-child(4) .fw-bold');
                    if (farkYuzdeDiv) {
                        farkYuzdeDiv.textContent = `${farkYuzde > 0 ? '+' : ''}${farkYuzde}%`;
                        farkYuzdeDiv.className = `fw-bold text-${farkYuzde > 0 ? 'danger' : 'success'}`;
                    }
                    
                    // Pazar pozisyonunu güncelle
                    const pozisyonBadge = pazarBilgiDiv.querySelector('.col-md-3:nth-child(3) .badge');
                    if (pozisyonBadge) {
                        const pozisyonRenk = bizimPazarPozisyonu === 'ucuz' ? 'success' : 
                                            (bizimPazarPozisyonu === 'pahali' ? 'danger' : 'warning');
                        const pozisyonText = bizimPazarPozisyonu === 'ucuz' ? 'Ucuz' : 
                                            (bizimPazarPozisyonu === 'pahali' ? 'Pahalı' : 'Orta');
                        pozisyonBadge.className = `badge bg-${pozisyonRenk}`;
                        pozisyonBadge.textContent = pozisyonText;
                    }
                }
            }
        });
    });
}

// KPI Detay Açma Fonksiyonu
window.kpiDetayAc = async function(kpiTipi) {
    const modal = new bootstrap.Modal(document.getElementById('kpiDetayModal'));
    const baslik = document.getElementById('kpiDetayBaslik');
    
    const kpiIsimleri = {
        'doluluk': 'Doluluk Oranı Detay Analizi',
        'gelir': 'Toplam Gelir Detay Analizi',
        'karMarji': 'Kar Marjı Detay Analizi',
        'iptalOrani': 'İptal Oranı Detay Analizi'
    };
    
    baslik.textContent = kpiIsimleri[kpiTipi] || 'KPI Detay Analizi';
    
    // Mevcut periyot değerini al (varsayılan 6)
    window.kpiDetayPeriyot = window.kpiDetayPeriyot || 6;
    window.kpiDetayTipi = kpiTipi;
    
    // Periyot butonlarını güncelle
    document.getElementById('kpiDetayPeriyot6').classList.remove('active');
    document.getElementById('kpiDetayPeriyot12').classList.remove('active');
    if (window.kpiDetayPeriyot === 6) {
        document.getElementById('kpiDetayPeriyot6').classList.add('active');
    } else {
        document.getElementById('kpiDetayPeriyot12').classList.add('active');
    }
    
    await kpiDetayGrafikCiz(kpiTipi, window.kpiDetayPeriyot);
    modal.show();
};

// KPI Detay Periyot Değiştirme
window.kpiDetayPeriyotDegistir = function(periyot) {
    window.kpiDetayPeriyot = periyot;
    document.getElementById('kpiDetayPeriyot6').classList.remove('active');
    document.getElementById('kpiDetayPeriyot12').classList.remove('active');
    if (periyot === 6) {
        document.getElementById('kpiDetayPeriyot6').classList.add('active');
    } else {
        document.getElementById('kpiDetayPeriyot12').classList.add('active');
    }
    kpiDetayGrafikCiz(window.kpiDetayTipi, periyot);
};

// KPI Detay Grafik Çizme
async function kpiDetayGrafikCiz(kpiTipi, periyot) {
    try {
        const res = await fetch(`/api/kpi-detay?kpiTipi=${kpiTipi}&periyot=${periyot}`);
        if (!res.ok) {
            console.error('KPI detay API hatası:', res.status, res.statusText);
            const ctx = document.getElementById('kpiDetayGrafigi');
            if (ctx && window.kpiDetayChart) {
                window.kpiDetayChart.destroy();
                // Hata mesajı göster
                const ctx2 = ctx.getContext('2d');
                ctx2.clearRect(0, 0, ctx.width, ctx.height);
                ctx2.fillStyle = '#94a3b8';
                ctx2.font = '16px Arial';
                ctx2.textAlign = 'center';
                ctx2.fillText('Veri yüklenemedi', ctx.width / 2, ctx.height / 2);
            }
            return;
        }
        const data = await res.json();
        
        const ctx = document.getElementById('kpiDetayGrafigi');
        if (!ctx) return;

        // Null check
        if (!data || !data.labels || !data.data) {
            console.warn('KPI detay verisi formatı geçersiz');
            return;
        }
        
        if (window.kpiDetayChart) window.kpiDetayChart.destroy();
        
        const renkler = {
            'doluluk': '#3b82f6',
            'gelir': '#10b981',
            'karMarji': '#f59e0b',
            'iptalOrani': '#ef4444'
        };
        
        const kpiIsimleri = {
            'doluluk': 'Doluluk Oranı (%)',
            'gelir': 'Toplam Gelir (TL)',
            'karMarji': 'Kar Marjı (%)',
            'iptalOrani': 'İptal Oranı (%)'
        };
        
        window.kpiDetayChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels || [],
                datasets: [{
                    label: kpiIsimleri[kpiTipi] || 'KPI Değeri',
                    data: data.data || [],
                    borderColor: renkler[kpiTipi] || '#3b82f6',
                    backgroundColor: renkler[kpiTipi] ? renkler[kpiTipi] + '20' : '#3b82f620',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: renkler[kpiTipi] || '#3b82f6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: { color: '#94a3b8' }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        padding: 12,
                        titleColor: '#f1f5f9',
                        bodyColor: '#cbd5e1',
                        callbacks: {
                            label: (context) => {
                                const value = parseFloat(context.raw);
                                const birim = data.birim || '';
                                return `${value.toLocaleString('tr-TR')} ${birim}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#94a3b8',
                            callback: function(value) {
                                const birim = data.birim || '';
                                return value.toLocaleString('tr-TR') + ' ' + birim;
                            }
                        },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { display: false }
                    }
                }
            }
        });
    } catch (e) {
        console.error('KPI detay grafik hatası:', e);
    }
}

// Genel Bakış Periyot Değiştirme
window.genelBakisPeriyotDegistir = function(periyot) {
    document.getElementById('periyotBtn6').classList.remove('active');
    document.getElementById('periyotBtn12').classList.remove('active');
    if (periyot === 6) {
        document.getElementById('periyotBtn6').classList.add('active');
    } else {
        document.getElementById('periyotBtn12').classList.add('active');
    }
    
    // Tüm grafikleri güncelle (buton durumlarını da güncelle)
    dolulukTahminiPeriyotDegistir(periyot);
    gelirKarTahminiPeriyotDegistir(periyot);
    // Diğer grafikler...
};


// Gelir ve Kâr Tahmini Periyot Değiştirme
window.gelirKarTahminiPeriyotDegistir = function(periyot, btn) {
    if (btn) {
        const group = btn.parentElement;
        group.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    } else {
        // Manuel çağrı durumunda butonları güncelle
        document.getElementById('gelirKarTahminiBtn6')?.classList.remove('active');
        document.getElementById('gelirKarTahminiBtn12')?.classList.remove('active');
        if (periyot === 6) {
            document.getElementById('gelirKarTahminiBtn6')?.classList.add('active');
        } else {
            document.getElementById('gelirKarTahminiBtn12')?.classList.add('active');
        }
    }
    gelirKarTahminiYukle(periyot);
};

// Gelir ve Kâr Tahmini
async function gelirKarTahminiYukle(periyot) {
    try {
        console.log(`💰 Gelir kâr tahmini yükleniyor: ${periyot} ay`);
        // Cache'i bypass etmek için timestamp ekle
        const timestamp = new Date().getTime();
        const res = await fetch(`/api/gelir-kar-tahmini?periyot=${periyot}&_t=${timestamp}`);
        if(!res.ok) {
            console.error('Gelir kâr tahmini API hatası:', res.status);
            return;
        }
        const data = await res.json();
        console.log(`💰 Gelir kâr tahmini verisi alındı:`, {
            tahminler_sayisi: data.tahminler?.length || 0,
            periyot: periyot
        });
        
        const container = document.getElementById('gelirKarTahminiListesi');
        if (!container) return;

        const ctx = document.getElementById('gelirKarTahminiGrafigi');
        if (!ctx) return;

        if (kararDestekCharts.gelirKarTahmini) kararDestekCharts.gelirKarTahmini.destroy();

        // Null check ekle
        if (!data || !data.tahminler || !Array.isArray(data.tahminler) || data.tahminler.length === 0) {
            console.warn('Gelir kâr tahmini verisi bulunamadı, fallback veri kullanılıyor');
            // Fallback veri oluştur
            const fallbackLabels = [];
            const fallbackGelir = [];
            const fallbackKar = [];
            for (let i = 0; i < periyot; i++) {
                const tarih = new Date();
                tarih.setMonth(tarih.getMonth() + i);
                fallbackLabels.push(tarih.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' }));
                fallbackGelir.push(3000000 + Math.random() * 500000);
                fallbackKar.push(1200000 + Math.random() * 200000);
            }
            data = { 
                tahminler: fallbackLabels.map((label, i) => ({ 
                    donem: label, 
                    tahmini_gelir: fallbackGelir[i],
                    tahmini_kar: fallbackKar[i]
                })) 
            };
        }

        const labels = data.tahminler.map(t => t.donem || t.ay || t.periyot);
        
        console.log(`💰 Grafik verisi:`, {
            labels_sayisi: labels.length,
            beklenen_periyot: periyot,
            ilk_label: labels[0],
            son_label: labels[labels.length - 1]
        });
        
        // Eğer veri eksikse, uyarı ver
        if (data.tahminler.length < periyot) {
            console.warn(`⚠️ Beklenen ${periyot} ay tahmin, ancak sadece ${data.tahminler.length} ay veri geldi`);
        }
        
        // GÜNCELLEME: API yanıtı esnek değilse hata vermemesi için kontrol eklendi.
        const gelirData = data.tahminler.map(t => {
            if (t.tahmini_gelir_araligi && t.tahmini_gelir_araligi.ortalama) return t.tahmini_gelir_araligi.ortalama;
            if (t.tahmini_gelir) return t.tahmini_gelir;
            return 0;
        });
        const karData = data.tahminler.map(t => {
            if (t.tahmini_kar_araligi && t.tahmini_kar_araligi.ortalama) return t.tahmini_kar_araligi.ortalama;
            if (t.tahmini_kar) return t.tahmini_kar;
            return 0;
        });
        
        // Gelir ve Kâr için min-max aralıkları (eğer varsa)
        const gelirMin = data.tahminler.map(t => t.tahmini_gelir_araligi?.min || t.tahmini_gelir || 0);
        const gelirMax = data.tahminler.map(t => t.tahmini_gelir_araligi?.max || t.tahmini_gelir || 0);
        const karMin = data.tahminler.map(t => t.tahmini_kar_araligi?.min || t.tahmini_kar || 0);
        const karMax = data.tahminler.map(t => t.tahmini_kar_araligi?.max || t.tahmini_kar || 0);

        // Mevcut chart'ı temizle
        if (kararDestekCharts.gelirKarTahmini) {
            try {
                kararDestekCharts.gelirKarTahmini.destroy();
            } catch(e) {
                console.warn('Gelir kâr tahmini chart destroy hatası:', e);
            }
            kararDestekCharts.gelirKarTahmini = null;
        }
        if (Chart.getChart(ctx)) {
            try {
                Chart.getChart(ctx).destroy();
            } catch(e) {
                console.warn('Chart registry destroy hatası:', e);
            }
        }

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
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        pointBackgroundColor: '#3b82f6',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2
                    },
                    {
                        label: 'Tahmini Kâr (₺)',
                        data: karData,
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderColor: '#10b981',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        pointBackgroundColor: '#10b981',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        position: 'top', 
                        labels: { 
                            color: '#fff',
                            usePointStyle: true,
                            padding: 15
                        } 
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        padding: 12,
                        titleColor: '#f1f5f9',
                        bodyColor: '#cbd5e1',
                        borderColor: '#334155',
                        borderWidth: 1,
                        callbacks: {
                            title: function(context) {
                                return context[0].label;
                            },
                            label: function(context) {
                                const index = context.dataIndex;
                                const item = data.tahminler[index];
                                let text = `${context.dataset.label}: ${formatPara(context.parsed.y)}`;
                                
                                // Aralık bilgisi ekle (eğer varsa)
                                if (context.datasetIndex === 0 && item.tahmini_gelir_araligi) {
                                    const aralik = item.tahmini_gelir_araligi;
                                    if (aralik.min !== undefined && aralik.max !== undefined) {
                                        text += `\nAralık: ${formatPara(aralik.min)} - ${formatPara(aralik.max)}`;
                                    }
                                } else if (context.datasetIndex === 1 && item.tahmini_kar_araligi) {
                                    const aralik = item.tahmini_kar_araligi;
                                    if (aralik.min !== undefined && aralik.max !== undefined) {
                                        text += `\nAralık: ${formatPara(aralik.min)} - ${formatPara(aralik.max)}`;
                                    }
                                }
                                
                                return text;
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
        if(!res.ok) {
            console.error('Personel ihtiyacı API hatası:', res.status);
            return;
        }
        const data = await res.json();
        
        const tbody = document.getElementById('personelIhtiyaciTablosu');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (!data || !data.tahminler || !Array.isArray(data.tahminler) || data.tahminler.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Personel ihtiyacı verisi bulunamadı</td></tr>';
            return;
        }
        
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
        });
        
        // Personel İhtiyacı Grafiği
        const ctx = document.getElementById('personelIhtiyaciGrafigi');
        if (ctx) {
            // Mevcut chart'ı temizle
            if (window.personelIhtiyaciChart) {
                try {
                    window.personelIhtiyaciChart.destroy();
                } catch(e) {
                    console.warn('Personel ihtiyacı chart destroy hatası:', e);
                }
            }
            if (Chart.getChart(ctx)) {
                try {
                    Chart.getChart(ctx).destroy();
                } catch(e) {
                    console.warn('Chart registry destroy hatası:', e);
                }
            }
            
            // Doluluk oranına göre personel ihtiyacı grafiği
            if (data.doluluk_personel_grafik && data.doluluk_personel_grafik.length > 0) {
                const dolulukLabels = data.doluluk_personel_grafik.map(d => `${d.doluluk_orani}%`);
                const temizlikData = data.doluluk_personel_grafik.map(d => d.personel_ihtiyaci.temizlik);
                const servisData = data.doluluk_personel_grafik.map(d => d.personel_ihtiyaci.servis);
                const mutfakData = data.doluluk_personel_grafik.map(d => d.personel_ihtiyaci.mutfak);
                const onBuroData = data.doluluk_personel_grafik.map(d => d.personel_ihtiyaci.on_buro);
                const toplamData = data.doluluk_personel_grafik.map(d => d.personel_ihtiyaci.toplam);
                
                window.personelIhtiyaciChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: dolulukLabels,
                        datasets: [
                            {
                                label: 'Temizlik',
                                data: temizlikData,
                                borderColor: '#3b82f6',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                borderWidth: 2,
                                tension: 0.4,
                                fill: false,
                                pointRadius: 3,
                                pointHoverRadius: 5
                            },
                            {
                                label: 'Servis',
                                data: servisData,
                                borderColor: '#10b981',
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                borderWidth: 2,
                                tension: 0.4,
                                fill: false,
                                pointRadius: 3,
                                pointHoverRadius: 5
                            },
                            {
                                label: 'Mutfak',
                                data: mutfakData,
                                borderColor: '#f59e0b',
                                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                borderWidth: 2,
                                tension: 0.4,
                                fill: false,
                                pointRadius: 3,
                                pointHoverRadius: 5
                            },
                            {
                                label: 'Ön Büro',
                                data: onBuroData,
                                borderColor: '#8b5cf6',
                                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                borderWidth: 2,
                                tension: 0.4,
                                fill: false,
                                pointRadius: 3,
                                pointHoverRadius: 5
                            },
                            {
                                label: 'Toplam Personel',
                                data: toplamData,
                                borderColor: '#ef4444',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                borderWidth: 3,
                                tension: 0.4,
                                fill: false,
                                pointRadius: 5,
                                pointHoverRadius: 7,
                                pointBackgroundColor: '#ef4444',
                                pointBorderColor: '#fff',
                                pointBorderWidth: 2
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Doluluk Oranına Göre Personel İhtiyacı',
                                color: '#94a3b8',
                                font: { size: 14, weight: 'bold' },
                                padding: { bottom: 10 }
                            },
                            legend: { 
                                position: 'top', 
                                labels: { 
                                    color: '#94a3b8', 
                                    font: { size: 11 },
                                    usePointStyle: true,
                                    padding: 12
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return `${context.dataset.label}: ${context.parsed.y} kişi`;
                                    },
                                    footer: function(tooltipItems) {
                                        const doluluk = parseInt(tooltipItems[0].label.replace('%', ''));
                                        const item = data.doluluk_personel_grafik.find(d => d.doluluk_orani === doluluk);
                                        if (item) {
                                            return [
                                                `Toplam: ${item.personel_ihtiyaci.toplam} kişi`,
                                                `Yönetim: ${item.personel_ihtiyaci.yonetim} kişi`
                                            ];
                                        }
                                        return '';
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Personel Sayısı',
                                    color: '#94a3b8',
                                    font: { size: 12 }
                                },
                                ticks: { color: '#94a3b8', stepSize: 5 },
                                grid: { color: 'rgba(255, 255, 255, 0.05)' }
                            },
                            x: {
                                title: {
                                    display: true,
                                    text: 'Doluluk Oranı (%)',
                                    color: '#94a3b8',
                                    font: { size: 12 }
                                },
                                ticks: { color: '#94a3b8' },
                                grid: { display: false }
                            }
                        }
                    }
                });
            } else {
                // Fallback: Departman bazlı grafik (eski grafik)
                const labels = data.tahminler.map(t => t.departman);
                const mevcutData = data.tahminler.map(t => t.mevcut_personel || 0);
                const onerilenData = data.tahminler.map(t => {
                    const aralik = t.degerlendirilebilir_personel_araligi || { ortalama: t.onerilen_personel || 0 };
                    return aralik.ortalama || t.onerilen_personel || 0;
                });
                
                window.personelIhtiyaciChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Mevcut Personel',
                                data: mevcutData,
                                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                                borderColor: '#3b82f6',
                                borderWidth: 2
                            },
                            {
                                label: 'Önerilen Personel',
                                data: onerilenData,
                                backgroundColor: 'rgba(16, 185, 129, 0.7)',
                                borderColor: '#10b981',
                                borderWidth: 2
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { 
                                position: 'top', 
                                labels: { color: '#94a3b8', font: { size: 12 } }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return `${context.dataset.label}: ${context.parsed.y} kişi`;
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: { color: '#94a3b8', stepSize: 1 },
                                grid: { color: 'rgba(255, 255, 255, 0.05)' }
                            },
                            x: {
                                ticks: { color: '#94a3b8' },
                                grid: { display: false }
                            }
                        }
                    }
                });
            }
        }
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
        if (!oneriDiv) {
            console.warn('Senaryo analizi öneri div bulunamadı');
            return;
        }
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

// Senaryo kaydetme fonksiyonu - Strateji Simülatörü için güncellendi
window.senaryoKaydet = async function() {
    // Strateji Simülatörü'nden gelen simülasyon verisini kontrol et
    const simuleEdilmisVeri = window.sonSimulasyonVerisi;
    
    if (!simuleEdilmisVeri && !mevcutSenaryoVerisi) {
        alert('Kaydedilecek senaryo verisi bulunamadı. Lütfen önce simülasyon yapın.');
        return;
    }
    
    // Senaryo adı al
    const senaryoAdi = prompt('Senaryo için bir isim girin:', 
        `Strateji Simülasyonu - ${new Date().toLocaleDateString('tr-TR')}`);
    
    if (!senaryoAdi) return;
    
    try {
        // Simülasyon verisini senaryo formatına dönüştür
        let kaydedilecekVeri = {};
        
        if (simuleEdilmisVeri) {
            // Strateji Simülatörü verisini senaryo formatına çevir
            kaydedilecekVeri = {
                senaryo_tipi: 'simulasyon',
                fiyat_degisimi: simuleEdilmisVeri.fiyatDegisimi || 0,
                personel_sayisi: simuleEdilmisVeri.personelSayisi || 20,
                pazarlama_butcesi: simuleEdilmisVeri.pazarlamaButcesi || 0,
                tahmini_ciro: simuleEdilmisVeri.tahminiCiro || 0,
                net_kar: simuleEdilmisVeri.netKar || 0,
                kar_marji: simuleEdilmisVeri.karMarji || 0,
                simulasyon_tarihi: new Date().toISOString(),
                not: 'Strateji Simülatörü ile oluşturuldu',
                senaryoKarsilastirma: simuleEdilmisVeri.senaryoKarsilastirma || []
            };
        } else if (mevcutSenaryoVerisi) {
            // Senaryo Analizi verisini kullan
            kaydedilecekVeri = mevcutSenaryoVerisi;
        }
        
        const res = await fetch('/api/senaryo-kaydet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                senaryo_adi: senaryoAdi,
                periyot: mevcutSenaryoPeriyot || 6,
                senaryo_verisi: kaydedilecekVeri
            })
        });
        
        const result = await res.json();
        
        if (res.ok && result.success) {
            // Senaryo listesini önce yenile
            if (typeof senaryoListesiniGetir === 'function') {
                await senaryoListesiniGetir();
            } else {
                // Eğer fonksiyon tanımlı değilse, manuel olarak çağır
                setTimeout(() => {
            senaryoListesiniGetir();
                }, 500);
            }
            
            // Senaryo raporunu otomatik aç
            if (result.senaryo_id) {
                setTimeout(() => {
                    window.senaryoRaporuGoster(result.senaryo_id);
                }, 800);
            }
            
            // Başarı mesajı göster
            console.log(`✅ Senaryo başarıyla kaydedildi!`, {
                senaryo_id: result.senaryo_id,
                senaryo_adi: result.senaryo_adi,
                senaryo_tipi: result.senaryo_tipi,
                sonuc_durumu: result.sonuc_durumu
            });
        } else {
            alert('❌ Senaryo kaydedilemedi: ' + (result.error || result.warning || 'Bilinmeyen hata'));
        }
    } catch(e) {
        console.error('Senaryo kaydetme hatası:', e);
        alert('❌ Senaryo kaydedilirken bir hata oluştu.');
    }
};

// Senaryo raporu görüntüleme
window.senaryoRaporuGoster = async function(senaryoId) {
    try {
        // Senaryo ID'yi global değişkene kaydet (PDF indirme için)
        window.currentSenaryoId = senaryoId;
        
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
        const isSimulasyon = rapor.analiz_ozeti?.simulasyon_verisi === true;
        
        icerik.innerHTML = `
            <!-- Rapor Başlığı - Profesyonel Tasarım -->
            <div class="text-center mb-5 pb-4" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2.5rem 1.5rem; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);">
                <div class="mb-3">
                    <i class="fas fa-file-chart-line" style="font-size: 3.5rem; opacity: 0.9;"></i>
                </div>
                <h2 class="mb-2 fw-bold" style="font-size: 2rem; letter-spacing: 0.5px;">Senaryo Analiz Raporu</h2>
                <p class="mb-0" style="font-size: 1rem; opacity: 0.95;">
                    <i class="fas fa-calendar-alt me-2"></i>
                    ${rapor.senaryo_bilgileri.olusturulma_tarihi || new Date(rapor.senaryo_bilgileri.tarih).toLocaleString('tr-TR')}
                </p>
                <div class="mt-3 pt-3 border-top" style="border-color: rgba(255,255,255,0.3) !important;">
                    <span class="badge bg-light text-dark px-3 py-2" style="font-size: 0.85rem;">
                        <i class="fas fa-hotel me-2"></i>HotelVision - Karar Destek Platformu
                    </span>
                </div>
            </div>
            
            <!-- Senaryo Bilgileri ve Özet - Profesyonel Tasarım -->
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="card shadow-lg border-0 mb-3" style="border-radius: 12px; overflow: hidden;">
                        <div class="card-header text-white" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 1.25rem;">
                            <h5 class="mb-0 fw-bold">
                                <i class="fas fa-info-circle me-2"></i>Senaryo Bilgileri
                            </h5>
                        </div>
                        <div class="card-body p-4">
                            <table class="table table-borderless mb-0">
                                <tr class="border-bottom">
                                    <td class="text-muted py-3" style="width: 40%; font-weight: 600;"><i class="fas fa-tag me-2 text-primary"></i>Adı:</td>
                                    <td class="py-3 fw-bold">${rapor.senaryo_bilgileri.senaryo_adi || 'İsimsiz Senaryo'}</td>
                                </tr>
                                <tr class="border-bottom">
                                    <td class="text-muted py-3" style="font-weight: 600;"><i class="fas fa-layer-group me-2 text-info"></i>Tipi:</td>
                                    <td class="py-3">
                                        <span class="badge px-3 py-2" style="font-size: 0.9rem; background: ${rapor.senaryo_bilgileri.senaryo_tipi === 'simulasyon' ? '#667eea' : 
                                            (rapor.senaryo_bilgileri.senaryo_tipi === 'iyimser' ? '#10b981' : 
                                            (rapor.senaryo_bilgileri.senaryo_tipi === 'kotumser' ? '#ef4444' : '#3b82f6'))};">
                                            ${rapor.senaryo_bilgileri.senaryo_tipi === 'simulasyon' ? 'Simülasyon' : 
                                            (rapor.senaryo_bilgileri.senaryo_tipi === 'iyimser' ? 'İyimser' : 
                                            (rapor.senaryo_bilgileri.senaryo_tipi === 'kotumser' ? 'Kötümser' : 'Gerçekçi'))}
                                        </span>
                                    </td>
                                </tr>
                                <tr class="border-bottom">
                                    <td class="text-muted py-3" style="font-weight: 600;"><i class="fas fa-chart-line me-2 text-warning"></i>Durum:</td>
                                    <td class="py-3">
                                        <span class="badge px-3 py-2" style="font-size: 0.9rem; background: ${rapor.senaryo_bilgileri.sonuc_durumu === 'Başarılı' ? '#10b981' : 
                                            (rapor.senaryo_bilgileri.sonuc_durumu === 'Orta' ? '#f59e0b' : '#ef4444')};">
                                            ${rapor.senaryo_bilgileri.sonuc_durumu || 'Riskli'}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="text-muted py-3" style="font-weight: 600;"><i class="fas fa-clock me-2 text-secondary"></i>Oluşturulma:</td>
                                    <td class="py-3">${rapor.senaryo_bilgileri.olusturulma_tarihi || new Date(rapor.senaryo_bilgileri.tarih).toLocaleString('tr-TR')}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card shadow-lg border-0 mb-3" style="border-radius: 12px; overflow: hidden;">
                        <div class="card-header text-white" style="background: linear-gradient(135deg, ${isSimulasyon ? '#3b82f6' : '#64748b'} 0%, ${isSimulasyon ? '#1e40af' : '#475569'} 100%); padding: 1.25rem;">
                            <h5 class="mb-0 fw-bold">
                                <i class="fas fa-${isSimulasyon ? 'calculator' : 'chart-bar'} me-2"></i>${isSimulasyon ? 'Simülasyon Özeti' : 'Analiz Özeti'}
                            </h5>
                        </div>
                        <div class="card-body p-4">
                            ${isSimulasyon ? `
                                <table class="table table-borderless mb-0">
                                    <tr class="border-bottom">
                                        <td class="text-muted py-2" style="width: 50%; font-weight: 600;"><i class="fas fa-percentage me-2 text-primary"></i>Fiyat Değişimi:</td>
                                        <td class="py-2"><span class="badge px-3 py-2" style="background: ${rapor.analiz_ozeti.fiyat_degisimi > 0 ? '#10b981' : '#ef4444'}; font-size: 0.9rem;">${rapor.analiz_ozeti.fiyat_degisimi > 0 ? '+' : ''}${rapor.analiz_ozeti.fiyat_degisimi || 0}%</span></td>
                                    </tr>
                                    <tr class="border-bottom">
                                        <td class="text-muted py-2" style="font-weight: 600;"><i class="fas fa-users me-2 text-info"></i>Personel Sayısı:</td>
                                        <td class="py-2 fw-bold">${rapor.analiz_ozeti.personel_sayisi || 20} kişi</td>
                                    </tr>
                                    <tr class="border-bottom">
                                        <td class="text-muted py-2" style="font-weight: 600;"><i class="fas fa-bullhorn me-2 text-warning"></i>Pazarlama Bütçesi:</td>
                                        <td class="py-2 fw-bold">${formatPara(rapor.analiz_ozeti.pazarlama_butcesi || 0)}</td>
                                    </tr>
                                    <tr class="border-bottom">
                                        <td class="text-muted py-2" style="font-weight: 600;"><i class="fas fa-chart-line me-2 text-success"></i>Tahmini Ciro:</td>
                                        <td class="py-2"><strong class="text-primary" style="font-size: 1.1rem;">${formatPara(rapor.analiz_ozeti.tahmini_ciro || 0)}</strong></td>
                                    </tr>
                                    <tr class="border-bottom">
                                        <td class="text-muted py-2" style="font-weight: 600;"><i class="fas fa-coins me-2 text-success"></i>Net Kâr:</td>
                                        <td class="py-2"><strong class="text-${rapor.analiz_ozeti.net_kar > 0 ? 'success' : 'danger'}" style="font-size: 1.1rem;">${formatPara(rapor.analiz_ozeti.net_kar || 0)}</strong></td>
                                    </tr>
                                    <tr class="border-bottom">
                                        <td class="text-muted py-2" style="font-weight: 600;"><i class="fas fa-percent me-2 text-info"></i>Kâr Marjı:</td>
                                        <td class="py-2"><span class="badge px-3 py-2" style="background: ${rapor.analiz_ozeti.kar_marji > 30 ? '#10b981' : (rapor.analiz_ozeti.kar_marji > 20 ? '#f59e0b' : '#ef4444')}; font-size: 0.9rem;">${(rapor.analiz_ozeti.kar_marji || 0).toFixed(1)}%</span></td>
                                    </tr>
                                    ${rapor.analiz_ozeti.fark_ciro !== undefined ? `
                                    <tr>
                                        <td class="text-muted py-2" style="font-weight: 600;"><i class="fas fa-arrow-up me-2 text-primary"></i>Ciro Farkı:</td>
                                        <td class="py-2"><span class="text-${rapor.analiz_ozeti.fark_ciro > 0 ? 'success' : 'danger'} fw-bold">${rapor.analiz_ozeti.fark_ciro > 0 ? '+' : ''}${formatPara(rapor.analiz_ozeti.fark_ciro)}</span></td>
                                    </tr>
                                    ` : ''}
                                </table>
                            ` : `
                                <table class="table table-borderless mb-0">
                                    <tr class="border-bottom">
                                        <td class="text-muted py-2" style="width: 50%; font-weight: 600;"><i class="fas fa-check-circle me-2 text-info"></i>Değerlendirilebilir Senaryo:</td>
                                        <td class="py-2"><span class="badge px-3 py-2" style="background: #3b82f6; font-size: 0.9rem;">${rapor.analiz_ozeti.degerlendirilebilir_senaryo || 'realist'}</span></td>
                                    </tr>
                                    <tr class="border-bottom">
                                        <td class="text-muted py-2" style="font-weight: 600;"><i class="fas fa-calendar-alt me-2 text-secondary"></i>Periyot:</td>
                                        <td class="py-2 fw-bold">${rapor.analiz_ozeti.periyot || 6} ay</td>
                                    </tr>
                                    <tr class="border-bottom">
                                        <td class="text-muted py-2" style="font-weight: 600;"><i class="fas fa-arrow-up me-2 text-success"></i>Toplam Gelir (İyimser):</td>
                                        <td class="py-2"><strong class="text-success" style="font-size: 1.1rem;">${formatPara(rapor.analiz_ozeti.toplam_tahmini_gelir?.iyimser || 0)}</strong></td>
                                    </tr>
                                    <tr class="border-bottom">
                                        <td class="text-muted py-2" style="font-weight: 600;"><i class="fas fa-equals me-2 text-info"></i>Toplam Gelir (Gerçekçi):</td>
                                        <td class="py-2"><strong class="text-info" style="font-size: 1.1rem;">${formatPara(rapor.analiz_ozeti.toplam_tahmini_gelir?.realist || 0)}</strong></td>
                                    </tr>
                                    <tr>
                                        <td class="text-muted py-2" style="font-weight: 600;"><i class="fas fa-arrow-down me-2 text-danger"></i>Toplam Gelir (Kötümser):</td>
                                        <td class="py-2"><strong class="text-danger" style="font-size: 1.1rem;">${formatPara(rapor.analiz_ozeti.toplam_tahmini_gelir?.kotumser || 0)}</strong></td>
                                    </tr>
                                </table>
                            `}
                        </div>
                    </div>
                </div>
            </div>
            
            ${rapor.mevcut_durum && Object.keys(rapor.mevcut_durum).length > 0 ? `
            <!-- Mevcut Durum Karşılaştırması - Profesyonel Tasarım -->
            <div class="card shadow-lg border-0 mb-4" style="border-radius: 12px; overflow: hidden;">
                <div class="card-header text-white" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 1.25rem;">
                    <h5 class="mb-0 fw-bold">
                        <i class="fas fa-balance-scale me-2"></i>Mevcut Durum Karşılaştırması
                    </h5>
                </div>
                <div class="card-body p-4">
                    <div class="row g-3">
                        <div class="col-md-3">
                            <div class="p-4 text-center rounded" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #0ea5e9;">
                                <i class="fas fa-money-bill-wave fa-2x mb-2" style="color: #0ea5e9;"></i>
                                <small class="text-muted d-block mb-2 fw-bold">Mevcut Ciro</small>
                                <h4 class="mb-0 fw-bold" style="color: #0ea5e9;">${formatPara(rapor.mevcut_durum.ciro || 0)}</h4>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="p-4 text-center rounded" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b;">
                                <i class="fas fa-tag fa-2x mb-2" style="color: #f59e0b;"></i>
                                <small class="text-muted d-block mb-2 fw-bold">Ortalama Fiyat</small>
                                <h4 class="mb-0 fw-bold" style="color: #f59e0b;">${formatPara(rapor.mevcut_durum.ortalama_fiyat || 0)}</h4>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="p-4 text-center rounded" style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 2px solid #10b981;">
                                <i class="fas fa-calendar-check fa-2x mb-2" style="color: #10b981;"></i>
                                <small class="text-muted d-block mb-2 fw-bold">Rezervasyon Sayısı</small>
                                <h4 class="mb-0 fw-bold" style="color: #10b981;">${rapor.mevcut_durum.rezervasyon_sayisi || 0}</h4>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="p-4 text-center rounded" style="background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%); border: 2px solid #a855f7;">
                                <i class="fas fa-moon fa-2x mb-2" style="color: #a855f7;"></i>
                                <small class="text-muted d-block mb-2 fw-bold">Toplam Gece</small>
                                <h4 class="mb-0 fw-bold" style="color: #a855f7;">${rapor.mevcut_durum.toplam_gece || 0}</h4>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            ` : ''}
            
            ${!isSimulasyon ? `
            <!-- Ortalama Karlar - Profesyonel Tasarım -->
            <div class="card shadow-lg border-0 mb-4" style="border-radius: 12px; overflow: hidden;">
                <div class="card-header text-white" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 1.25rem;">
                    <h5 class="mb-0 fw-bold">
                        <i class="fas fa-chart-pie me-2"></i>Ortalama Karlar
                    </h5>
                </div>
                <div class="card-body p-4">
                    <div class="row g-3">
                    <div class="col-md-4">
                            <div class="text-center p-4 rounded" style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 2px solid #10b981;">
                                <i class="fas fa-arrow-up fa-2x mb-2" style="color: #10b981;"></i>
                                <small class="text-muted d-block mb-2 fw-bold">İyimser</small>
                                <h3 class="text-success mb-0 fw-bold">${formatPara(rapor.analiz_ozeti.ortalama_karlar?.iyimser || 0)}</h3>
                        </div>
                    </div>
                    <div class="col-md-4">
                            <div class="text-center p-4 rounded" style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 2px solid #3b82f6;">
                                <i class="fas fa-equals fa-2x mb-2" style="color: #3b82f6;"></i>
                                <small class="text-muted d-block mb-2 fw-bold">Gerçekçi</small>
                                <h3 class="text-info mb-0 fw-bold">${formatPara(rapor.analiz_ozeti.ortalama_karlar?.realist || 0)}</h3>
                        </div>
                    </div>
                    <div class="col-md-4">
                            <div class="text-center p-4 rounded" style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 2px solid #ef4444;">
                                <i class="fas fa-arrow-down fa-2x mb-2" style="color: #ef4444;"></i>
                                <small class="text-muted d-block mb-2 fw-bold">Kötümser</small>
                                <h3 class="text-danger mb-0 fw-bold">${formatPara(rapor.analiz_ozeti.ortalama_karlar?.kotumser || 0)}</h3>
                        </div>
                    </div>
                </div>
            </div>
            </div>
            ` : ''}
            
            ${!isSimulasyon ? `
            <!-- Değerlendirilebilecek Stratejiler - Profesyonel Tasarım -->
            <div class="card shadow-lg border-0 mb-4" style="border-radius: 12px; overflow: hidden;">
                <div class="card-header text-white" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 1.25rem;">
                    <h5 class="mb-0 fw-bold">
                        <i class="fas fa-lightbulb me-2"></i>Değerlendirilebilecek Stratejiler
                    </h5>
                </div>
                <div class="card-body p-4">
                    <div class="alert border-0 mb-4" style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-left: 4px solid #3b82f6 !important; padding: 1.5rem;">
                        <h6 class="fw-bold mb-2" style="color: #1e40af;">
                            <i class="fas fa-chart-line me-2"></i>Strateji Analizi
                        </h6>
                        <p class="mb-0" style="color: #1e3a8a; line-height: 1.7;">
                            ${rapor.degerlendirilebilir_stratejiler?.strateji_analizi || rapor.oneriler?.strateji || 'Analiz mevcut değil'}
                        </p>
                    </div>
                    <h6 class="mb-3 fw-bold" style="color: #1e40af;">
                        <i class="fas fa-list-ul me-2"></i>Alternatif Eylemler
                    </h6>
                    <div class="row g-3">
                        ${(rapor.degerlendirilebilir_stratejiler?.alternatif_eylemler || rapor.oneriler?.eylemler || []).map((e, idx) => `
                            <div class="col-md-6">
                                <div class="d-flex align-items-start p-3 rounded" style="background: #f8fafc; border-left: 3px solid #3b82f6;">
                                    <span class="badge px-3 py-2 me-3" style="background: #3b82f6; font-size: 0.9rem; min-width: 35px;">${idx + 1}</span>
                                    <span style="color: #334155; line-height: 1.6;">${e}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    ${rapor.degerlendirilebilir_stratejiler?.not ? `
                        <div class="alert border-0 mt-4 mb-0" style="background: #f1f5f9; border-left: 4px solid #64748b !important;">
                            <i class="fas fa-info-circle me-2" style="color: #64748b;"></i>
                            <span style="color: #475569;">${rapor.degerlendirilebilir_stratejiler.not}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Detaylı Senaryo Analizi Tablosu - Profesyonel Tasarım -->
            <div class="card shadow-lg border-0" style="border-radius: 12px; overflow: hidden;">
                <div class="card-header text-white" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 1.25rem;">
                    <h5 class="mb-0 fw-bold">
                        <i class="fas fa-table me-2"></i>Detaylı Senaryo Analizi (Aylık)
                    </h5>
                </div>
                <div class="card-body p-0">
                <div class="table-responsive">
                        <table class="table table-hover mb-0" style="border-collapse: separate; border-spacing: 0;">
                            <thead style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);">
                                <tr>
                                    <th class="text-center py-3 fw-bold" style="width: 15%; border-bottom: 2px solid #e2e8f0; color: #1e293b;">Ay</th>
                                    <th class="text-center py-3 fw-bold" style="width: 15%; border-bottom: 2px solid #e2e8f0; color: #1e293b;">Senaryo</th>
                                    <th class="text-center py-3 fw-bold" style="width: 15%; border-bottom: 2px solid #e2e8f0; color: #1e293b;">Doluluk Oranı</th>
                                    <th class="text-center py-3 fw-bold" style="width: 18%; border-bottom: 2px solid #e2e8f0; color: #1e293b;">Tahmini Gelir</th>
                                    <th class="text-center py-3 fw-bold" style="width: 18%; border-bottom: 2px solid #e2e8f0; color: #1e293b;">Tahmini Kâr</th>
                                    <th class="text-center py-3 fw-bold" style="width: 19%; border-bottom: 2px solid #e2e8f0; color: #1e293b;">Risk Seviyesi</th>
                            </tr>
                        </thead>
                        <tbody>
                                ${(rapor.detayli_senaryolar || []).length > 0 ? (rapor.detayli_senaryolar || []).map(s => `
                                <tr class="table-success">
                                        <td class="text-center fw-bold">${s.ay || '-'}</td>
                                        <td class="text-center"><span class="badge bg-success">İyimser</span></td>
                                        <td class="text-center">${(s.iyimser?.tahmini_doluluk || 0).toFixed(1)}%</td>
                                        <td class="text-end">${formatPara(s.iyimser?.tahmini_gelir || 0)}</td>
                                        <td class="text-end"><strong class="text-success">${formatPara(s.iyimser?.tahmini_kar || 0)}</strong></td>
                                        <td class="text-center"><span class="badge bg-success">${s.iyimser?.risk_seviyesi || 'Düşük'}</span></td>
                                </tr>
                                <tr class="table-info">
                                        <td class="text-center fw-bold">${s.ay || '-'}</td>
                                        <td class="text-center"><span class="badge bg-info">Gerçekçi</span></td>
                                        <td class="text-center">${(s.realist?.tahmini_doluluk || 0).toFixed(1)}%</td>
                                        <td class="text-end">${formatPara(s.realist?.tahmini_gelir || 0)}</td>
                                        <td class="text-end"><strong class="text-info">${formatPara(s.realist?.tahmini_kar || 0)}</strong></td>
                                        <td class="text-center"><span class="badge bg-warning">${s.realist?.risk_seviyesi || 'Orta'}</span></td>
                                </tr>
                                <tr class="table-danger">
                                        <td class="text-center fw-bold">${s.ay || '-'}</td>
                                        <td class="text-center"><span class="badge bg-danger">Kötümser</span></td>
                                        <td class="text-center">${((s.kutumser || s.kutumser)?.tahmini_doluluk || 0).toFixed(1)}%</td>
                                        <td class="text-end">${formatPara((s.kutumser || s.kutumser)?.tahmini_gelir || 0)}</td>
                                        <td class="text-end"><strong class="text-danger">${formatPara((s.kutumser || s.kutumser)?.tahmini_kar || 0)}</strong></td>
                                        <td class="text-center"><span class="badge bg-danger">${(s.kutumser || s.kutumser)?.risk_seviyesi || 'Yüksek'}</span></td>
                                </tr>
                                `).join('') : `
                                    <tr>
                                        <td colspan="6" class="text-center text-muted py-4">
                                            <i class="fas fa-exclamation-triangle me-2"></i>Detaylı senaryo verisi bulunamadı.
                                        </td>
                                    </tr>
                                `}
                        </tbody>
                    </table>
                </div>
            </div>
            </div>
            ` : `
            <!-- Simülasyon Detayları - Profesyonel Tasarım -->
            <div class="card shadow-lg border-0 mb-4" style="border-radius: 12px; overflow: hidden;">
                <div class="card-header text-white" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 1.25rem;">
                    <h5 class="mb-0 fw-bold">
                        <i class="fas fa-calculator me-2"></i>Simülasyon Detayları
                    </h5>
                </div>
                <div class="card-body p-4">
                    <div class="alert border-0 mb-4" style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-left: 4px solid #3b82f6 !important; padding: 1.5rem;">
                        <h6 class="fw-bold mb-2" style="color: #1e40af;">
                            <i class="fas fa-info-circle me-2"></i>Simülasyon Bilgisi
                        </h6>
                        <p class="mb-0" style="color: #1e3a8a; line-height: 1.7;">
                            ${rapor.analiz_ozeti.not || 'Bu senaryo, Strateji Simülatörü kullanılarak oluşturulmuştur. Fiyat politikası, personel sayısı ve pazarlama bütçesi değişikliklerinin karlılığa etkisi simüle edilmiştir.'}
                        </p>
                    </div>
                    ${rapor.analiz_ozeti.analiz_gerekcesi ? `
                        <div class="alert border-0 mt-3 mb-0" style="background: #f8fafc; border-left: 4px solid #64748b !important;">
                            <strong style="color: #475569;">Analiz Gerekçesi:</strong>
                            <p class="mb-0 mt-2" style="color: #64748b; line-height: 1.6;">${rapor.analiz_ozeti.analiz_gerekcesi}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            ${rapor.senaryo_karsilastirma && Array.isArray(rapor.senaryo_karsilastirma) && rapor.senaryo_karsilastirma.length > 0 ? `
            <!-- Senaryo Karşılaştırması - Profesyonel Tasarım -->
            <div class="card shadow-lg border-0" style="border-radius: 12px; overflow: hidden;">
                <div class="card-header text-white" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 1.25rem;">
                    <h5 class="mb-0 fw-bold">
                        <i class="fas fa-balance-scale me-2"></i>Senaryo Karşılaştırması - Net Kâr Analizi
                    </h5>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover mb-0" style="border-collapse: separate; border-spacing: 0;">
                            <thead style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);">
                                <tr>
                                    <th class="text-center py-3 fw-bold" style="width: 15%; border-bottom: 2px solid #e2e8f0; color: #1e293b;">Senaryo</th>
                                    <th class="text-center py-3 fw-bold" style="width: 20%; border-bottom: 2px solid #e2e8f0; color: #1e293b;">Tahmini Gelir</th>
                                    <th class="text-center py-3 fw-bold" style="width: 20%; border-bottom: 2px solid #e2e8f0; color: #1e293b;">Tahmini Net Kâr</th>
                                    <th class="text-center py-3 fw-bold" style="width: 15%; border-bottom: 2px solid #e2e8f0; color: #1e293b;">Risk Skoru</th>
                                    <th class="text-center py-3 fw-bold" style="width: 15%; border-bottom: 2px solid #e2e8f0; color: #1e293b;">Durum</th>
                                    <th class="text-center py-3 fw-bold" style="width: 15%; border-bottom: 2px solid #e2e8f0; color: #1e293b;">Yönetici Yorumu</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rapor.senaryo_karsilastirma.map(s => {
                                    const riskRenk = s.risk <= 30 ? '#10b981' : (s.risk <= 60 ? '#f59e0b' : '#ef4444');
                                    const degerlendirilebilirBadge = s.onerilir ? 
                                        '<span class="badge px-3 py-2" style="background: #3b82f6; font-size: 0.85rem;">Değerlendirilebilir</span>' : 
                                        '<span class="badge px-3 py-2" style="background: #64748b; font-size: 0.85rem;">Dikkat Gerekli</span>';
                                    return `
                                        <tr style="opacity: 0.85; transition: all 0.2s;">
                                            <td class="text-center py-3 fw-bold" style="border-bottom: 1px solid #e2e8f0;">${s.senaryo || '-'}</td>
                                            <td class="text-end py-3" style="border-bottom: 1px solid #e2e8f0;">${formatPara(s.gelir || 0)}</td>
                                            <td class="text-end py-3" style="border-bottom: 1px solid #e2e8f0;"><strong class="text-${s.kar > 0 ? 'success' : 'danger'}" style="font-size: 1.05rem;">${formatPara(s.kar || 0)}</strong></td>
                                            <td class="text-center py-3" style="border-bottom: 1px solid #e2e8f0;"><span class="badge px-3 py-2" style="background: ${riskRenk}; font-size: 0.85rem;">${s.risk || 0}/100</span></td>
                                            <td class="text-center py-3" style="border-bottom: 1px solid #e2e8f0;">${degerlendirilebilirBadge}</td>
                                            <td class="small py-3" style="border-bottom: 1px solid #e2e8f0; color: #64748b; font-style: italic;">${s.yoneticiYorumu || 'Analiz mevcut değil'}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            ` : ''}
            `}
            
            <!-- Rapor Alt Bilgi - Profesyonel Footer -->
            <div class="text-center mt-5 pt-4" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 2rem 1.5rem; border-radius: 12px; border-top: 3px solid #667eea;">
                <div class="mb-2">
                    <i class="fas fa-shield-alt fa-2x mb-3" style="color: #667eea;"></i>
                </div>
                <p class="mb-2 fw-bold" style="color: #475569; font-size: 0.95rem;">
                    Bu rapor <span style="color: #667eea;">HotelVision - Karar Destek Platformu</span> tarafından otomatik olarak oluşturulmuştur.
                </p>
                <p class="mb-0 text-muted" style="font-size: 0.85rem;">
                    <i class="fas fa-calendar-alt me-1"></i>
                    Rapor Tarihi: ${new Date().toLocaleString('tr-TR')}
                </p>
            </div>
        `;
        
        // Modal'ı göster
        const senaryoModalEl = document.getElementById('senaryoRaporModal');
        if (senaryoModalEl) {
            const bsModal = new bootstrap.Modal(senaryoModalEl);
        bsModal.show();
        } else {
            console.error('Senaryo rapor modal elementi bulunamadı');
            alert('Rapor modal açılamadı. Sayfayı yenileyip tekrar deneyin.');
        }
    } catch(e) {
        console.error('Rapor yükleme hatası:', e);
        alert('Rapor yüklenirken bir hata oluştu.');
    }
};

// Senaryo raporu indirme (PDF)
window.senaryoRaporuIndir = async function() {
    try {
        // Modal içeriğini al - tüm modal body'yi yakala
        const modalBody = document.querySelector('#senaryoRaporModal .modal-body');
        const raporIcerik = document.getElementById('senaryoRaporIcerik');
        
        if (!raporIcerik && !modalBody) {
            alert('Rapor içeriği bulunamadı. Lütfen önce raporu görüntüleyin.');
            return;
        }
        
        // Senaryo ID'yi modal'dan al (eğer varsa)
        const senaryoId = window.currentSenaryoId || 'rapor';
        
        // İndirme butonunu geçici olarak devre dışı bırak
        const indirBtn = document.getElementById('senaryoRaporIndirBtn');
        if (indirBtn) {
            indirBtn.disabled = true;
            indirBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Hazırlanıyor...';
        }
        
        // Modal'ı tam ekran yap ve scroll'u en üste al (tüm içeriğin görünür olması için)
        const modal = document.getElementById('senaryoRaporModal');
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                // Modal zaten açık olmalı, sadece scroll'u en üste al
                const modalBodyEl = modal.querySelector('.modal-body');
                if (modalBodyEl) {
                    modalBodyEl.scrollTop = 0;
                }
            }
        }
        
        // Modal body'nin scroll'unu kaldır ve tüm içeriği görünür yap (PDF için)
        let canvas;
        if (modalBody) {
            const originalOverflow = modalBody.style.overflow;
            const originalHeight = modalBody.style.height;
            const originalMaxHeight = modalBody.style.maxHeight;
            
            // Geçici olarak scroll'u kaldır ve tüm içeriği görünür yap
            modalBody.style.overflow = 'visible';
            modalBody.style.height = 'auto';
            modalBody.style.maxHeight = 'none';
            
            // Kısa bir bekleme süresi ekle (DOM'un render edilmesi için)
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Yakalanacak element - raporIcerik varsa onu, yoksa modalBody'yi kullan
            const captureElement = raporIcerik || modalBody;
            
            // html2canvas ile rapor içeriğini görüntüye çevir
            // Tüm içeriği yakalamak için daha yüksek scale ve daha iyi ayarlar
            canvas = await html2canvas(captureElement, {
                scale: 2, // Yüksek kalite için
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                width: captureElement.scrollWidth,
                height: captureElement.scrollHeight,
                windowWidth: captureElement.scrollWidth,
                windowHeight: captureElement.scrollHeight,
                allowTaint: false,
                removeContainer: false,
                imageTimeout: 15000,
                onclone: (clonedDoc) => {
                    // Clone'da scroll'u kaldır ve tüm içeriği görünür yap
                    const clonedElement = clonedDoc.querySelector('#senaryoRaporIcerik') || clonedDoc.querySelector('#senaryoRaporModal .modal-body');
                    if (clonedElement) {
                        clonedElement.style.overflow = 'visible';
                        clonedElement.style.height = 'auto';
                        clonedElement.style.maxHeight = 'none';
                        // Tüm gizli elementleri görünür yap
                        const hiddenElements = clonedElement.querySelectorAll('[style*="display: none"], [style*="visibility: hidden"]');
                        hiddenElements.forEach(el => {
                            el.style.display = '';
                            el.style.visibility = 'visible';
                        });
                    }
                }
            });
            
            // Orijinal stilleri geri yükle
            modalBody.style.overflow = originalOverflow;
            modalBody.style.height = originalHeight;
            modalBody.style.maxHeight = originalMaxHeight;
        } else if (raporIcerik) {
            // Fallback: sadece raporIcerik varsa onu kullan
            canvas = await html2canvas(raporIcerik, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                width: raporIcerik.scrollWidth,
                height: raporIcerik.scrollHeight
            });
        } else {
            throw new Error('Rapor içeriği bulunamadı');
        }
        
        // jsPDF ile PDF oluştur - içeriğin tam boyutuna göre
        const { jsPDF } = window.jspdf;
        
        // Canvas boyutlarını piksel cinsinden al
        const canvasWidthPx = canvas.width;
        const canvasHeightPx = canvas.height;
        
        // Piksel'i mm'ye çevir (1 inch = 25.4mm, 1 inch = 96px, yani 1px = 25.4/96 mm)
        const pxToMm = 25.4 / 96;
        const imgWidthMm = canvasWidthPx * pxToMm;
        const imgHeightMm = canvasHeightPx * pxToMm;
        
        // PDF boyutunu içeriğe göre ayarla (A4'ten büyükse genişlet)
        const pdfWidth = Math.max(210, imgWidthMm); // Minimum A4 genişliği
        const pdfHeight = Math.max(297, imgHeightMm); // Minimum A4 yüksekliği
        
        // PDF'i özel boyutta oluştur
        const pdf = new jsPDF({
            orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
            unit: 'mm',
            format: [pdfWidth, pdfHeight]
        });
        
        // PDF'e görüntüyü ekle (tam boyutta)
        const imgData = canvas.toDataURL('image/png', 1.0);
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidthMm, imgHeightMm, undefined, 'FAST');
        
        // PDF'i indir
        const tarih = new Date().toLocaleDateString('tr-TR').replace(/\s/g, '_');
        const dosyaAdi = `Senaryo_Raporu_${senaryoId}_${tarih}.pdf`;
        pdf.save(dosyaAdi);
        
        // Butonu tekrar aktif et
        if (indirBtn) {
            indirBtn.disabled = false;
            indirBtn.innerHTML = '<i class="fas fa-download me-2"></i>PDF İndir';
        }
        
        console.log('✅ PDF başarıyla indirildi:', dosyaAdi);
        console.log('📊 PDF boyutları:', { 
            canvas: { width: canvasWidthPx, height: canvasHeightPx },
            pdf: { width: pdfWidth + 'mm', height: pdfHeight + 'mm' },
            image: { width: imgWidthMm.toFixed(2) + 'mm', height: imgHeightMm.toFixed(2) + 'mm' }
        });
    } catch (e) {
        console.error('PDF indirme hatası:', e);
        alert('PDF indirilirken bir hata oluştu: ' + e.message);
        
        // Butonu tekrar aktif et
        const indirBtn = document.getElementById('senaryoRaporIndirBtn');
        if (indirBtn) {
            indirBtn.disabled = false;
            indirBtn.innerHTML = '<i class="fas fa-download me-2"></i>PDF İndir';
        }
    }
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
    const pInput = document.getElementById('pazarlamaButcesiInput');
    const pazarlamaButcesi = pInput ? parseFloat(pInput.value) || 0 : 0;

    // Personel Sayısı
    const perInput = document.getElementById('personelSayisiInput');
    const personelSayisi = perInput ? parseInt(perInput.value) || 0 : 0;

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
                <tr style="opacity: 0.6;">
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
        let personelBilgi = '';
        if (data.personel_analizi) {
            const p = data.personel_analizi;
            const maliyetRenk = p.fark > 0 ? 'danger' : (p.fark < 0 ? 'success' : 'secondary');
            personelBilgi = `
                <div class="alert bg-dark border border-info text-white p-3 shadow mt-2">
                    <div class="mb-2 fw-bold"><i class="fas fa-users me-2"></i>Personel Analizi</div>
                    <div class="small">
                        <div class="mb-1">Mevcut: <strong>${p.mevcut}</strong> → Yeni: <strong>${p.yeni}</strong> (Fark: <span class="text-${maliyetRenk}">${p.fark > 0 ? '+' : ''}${p.fark}</span>)</div>
                        <div class="mb-1">Aylık Maliyet Farkı: <strong class="text-${maliyetRenk}">${p.fark > 0 ? '+' : ''}${p.aylikMaliyetFark.toLocaleString('tr-TR')} TL</strong></div>
                        <div class="text-muted small mt-2"><i class="fas fa-info-circle me-1"></i>${p.aciklama}</div>
                    </div>
                </div>
            `;
        }
        aiOzetKutusu.innerHTML = `
            <div class="alert bg-dark border ${data.realist.fark>=0?'border-success':'border-danger'} text-white p-3 shadow mt-3">
                <div class="mb-1 fw-bold text-${data.realist.fark>=0?'success':'danger'}">${data.ai_mesaj}</div>
            </div>
            ${personelBilgi}
        `; 
    }
    document.getElementById('chartRow').style.display = 'flex';
    
    // Simülasyon verisini kaydet (senaryo kaydetme için)
    window.sonSimulasyonVerisi = {
        fiyatDegisimi: parseFloat(val),
        personelSayisi: personelSayisi,
        pazarlamaButcesi: pazarlamaButcesi,
        tahminiCiro: data.realist.ciro,
        netKar: data.realist.kar,
        karMarji: data.realist.marj,
        fark: data.realist.fark,
        simulasyonTarihi: new Date().toISOString(),
        senaryoKarsilastirma: data.senaryoKarsilastirma || []
    };
    
    // Senaryo kaydet butonunu göster
    const senaryoKaydetBtn = document.getElementById('senaryoKaydetBtn');
    if (senaryoKaydetBtn) {
        senaryoKaydetBtn.style.display = 'inline-block';
    }
    
    // Grafikler (mevcut kod)
    const ctxBar = document.getElementById('senaryoGrafigi'); 
    if (!ctxBar) {
        console.warn('senaryoGrafigi canvas bulunamadı');
        return;
    }
    if(window.senaryoChart instanceof Chart) window.senaryoChart.destroy(); 
    
    // Null check
    if (!data || !data.realist || !data.iyimser || !data.kotumser || !data.mevcut) {
        console.warn('Senaryo verisi eksik');
        return;
    }
    
    // Senaryo yorumlarını hazırla (senaryoKarsilastirma'dan)
    const senaryoYorumlari = {};
    if (data.senaryoKarsilastirma && Array.isArray(data.senaryoKarsilastirma)) {
        data.senaryoKarsilastirma.forEach(s => {
            // Senaryo adını label ile eşleştir
            if (s.senaryo === 'Kötümser') senaryoYorumlari[0] = s.yoneticiYorumu || 'Analiz mevcut değil';
            if (s.senaryo === 'Mevcut') senaryoYorumlari[1] = s.yoneticiYorumu || 'Analiz mevcut değil';
            if (s.senaryo === 'Gerçekçi') senaryoYorumlari[2] = s.yoneticiYorumu || 'Analiz mevcut değil';
            if (s.senaryo === 'İyimser') senaryoYorumlari[3] = s.yoneticiYorumu || 'Analiz mevcut değil';
        });
    }
    
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
                onHover: function(event, activeElements) {
                    // Tooltip DOM'a eklendikten sonra tüm yorum satırlarını bul ve saydam yap
                    setTimeout(() => {
                        // Senaryo grafiği tooltip'ini bul
                        const tooltipEl = document.querySelector('.chartjs-tooltip');
                        if (tooltipEl) {
                            const tooltipItems = tooltipEl.querySelectorAll('li');
                            tooltipItems.forEach((li, index) => {
                                // İlk satır (Net Kâr) normal, 3. satırdan itibaren (yorum satırları) saydam
                                // afterBody callback'inden gelen satırlar: boş satır (index 1), ayırıcı (index 2), yorum (index 3+)
                                if (index >= 2) {
                                    li.style.opacity = '0.6';
                                    li.style.fontStyle = 'italic';
                                    li.style.fontSize = '0.85em';
                                    li.style.color = 'rgba(255, 255, 255, 0.6)';
                                }
                            });
                        }
                    }, 50);
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#334155',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                return `Net Kâr: ${formatPara(context.parsed.y)}`;
                            },
                            afterBody: function(context) {
                                const yorum = senaryoYorumlari[context[0].dataIndex];
                                if (yorum) {
                                    return [
                                        '',
                                        `─────────────────────────`,
                                        `Yorum: ${yorum}`
                                    ];
                                }
                                return '';
                            },
                            labelColor: function(context) {
                                return {
                                    borderColor: context.dataset.backgroundColor[context.dataIndex] || context.dataset.backgroundColor,
                                    backgroundColor: context.dataset.backgroundColor[context.dataIndex] || context.dataset.backgroundColor,
                                    borderWidth: 2
                                };
                            }
                        },
                        enabled: true
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
// Taslak kaydet/yükle fonksiyonları kaldırıldı

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
            <span class="badge bg-light border border-secondary py-2 px-3 rounded-pill">${veri.fiyat} ₺</span>
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
                liste.innerHTML += `<tr><td>${r.otel}</td><td class="text-end fw-bold">${r.fiyat} ₺</td><td class="text-end">${durum}</td></tr>`;
            });

            const ctx2El = document.getElementById('rakipGrafigiAnalytics');
            if(!ctx2El) return;
            const ctx2 = ctx2El.getContext('2d');
            if(rakipChartAnalytics) rakipChartAnalytics.destroy();
            rakipChartAnalytics = new Chart(ctx2, { type: 'bar', data: { labels: gLabels, datasets: [{ data: gData, backgroundColor: gRenk, borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: {display:false} }, scales: { x:{grid:{display:false}}, y:{grid:{color:'rgba(255,255,255,0.05)'}} } } });
        }
    } catch(e) { console.error(e); }
};

// Yıllık Karşılaştırma (2023-2024-2025)
let yillikKarsilastirmaChart = null;

async function yillikKarsilastirmaYukle() {
    try {
        console.log('📊 Yıllık karşılaştırma yükleniyor...');
        const res = await fetch('/api/dashboard/yillik-karsilastirma');
        if (!res.ok) {
            console.error('Yıllık karşılaştırma API hatası:', res.status);
            const errorText = await res.text();
            console.error('API hata detayı:', errorText);
            return;
        }
        const data = await res.json();
        console.log('📊 Yıllık karşılaştırma verisi alındı:', data);
        
        if (!data || !data.yillik_veriler || data.yillik_veriler.length === 0) {
            console.warn('Yıllık karşılaştırma verisi bulunamadı');
            return;
        }
        
        const yillikVeriler = data.yillik_veriler;
        const buyumeOranlari = data.buyume_oranlari || [];
        const ozet = data.ozet || {};
        
        console.log('📊 Yıllık veriler:', yillikVeriler);
        
        // Bilgi kartı
        const bilgiDiv = document.getElementById('yillikKarsilastirmaBilgi');
        if (bilgiDiv) {
            let bilgiHTML = '<div class="row g-3">';
            
            if (ozet.en_yuksek_gelir) {
                bilgiHTML += `
                    <div class="col-md-4">
                        <div class="card bg-success bg-opacity-10 border-success border-start border-3 p-3">
                            <div class="d-flex align-items-center">
                                <i class="fas fa-trophy text-success fs-4 me-3"></i>
                                <div>
                                    <small class="text-muted d-block">En Yüksek Gelir</small>
                                    <strong class="text-success">${ozet.en_yuksek_gelir.yil}: ${formatPara(ozet.en_yuksek_gelir.toplam_gelir)}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            if (ozet.en_yuksek_doluluk) {
                bilgiHTML += `
                    <div class="col-md-4">
                        <div class="card bg-primary bg-opacity-10 border-primary border-start border-3 p-3">
                            <div class="d-flex align-items-center">
                                <i class="fas fa-chart-line text-primary fs-4 me-3"></i>
                                <div>
                                    <small class="text-muted d-block">En Yüksek Doluluk</small>
                                    <strong class="text-primary">${ozet.en_yuksek_doluluk.yil}: ${ozet.en_yuksek_doluluk.doluluk_orani.toFixed(1)}%</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            if (ozet.en_dusuk_iptal) {
                bilgiHTML += `
                    <div class="col-md-4">
                        <div class="card bg-info bg-opacity-10 border-info border-start border-3 p-3">
                            <div class="d-flex align-items-center">
                                <i class="fas fa-check-circle text-info fs-4 me-3"></i>
                                <div>
                                    <small class="text-muted d-block">En Düşük İptal</small>
                                    <strong class="text-info">${ozet.en_dusuk_iptal.yil}: ${ozet.en_dusuk_iptal.iptal_orani.toFixed(1)}%</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            bilgiHTML += '</div>';
            bilgiDiv.innerHTML = bilgiHTML;
        }
        
        // Tablo
        const tabloDiv = document.getElementById('yillikKarsilastirmaTablosu');
        if (tabloDiv) {
            let tabloHTML = `
                <table class="table table-hover table-bordered align-middle">
                    <thead class="table-light">
                        <tr>
                            <th class="text-center">Yıl</th>
                            <th class="text-end">Toplam Rezervasyon</th>
                            <th class="text-end">Aktif Rezervasyon</th>
                            <th class="text-end">İptal Sayısı</th>
                            <th class="text-end">İptal Oranı (%)</th>
                            <th class="text-end">Toplam Gelir</th>
                            <th class="text-end">Ortalama Fiyat</th>
                            <th class="text-end">Toplam Gece</th>
                            <th class="text-end">Doluluk Oranı (%)</th>
                            <th class="text-end">Toplam Kâr</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            yillikVeriler.forEach((yil, index) => {
                const buyume = buyumeOranlari.find(b => b.yil === yil.yil);
                const gelirBuyumeBadge = buyume && buyume.gelir_buyume_yuzde > 0 
                    ? `<span class="badge bg-success ms-2">+${buyume.gelir_buyume_yuzde.toFixed(1)}%</span>`
                    : buyume && buyume.gelir_buyume_yuzde < 0
                    ? `<span class="badge bg-danger ms-2">${buyume.gelir_buyume_yuzde.toFixed(1)}%</span>`
                    : '';
                
                tabloHTML += `
                    <tr>
                        <td class="text-center fw-bold">${yil.yil}</td>
                        <td class="text-end">${yil.toplam_rezervasyon.toLocaleString('tr-TR')}</td>
                        <td class="text-end">${yil.aktif_rezervasyon.toLocaleString('tr-TR')}</td>
                        <td class="text-end">${yil.iptal_sayisi.toLocaleString('tr-TR')}</td>
                        <td class="text-end">${yil.iptal_orani.toFixed(1)}%</td>
                        <td class="text-end fw-bold">${formatPara(yil.toplam_gelir)}${gelirBuyumeBadge}</td>
                        <td class="text-end">${formatPara(yil.ortalama_fiyat)}</td>
                        <td class="text-end">${yil.toplam_gece.toLocaleString('tr-TR')}</td>
                        <td class="text-end fw-bold">${yil.doluluk_orani.toFixed(1)}%</td>
                        <td class="text-end text-success fw-bold">${formatPara(yil.toplam_kar)}</td>
                    </tr>
                `;
            });
            
            tabloHTML += '</tbody></table>';
            tabloDiv.innerHTML = tabloHTML;
        }
        
        // Grafik
        const ctxEl = document.getElementById('yillikKarsilastirmaChart');
        if (!ctxEl) {
            console.error('❌ Canvas elementi bulunamadı: yillikKarsilastirmaChart');
            return;
        }
        
        console.log('✅ Canvas elementi bulundu');
        
        // Mevcut chart'ı güvenli şekilde yok et
        if (yillikKarsilastirmaChart) {
            try {
                yillikKarsilastirmaChart.destroy();
            } catch (e) {
                console.warn('Chart destroy hatası (göz ardı ediliyor):', e);
            }
            yillikKarsilastirmaChart = null;
        }
        
        // Chart.js'in yüklü olup olmadığını kontrol et
        if (typeof Chart === 'undefined') {
            console.error('❌ Chart.js yüklenmemiş!');
            return;
        }
        
        const ctx = ctxEl.getContext('2d');
        if (!ctx) {
            console.error('❌ Canvas context alınamadı');
            return;
        }
        
        const labels = yillikVeriler.map(v => v.yil.toString());
        const gelirData = yillikVeriler.map(v => v.toplam_gelir);
        const karData = yillikVeriler.map(v => v.toplam_kar);
        const dolulukData = yillikVeriler.map(v => v.doluluk_orani);
        
        console.log('📊 Grafik verileri:', { labels, gelirData, karData, dolulukData });
        
        try {
            // Mixed chart için Chart.js'in doğru şekilde yapılandırılması
            yillikKarsilastirmaChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Toplam Gelir (TL)',
                        data: gelirData,
                        backgroundColor: 'rgba(59, 130, 246, 0.7)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 2,
                        yAxisID: 'y',
                        order: 2
                    },
                    {
                        label: 'Toplam Kâr (TL)',
                        data: karData,
                        backgroundColor: 'rgba(34, 197, 94, 0.7)',
                        borderColor: 'rgba(34, 197, 94, 1)',
                        borderWidth: 2,
                        yAxisID: 'y',
                        order: 1
                    },
                    {
                        label: 'Doluluk Oranı (%)',
                        data: dolulukData,
                        type: 'line',
                        backgroundColor: 'rgba(168, 85, 247, 0.2)',
                        borderColor: 'rgba(168, 85, 247, 1)',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        pointBackgroundColor: 'rgba(168, 85, 247, 1)',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        yAxisID: 'y1',
                        order: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#1e293b',
                        bodyColor: '#1e293b',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    if (label.includes('Doluluk')) {
                                        label += context.parsed.y.toFixed(1) + '%';
                                    } else {
                                        label += formatPara(context.parsed.y);
                                    }
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Gelir ve Kâr (TL)'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return formatPara(value);
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Doluluk Oranı (%)'
                        },
                        grid: {
                            drawOnChartArea: false
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(1) + '%';
                            }
                        }
                    }
                }
            }
            });
            console.log('✅ Yıllık karşılaştırma grafiği oluşturuldu');
        } catch (chartError) {
            console.error('❌ Chart oluşturma hatası:', chartError);
            console.error('Chart hatası detayı:', chartError.stack);
        }
        
    } catch (e) {
        console.error('❌ Yıllık karşılaştırma yükleme hatası:', e);
        console.error('Hata detayı:', e.stack);
    }
}

window.yillikKarsilastirmaYukle = yillikKarsilastirmaYukle;