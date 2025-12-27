const { db } = require('../database');

/**
 * Doluluk Tahmini
 * Geçmiş verileri kullanarak 6 ay ve 12 ay ileriye dönük doluluk tahmini yapar
 */
exports.getDolulukTahmini = async (req, res) => {
    const periyot = req.query.periyot || '6'; // 6 veya 12 ay
    
    try {
        const [results] = await db.query(`
            SELECT 
                DATE_FORMAT(giris_tarihi, '%Y-%m') as ay,
                COUNT(*) as rezervasyon_sayisi
            FROM rezervasyonlar
            WHERE iptal_durumu = 0
            GROUP BY ay
            ORDER BY ay DESC
            LIMIT 24
        `);
        
        if (!results || results.length === 0) {
            return res.json({
                tahminler: generateFallbackDolulukTahmini(parseInt(periyot)),
                yontem: 'Basit Moving Average (Fallback)'
            });
        }
        
        const tahminler = hesaplaDolulukTahmini(results, parseInt(periyot));
        res.json({
            tahminler: tahminler,
            yontem: 'Moving Average + Mevsimsellik Katsayısı',
            kullanilan_veri: results.length + ' ay geçmiş veri'
        });
    } catch (err) {
        console.error('Doluluk tahmini hatası:', err);
        return res.json({
            tahminler: generateFallbackDolulukTahmini(parseInt(periyot)),
            yontem: 'Basit Moving Average (Fallback)'
        });
    }
};

/**
 * Doluluk tahmini hesaplama
 */
function hesaplaDolulukTahmini(gecmisVeri, periyot) {
    const toplamOda = 100; // Varsayılan oda sayısı
    const toplamGun = 30;
    const toplamOdaGun = toplamOda * toplamGun;
    
    // Geçmiş aylık doluluk oranlarını hesapla
    const aylikDoluluklar = gecmisVeri.map(v => ({
        ay: v.ay,
        doluluk: (v.rezervasyon_sayisi / toplamOdaGun) * 100
    })).reverse();
    
    // Mevsimsellik katsayıları (ay numarasına göre)
    const mevsimKatsayilari = {
        1: 0.85, 2: 0.80, 3: 0.90, 4: 0.95, 5: 1.00, 6: 1.10,
        7: 1.20, 8: 1.25, 9: 1.15, 10: 1.05, 11: 0.95, 12: 0.90
    };
    
    // Ortalama doluluk hesapla (son 12 ay)
    const son12Ay = aylikDoluluklar.slice(-12);
    const ortalamaDoluluk = son12Ay.reduce((sum, v) => sum + v.doluluk, 0) / son12Ay.length;
    
    const tahminler = [];
    const bugun = new Date();
    
    for (let i = 1; i <= periyot; i++) {
        const hedefTarih = new Date(bugun.getFullYear(), bugun.getMonth() + i, 1);
        const ayNo = hedefTarih.getMonth() + 1;
        const ay = hedefTarih.toISOString().slice(0, 7);
        
        // Mevsimsellik katsayısını uygula
        const mevsimKatsayi = mevsimKatsayilari[ayNo] || 1.0;
        const ortalamaTahminiDoluluk = Math.min(95, Math.max(40, ortalamaDoluluk * mevsimKatsayi));
        
        // DSS Prensibi: Aralık (min-max) ve belirsizlik seviyesi
        // Belirsizlik: Geçmiş veri miktarına ve trend tutarlılığına bağlı
        const belirsizlikYuzdesi = son12Ay.length < 6 ? 15 : (son12Ay.length < 12 ? 10 : 7);
        const minDoluluk = Math.max(40, Math.min(95, ortalamaTahminiDoluluk - belirsizlikYuzdesi));
        const maxDoluluk = Math.max(40, Math.min(95, ortalamaTahminiDoluluk + belirsizlikYuzdesi));
        
        // Belirsizlik seviyesi belirleme
        let belirsizlikSeviyesi = 'düşük';
        if (belirsizlikYuzdesi > 12) belirsizlikSeviyesi = 'yüksek';
        else if (belirsizlikYuzdesi > 8) belirsizlikSeviyesi = 'orta';
        
        // Analiz yorumu (öneri değil, bilgi)
        let analiz_yorumu = '';
        if (ortalamaTahminiDoluluk >= 80) {
            analiz_yorumu = `Yüksek doluluk beklentisi görülmektedir. Fiyat optimizasyonu ve gelir artırıcı stratejiler değerlendirilebilir.`;
        } else if (ortalamaTahminiDoluluk >= 70) {
            analiz_yorumu = `İyi doluluk seviyesi beklenmektedir. Mevcut stratejiler değerlendirilebilir.`;
        } else if (ortalamaTahminiDoluluk >= 60) {
            analiz_yorumu = `Orta seviye doluluk tahmini görülmektedir. Pazarlama kampanyaları değerlendirilebilir.`;
        } else {
            analiz_yorumu = `Düşük doluluk riski görülmektedir. Fiyatlandırma ve kampanya stratejileri değerlendirilebilir.`;
        }
        
        tahminler.push({
            ay: ay,
            tahmini_doluluk_araligi: {
                min: Math.round(minDoluluk * 100) / 100,
                max: Math.round(maxDoluluk * 100) / 100,
                ortalama: Math.round(ortalamaTahminiDoluluk * 100) / 100
            },
            belirsizlik_seviyesi: belirsizlikSeviyesi,
            belirsizlik_yuzdesi: belirsizlikYuzdesi,
            analiz_yorumu: analiz_yorumu,
            not: 'Bu tahminler olasılık bazlıdır. Nihai karar yöneticiye aittir.'
        });
    }
    
    return tahminler;
}

/**
 * Fiyat Stratejisi Analizi
 * Geçmiş fiyat ve doluluk verilerini kullanarak fiyat alternatiflerini ve olası etkilerini analiz eder
 * DSS Prensibi: Net karar vermez, sadece alternatifler ve etki analizi sunar
 */
exports.getFiyatStratejisi = async (req, res) => {
    const periyot = req.query.periyot || '6'; // 6 veya 12 ay
    
    try {
        const [results] = await db.query(`
            SELECT 
                DATE_FORMAT(giris_tarihi, '%Y-%m') as ay,
                AVG(fiyat) as ortalama_fiyat,
                COUNT(*) as rezervasyon_sayisi,
                SUM(fiyat * konaklama_suresi) as toplam_gelir
            FROM rezervasyonlar
            WHERE iptal_durumu = 0
            GROUP BY ay
            ORDER BY ay DESC
            LIMIT 24
        `);
        
        if (!results || results.length === 0) {
            return res.json({
                analizler: generateFallbackFiyatStratejisi(parseInt(periyot)),
                yontem: 'Basit Fiyat Esneklik Analizi (Fallback)',
                not: 'Bu analizler alternatifler sunar. Nihai karar yöneticiye aittir.'
            });
        }
        
        try {
            const analizler = hesaplaFiyatStratejisi(results, parseInt(periyot));
            res.json({
                analizler: analizler,
                yontem: 'Fiyat Esneklik Analizi + Geçmiş Trend',
                kullanilan_veri: results.length + ' ay geçmiş veri',
                not: 'Bu analizler alternatifler ve olası etkileri sunar. Nihai karar yöneticiye aittir.'
            });
        } catch (calcErr) {
            console.error('Fiyat stratejisi hesaplama hatası:', calcErr);
            return res.json({
                analizler: generateFallbackFiyatStratejisi(parseInt(periyot)),
                yontem: 'Basit Fiyat Esneklik Analizi (Fallback)',
                not: 'Bu analizler alternatifler sunar. Nihai karar yöneticiye aittir.'
            });
        }
    } catch (error) {
        console.error('Fiyat stratejisi genel hatası:', error);
        return res.status(500).json({
            error: 'Fiyat stratejisi hesaplanamadı',
            analizler: generateFallbackFiyatStratejisi(parseInt(periyot)),
            yontem: 'Basit Fiyat Esneklik Analizi (Fallback)',
            not: 'Bu analizler alternatifler sunar. Nihai karar yöneticiye aittir.'
        });
    }
};

/**
 * Fiyat stratejisi hesaplama
 */
