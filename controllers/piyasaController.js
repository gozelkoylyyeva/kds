const db = require('../config/db');
const axios = require('axios');

exports.getDoviz = async (req, res) => { res.json([{ kod: 'USD', isim: 'ABD Doları', alis: '34.50', satis: '34.60', fark: '0.10' }]); };
exports.getDovizGecmis = (req, res) => { res.json([]); };
exports.getRakipAnalizi = async (req, res) => { res.json([]); };
exports.getTahmin = (req, res) => { res.json([]); };

exports.simulasyonYap = (req, res) => {
    const { fiyatDegisimi, kampanyaTuru } = req.body;
    const degisim = parseFloat(fiyatDegisimi) || 0;
    
    // Veritabanından veri çek, çekemezsen varsayılan kullan
    db.query(`SELECT SUM(fiyat*konaklama_suresi) as mevcut_ciro, SUM(konaklama_suresi) as toplam_gece FROM rezervasyonlar WHERE iptal_durumu=0`, (err, sonuc) => {
        let mevcutCiro = 500000;
        let ortalamaFiyat = 3500;
        
        if (!err && sonuc && sonuc[0] && sonuc[0].mevcut_ciro) {
            mevcutCiro = parseFloat(sonuc[0].mevcut_ciro);
            const toplamGece = parseFloat(sonuc[0].toplam_gece) || 1;
            ortalamaFiyat = mevcutCiro / toplamGece;
        }

        const kMaliyet = (kampanyaTuru==='sosyal'?20000:(kampanyaTuru==='google'?35000:(kampanyaTuru==='influencer'?60000:(kampanyaTuru==='tv'?120000:0))));
        const mevcutKar = mevcutCiro * 0.4; // Tahmini kar marjı

        // Senaryo Hesaplamaları
        const etkiRealist = (1 + (degisim * -0.8 / 100));
        const ciroRealist = mevcutCiro * (1 + degisim/100) * etkiRealist;
        const karRealist = (ciroRealist * 0.4) - kMaliyet;

        const ciroIyimser = ciroRealist * 1.15;
        const karIyimser = (ciroIyimser * 0.45) - kMaliyet;

        const ciroKotumser = ciroRealist * 0.85;
        const karKotumser = (ciroKotumser * 0.30) - kMaliyet;

        const yeniOrtalamaFiyat = ortalamaFiyat * (1 + degisim / 100);
        
        // Senaryo verilerini hazırla
        const senaryoVerileri = {
            mevcut: { ciro: mevcutCiro, kar: mevcutKar, marj: 40 },
            realist: { ciro: ciroRealist, kar: karRealist, marj: (ciroRealist > 0 ? (karRealist/ciroRealist)*100 : 0), fark: karRealist - mevcutKar },
            iyimser: { ciro: ciroIyimser, kar: karIyimser, marj: (ciroIyimser > 0 ? (karIyimser/ciroIyimser)*100 : 0), fark: karIyimser - mevcutKar },
            kotumser: { ciro: ciroKotumser, kar: karKotumser, marj: (ciroKotumser > 0 ? (karKotumser/ciroKotumser)*100 : 0), fark: karKotumser - mevcutKar }
        };

        // Her senaryoyu veritabanına kaydet
        const kampanyaIsim = kampanyaTuru === 'sosyal' ? 'Sosyal Medya' : (kampanyaTuru === 'google' ? 'Google Ads' : (kampanyaTuru === 'influencer' ? 'Influencer' : (kampanyaTuru === 'tv' ? 'TV Reklam' : 'Yok')));
        
        const senaryolar = [
            { tip: 'iyimser', ad: `İyimser Senaryo - Fiyat %${degisim}`, veri: senaryoVerileri.iyimser },
            { tip: 'realist', ad: `Gerçekçi Senaryo - Fiyat %${degisim}`, veri: senaryoVerileri.realist },
            { tip: 'kotumser', ad: `Kötümser Senaryo - Fiyat %${degisim}`, veri: senaryoVerileri.kotumser }
        ];

        let kayitSayisi = 0;
        senaryolar.forEach((senaryo, index) => {
            const sonucDurum = senaryo.veri.kar > mevcutKar ? 'Başarılı' : 'Riskli';
            db.query(
                `INSERT INTO senaryolar (senaryo_adi, senaryo_tipi, fiyat_degisimi, kampanya_turu, sonuc_veri, sonuc_durumu, tarih) 
                 VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                [senaryo.ad, senaryo.tip, degisim, kampanyaIsim, JSON.stringify(senaryo.veri), sonucDurum],
                (errInsert) => {
                    if (!errInsert) kayitSayisi++;
                    if (index === senaryolar.length - 1) {
                        // Risk analizi için risk skorunu hesapla
                        const riskHesapla = (kar, mevcutKar, ciro) => {
                            let risk = 0;
                            if (kar < mevcutKar * 0.8) risk = 80;
                            else if (kar < mevcutKar) risk = 50;
                            else if (kar < mevcutKar * 1.2) risk = 20;
                            else risk = 10;
                            return risk;
                        };
                        
                        // Yönetici yorumu üret
                        const yoneticiYorumuUret = (senaryo, tip, mevcutKar) => {
                            if (tip === 'iyimser') {
                                if (senaryo.kar > mevcutKar * 1.3) {
                                    return 'Mükemmel karlılık potansiyeli. Agresif büyüme stratejisi uygulanabilir.';
                                } else if (senaryo.kar > mevcutKar) {
                                    return 'Pozitif karlılık beklentisi. Dikkatli ilerleme önerilir.';
                                } else {
                                    return 'İyimser senaryoda bile risk mevcut. Strateji gözden geçirilmeli.';
                                }
                            } else if (tip === 'realist') {
                                if (senaryo.kar > mevcutKar * 1.1) {
                                    return 'Gerçekçi beklentilerle güçlü performans. Önerilir.';
                                } else if (senaryo.kar > mevcutKar) {
                                    return 'Mevcut durumdan iyileşme var. Dikkatli uygulama önerilir.';
                                } else {
                                    return 'Gerçekçi senaryoda risk var. Alternatif stratejiler değerlendirilmeli.';
                                }
                            } else { // kotumser
                                if (senaryo.kar < mevcutKar * 0.7) {
                                    return 'Ciddi karlılık kaybı riski. Bu senaryo önerilmez.';
                                } else if (senaryo.kar < mevcutKar) {
                                    return 'Düşük performans beklentisi. Risk yönetimi gerekli.';
                                } else {
                                    return 'Kötümser senaryoda bile kabul edilebilir. Dikkatli ilerleme.';
                                }
                            }
                        };
                        
                        // Senaryo karşılaştırması hazırla
                        const senaryoKarsilastirma = [
                            {
                                senaryo: 'İyimser',
                                gelir: senaryoVerileri.iyimser.ciro,
                                kar: senaryoVerileri.iyimser.kar,
                                risk: riskHesapla(senaryoVerileri.iyimser.kar, mevcutKar, senaryoVerileri.iyimser.ciro),
                                onerilir: senaryoVerileri.iyimser.kar > mevcutKar * 1.1,
                                yoneticiYorumu: yoneticiYorumuUret(senaryoVerileri.iyimser, 'iyimser', mevcutKar)
                            },
                            {
                                senaryo: 'Gerçekçi',
                                gelir: senaryoVerileri.realist.ciro,
                                kar: senaryoVerileri.realist.kar,
                                risk: riskHesapla(senaryoVerileri.realist.kar, mevcutKar, senaryoVerileri.realist.ciro),
                                onerilir: senaryoVerileri.realist.kar > mevcutKar,
                                yoneticiYorumu: yoneticiYorumuUret(senaryoVerileri.realist, 'realist', mevcutKar)
                            },
                            {
                                senaryo: 'Kötümser',
                                gelir: senaryoVerileri.kotumser.ciro,
                                kar: senaryoVerileri.kotumser.kar,
                                risk: riskHesapla(senaryoVerileri.kotumser.kar, mevcutKar, senaryoVerileri.kotumser.ciro),
                                onerilir: senaryoVerileri.kotumser.kar > mevcutKar * 0.9,
                                yoneticiYorumu: yoneticiYorumuUret(senaryoVerileri.kotumser, 'kotumser', mevcutKar)
                            }
                        ];
                        
                        // Son senaryo kaydedildi, geçmişi çek ve cevap gönder
                        db.query(`SELECT * FROM senaryolar ORDER BY id DESC LIMIT 10`, (errHist, gecmis) => {
                            res.json({
                                mevcut: senaryoVerileri.mevcut,
                                realist: senaryoVerileri.realist,
                                iyimser: senaryoVerileri.iyimser,
                                kotumser: senaryoVerileri.kotumser,
                                fiyat_analizi: { eski: ortalamaFiyat, yeni: yeniOrtalamaFiyat },
                                gecmis: (!errHist && gecmis) ? gecmis : [],
                                ai_mesaj: karRealist > mevcutKar ? "✅ Başarılı Senaryo" : "⚠️ Riskli Senaryo",
                                senaryoKarsilastirma: senaryoKarsilastirma
                            });
                        });
                    }
                }
            );
        });
    });
};

// Senaryo listesi endpoint'i
exports.getSenaryolar = (req, res) => {
    try {
        db.query(`SELECT * FROM senaryolar ORDER BY id DESC LIMIT 20`, (err, sonuc) => {
            // Herhangi bir hata durumunda boş array döndür (500 yerine 200)
            if (err) {
                // Tablo yoksa veya sorgu hatası varsa boş array döndür
                if (err.code === 'ER_NO_SUCH_TABLE' || err.code === 'ER_BAD_TABLE_ERROR' || err.code === '42S02') {
                    console.log('Senaryolar tablosu mevcut değil, boş liste döndürülüyor');
                    return res.json([]);
                }
                console.error('Senaryo listesi DB hatası:', err.code, err.message);
                return res.json([]);
            }
            
            try {
                // sonuc undefined veya null olabilir
                if (!sonuc || !Array.isArray(sonuc)) {
                    return res.json([]);
                }
                
                const senaryolar = sonuc.map(s => {
                    if (!s) return null;
                    try {
                        let sonucVeri = {};
                        if (s.sonuc_veri) {
                            if (typeof s.sonuc_veri === 'string') {
                                try {
                                    sonucVeri = JSON.parse(s.sonuc_veri);
                                } catch(parseErr) {
                                    console.error('JSON parse hatası (senaryo ID:', s.id, '):', parseErr.message);
                                    sonucVeri = {};
                                }
                            } else {
                                sonucVeri = s.sonuc_veri;
                            }
                        }
                        
                        return {
                            ...s,
                            sonuc_veri: sonucVeri
                        };
                    } catch(itemErr) {
                        console.error('Senaryo item işleme hatası:', itemErr.message);
                        return {
                            ...s,
                            sonuc_veri: {}
                        };
                    }
                }).filter(s => s !== null); // null değerleri filtrele
                
                res.json(senaryolar);
            } catch(mapErr) {
                console.error('Senaryo map hatası:', mapErr.message || mapErr);
                res.json([]);
            }
        });
    } catch(outerErr) {
        console.error('Senaryo listesi genel hatası:', outerErr.message || outerErr);
        res.json([]);
    }
};

// Analytics sayfası için simülasyon endpoint'i
exports.simuleEt = (req, res) => {
    const { yuzdeDegisim } = req.body;
    const carpan = 1 + (yuzdeDegisim / 100);
    
    // Veritabanından baz fiyatları çek
    db.query("SELECT oda_tipi, AVG(fiyat) as ortalama FROM fiyat_gecmisi GROUP BY oda_tipi", (err, results) => {
        let bazFiyatlar = { 'Standart': 3000, 'Deluxe': 4500, 'Suit': 7500, 'Kral Dairesi': 25000 };
        
        if (!err && results && results.length > 0) {
            results.forEach(row => {
                if (bazFiyatlar[row.oda_tipi]) {
                    bazFiyatlar[row.oda_tipi] = Math.round(row.ortalama);
                }
            });
        }
        
        let kartlar = {};
        let toplamGunlukGelir = 0;
        
        // Oda bazlı senaryolar için dağılım objesi
        let dagilim = {}; 
        Object.keys(bazFiyatlar).forEach(k => dagilim[k] = []);

        for (const [tip, fiyat] of Object.entries(bazFiyatlar)) {
            let yeniFiyat = Math.round(fiyat * carpan);
            kartlar[tip] = { fiyat: yeniFiyat };
            toplamGunlukGelir += yeniFiyat * 5; // Günlük tahmin (5 oda)
        }

        const aylar = ['Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
        let realist = [];

        for (let i = 0; i < 6; i++) {
            let sezonCarpan = 1 - (i * 0.05); 
            let ayToplam = 0;

            for (const [tip, fiyat] of Object.entries(bazFiyatlar)) {
                let yeniFiyat = Math.round(fiyat * carpan);
                let aylikOdaGeliri = Math.round(yeniFiyat * 5 * sezonCarpan * 30);
                dagilim[tip].push(aylikOdaGeliri);
                ayToplam += aylikOdaGeliri;
            }
            realist.push(ayToplam);
        }

        res.json({
            kartlar: kartlar,
            grafik: {
                labels: aylar,
                realist: realist,
                dagilim: dagilim, // 🔥 4 Ayrı Grafik İçin Veri
                iyimser: realist.map(v => Math.round(v * 1.2)),
                kotumser: realist.map(v => Math.round(v * 0.8))
            },
            genel: Math.round(toplamGunlukGelir),
            rakipOrtalama: Math.round(Object.values(bazFiyatlar).reduce((a,b)=>a+b,0) / 4 * 1.1)
        });
    });
};

// Rakip detay endpoint'i
exports.rakipDetay = async (req, res) => {
    const tip = req.params.tip;
    const sql = "SELECT DATE_FORMAT(tarih, '%Y-%m-%d') as tarih, fiyat FROM fiyat_gecmisi WHERE oda_tipi = ? ORDER BY tarih ASC";
    
    db.query(sql, [tip], async (err, results) => {
        let labels = [], data = [];
        let bazFiyatlar = { 'Standart': 3000, 'Deluxe': 4500, 'Suit': 7500, 'Kral Dairesi': 25000 };
        let sonFiyat = bazFiyatlar[tip] || 5000;
        
        if (!err && results && results.length > 0) {
            // Veriyi seyrelt (her 50. kayıt)
            const orneklem = results.filter((_, index) => index % 50 === 0);
            labels = orneklem.map(r => r.tarih);
            data = orneklem.map(r => parseFloat(r.fiyat));
            if (data.length > 0) sonFiyat = data[data.length - 1];
        } else {
            // Veritabanında veri yoksa simüle et
            const bugun = new Date();
            for (let i = 11; i >= 0; i--) {
                const tarih = new Date(bugun.getFullYear(), bugun.getMonth() - i, 15);
                labels.push(tarih.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' }));
                
                let carpan = 1.0;
                const ay = tarih.getMonth();
                if (ay >= 5 && ay <= 8) carpan = 1.4;
                if (ay <= 1 || ay >= 11) carpan = 0.8;
                
                data.push(Math.round(sonFiyat * carpan * (1 + (Math.random() * 0.1 - 0.05))));
            }
        }

        // Google Hotels API'den canlı rakip verisi çek (cache ile)
        let rakipler = null;
        try {
            const SERPAPI_KEY = "8c425cb5074fb7a02a7fc51f72aefced62534bf81a5f5b78016870708ac89520";
            const yarin = new Date(); yarin.setDate(yarin.getDate() + 1);
            const cikis = new Date(); cikis.setDate(cikis.getDate() + 2);
            const tarihFormat = (d) => d.toISOString().split('T')[0];

            const response = await axios.get('https://serpapi.com/search.json', {
                params: {
                    engine: "google_hotels", q: "Hotels in Izmir", 
                    check_in_date: tarihFormat(yarin), check_out_date: tarihFormat(cikis),
                    adults: "2", currency: "TRY", hl: "tr", gl: "tr", api_key: SERPAPI_KEY
                }
            });

            if (response.data.properties) {
                rakipler = response.data.properties.map(otel => ({
                    otel: otel.name,
                    fiyat: otel.rate_per_night ? parseInt(otel.rate_per_night.lowest.replace(/\D/g, '')) : 0
                })).filter(o => o.fiyat > 0).slice(0, 10);
            }
        } catch (apiErr) {
            console.error("SerpAPI Hatası:", apiErr.message);
        }

        // Rakip verisi yoksa fallback
        if (!rakipler || rakipler.length === 0) {
            let carpan = 1.0;
            if (tip === 'Deluxe') carpan = 1.5;
            if (tip === 'Suit') carpan = 2.5;
            if (tip === 'Kral Dairesi') carpan = 5.0;
            
            rakipler = [
                { otel: 'Swissôtel Büyük Efes', fiyat: Math.round(sonFiyat * 1.8 * carpan) },
                { otel: 'Mövenpick Hotel', fiyat: Math.round(sonFiyat * 1.5 * carpan) },
                { otel: 'İbis Alsancak', fiyat: Math.round(sonFiyat * 0.9 * carpan) },
                { otel: 'Hilton İzmir', fiyat: Math.round(sonFiyat * 1.6 * carpan) },
                { otel: 'Wyndham Grand', fiyat: Math.round(sonFiyat * 1.4 * carpan) }
            ];
        } else {
            // Oda tipine göre rakip fiyatını scale et
            let carpan = 1.0;
            if (tip === 'Deluxe') carpan = 1.5;
            if (tip === 'Suit') carpan = 2.5;
            if (tip === 'Kral Dairesi') carpan = 5.0;
            rakipler = rakipler.map(r => ({ otel: r.otel, fiyat: Math.round(r.fiyat * carpan) }));
        }

        res.json({
            grafik: { labels: labels, datasets: [{ data: data }] },
            rakipler: rakipler
        });
    });
};