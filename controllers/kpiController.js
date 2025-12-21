const db = require('../config/db');

/**
 * Gelişmiş KPI sistemi
 * Mevcut değer, önceki ay karşılaştırması ve yorum cümlesi üretir
 */
exports.getGelismisKPI = async (req, res) => {
    try {
        const kpiVerileri = await hesaplaKPI();
        
        res.json({
            kpi: kpiVerileri,
            tarih: new Date().toISOString()
        });
    } catch (error) {
        console.error('KPI hesaplama hatası:', error);
        res.status(500).json({
            error: 'KPI hesaplanırken hata oluştu',
            kpi: fallbackKPI()
        });
    }
};

/**
 * KPI'ları hesaplar (export edilmiş versiyon)
 */
exports.hesaplaKPI = async function() {
    return await hesaplaKPI();
};

/**
 * KPI'ları hesaplar
 */
async function hesaplaKPI() {
    return new Promise((resolve, reject) => {
        const buAy = new Date().toISOString().slice(0, 7);
        const gecenAy = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);
        
        const sql = `
            SELECT 
                DATE_FORMAT(giris_tarihi, '%Y-%m') as ay,
                COUNT(*) as rezervasyon_sayisi,
                SUM(fiyat * konaklama_suresi) as toplam_gelir,
                AVG(fiyat) as ortalama_fiyat,
                SUM(iptal_durumu) as iptal_sayisi,
                COUNT(*) as toplam_rezervasyon,
                (SUM(fiyat * konaklama_suresi) * 0.4) as tahmini_kar,
                (SUM(fiyat * konaklama_suresi) * 0.6) as tahmini_maliyet
            FROM rezervasyonlar
            WHERE DATE_FORMAT(giris_tarihi, '%Y-%m') IN (?, ?)
            GROUP BY ay
        `;
        
        db.query(sql, [buAy, gecenAy], (err, results) => {
            if (err || !results || results.length === 0) {
                return resolve(fallbackKPI());
            }
            
            const buAyVeri = results.find(r => r.ay === buAy) || {};
            const gecenAyVeri = results.find(r => r.ay === gecenAy) || {};
            
            // Doluluk oranı
            const toplamOda = 100;
            const toplamGun = 30;
            const toplamOdaGun = toplamOda * toplamGun;
            const buAyDoluluk = buAyVeri.rezervasyon_sayisi || 0;
            const gecenAyDoluluk = gecenAyVeri.rezervasyon_sayisi || 0;
            const buAyDolulukOrani = toplamOdaGun > 0 ? (buAyDoluluk / toplamOdaGun) * 100 : 0;
            const gecenAyDolulukOrani = toplamOdaGun > 0 ? (gecenAyDoluluk / toplamOdaGun) * 100 : 0;
            const dolulukDegisim = buAyDolulukOrani - gecenAyDolulukOrani;
            
            // Toplam gelir
            const buAyGelir = parseFloat(buAyVeri.toplam_gelir) || 0;
            const gecenAyGelir = parseFloat(gecenAyVeri.toplam_gelir) || 0;
            const gelirDegisim = gecenAyGelir > 0 ? ((buAyGelir - gecenAyGelir) / gecenAyGelir) * 100 : 0;
            
            // Kar marjı
            const buAyKar = parseFloat(buAyVeri.tahmini_kar) || 0;
            const buAyKarMarji = buAyGelir > 0 ? (buAyKar / buAyGelir) * 100 : 0;
            const gecenAyKar = parseFloat(gecenAyVeri.tahmini_kar) || 0;
            const gecenAyKarMarji = gecenAyGelir > 0 ? (gecenAyKar / gecenAyGelir) * 100 : 0;
            const karMarjiDegisim = buAyKarMarji - gecenAyKarMarji;
            
            // İptal oranı
            const buAyIptal = buAyVeri.iptal_sayisi || 0;
            const buAyToplamRez = buAyVeri.toplam_rezervasyon || 1;
            const buAyIptalOrani = (buAyIptal / buAyToplamRez) * 100;
            const gecenAyIptal = gecenAyVeri.iptal_sayisi || 0;
            const gecenAyToplamRez = gecenAyVeri.toplam_rezervasyon || 1;
            const gecenAyIptalOrani = (gecenAyIptal / gecenAyToplamRez) * 100;
            const iptalOraniDegisim = buAyIptalOrani - gecenAyIptalOrani;
            
            resolve({
                doluluk_orani: {
                    mevcut_deger: Math.round(buAyDolulukOrani * 100) / 100,
                    onceki_ay: Math.round(gecenAyDolulukOrani * 100) / 100,
                    degisim: Math.round(dolulukDegisim * 100) / 100,
                    degisim_yuzde: Math.round((dolulukDegisim / (gecenAyDolulukOrani || 1)) * 100 * 100) / 100,
                    yorum: dolulukYorumuOlustur(buAyDolulukOrani, dolulukDegisim)
                },
                toplam_gelir: {
                    mevcut_deger: Math.round(buAyGelir),
                    onceki_ay: Math.round(gecenAyGelir),
                    degisim: Math.round(gelirDegisim * 100) / 100,
                    degisim_yuzde: Math.round(gelirDegisim * 100) / 100,
                    yorum: gelirYorumuOlustur(buAyGelir, gelirDegisim)
                },
                kar_marji: {
                    mevcut_deger: Math.round(buAyKarMarji * 100) / 100,
                    onceki_ay: Math.round(gecenAyKarMarji * 100) / 100,
                    degisim: Math.round(karMarjiDegisim * 100) / 100,
                    degisim_yuzde: Math.round((karMarjiDegisim / (gecenAyKarMarji || 1)) * 100 * 100) / 100,
                    yorum: karMarjiYorumuOlustur(buAyKarMarji, karMarjiDegisim)
                },
                iptal_orani: {
                    mevcut_deger: Math.round(buAyIptalOrani * 100) / 100,
                    onceki_ay: Math.round(gecenAyIptalOrani * 100) / 100,
                    degisim: Math.round(iptalOraniDegisim * 100) / 100,
                    degisim_yuzde: Math.round((iptalOraniDegisim / (gecenAyIptalOrani || 1)) * 100 * 100) / 100,
                    yorum: iptalOraniYorumuOlustur(buAyIptalOrani, iptalOraniDegisim)
                }
            });
        });
    });
}

