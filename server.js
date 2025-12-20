const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// VERİTABANI BAĞLANTISI
const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'root', // MAMP şifreniz
    database: 'kds_oteldb',
    port: 8889       // MySQL portunuz
});

db.connect(err => {
    if (err) console.error('❌ Veritabanı Hatası:', err.message);
    else console.log('✅ MySQL Bağlantısı Başarılı.');
});

const PORT = process.env.PORT || 3001;

// HTML SAYFALARI
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));

// --- API UÇLARI ---

app.post('/api/login', (req, res) => {
    const { kadi, sifre } = req.body;
    if (kadi === 'admin' && sifre === '1234') res.json({ success: true });
    else res.json({ success: false });
});

app.get('/api/ozet', (req, res) => {
    const sql = `SELECT COUNT(*) as toplam_rezervasyon, SUM(fiyat * konaklama_suresi) as toplam_ciro, AVG(fiyat) as ortalama_gecelik_fiyat, SUM(iptal_durumu) as toplam_iptal FROM rezervasyonlar`;
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result[0]);
    });
});

app.get('/api/aylik-doluluk', (req, res) => {
    const sql = `SELECT DATE_FORMAT(giris_tarihi, '%Y-%m') as ay, COUNT(*) as rezervasyon_sayisi FROM rezervasyonlar WHERE iptal_durumu = 0 GROUP BY ay ORDER BY ay ASC`;
    db.query(sql, (err, results) => res.json(results));
});

app.get('/api/mevsimsel-doluluk', (req, res) => {
    const sql = `SELECT CASE WHEN MONTH(giris_tarihi) IN (12, 1, 2) THEN 'Kış' WHEN MONTH(giris_tarihi) IN (3, 4, 5) THEN 'İlkbahar' WHEN MONTH(giris_tarihi) IN (6, 7, 8) THEN 'Yaz' ELSE 'Sonbahar' END as mevsim, COUNT(*) as rezervasyon_sayisi FROM rezervasyonlar WHERE iptal_durumu = 0 GROUP BY mevsim`;
    db.query(sql, (err, results) => res.json(results));
});

// CANLI DÖVİZ (Simülasyon)
app.get('/api/doviz', (req, res) => {
    const random = (min, max) => (Math.random() * (max - min) + min).toFixed(4);
    const kurlar = [
        { kod: 'USD', isim: 'ABD Doları', alis: random(34.15, 34.25), satis: random(34.25, 34.35), fark: 0.15 },
        { kod: 'EUR', isim: 'Euro', alis: random(36.40, 36.50), satis: random(36.50, 36.60), fark: 0.22 },
        { kod: 'GBP', isim: 'Sterlin', alis: random(43.10, 43.20), satis: random(43.30, 43.40), fark: -0.05 },
        { kod: 'GA', isim: 'Gram Altın', alis: random(2900, 2910), satis: random(2920, 2930), fark: 1.25 }
    ];
    res.json(kurlar);
});

// DÖVİZ GEÇMİŞİ (90 Günlük Simülasyon)
app.get('/api/doviz-gecmis/:kod', (req, res) => {
    const kod = req.params.kod.toUpperCase();
    let bazFiyat = (kod === 'USD') ? 34.20 : (kod === 'EUR') ? 36.50 : (kod === 'GA') ? 2900 : 10;
    const veri = [];
    const bugun = new Date();
    for (let i = 90; i >= 0; i--) {
        const tarih = new Date();
        tarih.setDate(bugun.getDate() - i);
        const degisim = (Math.random() * 0.02) - 0.008;
        bazFiyat = bazFiyat * (1 + degisim);
        veri.push({ tarih: tarih.toISOString().split('T')[0], deger: bazFiyat.toFixed(2) });
    }
    res.json(veri);
});

