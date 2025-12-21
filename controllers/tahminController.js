const db = require('../config/db');

/**
 * Doluluk Tahmini
 * Geçmiş verileri kullanarak 6 ay ve 12 ay ileriye dönük doluluk tahmini yapar
 */
exports.getDolulukTahmini = (req, res) => {
    const periyot = req.query.periyot || '6'; // 6 veya 12 ay
    
    db.query(`
        SELECT 
            DATE_FORMAT(giris_tarihi, '%Y-%m') as ay,
            COUNT(*) as rezervasyon_sayisi
        FROM rezervasyonlar
        WHERE iptal_durumu = 0
        GROUP BY ay
        ORDER BY ay DESC
        LIMIT 24
    `, (err, results) => {
        if (err || !results || results.length === 0) {
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
    });
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
exports.getFiyatStratejisi = (req, res) => {
    const periyot = req.query.periyot || '6'; // 6 veya 12 ay
    
    db.query(`
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
    `, (err, results) => {
        if (err || !results || results.length === 0) {
            return res.json({
                analizler: generateFallbackFiyatStratejisi(parseInt(periyot)),
                yontem: 'Basit Fiyat Esneklik Analizi (Fallback)',
                not: 'Bu analizler alternatifler sunar. Nihai karar yöneticiye aittir.'
            });
        }
        
        const analizler = hesaplaFiyatStratejisi(results, parseInt(periyot));
        res.json({
            analizler: analizler,
            yontem: 'Fiyat Esneklik Analizi + Geçmiş Trend',
            kullanilan_veri: results.length + ' ay geçmiş veri',
            not: 'Bu analizler alternatifler ve olası etkileri sunar. Nihai karar yöneticiye aittir.'
        });
    });
};

/**
 * Fiyat stratejisi hesaplama
 */
function hesaplaFiyatStratejisi(gecmisVeri, periyot) {
    const veri = gecmisVeri.reverse();
    
    // Fiyat-doluluk ilişkisini hesapla
    const toplamOda = 100;
    const toplamGun = 30;
    const toplamOdaGun = toplamOda * toplamGun;
    
    // Son 12 ay için fiyat esnekliği hesapla
    const son12Ay = veri.slice(-12);
    let toplamFiyatDegisim = 0;
    let toplamDolulukDegisim = 0;
    
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
    
    const ortalamaFiyatEsneklik = toplamDolulukDegisim / (toplamFiyatDegisim || 1);
    const mevcutOrtalamaFiyat = parseFloat(veri[veri.length - 1].ortalama_fiyat) || 3500;
    
    const oneriler = [];
    const bugun = new Date();
    
    for (let i = 1; i <= periyot; i++) {
        const hedefTarih = new Date(bugun.getFullYear(), bugun.getMonth() + i, 1);
        const ay = hedefTarih.toISOString().slice(0, 7);
        const ayNo = hedefTarih.getMonth() + 1;
        
        // Mevsimsellik (yaz ayları daha yüksek fiyat)
        const mevsimKatsayi = (ayNo >= 6 && ayNo <= 8) ? 1.15 : (ayNo >= 12 || ayNo <= 2) ? 0.90 : 1.0;
        
        // DSS Prensibi: Fiyat esnekliğine göre alternatifler ve etki analizi
        // Net karar vermez, sadece alternatifler sunar
        const mevcutFiyat = mevcutOrtalamaFiyat * mevsimKatsayi;
        
        // Alternatif fiyat değişimleri ve olası etkileri
        let alternatifler = [];
        let belirsizlikSeviyesi = 'orta';
        
        if (ortalamaFiyatEsneklik > -0.5) {
            // Fiyat esnekliği düşük - Fiyat artışı alternatifi
            const fiyatArtisi = 5 * mevsimKatsayi;
            alternatifler = [
                {
                    alternatif: 'Fiyat Artışı',
                    fiyat_degisimi: `+%${fiyatArtisi.toFixed(1)}`,
                    olası_etkiler: {
                        doluluk_etkisi: 'Minimal düşüş beklenebilir (%2-5)',
                        gelir_etkisi: 'Gelir artışı potansiyeli var',
                        risk: 'Pazar payı kaybı riski düşük'
                    },
                    belirsizlik_seviyesi: 'düşük'
                },
                {
                    alternatif: 'Fiyat Sabit Tutma',
                    fiyat_degisimi: '%0',
                    olası_etkiler: {
                        doluluk_etkisi: 'Mevcut trend devam edebilir',
                        gelir_etkisi: 'Gelir stabil kalabilir',
                        risk: 'Düşük'
                    },
                    belirsizlik_seviyesi: 'düşük'
                }
            ];
            belirsizlikSeviyesi = 'düşük';
        } else if (ortalamaFiyatEsneklik < -1.0) {
            // Fiyat esnekliği yüksek - Fiyat indirimi alternatifi
            const fiyatIndirimi = -10 * (1 / mevsimKatsayi);
            alternatifler = [
                {
                    alternatif: 'Fiyat İndirimi',
                    fiyat_degisimi: `%${fiyatIndirimi.toFixed(1)}`,
                    olası_etkiler: {
                        doluluk_etkisi: 'Doluluk artışı beklenebilir (%5-15)',
                        gelir_etkisi: 'Toplam gelir artışı potansiyeli var, ancak marj düşebilir',
                        risk: 'Fiyat savaşına yol açabilir'
                    },
                    belirsizlik_seviyesi: 'yüksek'
                },
                {
                    alternatif: 'Fiyat Sabit Tutma',
                    fiyat_degisimi: '%0',
                    olası_etkiler: {
                        doluluk_etkisi: 'Mevcut trend devam edebilir',
                        gelir_etkisi: 'Gelir stabil kalabilir',
                        risk: 'Rekabet avantajı kaybedilebilir'
                    },
                    belirsizlik_seviyesi: 'orta'
                }
            ];
            belirsizlikSeviyesi = 'yüksek';
        } else {
            // Dengeli durum
            alternatifler = [
                {
                    alternatif: 'Fiyat Sabit Tutma',
                    fiyat_degisimi: '%0',
                    olası_etkiler: {
                        doluluk_etkisi: 'Mevcut trend devam edebilir',
                        gelir_etkisi: 'Gelir stabil kalabilir',
                        risk: 'Düşük'
                    },
                    belirsizlik_seviyesi: 'düşük'
                },
                {
                    alternatif: 'Hafif Fiyat Artışı',
                    fiyat_degisimi: '+%2-5',
                    olası_etkiler: {
                        doluluk_etkisi: 'Minimal etki beklenebilir',
                        gelir_etkisi: 'Gelir artışı potansiyeli var',
                        risk: 'Düşük'
                    },
                    belirsizlik_seviyesi: 'orta'
                }
            ];
            belirsizlikSeviyesi = 'orta';
        }
        
        // Etki analizi: Olası fiyat aralığı ve gelir etkisi
        const minFiyat = mevcutFiyat * 0.90;
        const maxFiyat = mevcutFiyat * 1.10;
        
        oneriler.push({
            ay: ay,
            mevcut_fiyat: Math.round(mevcutFiyat),
            alternatifler: alternatifler,
            fiyat_araligi: {
                min: Math.round(minFiyat),
                max: Math.round(maxFiyat),
                ortalama: Math.round(mevcutFiyat)
            },
            belirsizlik_seviyesi: belirsizlikSeviyesi,
            etki_analizi: {
                olası_gelir_etkisi: 'Fiyat değişimine bağlı olarak gelir artabilir veya azalabilir',
                olası_doluluk_etkisi: 'Fiyat esnekliğine bağlı olarak doluluk etkilenebilir',
                risk_faktörleri: ['Pazar koşulları', 'Rekabet durumu', 'Mevsimsellik']
            },
            not: 'Bu analiz alternatifler sunar. Nihai karar yöneticiye aittir.'
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
exports.getPersonelIhtiyaci = (req, res) => {
    db.query(`
        SELECT 
            DATE_FORMAT(giris_tarihi, '%Y-%m') as ay,
            COUNT(*) as rezervasyon_sayisi
        FROM rezervasyonlar
        WHERE iptal_durumu = 0
        GROUP BY ay
        ORDER BY ay DESC
        LIMIT 12
    `, (err, results) => {
        if (err || !results || results.length === 0) {
            return res.json({
                tahminler: generateFallbackPersonelIhtiyaci(),
                yontem: 'Basit Doluluk-Personel Katsayısı (Fallback)'
            });
        }
        
        const tahminler = hesaplaPersonelIhtiyaci(results);
        res.json({
            tahminler: tahminler,
            yontem: 'Doluluk Bazlı Personel Katsayısı',
            kullanilan_veri: results.length + ' ay geçmiş veri'
        });
    });
};

/**
 * Personel ihtiyacı hesaplama
 */
function hesaplaPersonelIhtiyaci(gecmisVeri) {
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
 * Gelecek Risk Analizi
 * Önümüzdeki 6 ay ve 1 yıl için risk analizi yapar
 */
exports.getGelecekRiskAnalizi = (req, res) => {
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
                risk_analizi: generateFallbackRiskAnalizi(parseInt(periyot)),
                yontem: 'Basit Risk Faktörü Analizi (Fallback)'
            });
        }
        
        const riskAnalizi = hesaplaGelecekRiskAnalizi(results, parseInt(periyot));
        res.json({
            risk_analizi: riskAnalizi,
            yontem: 'Çok Faktörlü Risk Analizi',
            kullanilan_veri: results.length + ' ay geçmiş veri'
        });
    });
};

/**
 * Gelecek risk analizi hesaplama
 */
function hesaplaGelecekRiskAnalizi(gecmisVeri, periyot) {
    const veri = gecmisVeri.reverse();
    const toplamOda = 100;
    const toplamGun = 30;
    const toplamOdaGun = toplamOda * toplamGun;
    
    // Geçmiş ortalamalar
    const son12Ay = veri.slice(-12);
    const ortalamaDoluluk = son12Ay.reduce((sum, v) => {
        return sum + ((v.rezervasyon_sayisi / toplamOdaGun) * 100);
    }, 0) / son12Ay.length;
    
    const ortalamaGelir = son12Ay.reduce((sum, v) => sum + (parseFloat(v.toplam_gelir) || 0), 0) / son12Ay.length;
    const gelirVaryans = son12Ay.reduce((sum, v) => {
        const gelir = parseFloat(v.toplam_gelir) || 0;
        return sum + Math.pow(gelir - ortalamaGelir, 2);
    }, 0) / son12Ay.length;
    const gelirStandartSapma = Math.sqrt(gelirVaryans);
    const gelirDalgalanmaOrani = (gelirStandartSapma / ortalamaGelir) * 100;
    
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
        const ortalamaFiyat = parseFloat(veri[veri.length - 1].ortalama_fiyat) || 3500;
        const rakipFiyat = ortalamaFiyat * 0.88; // %12 daha düşük varsayım
        const fiyatFarki = ((ortalamaFiyat - rakipFiyat) / rakipFiyat) * 100;
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
    
    // DSS Prensibi: Senaryo tercihi yöneticiye aittir
    const degerlendirilebilirSenaryo = senaryo_verisi.degerlendirilebilir_senaryo || senaryo_verisi.onerilen_senaryo || 'realist';
    const senaryoTipi = degerlendirilebilirSenaryo === 'iyimser' ? 'iyimser' : 
                       degerlendirilebilirSenaryo === 'kotumser' ? 'kotumser' : 'realist';
    
    // Sonuç durumunu belirle (ortalama karlara göre)
    const ortalamaKar = senaryo_verisi.ortalama_karlar ? 
                       senaryo_verisi.ortalama_karlar[degerlendirilebilirSenaryo] : 0;
    const sonucDurumu = ortalamaKar > 1500000 ? 'Başarılı' : 'Riskli';
    
    // Senaryo verisini JSON olarak hazırla
    const sonucVeri = {
        senaryolar: senaryo_verisi.senaryolar,
        degerlendirilebilir_senaryo: degerlendirilebilirSenaryo, // "önerilen" yerine "değerlendirilebilir"
        analiz_gerekcesi: senaryo_verisi.analiz_gerekcesi || senaryo_verisi.gerekce, // Geriye uyumluluk
        yonetici_tercihi_notu: senaryo_verisi.yonetici_tercihi_notu || '',
        ortalama_karlar: senaryo_verisi.ortalama_karlar,
        periyot: periyot || 6,
        kayit_tarihi: new Date().toISOString(),
        not: 'Bu analiz senaryo alternatiflerini sunar. Hangi senaryonun tercih edileceği yönetici kararına bağlıdır.'
    };
    
    db.query(
        `INSERT INTO senaryolar 
         (senaryo_adi, senaryo_tipi, sonuc_veri, sonuc_durumu, tarih) 
         VALUES (?, ?, ?, ?, NOW())`,
        [senaryo_adi, senaryoTipi, JSON.stringify(sonucVeri), sonucDurumu],
        (err, result) => {
            if (err) {
                console.error('Senaryo kaydetme hatası:', err);
                // Tablo yoksa DSS çıktısını yine de bozmayalım, kullanıcıya bilgi verelim
                if (err.code === 'ER_NO_SUCH_TABLE') {
                    return res.status(200).json({
                        success: false,
                        warning: 'Senaryolar tablosu bulunamadı, kayıt yapılmadı. Analiz çalışmaya devam ediyor.',
                        fallback: true,
                        detay: err.message
                    });
                }
                return res.status(500).json({ error: 'Senaryo kaydedilemedi', detay: err.message });
            }
            
            res.json({
                success: true,
                message: 'Senaryo başarıyla kaydedildi',
                senaryo_id: result.insertId,
                senaryo_adi: senaryo_adi,
                senaryo_tipi: senaryoTipi,
                sonuc_durumu: sonucDurumu
            });
        }
    );
};

/**
 * Senaryo Raporu Oluşturma
 * Kaydedilmiş senaryolar için detaylı rapor oluşturur
 */
exports.getSenaryoRaporu = (req, res) => {
    const senaryoId = req.params.id;
    
    if (!senaryoId) {
        return res.status(400).json({ error: 'Senaryo ID gerekli' });
    }
    
    db.query(
        `SELECT * FROM senaryolar WHERE id = ?`,
        [senaryoId],
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Rapor oluşturulamadı', detay: err.message });
            }
            
            if (!results || results.length === 0) {
                return res.status(404).json({ error: 'Senaryo bulunamadı' });
            }
            
            const senaryo = results[0];
            const senaryoVeri = typeof senaryo.sonuc_veri === 'string' ? 
                               JSON.parse(senaryo.sonuc_veri) : senaryo.sonuc_veri;
            
            // Rapor verilerini hazırla
            const rapor = {
                senaryo_bilgileri: {
                    id: senaryo.id,
                    senaryo_adi: senaryo.senaryo_adi,
                    senaryo_tipi: senaryo.senaryo_tipi,
                    sonuc_durumu: senaryo.sonuc_durumu,
                    tarih: senaryo.tarih
                },
                analiz_ozeti: {
                    degerlendirilebilir_senaryo: senaryoVeri.degerlendirilebilir_senaryo || senaryoVeri.onerilen_senaryo, // Geriye uyumluluk
                    analiz_gerekcesi: senaryoVeri.analiz_gerekcesi || senaryoVeri.gerekce, // Geriye uyumluluk
                    yonetici_tercihi_notu: senaryoVeri.yonetici_tercihi_notu || '',
                    ortalama_karlar: senaryoVeri.ortalama_karlar,
                    periyot: senaryoVeri.periyot || 6
                },
                detayli_senaryolar: senaryoVeri.senaryolar || [],
                grafik_verileri: {
                    aylar: Array.isArray(senaryoVeri.senaryolar) ? senaryoVeri.senaryolar.map(s => s?.ay) : [],
                    iyimser_gelir: Array.isArray(senaryoVeri.senaryolar) ? senaryoVeri.senaryolar.map(s => s?.iyimser?.tahmini_gelir || 0) : [],
                    realist_gelir: Array.isArray(senaryoVeri.senaryolar) ? senaryoVeri.senaryolar.map(s => s?.realist?.tahmini_gelir || 0) : [],
                    kotumser_gelir: Array.isArray(senaryoVeri.senaryolar) ? senaryoVeri.senaryolar.map(s => (s?.kotumser || s?.kutumser)?.tahmini_gelir || 0) : [],
                    iyimser_kar: Array.isArray(senaryoVeri.senaryolar) ? senaryoVeri.senaryolar.map(s => s?.iyimser?.tahmini_kar || 0) : [],
                    realist_kar: Array.isArray(senaryoVeri.senaryolar) ? senaryoVeri.senaryolar.map(s => s?.realist?.tahmini_kar || 0) : [],
                    kotumser_kar: Array.isArray(senaryoVeri.senaryolar) ? senaryoVeri.senaryolar.map(s => (s?.kotumser || s?.kutumser)?.tahmini_kar || 0) : []
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
        }
    );
};

/**
 * Tüm Senaryo Raporları Listesi
 */
exports.getSenaryoRaporlari = (req, res) => {
    db.query(
        `SELECT id, senaryo_adi, senaryo_tipi, sonuc_durumu, tarih 
         FROM senaryolar 
         ORDER BY tarih DESC 
         LIMIT 50`,
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Raporlar yüklenemedi', detay: err.message });
            }
            
            res.json(results || []);
        }
    );
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