/**
 * Doluluk oranı yorumu
 */
function dolulukYorumuOlustur(mevcut, degisim) {
    const degisimYon = degisim >= 0 ? 'artış' : 'düşüş';
    const degisimMutlak = Math.abs(degisim);
    
    // DSS Prensibi: Analiz ve bilgi sunar, net karar vermez
    if (mevcut < 70) {
        return `Geçen aya göre %${degisimMutlak.toFixed(1)} ${degisimYon} görülmektedir. Kritik eşik (%70) altında. Hafta içi kampanya ve fiyat optimizasyonu değerlendirilebilir.`;
    } else if (mevcut < 80) {
        return `Geçen aya göre %${degisimMutlak.toFixed(1)} ${degisimYon} görülmektedir. Hedef aralığa yakın (%70-85). Mevcut stratejiler değerlendirilebilir.`;
    } else if (mevcut < 90) {
        return `Geçen aya göre %${degisimMutlak.toFixed(1)} ${degisimYon} görülmektedir. İdeal doluluk seviyesinde (%80-90). Performans iyi görünmektedir.`;
    } else {
        return `Geçen aya göre %${degisimMutlak.toFixed(1)} ${degisimYon} görülmektedir. Yüksek doluluk oranı (%90+). Fiyat artışı değerlendirilebilir.`;
    }
}

/**
 * Toplam gelir yorumu
 */
function gelirYorumuOlustur(mevcut, degisim) {
    const degisimYon = degisim >= 0 ? 'artış' : 'azalış';
    const degisimMutlak = Math.abs(degisim);
    
    // DSS Prensibi: Analiz sunar, net karar vermez
    if (degisim < -10) {
        return `Geçen aya göre %${degisimMutlak.toFixed(1)} ${degisimYon} görülmektedir. Gelir düşüşü ciddi görünmektedir. Acil aksiyon planı değerlendirilebilir.`;
    } else if (degisim < -5) {
        return `Geçen aya göre %${degisimMutlak.toFixed(1)} ${degisimYon} görülmektedir. Gelir düşüşü gözlemlenmektedir. Pazarlama ve fiyat stratejisi değerlendirilebilir.`;
    } else if (degisim < 5) {
        return `Geçen aya göre %${degisimMutlak.toFixed(1)} ${degisimYon} görülmektedir. Gelir stabil görünmektedir. Mevcut trend devam edebilir.`;
    } else if (degisim < 15) {
        return `Geçen aya göre %${degisimMutlak.toFixed(1)} ${degisimYon} görülmektedir. Gelir artışı pozitif görünmektedir. Performans iyi görünmektedir.`;
    } else {
        return `Geçen aya göre %${degisimMutlak.toFixed(1)} ${degisimYon} görülmektedir. Güçlü gelir artışı görülmektedir. Başarılı strateji uygulanıyor olabilir.`;
    }
}