// RAKİP ANALİZİ (Fiyatlar TL)
app.get('/api/rakip-analizi', async (req, res) => {
    const apiKey = "ecce8ce2aafaf0a2cb3f34e4e8558a96af63bc809c8d7e5942bcedd6a30398d0";
    const sehir = "Istanbul";
    const sql = `SELECT DATE_FORMAT(giris_tarihi, '%Y-%m') as ay, AVG(fiyat) as bizim_fiyat
                 FROM rezervasyonlar
                 WHERE iptal_durumu = 0
                 GROUP BY ay
                 ORDER BY ay ASC`;

    db.query(sql, async (err, results) => {
        if (err) return res.status(500).json(err);

        let piyasaOrtalamasi = 0;
        try {
            const today = new Date();
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            const checkIn = nextMonth.toISOString().split('T')[0];
            const checkOut = new Date(today.getFullYear(), today.getMonth() + 1, 2).toISOString().split('T')[0];
            const url = `https://serpapi.com/search.json?engine=google_hotels&q=hotels+in+${sehir}&check_in_date=${checkIn}&check_out_date=${checkOut}&currency=TRY&api_key=${apiKey}`;
            
            // Hata yakalama için try-catch bloğu içinde axios
            try {
                const response = await axios.get(url);
                if (response.data.properties && response.data.properties.length > 0) {
                    let toplam = 0, sayac = 0;
                    response.data.properties.slice(0, 10).forEach(o => {
                        if (o.rate_per_night && o.rate_per_night.lowest) {
                            let f = o.rate_per_night.lowest.toString().replace(/[^0-9.,]/g, '');
                            if(f.includes('.') && f.includes(',')) f = f.replace('.', '').replace(',', '.');
                            else if(f.includes(',')) f = f.replace(',', '.');
                            toplam += parseFloat(f);
                            sayac++;
                        }
                    });
                    piyasaOrtalamasi = sayac > 0 ? toplam / sayac : 0;
                }
            } catch (e) { console.log("Google API Hatası (Simülasyona geçiliyor)"); }

            const analizVerisi = results.map((row) => {
                const bizimFiyat = parseFloat(row.bizim_fiyat);
                let rakipFiyat = piyasaOrtalamasi > 1000 ? piyasaOrtalamasi * (1 + (Math.random() * 0.1 - 0.05)) : bizimFiyat * 1.15;
                return { ay: row.ay, bizim_fiyat: bizimFiyat.toFixed(2), rakip_fiyat: rakipFiyat.toFixed(2) };
            });
            res.json(analizVerisi);
        } catch (apiError) {
            const fallbackVeri = results.map(row => ({ ay: row.ay, bizim_fiyat: row.bizim_fiyat, rakip_fiyat: (row.bizim_fiyat * 1.15).toFixed(2) }));
            res.json(fallbackVeri);
        }
    });
});

// 6. 🔥 FİYAT SİMÜLASYONU (Gelişmiş - Fiyat & Ciro Analizi)
app.post('/api/simulasyon', (req, res) => {
    const { fiyatDegisimi } = req.body;
    
    // 1. Adım: Mevcut Ortalama Fiyatı Bul
    const sqlFiyat = `SELECT AVG(fiyat) as ort_fiyat FROM rezervasyonlar`;
    
    // 2. Adım: Aylık Ciro Verilerini Çek
    const sqlCiro = `SELECT MONTH(giris_tarihi) as ay_no, SUM(fiyat * konaklama_suresi) as aylik_ciro FROM rezervasyonlar WHERE iptal_durumu = 0 GROUP BY ay_no`;

    db.query(sqlFiyat, (err, resFiyat) => {
        if (err) {
            console.error("Fiyat SQL Hatası:", err);
            return res.status(500).json({ error: "Veritabanı Hatası (Fiyat)" });
        }
        
        // Veritabanındaki fiyatlar eğer TL'ye çevrilmediyse burada sanal olarak çarpılabilir.
        // Ancak önceki adımda SQL ile çevirdiğinizi varsayıyoruz.
        const mevcutOrtalamaFiyat = parseFloat(resFiyat[0].ort_fiyat || 0);
        
        // Yeni fiyatı hesapla (Örn: %10 artış)
        const yeniOrtalamaFiyat = mevcutOrtalamaFiyat * (1 + fiyatDegisimi / 100);

        db.query(sqlCiro, (err2, results) => {
            if (err2) {
                console.error("Ciro SQL Hatası:", err2);
                return res.status(500).json({ error: "Veritabanı Hatası (Ciro)" });
            }
            
            let eskiCiro = 0, yeniCiro = 0;
            
            results.forEach(row => {
                const ay = row.ay_no;
                
                // --- EKONOMİK MODEL (ESNEKLİK) ---
                // Yaz sezonunda (6,7,8,9. aylar) fiyat artsa bile talep az düşer (-0.3)
                // Kış sezonunda fiyat artarsa talep çok düşer (-1.0)
                const esneklik = (ay >= 6 && ay <= 9) ? -0.3 : (ay <= 2 || ay >= 11) ? -1.0 : -0.6;
                
                // Fiyat değişiminin talebe etkisi
                const talepDegisimi = (fiyatDegisimi * esneklik) / 100;
                
                const buAykiCiro = parseFloat(row.aylik_ciro);
                
                eskiCiro += buAykiCiro;
                // Yeni Ciro Formülü: Eski Ciro * (1 + Fiyat Artışı) * (1 + Talep Düşüşü)
                yeniCiro += buAykiCiro * (1 + fiyatDegisimi/100) * (1 + talepDegisimi);
            });

            res.json({ 
                eski_fiyat: mevcutOrtalamaFiyat,
                yeni_fiyat: yeniOrtalamaFiyat,
                orijinal_ciro: eskiCiro, 
                tahmini_ciro: yeniCiro, 
                fark: yeniCiro - eskiCiro 
            });
        });
    });
});