function hesaplaFiyatStratejisi(gecmisVeri, periyot) {
    if (!gecmisVeri || !Array.isArray(gecmisVeri) || gecmisVeri.length === 0) {
        return generateFallbackFiyatStratejisi(periyot);
    }
    const veri = [...gecmisVeri].reverse(); // Orijinal array'i değiştirmemek için kopyala
    
    // Fiyat-doluluk ilişkisini hesapla
    const toplamOda = 100;
    const toplamGun = 30;
    const toplamOdaGun = toplamOda * toplamGun;
    
    // Son 12 ay için fiyat esnekliği ve trend analizi
    const son12Ay = veri.slice(-12);
    let toplamFiyatDegisim = 0;
    let toplamDolulukDegisim = 0;
    
    // Fiyat trendini hesapla (basit lineer regresyon)
    let fiyatTrend = 0;
    if (son12Ay.length >= 2) {
        const ilkFiyat = parseFloat(son12Ay[0].ortalama_fiyat) || 0;
        const sonFiyat = parseFloat(son12Ay[son12Ay.length - 1].ortalama_fiyat) || 0;
        fiyatTrend = (sonFiyat - ilkFiyat) / son12Ay.length; // Aylık ortalama değişim
    }
    
    // Fiyat volatilitesi (dalgalanma)
    const fiyatlar = son12Ay.map(v => parseFloat(v.ortalama_fiyat) || 0).filter(f => f > 0);
    if (fiyatlar.length === 0) {
        // Eğer fiyat verisi yoksa fallback döndür
        return generateFallbackFiyatStratejisi(periyot);
    }
    const ortalamaFiyat = fiyatlar.reduce((sum, f) => sum + f, 0) / fiyatlar.length;
    if (ortalamaFiyat === 0 || isNaN(ortalamaFiyat) || !isFinite(ortalamaFiyat)) {
        return generateFallbackFiyatStratejisi(periyot);
    }
    const fiyatVaryans = fiyatlar.reduce((sum, f) => sum + Math.pow(f - ortalamaFiyat, 2), 0) / fiyatlar.length;
    const fiyatStandartSapma = Math.sqrt(fiyatVaryans);
    const volatiliteKatsayi = ortalamaFiyat > 0 ? (fiyatStandartSapma / ortalamaFiyat) : 0.1; // % volatilite
    
    for (let i = 1; i < son12Ay.length; i++) {
        const oncekiFiyat = parseFloat(son12Ay[i-1].ortalama_fiyat) || 0;
        const simdikiFiyat = parseFloat(son12Ay[i].ortalama_fiyat) || 0;
        const oncekiDoluluk = (son12Ay[i-1].rezervasyon_sayisi / toplamOdaGun) * 100;
        const simdikiDoluluk = (son12Ay[i].rezervasyon_sayisi / toplamOdaGun) * 100;
        
        if (oncekiFiyat > 0) {
            toplamFiyatDegisim += ((simdikiFiyat - oncekiFiyat) / oncekiFiyat) * 100;
            toplamDolulukDegisim += simdikiDoluluk - oncekiDoluluk;
        }
    }
    
    const ortalamaFiyatEsneklik = toplamFiyatDegisim !== 0 ? (toplamDolulukDegisim / toplamFiyatDegisim) : 0;
    const mevcutOrtalamaFiyat = parseFloat(veri[veri.length - 1]?.ortalama_fiyat) || ortalamaFiyat || 3500;
    
    // Mevsimsel pattern analizi (ay bazında ortalama fiyat)
    const aylikOrtalamalar = {};
    for (let i = 0; i < 12; i++) {
        aylikOrtalamalar[i + 1] = [];
    }
    veri.forEach(v => {
        const ayNo = parseInt(v.ay.split('-')[1]);
        const fiyat = parseFloat(v.ortalama_fiyat) || 0;
        if (fiyat > 0) {
            aylikOrtalamalar[ayNo].push(fiyat);
        }
    });
    
    const aylikOrtalamaFiyatlar = {};
    Object.keys(aylikOrtalamalar).forEach(ay => {
        const fiyatlar = aylikOrtalamalar[ay];
        if (fiyatlar.length > 0) {
            aylikOrtalamaFiyatlar[ay] = fiyatlar.reduce((sum, f) => sum + f, 0) / fiyatlar.length;
        }
    });
    
    const oneriler = [];
    const bugun = new Date();
    
    for (let i = 1; i <= periyot; i++) {
        const hedefTarih = new Date(bugun.getFullYear(), bugun.getMonth() + i, 1);
        const ay = hedefTarih.toISOString().slice(0, 7);
        const ayNo = hedefTarih.getMonth() + 1;
        
        // Mevsimsellik katsayısı (geçmiş verilerden)
        let mevsimKatsayi = 1.0;
        if (aylikOrtalamaFiyatlar[ayNo]) {
            mevsimKatsayi = aylikOrtalamaFiyatlar[ayNo] / ortalamaFiyat;
        } else {
            // Fallback mevsimsellik
            mevsimKatsayi = (ayNo >= 6 && ayNo <= 8) ? 1.15 : (ayNo >= 12 || ayNo <= 2) ? 0.90 : 1.0;
        }
        
        // Trend bazlı tahmin (geçmiş trendi geleceğe yansıt)
        const trendEtkisi = fiyatTrend * i; // İlerleyen aylarda trend etkisi artar
        
        // Volatilite bazlı dalgalanma (rastgele ama gerçekçi)
        const rastgeleDalgalanma = (Math.random() - 0.5) * 2 * volatiliteKatsayi * ortalamaFiyat * 0.3; // %30 volatilite
        
        // Temel fiyat hesaplama
        const temelFiyat = mevcutOrtalamaFiyat * mevsimKatsayi + trendEtkisi;
        const onerilenFiyat = temelFiyat + rastgeleDalgalanma;
        
        // Fiyat aralığı (belirsizlik dahil)
        const belirsizlikYuzdesi = i <= 3 ? 0.05 : (i <= 6 ? 0.10 : 0.15); // İlerleyen aylarda belirsizlik artar
        const minFiyat = onerilenFiyat * (1 - belirsizlikYuzdesi);
        const maxFiyat = onerilenFiyat * (1 + belirsizlikYuzdesi);
        
        // Alternatifler (DSS prensibi)
        const alternatifler = [
            {
                alternatif: 'Önerilen Fiyat',
                onerilen_fiyat: Math.round(onerilenFiyat),
                fiyat_degisimi: mevcutOrtalamaFiyat > 0 
                    ? `%${(((onerilenFiyat - mevcutOrtalamaFiyat) / mevcutOrtalamaFiyat) * 100).toFixed(1)}`
                    : '%0.0',
                olası_etkiler: {
                    doluluk_etkisi: 'Mevsimsel ve trend analizine göre beklenen doluluk',
                    gelir_etkisi: 'Trend ve mevsimsellik dikkate alınarak beklenen gelir',
                    risk: volatiliteKatsayi > 0.15 ? 'Orta' : 'Düşük'
                },
                belirsizlik_seviyesi: i <= 3 ? 'düşük' : (i <= 6 ? 'orta' : 'yüksek')
            }
        ];
        
        // Güvenli hesaplamalar
        const fiyatDegisimiYuzde = mevcutOrtalamaFiyat > 0 
            ? (((onerilenFiyat - mevcutOrtalamaFiyat) / mevcutOrtalamaFiyat) * 100).toFixed(1)
            : '0.0';
        
        oneriler.push({
            ay: ay,
            mevcut_fiyat: Math.round(mevcutOrtalamaFiyat),
            onerilen_fiyat: Math.round(onerilenFiyat),
            alternatifler: alternatifler.map(alt => ({
                ...alt,
                fiyat_degisimi: `%${fiyatDegisimiYuzde}`
            })),
            fiyat_araligi: {
                min: Math.round(minFiyat),
                max: Math.round(maxFiyat),
                ortalama: Math.round(onerilenFiyat)
            },
            belirsizlik_seviyesi: i <= 3 ? 'düşük' : (i <= 6 ? 'orta' : 'yüksek'),
            trend_etkisi: mevcutOrtalamaFiyat > 0 ? parseFloat((trendEtkisi / mevcutOrtalamaFiyat * 100).toFixed(2)) : 0,
            mevsimsel_etki: parseFloat(((mevsimKatsayi - 1) * 100).toFixed(2)),
            volatilite: parseFloat((volatiliteKatsayi * 100).toFixed(2)),
            etki_analizi: {
                olası_gelir_etkisi: 'Fiyat değişimine bağlı olarak gelir artabilir veya azalabilir',
                olası_doluluk_etkisi: 'Fiyat esnekliğine bağlı olarak doluluk etkilenebilir',
                risk_faktörleri: ['Pazar koşulları', 'Rekabet durumu', 'Mevsimsellik', 'Trend']
            },
            not: 'Bu analiz geçmiş verilere dayalı tahminler sunar. Nihai karar yöneticiye aittir.'
        });
    }
    
    return oneriler;
}

/**
 * Gelir ve Kâr Tahmini
 * Geçmiş verileri kullanarak gelir ve net kâr tahmini yapar
 */
exports.getGelirKarTahmini = (req, res) => {
    const periyot = req.query.periyot || '6'; // 6 veya 12 ay
    
    db.query(`
        SELECT 
            DATE_FORMAT(giris_tarihi, '%Y-%m') as ay,
            SUM(fiyat * konaklama_suresi) as toplam_gelir,
            COUNT(*) as rezervasyon_sayisi,
            AVG(fiyat) as ortalama_fiyat
        FROM rezervasyonlar
        WHERE iptal_durumu = 0
        GROUP BY ay
        ORDER BY ay DESC
        LIMIT 24
    `, (err, results) => {
        if (err || !results || results.length === 0) {
            return res.json({
                tahminler: generateFallbackGelirKarTahmini(parseInt(periyot)),
                yontem: 'Basit Trend Analizi (Fallback)'
            });
        }
        
        const tahminler = hesaplaGelirKarTahmini(results, parseInt(periyot));
        res.json({
            tahminler: tahminler,
            yontem: 'Moving Average + Mevsimsellik + Trend Analizi',
            kullanilan_veri: results.length + ' ay geçmiş veri'
        });
    });
};

/**
 * Gelir ve kâr tahmini hesaplama
 */
