// GÜVENLİK
if (!localStorage.getItem('girisYapildi')) window.location.href = '/login.html';

// ODA RESİMLERİ VE ÖZELLİKLERİ
const ODA_VERITABANI = {
    'Standart': { img: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=800&q=80', features: ['Çift Kişilik Yatak', 'Wi-Fi', 'TV', 'Duş'], basePrice: 3500 },
    'Deluxe': { img: 'https://images.unsplash.com/photo-1590490360182-f33fb0d41022?auto=format&fit=crop&w=800&q=80', features: ['King Yatak', 'Minibar', 'Jakuzi', 'Manzara'], basePrice: 5500 },
    'Suit': { img: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80', features: ['Oturma Alanı', 'Teras', 'Kahve Makinesi', 'VIP'], basePrice: 8500 },
    'Kral Dairesi': { img: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80', features: ['Havuz', 'Sauna', 'Toplantı', 'Butler'], basePrice: 15000 }
};

document.addEventListener('DOMContentLoaded', () => {
    verileriGetir(); grafigiCiz(); rakipAnaliziCiz(); dovizKurlariniGetir(); mevsimAnaliziCiz(); ikSimulasyonuYap(50); tahminGetir(); odaDurumuGetir();
    
    // Geçmiş tarih seçimini engelle (YYYY-MM-DD formatında yerel saat)
    const bugun = new Date().toLocaleDateString('en-CA'); 
    document.getElementById('inpTarih').setAttribute('min', bugun);
    document.getElementById('inpTarih').value = bugun;

    const sonSayfa = localStorage.getItem('sonAcilanSayfa');
    if (sonSayfa) { const menuLink = document.querySelector(`a[onclick*="${sonSayfa}"]`); if (menuLink) menuLink.click(); }
});

function cikisYap() { localStorage.removeItem('girisYapildi'); localStorage.removeItem('sonAcilanSayfa'); window.location.href = '/login.html'; }
const formatPara = (s) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(s);

async function verileriGetir() {
    const res = await fetch('/api/ozet'); const data = await res.json();
    document.getElementById('toplamRez').innerText = data.toplam_rezervasyon;
    document.getElementById('toplamCiro').innerText = formatPara(data.toplam_ciro);
    document.getElementById('ortFiyat').innerText = formatPara(data.ortalama_gecelik_fiyat);
    document.getElementById('iptalSayisi').innerText = data.toplam_iptal;
}

// 🔥 ODA YÖNETİMİ (DÜZELTİLMİŞ)
async function odaDurumuGetir() {
    // Bugünün tarihini al (Yerel Saat ile)
    const bugun = new Date().toLocaleDateString('en-CA'); 

    try {
        const res = await fetch(`/api/oda-durumu?tarih=${bugun}`);
        const data = await res.json();

        // Grafik
        if (window.odaChart instanceof Chart) window.odaChart.destroy();
        new Chart(document.getElementById('odaTipiGrafigi'), { type: 'bar', data: { labels: ['Standart', 'Deluxe', 'Suit', 'Kral'], datasets: [{ label: 'Fiyat', data: [3500, 5500, 8500, 15000], backgroundColor: ['#3498db', '#9b59b6', '#f1c40f', '#e74c3c'] }] }, options: { plugins: { legend: { display: false } } } });
        
        const grid = document.getElementById('odaGrid'); grid.innerHTML = "";
        
        // 101-150 Odaları Döngüyle Oluştur
        for (let i = 101; i <= 150; i++) {
            let tip = 'Standart';
            if (i >= 131 && i <= 140) tip = 'Deluxe';
            else if (i >= 141 && i <= 148) tip = 'Suit';
            else if (i >= 149) tip = 'Kral Dairesi';

            // Odanın dolu olup olmadığını kontrol et
            const doluOda = data.oda_listesi.find(r => r.oda_no === i);
            let durum = 'Boş';
            let kartRengi = 'bg-success'; // Varsayılan YEŞİL
            let odaData = { oda_no: i, tip: tip, durum: 'Boş', fiyat: ODA_VERITABANI[tip].basePrice };

            if (doluOda) {
                durum = 'Dolu';
                kartRengi = 'bg-danger'; // Doluysa KIRMIZI
                odaData = { ...doluOda, tip: tip, durum: 'Dolu' };
            }

            const dataStr = encodeURIComponent(JSON.stringify(odaData));

            let html = `
                <div class="col-md-2 col-4 mb-2">
                    <div onclick="odaDetayAc('${dataStr}')" class="oda-kutu p-2 text-center text-white rounded shadow-sm ${kartRengi}" style="min-height:110px; display:flex; flex-direction:column; justify-content:center;">
                        <h5 class="fw-bold m-0">${i}</h5>
                        <small style="font-size:0.7rem;">${tip}</small>
            `;

            if (durum === 'Dolu') {
                html += `
                    <div style="margin-top:5px; border-top:1px solid rgba(255,255,255,0.4); padding-top:4px; font-size:0.65rem;">
                        <div>${odaData.giris}</div>
                        <i class="fas fa-arrow-down" style="font-size:0.5rem; opacity:0.7"></i>
                        <div>${odaData.cikis}</div>
                    </div>`;
            } else {
                html += `<div style="margin-top:5px; opacity:0.6"><i class="fas fa-check"></i> Boş</div>`;
            }

            html += `</div></div>`;
            grid.innerHTML += html;
        }
    } catch (err) { console.error(err); }
}

function odaDetayAc(str) {
    const oda = JSON.parse(decodeURIComponent(str));
    const detay = ODA_VERITABANI[oda.tip] || ODA_VERITABANI['Standart'];
    document.getElementById('mdlOdaNo').innerText = oda.oda_no;
    document.getElementById('mdlTip').innerText = oda.tip;
    document.getElementById('mdlResim').src = detay.img;
    const fiyat = oda.durum === 'Dolu' ? parseFloat(oda.fiyat) : detay.basePrice;
    document.getElementById('mdlFiyat').innerText = formatPara(fiyat);
    document.getElementById('mdlOzellikler').innerHTML = detay.features.map(f => `<li><i class="fas fa-check text-primary me-2"></i> ${f}</li>`).join('');
    
    const badge = document.getElementById('mdlDurumBadge');
    const info = document.getElementById('mdlRezBilgi');
    if (oda.durum === 'Dolu') {
        badge.className = "badge bg-danger w-100 p-2"; badge.innerText = "DOLU";
        info.style.display = "block";
        document.getElementById('mdlGiris').innerText = oda.giris;
        document.getElementById('mdlCikis').innerText = oda.cikis;
    } else {
        badge.className = "badge bg-success w-100 p-2"; badge.innerText = "MÜSAİT";
        info.style.display = "none";
    }
    new bootstrap.Modal(document.getElementById('odaDetayModal')).show();
}

async function rezervasyonEkle() {
    const veri = { giris_tarihi: document.getElementById('inpTarih').value, sure: document.getElementById('inpSure').value, oda_no: document.getElementById('inpOda').value, oda_tipi: document.getElementById('inpTip').value, fiyat: document.getElementById('inpFiyat').value };
    await fetch('/api/rezervasyon-ekle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(veri) });
    alert("✅ Rezervasyon Eklendi!"); odaDurumuGetir(); document.getElementById('rezervasyonForm').reset(); document.getElementById('inpTarih').value = new Date().toLocaleDateString('en-CA');
}

// Diğer standart fonksiyonlar
async function grafigiCiz() { const res = await fetch('/api/aylik-doluluk'); const data = await res.json(); new Chart(document.getElementById('dolulukGrafigi'), { type: 'line', data: { labels: data.map(d=>d.ay), datasets: [{ label: 'Rezervasyon', data: data.map(d=>d.rezervasyon_sayisi), borderColor: '#3498db', fill: true }] } }); }
async function dovizKurlariniGetir() { const res = await fetch('/api/doviz'); const kurlar = await res.json(); const liste = document.getElementById('dovizListesi'); liste.innerHTML = ""; kurlar.forEach(kur => { const renk = kur.fark >= 0 ? 'text-success' : 'text-danger'; const ikon = kur.fark >= 0 ? 'fa-caret-up' : 'fa-caret-down'; liste.innerHTML += `<div class="currency-row d-flex justify-content-between align-items-center" onclick="dovizDetayAc('${kur.kod}', '${kur.isim}')"><div><span class="fw-bold text-warning">${kur.kod}</span> <small class="d-block text-secondary">${kur.isim}</small></div><div class="text-end"><div class="fw-bold">${kur.satis} ₺</div><small class="${renk}"><i class="fas ${ikon}"></i> %${Math.abs(kur.fark)}</small></div></div>`; }); }
async function dovizDetayAc(kod, isim) { new bootstrap.Modal(document.getElementById('dovizModal')).show(); document.getElementById('dovizModalBaslik').innerText = `${isim} (${kod}) - Son 3 Ay`; const ctx = document.getElementById('dovizDetayGrafigi'); if (window.dovizChart instanceof Chart) window.dovizChart.destroy(); const res = await fetch(`/api/doviz-gecmis/${kod}`); const data = await res.json(); window.dovizChart = new Chart(ctx, { type: 'line', data: { labels: data.map(d=>d.tarih), datasets: [{ label: 'Değer (₺)', data: data.map(d=>d.deger), borderColor: '#f39c12', backgroundColor: 'rgba(243, 156, 18, 0.1)', fill: true, pointRadius: 0 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { maxTicksLimit: 10 } } } } }); }
async function rakipAnaliziCiz() { const res = await fetch('/api/rakip-analizi'); const data = await res.json(); new Chart(document.getElementById('rakipGrafigi'), { type: 'line', data: { labels: data.map(d => d.ay), datasets: [{ label: 'Bizim Fiyat (₺)', data: data.map(d => d.bizim_fiyat), borderColor: 'green', backgroundColor: 'green' }, { label: 'Rakip Fiyat (₺)', data: data.map(d => d.rakip_fiyat), borderColor: 'red', backgroundColor: 'red', borderDash: [5,5] }] }, options: { plugins: { datalabels: { display: false } } } }); }
async function mevsimAnaliziCiz() { const res = await fetch('/api/mevsimsel-doluluk'); const data = await res.json(); new Chart(document.getElementById('mevsimGrafigi'), { type: 'doughnut', data: { labels: data.map(d=>d.mevsim), datasets: [{ data: data.map(d=>d.rezervasyon_sayisi) }] } }); }
async function tahminGetir() { const res = await fetch('/api/tahmin'); const data = await res.json(); const aylar = ["", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]; new Chart(document.getElementById('tahminGrafigi'), { type: 'line', data: { labels: data.map(d=>aylar[d.ay_no]), datasets: [{ label: 'Tahmin', data: data.map(d=>d.tahmin_rezervasyon), borderColor: '#17a2b8', borderDash: [5,5] }] } }); const tablo = document.getElementById('stratejiTablosu'); tablo.innerHTML = ""; data.forEach(d => { tablo.innerHTML += `<tr><td>${aylar[d.ay_no]}</td><td>${d.tahmin_rezervasyon}</td><td class="${d.renk}">${d.strateji}</td></tr>`; }); }
async function fiyatSimulasyonuYap() { const val = document.getElementById('fiyatDegisimi').value; if (!val) { alert("Değer girin!"); return; } const res = await fetch('/api/simulasyon', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({fiyatDegisimi:parseFloat(val)}) }); const data = await res.json(); document.getElementById('simSonuc').innerHTML = `<div class="mt-3 border-top pt-3"><div class="d-flex justify-content-between mb-2"><span>Oda Fiyatı:</span><strong>${formatPara(data.eski_fiyat)} ➝ <span class="text-primary">${formatPara(data.yeni_fiyat)}</span></strong></div><div class="d-flex justify-content-between mb-2"><span>Yeni Ciro:</span><strong>${formatPara(data.tahmini_ciro)}</strong></div></div>`; new Chart(document.getElementById('senaryoGrafigi'), { type:'bar', data:{ labels:[`Mevcut`, `Simülasyon`], datasets:[{ label:'Ciro (₺)', data:[data.orijinal_ciro, data.tahmini_ciro], backgroundColor:['#95a5a6', data.fark > 0 ? '#2ecc71' : '#e74c3c'] }] } }); }
async function ikSimulasyonuYap(v) { const res = await fetch('/api/personel-simulasyon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hedefDoluluk: parseFloat(v) }) }); const data = await res.json(); document.getElementById('ikTemizlik').innerText = data.temizlik; document.getElementById('ikServis').innerText = data.servis; document.getElementById('ikToplam').innerText = data.toplam; }
async function excelIndir() { const d = await (await fetch('/api/ozet')).json(); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([d]), "Ozet"); XLSX.writeFile(wb, "Rapor.xlsx"); }