app.post('/api/personel-simulasyon', (req, res) => {
    const { hedefDoluluk } = req.body;
    const sql = `SELECT COUNT(*) as max_oda FROM rezervasyonlar GROUP BY giris_tarihi ORDER BY max_oda DESC LIMIT 1`;
    db.query(sql, (err, result) => {
        const kapasite = result[0] ? result[0].max_oda : 100;
        const hedefOda = Math.ceil(kapasite * (hedefDoluluk / 100));
        res.json({ hedef_doluluk: hedefDoluluk, aktif_oda: hedefOda, temizlik: Math.ceil(hedefOda / 10), servis: Math.ceil((hedefOda * 2.1) / 20), mutfak: Math.ceil((hedefOda * 2.1) / 30), resepsiyon: 3, guvenlik: 2, toplam: Math.ceil(hedefOda / 10) + Math.ceil((hedefOda * 2.1) / 20) + Math.ceil((hedefOda * 2.1) / 30) + 5 });
    });
});

app.get('/api/tahmin', (req, res) => {
    const sql = `SELECT MONTH(giris_tarihi) as ay_no, COUNT(*) as ort_rez, AVG(fiyat) as ort_fiyat FROM rezervasyonlar WHERE iptal_durumu = 0 GROUP BY ay_no ORDER BY ay_no ASC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        const buAy = new Date().getMonth() + 1;
        let tahminSerisi = [];
        for (let i = 0; i < 12; i++) {
            let hedefAy = (buAy + i);
            if (hedefAy > 12) hedefAy -= 12;
            const gecmis = results.find(r => r.ay_no === hedefAy);
            const bazRez = gecmis ? gecmis.ort_rez : 50;
            const tahminRez = Math.round(bazRez * 1.05);
            let strateji = "", renk = "";
            if (tahminRez < 400) { strateji = "📉 Düşük Sezon: Tadilat Planlayın"; renk = "text-danger"; }
            else if (tahminRez > 800) { strateji = "🚀 Yüksek Sezon: Fiyat Artırın"; renk = "text-success"; }
            else { strateji = "⚖️ Normal Sezon: Standart Operasyon"; renk = "text-warning"; }
            tahminSerisi.push({ ay_no: hedefAy, tahmin_rezervasyon: tahminRez, tahmin_ciro: (tahminRez * (gecmis ? gecmis.ort_fiyat : 100)).toFixed(2), strateji, renk });
        }
        res.json(tahminSerisi);
    });
});

app.get('/api/oda-durumu', (req, res) => {
    const simule_tarih = req.query.tarih || '2023-08-15'; 
    const sqlFiyat = `SELECT oda_tipi, AVG(fiyat) as ort_fiyat FROM rezervasyonlar GROUP BY oda_tipi`;
    const sqlOdalar = `SELECT oda_no, oda_tipi, fiyat, giris_tarihi, DATE_ADD(giris_tarihi, INTERVAL konaklama_suresi DAY) as cikis_tarihi FROM rezervasyonlar WHERE ? BETWEEN giris_tarihi AND DATE_ADD(giris_tarihi, INTERVAL konaklama_suresi DAY) ORDER BY oda_no ASC LIMIT 50`;
    db.query(sqlFiyat, (err, resFiyat) => {
        db.query(sqlOdalar, [simule_tarih], (err2, resOdalar) => {
            if (err2) return res.status(500).json({ error: "DB Hatası" });
            let tumOdalar = [];
            for(let i=101; i<=150; i++) {
                const rez = resOdalar.find(r => r.oda_no === i);
                if (rez) tumOdalar.push({ oda_no: i, durum: 'Dolu', renk: 'bg-danger', tip: rez.oda_tipi, giris: rez.giris_tarihi.toISOString().split('T')[0], cikis: rez.cikis_tarihi.toISOString().split('T')[0], fiyat: rez.fiyat });
                else tumOdalar.push({ oda_no: i, durum: 'Boş', renk: 'bg-success', tip: '-', giris: '-', cikis: '-', fiyat: '-' });
            }
            res.json({ fiyat_analizi: resFiyat, oda_listesi: tumOdalar, simule_tarih: simule_tarih });
        });
    });
});

app.post('/api/rezervasyon-ekle', (req, res) => {
    const { giris_tarihi, sure, fiyat, oda_no, oda_tipi } = req.body;
    if (!giris_tarihi || !fiyat || !oda_no) return res.json({ success: false, message: "Eksik bilgi!" });
    const sql = `INSERT INTO rezervasyonlar (giris_tarihi, konaklama_suresi, fiyat, iptal_durumu, oda_no, oda_tipi) VALUES (?, ?, ?, 0, ?, ?)`;
    db.query(sql, [giris_tarihi, sure, fiyat, oda_no, oda_tipi], (err, result) => {
        if (err) return res.json({ success: false, message: "Hata!" });
        res.json({ success: true, message: "Eklendi!" });
    });
});

app.listen(PORT, () => console.log(`🚀 KDS YAYINDA: http://localhost:${PORT}`));