function hesaplaGelirKarTahmini(gecmisVeri, periyot) {
    const veri = gecmisVeri.reverse();
    const son12Ay = veri.slice(-12);
    
    // Ortalama gelir ve maliyet oranı
    const ortalamaGelir = son12Ay.reduce((sum, v) => sum + (parseFloat(v.toplam_gelir) || 0), 0) / son12Ay.length;
    const ortalamaMaliyetOrani = 0.60; // %60 maliyet, %40 kar (varsayılan)
    
    const tahminler = [];
    const bugun = new Date();
    
    for (let i = 1; i <= periyot; i++) {
        const hedefTarih = new Date(bugun.getFullYear(), bugun.getMonth() + i, 1);
        const ay = hedefTarih.toISOString().slice(0, 7);
        const ayNo = hedefTarih.getMonth() + 1;
        
        // Mevsimsellik katsayısı
        const mevsimKatsayi = (ayNo >= 6 && ayNo <= 8) ? 1.20 : (ayNo >= 12 || ayNo <= 2) ? 0.85 : 1.0;
        
        // Trend (son 3 ay ortalaması)
        const son3Ay = veri.slice(-3);
        const trendKatsayi = son3Ay.length > 0 
            ? (son3Ay.reduce((sum, v) => sum + (parseFloat(v.toplam_gelir) || 0), 0) / son3Ay.length) / ortalamaGelir
            : 1.0;
        
        // DSS Prensibi: Tahminler aralık (min-max) ve belirsizlik seviyesi ile sunulur
        const ortalamaTahminiGelir = ortalamaGelir * mevsimKatsayi * trendKatsayi;
        const ortalamaTahminiMaliyet = ortalamaTahminiGelir * ortalamaMaliyetOrani;
        const ortalamaTahminiKar = ortalamaTahminiGelir - ortalamaTahminiMaliyet;
        const ortalamaKarMarji = (ortalamaTahminiKar / ortalamaTahminiGelir) * 100;
        
        // Belirsizlik: Geçmiş veri miktarına ve trend tutarlılığına bağlı
        const belirsizlikYuzdesi = son12Ay.length < 6 ? 20 : (son12Ay.length < 12 ? 15 : 10);
        const minGelir = Math.max(0, ortalamaTahminiGelir * (1 - belirsizlikYuzdesi / 100));
        const maxGelir = ortalamaTahminiGelir * (1 + belirsizlikYuzdesi / 100);
        const minKar = Math.max(0, ortalamaTahminiKar * (1 - belirsizlikYuzdesi / 100));
        const maxKar = ortalamaTahminiKar * (1 + belirsizlikYuzdesi / 100);
        
        // Belirsizlik seviyesi
        let belirsizlikSeviyesi = 'düşük';
        if (belirsizlikYuzdesi > 15) belirsizlikSeviyesi = 'yüksek';
        else if (belirsizlikYuzdesi > 12) belirsizlikSeviyesi = 'orta';
        
        // Analiz değerlendirmesi (öneri değil, bilgi)
        let analiz_degerlendirmesi = '';
        let analiz_yorumu = '';
        
        if (ortalamaKarMarji >= 45) {
            analiz_degerlendirmesi = 'Mükemmel';
            analiz_yorumu = 'Yüksek karlılık beklentisi görülmektedir. Mevcut stratejiler değerlendirilebilir.';
        } else if (ortalamaKarMarji >= 35) {
            analiz_degerlendirmesi = 'İyi';
            analiz_yorumu = 'Sağlıklı karlılık seviyesi görülmektedir. İyileştirme potansiyeli mevcut olabilir.';
        } else if (ortalamaKarMarji >= 25) {
            analiz_degerlendirmesi = 'Orta';
            analiz_yorumu = 'Kabul edilebilir karlılık görülmektedir. Maliyet optimizasyonu değerlendirilebilir.';
        } else {
            analiz_degerlendirmesi = 'Düşük';
            analiz_yorumu = 'Düşük karlılık riski görülmektedir. Maliyet ve fiyat stratejisi değerlendirilebilir.';
        }
        
        tahminler.push({
            donem: ay,
            tahmini_gelir_araligi: {
                min: Math.round(minGelir),
                max: Math.round(maxGelir),
                ortalama: Math.round(ortalamaTahminiGelir)
            },
            tahmini_kar_araligi: {
                min: Math.round(minKar),
                max: Math.round(maxKar),
                ortalama: Math.round(ortalamaTahminiKar)
            },
            kar_marji_araligi: {
                min: Math.round(((minKar / maxGelir) * 100) * 100) / 100,
                max: Math.round(((maxKar / minGelir) * 100) * 100) / 100,
                ortalama: Math.round(ortalamaKarMarji * 100) / 100
            },
            belirsizlik_seviyesi: belirsizlikSeviyesi,
            belirsizlik_yuzdesi: belirsizlikYuzdesi,
            analiz_degerlendirmesi: analiz_degerlendirmesi,
            analiz_yorumu: analiz_yorumu,
            not: 'Bu tahminler olasılık bazlıdır. Nihai karar yöneticiye aittir.'
        });
    }
    
    return tahminler;
}

/**
 * Personel İhtiyacı Tahmini
 * Doluluk oranlarına göre personel ihtiyacını tahmin eder
 */