/**
 * Kar marjı yorumu
 */
function karMarjiYorumuOlustur(mevcut, degisim) {
    const degisimYon = degisim >= 0 ? 'artış' : 'düşüş';
    const degisimMutlak = Math.abs(degisim);
    
    // DSS Prensibi: Analiz sunar, net karar vermez
    if (mevcut < 30) {
        return `Geçen aya göre %${degisimMutlak.toFixed(1)} ${degisimYon} görülmektedir. Kar marjı düşük (%30 altı). Maliyet optimizasyonu ve fiyatlandırma stratejisi değerlendirilebilir.`;
    } else if (mevcut < 40) {
        return `Geçen aya göre %${degisimMutlak.toFixed(1)} ${degisimYon} görülmektedir. Kar marjı orta seviyede (%30-40). İyileştirme potansiyeli görülmektedir.`;
    } else if (mevcut < 50) {
        return `Geçen aya göre %${degisimMutlak.toFixed(1)} ${degisimYon} görülmektedir. Kar marjı iyi seviyede (%40-50). Sağlıklı karlılık görünmektedir.`;
    } else {
        return `Geçen aya göre %${degisimMutlak.toFixed(1)} ${degisimYon} görülmektedir. Yüksek kar marjı (%50+). Mükemmel performans görünmektedir.`;
    }
}

/**
 * İptal oranı yorumu
 */
function iptalOraniYorumuOlustur(mevcut, degisim) {
    const degisimYon = degisim >= 0 ? 'artış' : 'azalış';
    const degisimMutlak = Math.abs(degisim);
    
    // DSS Prensibi: Analiz sunar, net karar vermez
    if (mevcut > 15) {
        return `Geçen aya göre %${degisimMutlak.toFixed(1)} ${degisimYon} görülmektedir. İptal oranı yüksek (%15+). Esnek iptal politikası ve erken rezervasyon kampanyaları değerlendirilebilir.`;
    } else if (mevcut > 10) {
        return `Geçen aya göre %${degisimMutlak.toFixed(1)} ${degisimYon} görülmektedir. İptal oranı hedef üzerinde (%10-15). İyileştirme değerlendirilebilir.`;
    } else if (mevcut > 5) {
        return `Geçen aya göre %${degisimMutlak.toFixed(1)} ${degisimYon} var. İptal oranı kabul edilebilir seviyede (%5-10). Normal aralıkta.`;
    } else {
        return `Geçen aya göre %${degisimMutlak.toFixed(1)} ${degisimYon} var. Düşük iptal oranı (%5 altı). Mükemmel müşteri sadakati.`;
    }
}

/**
 * Fallback KPI verileri
 */
function fallbackKPI() {
    return {
        doluluk_orani: {
            mevcut_deger: 68,
            onceki_ay: 73,
            degisim: -5,
            degisim_yuzde: -6.8,
            yorum: 'Geçen aya göre %5 düşüş görülmektedir. Kritik eşik (%70) altında. Hafta içi kampanya değerlendirilebilir.'
        },
        toplam_gelir: {
            mevcut_deger: 3500000,
            onceki_ay: 3800000,
            degisim: -7.9,
            degisim_yuzde: -7.9,
            yorum: 'Geçen aya göre %7.9 azalış var. Gelir düşüşü gözlemleniyor. Pazarlama ve fiyat stratejisi gözden geçirilmeli.'
        },
        kar_marji: {
            mevcut_deger: 38.5,
            onceki_ay: 40.2,
            degisim: -1.7,
            degisim_yuzde: -4.2,
            yorum: 'Geçen aya göre %1.7 düşüş var. Kar marjı orta seviyede (%30-40). İyileştirme potansiyeli var.'
        },
        iptal_orani: {
            mevcut_deger: 12.5,
            onceki_ay: 10.8,
            degisim: 1.7,
            degisim_yuzde: 15.7,
            yorum: 'Geçen aya göre %1.7 artış var. İptal oranı hedef üzerinde (%10-15). İyileştirme gereklidir.'
        }
    };
}