exports.getPersonelIhtiyaci = async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT 
                DATE_FORMAT(giris_tarihi, '%Y-%m') as ay,
                COUNT(*) as rezervasyon_sayisi
            FROM rezervasyonlar
            WHERE iptal_durumu = 0
            GROUP BY ay
            ORDER BY ay DESC
            LIMIT 12
        `);
        
        if (!results || results.length === 0) {
            const fallbackTahminler = generateFallbackPersonelIhtiyaci();
            // Fallback için doluluk grafik verisi oluştur
            const fallbackGrafik = [];
            for (let doluluk = 40; doluluk <= 95; doluluk += 5) {
                let personelKatsayi = 1.0;
                if (doluluk >= 85) personelKatsayi = 1.3;
                else if (doluluk >= 75) personelKatsayi = 1.15;
                else if (doluluk >= 65) personelKatsayi = 1.0;
                else if (doluluk >= 55) personelKatsayi = 0.85;
                else personelKatsayi = 0.70;
                
                fallbackGrafik.push({
                    doluluk_orani: doluluk,
                    personel_ihtiyaci: {
                        temizlik: Math.round(15 * personelKatsayi),
                        servis: Math.round(12 * personelKatsayi),
                        mutfak: Math.round(8 * personelKatsayi),
                        on_buro: Math.round(6 * personelKatsayi),
                        yonetim: Math.round(3 * personelKatsayi),
                        toplam: Math.round(44 * personelKatsayi)
                    }
                });
            }
            
            return res.json({
                tahminler: fallbackTahminler,
                doluluk_personel_grafik: fallbackGrafik,
                yontem: 'Basit Doluluk-Personel Katsayısı (Fallback)'
            });
        }
        
        const tahminler = hesaplaPersonelIhtiyaci(results);
        
        // Doluluk oranına göre personel ihtiyacı grafiği için veri hazırla
        const dolulukPersonelGrafik = hesaplaDolulukPersonelGrafik(results);
        
        res.json({
            tahminler: tahminler,
            doluluk_personel_grafik: dolulukPersonelGrafik, // Yeni grafik verisi
            yontem: 'Doluluk Bazlı Personel Katsayısı',
            kullanilan_veri: results.length + ' ay geçmiş veri'
        });
    } catch (error) {
        console.error('Personel ihtiyacı veritabanı hatası:', error);
        return res.json({
            tahminler: generateFallbackPersonelIhtiyaci(),
            yontem: 'Basit Doluluk-Personel Katsayısı (Fallback)'
        });
    }
};

/**
 * Personel ihtiyacı hesaplama
 */
function hesaplaPersonelIhtiyaci(gecmisVeri) {
    if (!gecmisVeri || !Array.isArray(gecmisVeri) || gecmisVeri.length === 0) {
        return generateFallbackPersonelIhtiyaci();
    }
    const toplamOda = 100;
    const toplamGun = 30;
    const toplamOdaGun = toplamOda * toplamGun;
    
    // Ortalama doluluk hesapla
    const ortalamaDoluluk = gecmisVeri.reduce((sum, v) => {
        const doluluk = (v.rezervasyon_sayisi / toplamOdaGun) * 100;
        return sum + doluluk;
    }, 0) / gecmisVeri.length;
    
    // Personel katsayıları (doluluk oranına göre)
    let personelKatsayi = 1.0;
    if (ortalamaDoluluk >= 85) personelKatsayi = 1.3;
    else if (ortalamaDoluluk >= 75) personelKatsayi = 1.15;
    else if (ortalamaDoluluk >= 65) personelKatsayi = 1.0;
    else if (ortalamaDoluluk >= 55) personelKatsayi = 0.85;
    else personelKatsayi = 0.70;
    
    // Mevcut personel sayıları (varsayılan)
    const mevcutPersonel = {
        temizlik: 15,
        servis: 12,
        mutfak: 8,
        on_buro: 6,
        yonetim: 3
    };
    
    const tahminler = [];
    const departmanlar = ['temizlik', 'servis', 'mutfak', 'on_buro', 'yonetim'];
    
    // DSS Prensibi: Personel ihtiyacı aralık (min-max) ve etki analizi ile sunulur
    departmanlar.forEach(departman => {
        const mevcut = mevcutPersonel[departman] || 0;
        const ortalamaDegerlendirilebilir = Math.max(1, Math.round(mevcut * personelKatsayi));
        
        // Belirsizlik: Doluluk tahminine bağlı
        const belirsizlikYuzdesi = 10; // %10 belirsizlik
        const minPersonel = Math.max(1, Math.round(ortalamaDegerlendirilebilir * (1 - belirsizlikYuzdesi / 100)));
        const maxPersonel = Math.round(ortalamaDegerlendirilebilir * (1 + belirsizlikYuzdesi / 100));
        
        // Analiz açıklaması (öneri değil, bilgi)
        let analiz_aciklamasi = '';
        let etki_analizi = {};
        
        if (ortalamaDegerlendirilebilir > mevcut) {
            const fark = ortalamaDegerlendirilebilir - mevcut;
            analiz_aciklamasi = `Doluluk artışı beklentisi nedeniyle ${fark} ek personel değerlendirilebilir.`;
            etki_analizi = {
                olası_etkiler: 'Hizmet kalitesi artabilir, müşteri memnuniyeti iyileşebilir',
                maliyet_etkisi: `Aylık maliyet artışı: ${fark * 15000} - ${fark * 20000} TL aralığında olabilir`,
                risk: 'Orta - Personel maliyeti artabilir'
            };
        } else if (ortalamaDegerlendirilebilir < mevcut) {
            const fark = mevcut - ortalamaDegerlendirilebilir;
            analiz_aciklamasi = `Doluluk düşüşü nedeniyle ${fark} personel azaltılabilir.`;
            etki_analizi = {
                olası_etkiler: 'Maliyet düşebilir, ancak hizmet kapasitesi azalabilir',
                maliyet_etkisi: `Aylık maliyet tasarrufu: ${fark * 15000} - ${fark * 20000} TL aralığında olabilir`,
                risk: 'Yüksek - Hizmet kalitesi etkilenebilir'
            };
        } else {
            analiz_aciklamasi = `Mevcut personel seviyesi yeterli görünmektedir.`;
            etki_analizi = {
                olası_etkiler: 'Mevcut durum korunabilir',
                maliyet_etkisi: 'Maliyet değişikliği beklenmemektedir',
                risk: 'Düşük'
            };
        }
        
        tahminler.push({
            departman: departman,
            mevcut_personel: mevcut,
            degerlendirilebilir_personel_araligi: {
                min: minPersonel,
                max: maxPersonel,
                ortalama: ortalamaDegerlendirilebilir
            },
            fark: ortalamaDegerlendirilebilir - mevcut,
            analiz_aciklamasi: analiz_aciklamasi,
            etki_analizi: etki_analizi,
            not: 'Bu analiz alternatifler sunar. Nihai karar yöneticiye aittir.'
        });
    });
    
    return tahminler;
}

/**
 * Doluluk oranına göre personel ihtiyacı grafik verisi hesaplama
 * Farklı doluluk seviyelerinde personel ihtiyacını gösterir
 */
function hesaplaDolulukPersonelGrafik(gecmisVeri) {
    const toplamOda = 100;
    const toplamGun = 30;
    const toplamOdaGun = toplamOda * toplamGun;
    
    // Mevcut personel sayıları (varsayılan)
    const mevcutPersonel = {
        temizlik: 15,
        servis: 12,
        mutfak: 8,
        on_buro: 6,
        yonetim: 3
    };
    
    // Doluluk seviyeleri (40%'dan 95%'e kadar 5% artışlarla)
    const dolulukSeviyeleri = [];
    for (let doluluk = 40; doluluk <= 95; doluluk += 5) {
        dolulukSeviyeleri.push(doluluk);
    }
    
    // Her doluluk seviyesi için personel ihtiyacını hesapla
    const grafikVerisi = dolulukSeviyeleri.map(doluluk => {
        // Personel katsayısını doluluk oranına göre belirle
        let personelKatsayi = 1.0;
        if (doluluk >= 85) personelKatsayi = 1.3;
        else if (doluluk >= 75) personelKatsayi = 1.15;
        else if (doluluk >= 65) personelKatsayi = 1.0;
        else if (doluluk >= 55) personelKatsayi = 0.85;
        else personelKatsayi = 0.70;
        
        // Her departman için personel ihtiyacını hesapla
        const departmanlar = {
            temizlik: Math.round(mevcutPersonel.temizlik * personelKatsayi),
            servis: Math.round(mevcutPersonel.servis * personelKatsayi),
            mutfak: Math.round(mevcutPersonel.mutfak * personelKatsayi),
            on_buro: Math.round(mevcutPersonel.on_buro * personelKatsayi),
            yonetim: Math.round(mevcutPersonel.yonetim * personelKatsayi)
        };
        
        // Toplam personel ihtiyacı
        const toplamPersonel = Object.values(departmanlar).reduce((sum, val) => sum + val, 0);
        
        return {
            doluluk_orani: doluluk,
            personel_ihtiyaci: {
                temizlik: departmanlar.temizlik,
                servis: departmanlar.servis,
                mutfak: departmanlar.mutfak,
                on_buro: departmanlar.on_buro,
                yonetim: departmanlar.yonetim,
                toplam: toplamPersonel
            }
        };
    });
    
    return grafikVerisi;
}

/**
 * Gelecek Risk Analizi
 * Önümüzdeki 6 ay ve 1 yıl için risk analizi yapar
 */
exports.getGelecekRiskAnalizi = async (req, res) => {
    const periyot = req.query.periyot || '6'; // 6 veya 12 ay
    
    try {
        // Önce kolonların varlığını kontrol et
        let [columnCheck] = await db.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'rezervasyonlar' 
            AND COLUMN_NAME IN ('konaklama_suresi', 'fiyat')
        `);
        const hasKonaklamaSuresi = columnCheck.some(c => c.COLUMN_NAME === 'konaklama_suresi');
        const hasFiyat = columnCheck.some(c => c.COLUMN_NAME === 'fiyat');
        
        let sqlQuery;
        if (hasFiyat && hasKonaklamaSuresi) {
            sqlQuery = `
                SELECT 
                    DATE_FORMAT(giris_tarihi, '%Y-%m') as ay,
                    COUNT(*) as rezervasyon_sayisi,
                    SUM(fiyat * COALESCE(konaklama_suresi, 2)) as toplam_gelir,
                    COALESCE(SUM(konaklama_suresi), COUNT(*) * 2) as toplam_gece,
                    AVG(fiyat) as ortalama_fiyat
                FROM rezervasyonlar
                WHERE iptal_durumu = 0
                GROUP BY ay
                ORDER BY ay DESC
                LIMIT 24
            `;
        } else if (hasFiyat) {
            sqlQuery = `
                SELECT 
                    DATE_FORMAT(giris_tarihi, '%Y-%m') as ay,
                    COUNT(*) as rezervasyon_sayisi,
                    SUM(fiyat * 2) as toplam_gelir,
                    COUNT(*) * 2 as toplam_gece,
                    AVG(fiyat) as ortalama_fiyat
                FROM rezervasyonlar
                WHERE iptal_durumu = 0
                GROUP BY ay
                ORDER BY ay DESC
                LIMIT 24
            `;
        } else if (hasKonaklamaSuresi) {
            sqlQuery = `
                SELECT 
                    DATE_FORMAT(giris_tarihi, '%Y-%m') as ay,
                    COUNT(*) as rezervasyon_sayisi,
                    COUNT(*) * 3500 * COALESCE(SUM(konaklama_suresi), COUNT(*) * 2) as toplam_gelir,
                    COALESCE(SUM(konaklama_suresi), COUNT(*) * 2) as toplam_gece,
                    3500 as ortalama_fiyat
                FROM rezervasyonlar
                WHERE iptal_durumu = 0
                GROUP BY ay
                ORDER BY ay DESC
                LIMIT 24
            `;
        } else {
            // Her iki kolon da yoksa varsayılan değerler kullan
            sqlQuery = `
                SELECT 
                    DATE_FORMAT(giris_tarihi, '%Y-%m') as ay,
                    COUNT(*) as rezervasyon_sayisi,
                    COUNT(*) * 3500 * 2 as toplam_gelir,
                    COUNT(*) * 2 as toplam_gece,
                    3500 as ortalama_fiyat
                FROM rezervasyonlar
                WHERE iptal_durumu = 0
                GROUP BY ay
                ORDER BY ay DESC
                LIMIT 24
            `;
        }
        
        const [results] = await db.query(sqlQuery);
        
        if (!results || results.length === 0) {
            return res.json({
                risk_analizi: generateFallbackRiskAnalizi(parseInt(periyot)),
                yontem: 'Basit Risk Faktörü Analizi (Fallback)'
            });
        }
        
        try {
            const riskAnalizi = hesaplaGelecekRiskAnalizi(results, parseInt(periyot));
            res.json({
                risk_analizi: riskAnalizi,
                yontem: 'Çok Faktörlü Risk Analizi',
                kullanilan_veri: results.length + ' ay geçmiş veri'
            });
        } catch (calcErr) {
            console.error('Risk analizi hesaplama hatası:', calcErr);
            return res.json({
                risk_analizi: generateFallbackRiskAnalizi(parseInt(periyot)),
                yontem: 'Basit Risk Faktörü Analizi (Fallback)'
            });
        }
    } catch (error) {
        console.error('Risk analizi genel hatası:', error);
        // 500 hatası yerine 200 ile fallback veri döndür (frontend hatası önlemek için)
        return res.status(200).json({
            error: 'Risk analizi hesaplanamadı',
            risk_analizi: generateFallbackRiskAnalizi(parseInt(periyot)),
            yontem: 'Basit Risk Faktörü Analizi (Fallback)'
        });
    }
};

/**
 * Gelecek risk analizi hesaplama
 */
function hesaplaGelecekRiskAnalizi(gecmisVeri, periyot) {
    if (!gecmisVeri || !Array.isArray(gecmisVeri) || gecmisVeri.length === 0) {
        return generateFallbackRiskAnalizi(periyot);
    }
    
    const veri = [...gecmisVeri].reverse(); // Orijinal array'i değiştirmemek için kopyala
    const toplamOda = 100;
    
    // Geçmiş ortalamalar - Her ay için gerçek gün sayısını kullan
    const son12Ay = veri.slice(-12);
    const ortalamaDoluluk = son12Ay.length > 0 ? son12Ay.reduce((sum, v) => {
        const [yil, ay] = v.ay.split('-').map(Number);
        const gercekGunSayisi = new Date(yil, ay, 0).getDate();
        const toplamOdaGun = toplamOda * gercekGunSayisi;
        const toplamRezerveGece = v.toplam_gece || (v.rezervasyon_sayisi * 2);
        const doluluk = toplamOdaGun > 0 ? (toplamRezerveGece / toplamOdaGun) * 100 : 0;
        return sum + doluluk;
    }, 0) / son12Ay.length : 70;
    
    const ortalamaGelir = son12Ay.length > 0 
        ? son12Ay.reduce((sum, v) => sum + (parseFloat(v.toplam_gelir) || 0), 0) / son12Ay.length 
        : 3500000;
    const gelirVaryans = son12Ay.length > 0 && ortalamaGelir > 0
        ? son12Ay.reduce((sum, v) => {
            const gelir = parseFloat(v.toplam_gelir) || 0;
            return sum + Math.pow(gelir - ortalamaGelir, 2);
        }, 0) / son12Ay.length
        : 0;
    const gelirStandartSapma = Math.sqrt(Math.max(0, gelirVaryans));
    const gelirDalgalanmaOrani = ortalamaGelir > 0 
        ? (gelirStandartSapma / ortalamaGelir) * 100 
        : 15; // Varsayılan %15 dalgalanma
    
    const riskAnalizleri = [];
    const bugun = new Date();
    
    for (let i = 1; i <= periyot; i++) {
        const hedefTarih = new Date(bugun.getFullYear(), bugun.getMonth() + i, 1);
        const ay = hedefTarih.toISOString().slice(0, 7);
        const ayNo = hedefTarih.getMonth() + 1;
        
        // Mevsimsellik
        const mevsimKatsayi = (ayNo >= 6 && ayNo <= 8) ? 1.15 : (ayNo >= 12 || ayNo <= 2) ? 0.85 : 1.0;
        const tahminiDoluluk = Math.min(95, Math.max(40, ortalamaDoluluk * mevsimKatsayi));
        
        // Risk faktörleri (her biri 0-25 puan)
        let dusukDoluluk = 0;
        if (tahminiDoluluk < 50) dusukDoluluk = 25;
        else if (tahminiDoluluk < 60) dusukDoluluk = 20;
        else if (tahminiDoluluk < 70) dusukDoluluk = 15;
        else if (tahminiDoluluk < 80) dusukDoluluk = 8;
        
        let gelirDalgalanmasi = 0;
        if (gelirDalgalanmaOrani > 25) gelirDalgalanmasi = 25;
        else if (gelirDalgalanmaOrani > 20) gelirDalgalanmasi = 20;
        else if (gelirDalgalanmaOrani > 15) gelirDalgalanmasi = 15;
        else if (gelirDalgalanmaOrani > 10) gelirDalgalanmasi = 10;
        
        let personelMaliyetOrani = 0;
        const personelMaliyetOraniVarsayilan = 0.48;
        if (personelMaliyetOraniVarsayilan > 0.55) personelMaliyetOrani = 25;
        else if (personelMaliyetOraniVarsayilan > 0.50) personelMaliyetOrani = 20;
        else if (personelMaliyetOraniVarsayilan > 0.48) personelMaliyetOrani = 15;
        else if (personelMaliyetOraniVarsayilan > 0.45) personelMaliyetOrani = 10;
        
        let rakipFiyatBaskisi = 0;
        const ortalamaFiyat = veri.length > 0 && veri[veri.length - 1]?.ortalama_fiyat 
            ? parseFloat(veri[veri.length - 1].ortalama_fiyat) || 3500
            : 3500;
        const rakipFiyat = ortalamaFiyat * 0.88; // %12 daha düşük varsayım
        const fiyatFarki = rakipFiyat > 0 
            ? ((ortalamaFiyat - rakipFiyat) / rakipFiyat) * 100 
            : 0;
        if (fiyatFarki > 25) rakipFiyatBaskisi = 25;
        else if (fiyatFarki > 20) rakipFiyatBaskisi = 20;
        else if (fiyatFarki > 15) rakipFiyatBaskisi = 15;
        else if (fiyatFarki > 10) rakipFiyatBaskisi = 10;
        
        const toplamRiskSkoru = Math.min(100, dusukDoluluk + gelirDalgalanmasi + personelMaliyetOrani + rakipFiyatBaskisi);
        
        let riskSeviyesi = 'Düşük';
        if (toplamRiskSkoru > 60) riskSeviyesi = 'Yüksek';
        else if (toplamRiskSkoru > 30) riskSeviyesi = 'Orta';
        
        let yoneticiUyarisi = '';
        if (riskSeviyesi === 'Yüksek') {
            yoneticiUyarisi = `Kritik risk seviyesi! Acil aksiyon planı gereklidir. Doluluk artırıcı ve maliyet düşürücü stratejiler uygulanmalı.`;
        } else if (riskSeviyesi === 'Orta') {
            yoneticiUyarisi = `Dikkat gerektiren risk seviyesi. Önleyici tedbirler alınması önerilir.`;
        } else {
            yoneticiUyarisi = `Düşük risk seviyesi. Mevcut stratejileri sürdürebilirsiniz.`;
        }
        
        riskAnalizleri.push({
            ay: ay,
            riskSkoru: Math.round(toplamRiskSkoru),
            riskSeviyesi: riskSeviyesi,
            faktorler: {
                dusuk_doluluk: Math.round(dusukDoluluk),
                gelir_dalgalanmasi: Math.round(gelirDalgalanmasi),
                personel_maliyet_orani: Math.round(personelMaliyetOrani),
                rakip_fiyat_baskisi: Math.round(rakipFiyatBaskisi)
            },
            yonetici_uyarisi: yoneticiUyarisi
        });
    }
    
    return riskAnalizleri;
}

/**
 * Senaryo Analizi
 * İyimser, Gerçekçi ve Kötümser senaryolar oluşturur
 */
exports.getSenaryoAnalizi = (req, res) => {
    const periyot = req.query.periyot || '6'; // 6 veya 12 ay
    
    db.query(`
        SELECT 
            DATE_FORMAT(giris_tarihi, '%Y-%m') as ay,
            COUNT(*) as rezervasyon_sayisi,
            SUM(fiyat * konaklama_suresi) as toplam_gelir,
            AVG(fiyat) as ortalama_fiyat
        FROM rezervasyonlar
        WHERE iptal_durumu = 0
        GROUP BY ay
        ORDER BY ay DESC
        LIMIT 24
    `, (err, results) => {
        if (err || !results || results.length === 0) {
            return res.json({
                senaryolar: generateFallbackSenaryoAnalizi(parseInt(periyot)),
                yontem: 'Basit Senaryo Analizi (Fallback)'
            });
        }
        
        const senaryolar = hesaplaSenaryoAnalizi(results, parseInt(periyot));
        res.json({
            senaryolar: senaryolar,
            yontem: 'Çoklu Senaryo Analizi',
            kullanilan_veri: results.length + ' ay geçmiş veri'
        });
    });
};

/**
 * Senaryo Analizi Kaydetme
 * Senaryo analizi sonuçlarını veritabanına kaydeder
 */
exports.kaydetSenaryoAnalizi = (req, res) => {
    const { senaryo_adi, periyot, senaryo_verisi } = req.body;
    
    if (!senaryo_adi || !senaryo_verisi) {
        return res.status(400).json({ error: 'Senaryo adı ve verisi gerekli' });
    }
    
    // Strateji Simülatörü'nden gelen veri mi kontrol et
    const isSimulasyon = senaryo_verisi.senaryo_tipi === 'simulasyon' || 
                        senaryo_verisi.fiyat_degisimi !== undefined ||
                        senaryo_verisi.personel_sayisi !== undefined;
    
    let senaryoTipi, sonucDurumu, sonucVeri;
    
    if (isSimulasyon) {
        // Strateji Simülatörü verisi
        senaryoTipi = 'simulasyon';
        const netKar = senaryo_verisi.net_kar || 0;
        sonucDurumu = netKar > 1500000 ? 'Başarılı' : (netKar > 0 ? 'Orta' : 'Riskli');
        
        sonucVeri = {
            senaryo_tipi: 'simulasyon',
            fiyat_degisimi: senaryo_verisi.fiyat_degisimi || 0,
            personel_sayisi: senaryo_verisi.personel_sayisi || 20,
            pazarlama_butcesi: senaryo_verisi.pazarlama_butcesi || 0,
            tahmini_ciro: senaryo_verisi.tahmini_ciro || 0,
            net_kar: senaryo_verisi.net_kar || 0,
            kar_marji: senaryo_verisi.kar_marji || 0,
            simulasyon_tarihi: senaryo_verisi.simulasyon_tarihi || new Date().toISOString(),
            periyot: periyot || 6,
            kayit_tarihi: new Date().toISOString(),
            not: 'Strateji Simülatörü ile oluşturuldu',
            senaryoKarsilastirma: senaryo_verisi.senaryoKarsilastirma || []
        };
    } else {
        // Senaryo Analizi verisi
        const degerlendirilebilirSenaryo = senaryo_verisi.degerlendirilebilir_senaryo || senaryo_verisi.onerilen_senaryo || 'realist';
        senaryoTipi = degerlendirilebilirSenaryo === 'iyimser' ? 'iyimser' : 
                     degerlendirilebilirSenaryo === 'kotumser' ? 'kotumser' : 'realist';
        
        const ortalamaKar = senaryo_verisi.ortalama_karlar ? 
                           senaryo_verisi.ortalama_karlar[degerlendirilebilirSenaryo] : 0;
        sonucDurumu = ortalamaKar > 1500000 ? 'Başarılı' : 'Riskli';
        
        sonucVeri = {
            senaryolar: senaryo_verisi.senaryolar,
            degerlendirilebilir_senaryo: degerlendirilebilirSenaryo,
            analiz_gerekcesi: senaryo_verisi.analiz_gerekcesi || senaryo_verisi.gerekce,
            yonetici_tercihi_notu: senaryo_verisi.yonetici_tercihi_notu || '',
            ortalama_karlar: senaryo_verisi.ortalama_karlar,
            periyot: periyot || 6,
            kayit_tarihi: new Date().toISOString(),
            not: 'Bu analiz senaryo alternatiflerini sunar. Hangi senaryonun tercih edileceği yönetici kararına bağlıdır.'
        };
    }
    
    (async () => {
        try {
            // Senaryo tipi ve durum değerlerini kullan (tablo artık 'simulasyon' ve 'Orta' değerlerini destekliyor)
            const [result] = await db.query(
                `INSERT INTO senaryolar 
                 (senaryo_adi, senaryo_tipi, sonuc_veri, sonuc_durumu, tarih) 
                 VALUES (?, ?, ?, ?, NOW())`,
                [senaryo_adi, senaryoTipi, JSON.stringify(sonucVeri), sonucDurumu]
            );
            
            console.log(`✅ Senaryo kaydedildi: ID=${result.insertId}, Adı=${senaryo_adi}, Tipi=${senaryoTipi}, Durum=${sonucDurumu}`);
            
            res.json({
                success: true,
                message: 'Senaryo başarıyla kaydedildi',
                senaryo_id: result.insertId,
                senaryo_adi: senaryo_adi,
                senaryo_tipi: senaryoTipi,
                sonuc_durumu: sonucDurumu
            });
        } catch (err) {
            console.error('Senaryo kaydetme hatası:', err);
            console.error('Hata detayları:', {
                code: err.code,
                sqlMessage: err.sqlMessage,
                sqlState: err.sqlState
            });
            
            // Tablo yoksa veya ENUM hatası varsa
            if (err.code === 'ER_NO_SUCH_TABLE') {
                return res.status(200).json({
                    success: false,
                    warning: 'Senaryolar tablosu bulunamadı. Lütfen setup_senaryolar.js scriptini çalıştırın.',
                    fallback: true,
                    detay: err.message
                });
            }
            
            // ENUM hatası - tabloyu güncellemek gerekebilir
            if (err.code === 'ER_DATA_TOO_LONG' || err.sqlMessage?.includes('ENUM')) {
                return res.status(500).json({ 
                    error: 'Senaryo tipi veya durum değeri geçersiz. Tablo şeması güncellenmeli.',
                    detay: err.message,
                    onerilen_tip: senaryoTipi === 'simulasyon' ? 'realist kullanıldı' : senaryoTipi
                });
            }
            
            return res.status(500).json({ error: 'Senaryo kaydedilemedi', detay: err.message });
        }
    })();
};

/**
 * Senaryo Raporu Oluşturma
 * Kaydedilmiş senaryolar için detaylı rapor oluşturur
 */
exports.getSenaryoRaporu = async (req, res) => {
    const senaryoId = req.params.id;
    
    if (!senaryoId) {
        return res.status(400).json({ error: 'Senaryo ID gerekli' });
    }
    
    try {
        const [results] = await db.query(
            `SELECT * FROM senaryolar WHERE id = ?`,
            [senaryoId]
        );
        
        if (!results || results.length === 0) {
            return res.status(404).json({ error: 'Senaryo bulunamadı' });
        }
            
            const senaryo = results[0];
            const senaryoVeri = typeof senaryo.sonuc_veri === 'string' ? 
                               JSON.parse(senaryo.sonuc_veri) : senaryo.sonuc_veri;
            
            // Simülasyon verisi mi kontrol et
            const isSimulasyon = senaryoVeri.senaryo_tipi === 'simulasyon' || 
                                senaryoVeri.fiyat_degisimi !== undefined ||
                                senaryoVeri.personel_sayisi !== undefined;
            
            // Eksik verileri tamamla - Mevcut durum verilerini çek
            let mevcutDurum = {};
            try {
                const [mevcutSonuc] = await db.query(`
                    SELECT 
                        SUM(fiyat * konaklama_suresi) as mevcut_ciro,
                        AVG(fiyat) as ortalama_fiyat,
                        COUNT(*) as rezervasyon_sayisi,
                        SUM(konaklama_suresi) as toplam_gece
                    FROM rezervasyonlar 
                    WHERE iptal_durumu = 0 
                    AND giris_tarihi >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
                `);
                if (mevcutSonuc && mevcutSonuc.length > 0) {
                    mevcutDurum = {
                        ciro: parseFloat(mevcutSonuc[0].mevcut_ciro) || 0,
                        ortalama_fiyat: parseFloat(mevcutSonuc[0].ortalama_fiyat) || 0,
                        rezervasyon_sayisi: parseInt(mevcutSonuc[0].rezervasyon_sayisi) || 0,
                        toplam_gece: parseInt(mevcutSonuc[0].toplam_gece) || 0
                    };
                }
            } catch (err) {
                console.warn('Mevcut durum verisi çekilemedi:', err.message);
            }
            
            // Rapor verilerini hazırla
            const rapor = {
                senaryo_bilgileri: {
                    id: senaryo.id,
                    senaryo_adi: senaryo.senaryo_adi || 'İsimsiz Senaryo',
                    senaryo_tipi: senaryoVeri.senaryo_tipi || senaryo.senaryo_tipi || 'realist',
                    sonuc_durumu: senaryo.sonuc_durumu || 'Riskli',
                    tarih: senaryo.tarih || new Date().toISOString(),
                    olusturulma_tarihi: new Date(senaryo.tarih).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                },
                mevcut_durum: mevcutDurum,
                analiz_ozeti: isSimulasyon ? {
                    // Simülasyon verisi için özel format
                    simulasyon_verisi: true,
                    fiyat_degisimi: senaryoVeri.fiyat_degisimi || 0,
                    personel_sayisi: senaryoVeri.personel_sayisi || 20,
                    pazarlama_butcesi: senaryoVeri.pazarlama_butcesi || 0,
                    tahmini_ciro: senaryoVeri.tahmini_ciro || 0,
                    net_kar: senaryoVeri.net_kar || 0,
                    kar_marji: senaryoVeri.kar_marji || 0,
                    periyot: senaryoVeri.periyot || 6,
                    not: senaryoVeri.not || 'Strateji Simülatörü ile oluşturuldu',
                    fark_ciro: (senaryoVeri.tahmini_ciro || 0) - (mevcutDurum.ciro || 0),
                    fark_kar: (senaryoVeri.net_kar || 0) - ((mevcutDurum.ciro || 0) * 0.4) // Varsayılan %40 kar marjı
                } : {
                    // Senaryo Analizi verisi
                    degerlendirilebilir_senaryo: senaryoVeri.degerlendirilebilir_senaryo || senaryoVeri.onerilen_senaryo || 'realist',
                    analiz_gerekcesi: senaryoVeri.analiz_gerekcesi || senaryoVeri.gerekce || 'Geçmiş veriler ve trend analizi kullanılarak oluşturulmuştur.',
                    yonetici_tercihi_notu: senaryoVeri.yonetici_tercihi_notu || '',
                    ortalama_karlar: {
                        iyimser: senaryoVeri.ortalama_karlar?.iyimser || 0,
                        realist: senaryoVeri.ortalama_karlar?.realist || 0,
                        kotumser: senaryoVeri.ortalama_karlar?.kotumser || 0
                    },
                    periyot: senaryoVeri.periyot || 6,
                    toplam_tahmini_gelir: {
                        iyimser: Array.isArray(senaryoVeri.senaryolar) ? 
                            senaryoVeri.senaryolar.reduce((sum, s) => sum + (s?.iyimser?.tahmini_gelir || 0), 0) : 0,
                        realist: Array.isArray(senaryoVeri.senaryolar) ? 
                            senaryoVeri.senaryolar.reduce((sum, s) => sum + (s?.realist?.tahmini_gelir || 0), 0) : 0,
                        kotumser: Array.isArray(senaryoVeri.senaryolar) ? 
                            senaryoVeri.senaryolar.reduce((sum, s) => sum + ((s?.kotumser || s?.kutumser)?.tahmini_gelir || 0), 0) : 0
                    },
                    toplam_tahmini_kar: {
                        iyimser: Array.isArray(senaryoVeri.senaryolar) ? 
                            senaryoVeri.senaryolar.reduce((sum, s) => sum + (s?.iyimser?.tahmini_kar || 0), 0) : 0,
                        realist: Array.isArray(senaryoVeri.senaryolar) ? 
                            senaryoVeri.senaryolar.reduce((sum, s) => sum + (s?.realist?.tahmini_kar || 0), 0) : 0,
                        kotumser: Array.isArray(senaryoVeri.senaryolar) ? 
                            senaryoVeri.senaryolar.reduce((sum, s) => sum + ((s?.kotumser || s?.kutumser)?.tahmini_kar || 0), 0) : 0
                    }
                },
                detayli_senaryolar: senaryoVeri.senaryolar || [],
                senaryo_karsilastirma: senaryoVeri.senaryoKarsilastirma || senaryoVeri.senaryo_karsilastirma || [],
                grafik_verileri: {
                    aylar: Array.isArray(senaryoVeri.senaryolar) ? senaryoVeri.senaryolar.map(s => s?.ay || '-') : [],
                    iyimser_gelir: Array.isArray(senaryoVeri.senaryolar) ? senaryoVeri.senaryolar.map(s => s?.iyimser?.tahmini_gelir || 0) : [],
                    realist_gelir: Array.isArray(senaryoVeri.senaryolar) ? senaryoVeri.senaryolar.map(s => s?.realist?.tahmini_gelir || 0) : [],
                    kotumser_gelir: Array.isArray(senaryoVeri.senaryolar) ? senaryoVeri.senaryolar.map(s => (s?.kotumser || s?.kutumser)?.tahmini_gelir || 0) : [],
                    iyimser_kar: Array.isArray(senaryoVeri.senaryolar) ? senaryoVeri.senaryolar.map(s => s?.iyimser?.tahmini_kar || 0) : [],
                    realist_kar: Array.isArray(senaryoVeri.senaryolar) ? senaryoVeri.senaryolar.map(s => s?.realist?.tahmini_kar || 0) : [],
                    kotumser_kar: Array.isArray(senaryoVeri.senaryolar) ? senaryoVeri.senaryolar.map(s => (s?.kotumser || s?.kutumser)?.tahmini_kar || 0) : [],
                    iyimser_doluluk: Array.isArray(senaryoVeri.senaryolar) ? senaryoVeri.senaryolar.map(s => s?.iyimser?.tahmini_doluluk || 0) : [],
                    realist_doluluk: Array.isArray(senaryoVeri.senaryolar) ? senaryoVeri.senaryolar.map(s => s?.realist?.tahmini_doluluk || 0) : [],
                    kotumser_doluluk: Array.isArray(senaryoVeri.senaryolar) ? senaryoVeri.senaryolar.map(s => (s?.kotumser || s?.kutumser)?.tahmini_doluluk || 0) : []
                },
                degerlendirilebilir_stratejiler: {
                    // DSS Prensibi: Net karar vermez, sadece alternatifler sunar
                    strateji_analizi: (() => {
                        const secilenSenaryo = senaryoVeri.degerlendirilebilir_senaryo || senaryoVeri.onerilen_senaryo || 'realist';
                        if(secilenSenaryo === 'iyimser') {
                            return 'İyimser senaryo için değerlendirilebilecek stratejiler: Agresif büyüme yaklaşımı değerlendirilebilir. Yatırım ve pazarlama bütçesi artırılabilir.';
                        } else if(secilenSenaryo === 'kotumser') {
                            return 'Kötümser senaryo için değerlendirilebilecek stratejiler: Muhafazakar yaklaşım değerlendirilebilir. Maliyet kontrolü ve risk yönetimi göz önünde bulundurulabilir.';
                        } else {
                            return 'Gerçekçi senaryo için değerlendirilebilecek stratejiler: Dengeli yaklaşım değerlendirilebilir. Mevcut operasyonel yapı korunabilir, kademeli büyüme hedeflenebilir.';
                        }
                    })(),
                    alternatif_eylemler: (() => {
                        const secilenSenaryo = senaryoVeri.degerlendirilebilir_senaryo || senaryoVeri.onerilen_senaryo || 'realist';
                        if(secilenSenaryo === 'iyimser') {
                            return [
                                'Pazarlama bütçesi artırılabilir (%15-25 aralığı)',
                                'Yeni oda tipleri eklenebilir',
                                'Personel sayısı artırılabilir',
                                'Fiyatlar artırılabilir (%5-10 aralığı)'
                            ];
                        } else if(secilenSenaryo === 'kotumser') {
                            return [
                                'Maliyetler azaltılabilir (%5-15 aralığı)',
                                'Esnek iptal politikaları değerlendirilebilir',
                                'Personel maliyetleri optimize edilebilir',
                                'Fiyat rekabetçiliği korunabilir'
                            ];
                        } else {
                            return [
                                'Mevcut stratejiler değerlendirilebilir',
                                'Kademeli fiyat artışları değerlendirilebilir',
                                'Personel verimliliği artırılabilir',
                                'Müşteri memnuniyeti korunabilir'
                            ];
                        }
                    })(),
                    not: 'Bu stratejiler alternatiflerdir. Hangi stratejinin uygulanacağı yönetici kararına bağlıdır.'
                }
            };
            
            res.json(rapor);
    } catch (err) {
        return res.status(500).json({ error: 'Rapor oluşturulamadı', detay: err.message });
    }
};

/**
 * Tüm Senaryo Raporları Listesi
 */
exports.getSenaryoRaporlari = async (req, res) => {
    try {
        const [results] = await db.query(
            `SELECT id, senaryo_adi, senaryo_tipi, sonuc_durumu, tarih 
             FROM senaryolar 
             ORDER BY tarih DESC 
             LIMIT 50`
        );
        
        res.json(results || []);
    } catch (err) {
        return res.status(500).json({ error: 'Raporlar yüklenemedi', detay: err.message });
    }
};

/**
 * Senaryo analizi hesaplama
 */
function hesaplaSenaryoAnalizi(gecmisVeri, periyot) {
    // Güvenli veri kontrolü
    if (!gecmisVeri || !Array.isArray(gecmisVeri) || gecmisVeri.length === 0) {
        // Fallback: Boş veri durumunda varsayılan değerler
        return generateFallbackSenaryoAnalizi(periyot);
    }
    
    const veri = [...gecmisVeri].reverse(); // Orijinal array'i değiştirmemek için kopyala
    const toplamOda = 100;
    const toplamGun = 30;
    const toplamOdaGun = toplamOda * toplamGun;
    
    const son12Ay = veri.slice(-12);
    const ortalamaDolulukHesapla = son12Ay.length > 0 ? son12Ay.reduce((sum, v) => {
        const rezervasyonSayisi = parseFloat(v.rezervasyon_sayisi) || 0;
        return sum + ((rezervasyonSayisi / toplamOdaGun) * 100);
    }, 0) / son12Ay.length : 70;
    
    const ortalamaDoluluk = isNaN(ortalamaDolulukHesapla) || ortalamaDolulukHesapla <= 0 ? 70 : ortalamaDolulukHesapla;
    
    const ortalamaGelirHesapla = son12Ay.length > 0 ? son12Ay.reduce((sum, v) => sum + (parseFloat(v.toplam_gelir) || 0), 0) / son12Ay.length : 3500000;
    const ortalamaGelir = isNaN(ortalamaGelirHesapla) || ortalamaGelirHesapla <= 0 ? 3500000 : ortalamaGelirHesapla;
    
    const ortalamaFiyatHesapla = son12Ay.length > 0 ? son12Ay.reduce((sum, v) => sum + (parseFloat(v.ortalama_fiyat) || 0), 0) / son12Ay.length : 3500;
    const ortalamaFiyat = isNaN(ortalamaFiyatHesapla) || ortalamaFiyatHesapla <= 0 ? 3500 : ortalamaFiyatHesapla;
    
    const ortalamaMaliyetOrani = 0.60;
    
    const tumSenaryolar = [];
    const bugun = new Date();
    
    for (let i = 1; i <= periyot; i++) {
        const hedefTarih = new Date(bugun.getFullYear(), bugun.getMonth() + i, 1);
        const ay = hedefTarih.toISOString().slice(0, 7);
        const ayNo = hedefTarih.getMonth() + 1;
        
        const mevsimKatsayi = (ayNo >= 6 && ayNo <= 8) ? 1.15 : (ayNo >= 12 || ayNo <= 2) ? 0.85 : 1.0;
        
        // İyimser Senaryo
        const iyimserDoluluk = Math.min(95, Math.max(40, ortalamaDoluluk * mevsimKatsayi * 1.15));
        const iyimserGelir = Math.max(0, ortalamaGelir * mevsimKatsayi * 1.20);
        const iyimserKar = iyimserGelir * 0.45; // %45 kar marjı
        const iyimserRisk = 15;
        
        // Gerçekçi Senaryo
        const realistDoluluk = Math.min(90, Math.max(40, ortalamaDoluluk * mevsimKatsayi));
        const realistGelir = Math.max(0, ortalamaGelir * mevsimKatsayi);
        const realistKar = realistGelir * 0.40; // %40 kar marjı
        const realistRisk = 35;
        
        // Kötümser Senaryo
        const kotumserDoluluk = Math.max(40, Math.min(95, ortalamaDoluluk * mevsimKatsayi * 0.85));
        const kotumserGelir = Math.max(0, ortalamaGelir * mevsimKatsayi * 0.80);
        const kotumserKar = kotumserGelir * 0.30; // %30 kar marjı
        const kotumserRisk = 65;
        
        tumSenaryolar.push({
            ay: ay,
            iyimser: {
                tahmini_doluluk: Math.round(iyimserDoluluk * 100) / 100,
                tahmini_gelir: Math.round(iyimserGelir),
                tahmini_kar: Math.round(iyimserKar),
                risk_seviyesi: iyimserRisk
            },
            realist: {
                tahmini_doluluk: Math.round(realistDoluluk * 100) / 100,
                tahmini_gelir: Math.round(realistGelir),
                tahmini_kar: Math.round(realistKar),
                risk_seviyesi: realistRisk
            },
            kotumser: {
                tahmini_doluluk: Math.round(kotumserDoluluk * 100) / 100,
                tahmini_gelir: Math.round(kotumserGelir),
                tahmini_kar: Math.round(kotumserKar),
                risk_seviyesi: kotumserRisk
            }
        });
    }
    
    // En iyi senaryoyu belirle (ortalama kar bazlı)
    // Güvenli kontrol: tumSenaryolar boş veya eksik elemanlar içeriyorsa fallback değerler kullan
    if (!tumSenaryolar || tumSenaryolar.length === 0) {
        return generateFallbackSenaryoAnalizi(periyot);
    }
    
    // Güvenli reduce işlemleri - undefined kontrolü ile
    const senaryoListesi = Array.isArray(tumSenaryolar)
        ? tumSenaryolar.filter(s => s && (s.kotumser || s.kutumser) && s.realist && s.iyimser)
        : [];

    if (senaryoListesi.length === 0) {
        return generateFallbackSenaryoAnalizi(periyot);
    }

    const karDegeriAl = (senaryo, tip) => {
        if (!senaryo) return 0;
        if (tip === 'kotumser') {
            const kotumserKayit = senaryo.kotumser || senaryo.kutumser; // geriye uyumluluk
            return Number(kotumserKayit?.tahmini_kar) || 0;
        }
        return Number(senaryo?.[tip]?.tahmini_kar) || 0;
    };

    const ortalamaIyimserKar = senaryoListesi.reduce((sum, s) => sum + karDegeriAl(s, 'iyimser'), 0) / senaryoListesi.length;
    const ortalamaRealistKar = senaryoListesi.reduce((sum, s) => sum + karDegeriAl(s, 'realist'), 0) / senaryoListesi.length;
    const ortalamaKotumserKar = senaryoListesi.reduce((sum, s) => sum + karDegeriAl(s, 'kotumser'), 0) / senaryoListesi.length;
    
    // DSS Prensibi: Senaryo tercihi yöneticiye aittir. Sistem sadece analiz sunar.
    let degerlendirilebilirSenaryo = 'realist';
    let analiz_gerekcesi = '';
    let yonetici_tercihi_notu = '';
    
    if (ortalamaIyimserKar > ortalamaRealistKar * 1.1 && ortalamaIyimserKar > ortalamaKotumserKar * 1.2) {
        degerlendirilebilirSenaryo = 'iyimser';
        analiz_gerekcesi = 'İyimser senaryo, gerçekçi senaryodan %10+ daha yüksek karlılık potansiyeli göstermektedir. Risk seviyesi düşük görünmektedir. Agresif büyüme stratejisi değerlendirilebilir.';
        yonetici_tercihi_notu = 'Yönetici tercihi: Yüksek karlılık hedefleyen ve risk toleransı yüksek yöneticiler için uygun olabilir.';
    } else if (ortalamaRealistKar > ortalamaKotumserKar * 1.15) {
        degerlendirilebilirSenaryo = 'realist';
        analiz_gerekcesi = 'Gerçekçi senaryo, dengeli risk-kar dengesi sunmaktadır. Sürdürülebilir strateji olarak değerlendirilebilir.';
        yonetici_tercihi_notu = 'Yönetici tercihi: Dengeli yaklaşım tercih eden ve orta risk toleransına sahip yöneticiler için uygun olabilir.';
    } else {
        degerlendirilebilirSenaryo = 'kotumser';
        analiz_gerekcesi = 'Kötümser senaryo, risk yönetimi odaklı yaklaşım gerektirmektedir. Muhafazakar strateji ile kayıpları minimize etme potansiyeli görülmektedir.';
        yonetici_tercihi_notu = 'Yönetici tercihi: Riskten kaçınan ve muhafazakar yaklaşım tercih eden yöneticiler için uygun olabilir.';
    }
    
    return {
        senaryolar: tumSenaryolar,
        degerlendirilebilir_senaryo: degerlendirilebilirSenaryo, // "önerilen" yerine "değerlendirilebilir"
        analiz_gerekcesi: analiz_gerekcesi, // "gerekce" yerine "analiz_gerekcesi"
        yonetici_tercihi_notu: yonetici_tercihi_notu,
        ortalama_karlar: {
            iyimser: Math.round(ortalamaIyimserKar),
            realist: Math.round(ortalamaRealistKar),
            kotumser: Math.round(ortalamaKotumserKar)
        },
        karar_notu: 'Bu analiz senaryo alternatiflerini sunar. Hangi senaryonun tercih edileceği yönetici kararına bağlıdır. Tüm senaryolar değerlendirilebilir.'
    };
}

// ========== FALLBACK FONKSİYONLAR ==========

function generateFallbackDolulukTahmini(periyot) {
    const tahminler = [];
    const bugun = new Date();
    for (let i = 1; i <= periyot; i++) {
        const tarih = new Date(bugun.getFullYear(), bugun.getMonth() + i, 1);
        const ay = tarih.toISOString().slice(0, 7);
        const doluluk = 65 + Math.random() * 15;
        tahminler.push({
            ay: ay,
            tahmini_doluluk: Math.round(doluluk * 100) / 100,
            yorum: 'Tahmin geçmiş veri eksikliği nedeniyle basitleştirilmiş yöntemle oluşturuldu.'
        });
    }
    return tahminler;
}

function generateFallbackFiyatStratejisi(periyot) {
    const oneriler = [];
    const bugun = new Date();
    for (let i = 1; i <= periyot; i++) {
        const tarih = new Date(bugun.getFullYear(), bugun.getMonth() + i, 1);
        const ay = tarih.toISOString().slice(0, 7);
        oneriler.push({
            ay: ay,
            onerilen_fiyat_degisimi: 0,
            mevcut_ortalama_fiyat: 3500,
            onerilen_fiyat: 3500,
            beklenen_etki: 'Geçmiş veri eksikliği nedeniyle mevcut fiyat seviyesi korunmalı.'
        });
    }
    return oneriler;
}

function generateFallbackGelirKarTahmini(periyot) {
    const tahminler = [];
    const bugun = new Date();
    for (let i = 1; i <= periyot; i++) {
        const tarih = new Date(bugun.getFullYear(), bugun.getMonth() + i, 1);
        const ay = tarih.toISOString().slice(0, 7);
        tahminler.push({
            donem: ay,
            tahmini_gelir: 3500000,
            tahmini_kar: 1400000,
            kar_marji: 40,
            yonetsel_degerlendirme: 'Orta',
            yonetici_yorumu: 'Tahmin geçmiş veri eksikliği nedeniyle basitleştirilmiş yöntemle oluşturuldu.'
        });
    }
    return tahminler;
}

function generateFallbackPersonelIhtiyaci() {
    return [
        { departman: 'temizlik', mevcut_personel: 15, onerilen_personel: 15, fark: 0, yonetici_aciklamasi: 'Mevcut personel seviyesi yeterli.' },
        { departman: 'servis', mevcut_personel: 12, onerilen_personel: 12, fark: 0, yonetici_aciklamasi: 'Mevcut personel seviyesi yeterli.' },
        { departman: 'mutfak', mevcut_personel: 8, onerilen_personel: 8, fark: 0, yonetici_aciklamasi: 'Mevcut personel seviyesi yeterli.' },
        { departman: 'on_buro', mevcut_personel: 6, onerilen_personel: 6, fark: 0, yonetici_aciklamasi: 'Mevcut personel seviyesi yeterli.' },
        { departman: 'yonetim', mevcut_personel: 3, onerilen_personel: 3, fark: 0, yonetici_aciklamasi: 'Mevcut personel seviyesi yeterli.' }
    ];
}

function generateFallbackRiskAnalizi(periyot) {
    const riskAnalizleri = [];
    const bugun = new Date();
    for (let i = 1; i <= periyot; i++) {
        const tarih = new Date(bugun.getFullYear(), bugun.getMonth() + i, 1);
        const ay = tarih.toISOString().slice(0, 7);
        riskAnalizleri.push({
            ay: ay,
            riskSkoru: 35,
            riskSeviyesi: 'Orta',
            faktorler: { dusuk_doluluk: 10, gelir_dalgalanmasi: 10, personel_maliyet_orani: 10, rakip_fiyat_baskisi: 5 },
            yonetici_uyarisi: 'Geçmiş veri eksikliği nedeniyle orta risk seviyesi varsayılmıştır.'
        });
    }
    return riskAnalizleri;
}

function generateFallbackSenaryoAnalizi(periyot) {
    const senaryolar = [];
    const bugun = new Date();
    for (let i = 1; i <= periyot; i++) {
        const tarih = new Date(bugun.getFullYear(), bugun.getMonth() + i, 1);
        const ay = tarih.toISOString().slice(0, 7);
        senaryolar.push({
            ay: ay,
            iyimser: { tahmini_doluluk: 85, tahmini_gelir: 4200000, tahmini_kar: 1890000, risk_seviyesi: 15 },
            realist: { tahmini_doluluk: 70, tahmini_gelir: 3500000, tahmini_kar: 1400000, risk_seviyesi: 35 },
            kotumser: { tahmini_doluluk: 55, tahmini_gelir: 2800000, tahmini_kar: 840000, risk_seviyesi: 65 }
        });
    }
    return {
        senaryolar: senaryolar,
        degerlendirilebilir_senaryo: 'realist',
        analiz_gerekcesi: 'Geçmiş veri eksikliği nedeniyle gerçekçi senaryo değerlendirilebilir olarak görülmektedir.',
        yonetici_tercihi_notu: 'Yönetici tercihi: Dengeli yaklaşım tercih eden yöneticiler için uygun olabilir.',
        ortalama_karlar: { iyimser: 1890000, realist: 1400000, kotumser: 840000 }
    };
}

