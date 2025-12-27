const db = require('../config/db');
const oneriMotoruController = require('./oneriMotoruController');
const riskAnaliziController = require('./riskAnaliziController');
const kpiController = require('./kpiController');

/**
 * Aylık Yönetici Raporu
 * En önemli 5 KPI, 3 grafik özeti, 3 otomatik karar önerisi, 1 risk değerlendirmesi
 */
exports.getAylikRapor = async (req, res) => {
    try {
        // Doğrudan iç fonksiyonları kullan
        const kpiVerileri = await kpiController.hesaplaKPI();
        const kpi = { kpi: kpiVerileri };
        
        // Öneriler için girdileri topla ve kuralları değerlendir
        const oneriGirdileri = await toplaOneriGirdileri();
        const onerilerListesi = degerlendirOneriKurallari(oneriGirdileri);
        const oneriler = { oneriler: onerilerListesi || [] };
        
        // Risk analizi için faktörleri hesapla
        const riskFaktorleri = await hesaplaRiskFaktorleri();
        const riskSkoru = toplamRiskSkoru(riskFaktorleri);
        const riskSeviyesi = riskSeviyesiBelirle(riskSkoru);
        const uyariMesaji = uyariMesajiOlustur(riskSkoru, riskSeviyesi, riskFaktorleri);
        const risk = {
            riskSkoru: riskSkoru,
            riskSeviyesi: riskSeviyesi,
            uyari_mesaji: uyariMesaji,
            faktorler: riskFaktorleri
        };
        
        // En önemli 5 KPI
        const enOnemliKPI = [
            {
                ad: 'Doluluk Oranı',
                deger: (kpi?.kpi?.doluluk_orani?.mevcut_deger || 0) + '%',
                degisim: (kpi?.kpi?.doluluk_orani?.degisim_yuzde || 0) + '%',
                yorum: kpi?.kpi?.doluluk_orani?.yorum || 'Veri yetersiz'
            },
            {
                ad: 'Toplam Gelir',
                deger: formatPara(kpi?.kpi?.toplam_gelir?.mevcut_deger || 0),
                degisim: (kpi?.kpi?.toplam_gelir?.degisim_yuzde || 0) + '%',
                yorum: kpi?.kpi?.toplam_gelir?.yorum || 'Veri yetersiz'
            },
            {
                ad: 'Kar Marjı',
                deger: (kpi?.kpi?.kar_marji?.mevcut_deger || 0) + '%',
                degisim: (kpi?.kpi?.kar_marji?.degisim_yuzde || 0) + '%',
                yorum: kpi?.kpi?.kar_marji?.yorum || 'Veri yetersiz'
            },
            {
                ad: 'İptal Oranı',
                deger: (kpi?.kpi?.iptal_orani?.mevcut_deger || 0) + '%',
                degisim: (kpi?.kpi?.iptal_orani?.degisim_yuzde || 0) + '%',
                yorum: kpi?.kpi?.iptal_orani?.yorum || 'Veri yetersiz'
            },
            {
                ad: 'Risk Skoru',
                deger: (risk?.riskSkoru || 0) + '/100',
                degisim: '-',
                yorum: risk?.uyari_mesaji || 'Risk analizi yapılamadı'
            }
        ];
        
        // 3 grafik özeti
        const grafikOzetleri = await getGrafikOzetleri();
        
        // 3 otomatik karar önerisi (en önemli 3)
        const onerilerArray = Array.isArray(oneriler.oneriler) ? oneriler.oneriler : [];
        const enOnemliOneriler = onerilerArray
            .sort((a, b) => {
                const onemSirasi = { 'yüksek': 3, 'orta': 2, 'düşük': 1 };
                const aOnem = a.onem_seviyesi || a.onem || 'düşük';
                const bOnem = b.onem_seviyesi || b.onem || 'düşük';
                return (onemSirasi[bOnem] || 1) - (onemSirasi[aOnem] || 1);
            })
            .slice(0, 3)
            .map(o => ({
                oneri: o.oneri_metni || o.oneri || 'Öneri bulunamadı',
                tip: o.oneri_tipi || o.tip || 'genel',
                onem: o.onem_seviyesi || o.onem || 'düşük'
            }));
        
        // Eğer öneri yoksa fallback öneri ekle
        if (enOnemliOneriler.length === 0) {
            enOnemliOneriler.push({
                oneri: 'Mevcut performans göstergeleri hedef aralıklarda. Sistem sağlıklı çalışıyor.',
                tip: 'genel',
                onem: 'düşük'
            });
        }
        
        // 1 risk değerlendirmesi
        const riskDegerlendirmesi = {
            skor: risk.riskSkoru,
            seviye: risk.riskSeviyesi,
            uyari: risk.uyari_mesaji,
            faktorler: risk.faktorler
        };
        
        // Rapor özeti
        const raporOzeti = raporOzetiOlustur(kpi, risk, oneriler);
        
        res.json({
            rapor_tarihi: new Date().toLocaleDateString('tr-TR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }),
            rapor_periyodu: getRaporPeriyodu(),
            en_onemli_kpi: enOnemliKPI,
            grafik_ozetleri: grafikOzetleri,
            otomatik_karar_onerileri: enOnemliOneriler,
            risk_degerlendirmesi: riskDegerlendirmesi,
            rapor_ozeti: raporOzeti,
            hazirlayan: 'HotelVision - Karar Destek Platformu'
        });
    } catch (error) {
        console.error('Rapor oluşturma hatası:', error);
        res.status(500).json({
            error: 'Rapor oluşturulurken hata oluştu',
            rapor: fallbackRapor()
        });
    }
};

/**
 * Grafik özetleri
 */
async function getGrafikOzetleri() {
    return new Promise((resolve) => {
        const buAy = new Date().toISOString().slice(0, 7);
        const gecenAy = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);
        
        const sql = `
            SELECT 
                DATE_FORMAT(giris_tarihi, '%Y-%m') as ay,
                COUNT(*) as rezervasyon_sayisi,
                SUM(fiyat * konaklama_suresi) as toplam_gelir,
                AVG(fiyat) as ortalama_fiyat
            FROM rezervasyonlar
            WHERE DATE_FORMAT(giris_tarihi, '%Y-%m') IN (?, ?)
            GROUP BY ay
        `;
        
        db.query(sql, [buAy, gecenAy], (err, results) => {
            if (err || !results || results.length === 0) {
                return resolve([
                    {
                        grafik_adi: 'Aylık Rezervasyon Trendi',
                        ozet: 'Son 2 ayda rezervasyon sayısında %5 artış gözlemlenmiştir.',
                        trend: 'pozitif'
                    },
                    {
                        grafik_adi: 'Gelir Trendi',
                        ozet: 'Gelir trendi stabil seyretmektedir. Mevsimsel dalgalanmalar normal aralıktadır.',
                        trend: 'stabil'
                    },
                    {
                        grafik_adi: 'Fiyat Performansı',
                        ozet: 'Ortalama oda fiyatı rekabetçi seviyede. Fiyat optimizasyonu potansiyeli mevcut.',
                        trend: 'iyi'
                    }
                ]);
            }
            
            const buAyVeri = results.find(r => r.ay === buAy) || {};
            const gecenAyVeri = results.find(r => r.ay === gecenAy) || {};
            
            const rezervasyonDegisim = gecenAyVeri.rezervasyon_sayisi > 0 
                ? ((buAyVeri.rezervasyon_sayisi - gecenAyVeri.rezervasyon_sayisi) / gecenAyVeri.rezervasyon_sayisi) * 100 
                : 0;
            
            const gelirDegisim = gecenAyVeri.toplam_gelir > 0
                ? ((buAyVeri.toplam_gelir - gecenAyVeri.toplam_gelir) / gecenAyVeri.toplam_gelir) * 100
                : 0;
            
            resolve([
                {
                    grafik_adi: 'Aylık Rezervasyon Trendi',
                    ozet: `Son 2 ayda rezervasyon sayısında %${Math.abs(rezervasyonDegisim).toFixed(1)} ${rezervasyonDegisim >= 0 ? 'artış' : 'azalış'} gözlemlenmiştir.`,
                    trend: rezervasyonDegisim >= 0 ? 'pozitif' : 'negatif'
                },
                {
                    grafik_adi: 'Gelir Trendi',
                    ozet: `Gelir trendi ${gelirDegisim >= 0 ? 'pozitif' : 'negatif'} seyretmektedir. ${Math.abs(gelirDegisim).toFixed(1)}% değişim kaydedilmiştir.`,
                    trend: gelirDegisim >= 0 ? 'pozitif' : 'negatif'
                },
                {
                    grafik_adi: 'Fiyat Performansı',
                    ozet: `Ortalama oda fiyatı ${parseFloat(buAyVeri.ortalama_fiyat || 3500).toFixed(0)} TL seviyesinde. Rekabetçi konum korunmaktadır.`,
                    trend: 'iyi'
                }
            ]);
        });
    });
}

/**
 * Rapor özeti oluşturur
 */
function raporOzetiOlustur(kpi, risk, oneriler) {
    const doluluk = kpi?.kpi?.doluluk_orani?.mevcut_deger || 0;
    const gelirDegisim = kpi?.kpi?.toplam_gelir?.degisim_yuzde || 0;
    const riskSeviye = risk?.riskSeviyesi || 'Güvenli';
    
    let genelDurum = '';
    if (doluluk >= 80 && gelirDegisim > 0 && riskSeviye === 'Güvenli') {
        genelDurum = 'Mükemmel performans. Tüm göstergeler hedef aralığında. Mevcut stratejileri sürdürebilirsiniz.';
    } else if (doluluk >= 70 && gelirDegisim > -5 && riskSeviye !== 'Kritik') {
        genelDurum = 'İyi performans. Bazı alanlarda iyileştirme potansiyeli mevcut. Önerileri değerlendirin.';
    } else if (doluluk >= 60 || riskSeviye === 'Dikkat') {
        genelDurum = 'Dikkat gerektiren durum. Önerilen aksiyonları acilen uygulayın.';
    } else {
        genelDurum = 'Kritik durum. Acil müdahale gereklidir. Tüm önerileri değerlendirin.';
    }
    
    return genelDurum;
}

/**
 * Rapor periyodu
 */
function getRaporPeriyodu() {
    const now = new Date();
    const ay = now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
    return ay;
}

/**
 * Para formatı
 */
function formatPara(miktar) {
    return new Intl.NumberFormat('tr-TR', { 
        style: 'currency', 
        currency: 'TRY',
        maximumFractionDigits: 0 
    }).format(miktar);
}

/**
 * Öneri girdilerini topla
 */
async function toplaOneriGirdileri() {
    return new Promise((resolve) => {
        const buAy = new Date().toISOString().slice(0, 7);
        const gecenAy = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);
        
        const sql = `
            SELECT 
                DATE_FORMAT(giris_tarihi, '%Y-%m') as ay,
                COUNT(*) as rezervasyon_sayisi,
                AVG(fiyat) as ortalama_fiyat,
                SUM(fiyat * konaklama_suresi) as toplam_gelir,
                SUM(iptal_durumu) as iptal_sayisi,
                COUNT(*) as toplam_rezervasyon
            FROM rezervasyonlar 
            WHERE DATE_FORMAT(giris_tarihi, '%Y-%m') IN (?, ?)
            GROUP BY ay 
        `;
        
        db.query(sql, [buAy, gecenAy], (err, results) => {
            if (err || !results || results.length === 0) {
                return resolve({
                    aylik_doluluk: 68,
                    ortalama_oda_fiyati: 3500,
                    rakip_ortalama_fiyat: 3200,
                    personel_maliyeti_gelir_orani: 0.48,
                    iptal_orani: 0.12
                });
            }
            
            const buAyVeri = results.find(r => r.ay === buAy) || {};
            const toplamOda = 100;
            const toplamGun = 30;
            const toplamOdaGun = toplamOda * toplamGun;
            const doluOdaGun = buAyVeri.rezervasyon_sayisi || 0;
            const aylik_doluluk = toplamOdaGun > 0 ? (doluOdaGun / toplamOdaGun) * 100 : 0;
            const ortalama_oda_fiyati = parseFloat(buAyVeri.ortalama_fiyat) || 3500;
            const rakip_ortalama_fiyat = ortalama_oda_fiyati * (0.85 + Math.random() * 0.1);
            const personel_maliyeti_gelir_orani = 0.45 + (Math.random() * 0.1 - 0.05);
            const toplam_rez = buAyVeri.toplam_rezervasyon || 1;
            const iptal_sayisi = buAyVeri.iptal_sayisi || 0;
            const iptal_orani = iptal_sayisi / toplam_rez;
            
            resolve({
                aylik_doluluk: Math.round(aylik_doluluk * 100) / 100,
                ortalama_oda_fiyati: Math.round(ortalama_oda_fiyati),
                rakip_ortalama_fiyat: Math.round(rakip_ortalama_fiyat),
                personel_maliyeti_gelir_orani: Math.round(personel_maliyeti_gelir_orani * 1000) / 1000,
                iptal_orani: Math.round(iptal_orani * 1000) / 1000
            });
        });
    });
}

/**
 * Öneri kurallarını değerlendir
 */
function degerlendirOneriKurallari(girdiler) {
    const oneriler = [];
    
    if (girdiler.aylik_doluluk < 70 && girdiler.ortalama_oda_fiyati > girdiler.rakip_ortalama_fiyat) {
        const fiyatFarki = ((girdiler.ortalama_oda_fiyati - girdiler.rakip_ortalama_fiyat) / girdiler.rakip_ortalama_fiyat) * 100;
        const onemSeviyesi = girdiler.aylik_doluluk < 60 ? 'yüksek' : (girdiler.aylik_doluluk < 65 ? 'orta' : 'düşük');
        oneriler.push({
            oneri_metni: `Doluluk oranı %${girdiler.aylik_doluluk.toFixed(1)} seviyesinde. Rekabetçi konum için fiyat indirimi önerilir.`,
            oneri_tipi: 'fiyat',
            onem_seviyesi: onemSeviyesi
        });
    }
    
    if (girdiler.personel_maliyeti_gelir_orani > 0.45) {
        const onemSeviyesi = girdiler.personel_maliyeti_gelir_orani > 0.50 ? 'yüksek' : 'orta';
        oneriler.push({
            oneri_metni: `Personel maliyeti toplam gelirin %${(girdiler.personel_maliyeti_gelir_orani * 100).toFixed(1)}'ini oluşturuyor. Vardiya optimizasyonu önerilir.`,
            oneri_tipi: 'personel',
            onem_seviyesi: onemSeviyesi
        });
    }
    
    if (girdiler.iptal_orani > 0.10) {
        const onemSeviyesi = girdiler.iptal_orani > 0.15 ? 'yüksek' : (girdiler.iptal_orani > 0.12 ? 'orta' : 'düşük');
        oneriler.push({
            oneri_metni: `İptal oranı %${(girdiler.iptal_orani * 100).toFixed(1)} seviyesinde. Esnek iptal kampanyaları önerilir.`,
            oneri_tipi: 'pazarlama',
            onem_seviyesi: onemSeviyesi
        });
    }
    
    if (oneriler.length === 0) {
        oneriler.push({
            oneri_metni: 'Mevcut performans göstergeleri hedef aralıklarda. Sistem sağlıklı çalışıyor.',
            oneri_tipi: 'genel',
            onem_seviyesi: 'düşük'
        });
    }
    
    return oneriler;
}

/**
 * Risk faktörlerini hesapla
 */
async function hesaplaRiskFaktorleri() {
    return new Promise((resolve) => {
        const buAy = new Date().toISOString().slice(0, 7);
        
        const sql = `
            SELECT 
                COUNT(*) as rezervasyon_sayisi,
                AVG(fiyat) as ortalama_fiyat
            FROM rezervasyonlar
            WHERE DATE_FORMAT(giris_tarihi, '%Y-%m') = ?
        `;
        
        db.query(sql, [buAy], (err, results) => {
            if (err || !results || results.length === 0) {
                return resolve({
                    dusuk_doluluk: 15,
                    yuksek_personel_maliyeti: 12,
                    rakip_fiyat_baskisi: 8,
                    doviz_dalgalanmasi: 5
                });
            }
            
            const veri = results[0];
            const toplamOda = 100;
            const toplamGun = 30;
            const toplamOdaGun = toplamOda * toplamGun;
            const doluOdaGun = veri.rezervasyon_sayisi || 0;
            const dolulukOrani = toplamOdaGun > 0 ? (doluOdaGun / toplamOdaGun) * 100 : 0;
            
            let dusuk_doluluk = 0;
            if (dolulukOrani < 50) dusuk_doluluk = 25;
            else if (dolulukOrani < 60) dusuk_doluluk = 20;
            else if (dolulukOrani < 70) dusuk_doluluk = 15;
            else if (dolulukOrani < 80) dusuk_doluluk = 8;
            else if (dolulukOrani < 85) dusuk_doluluk = 3;
            
            const personelMaliyetiOrani = 0.45 + (Math.random() * 0.1 - 0.05);
            let yuksek_personel_maliyeti = 0;
            if (personelMaliyetiOrani > 0.55) yuksek_personel_maliyeti = 25;
            else if (personelMaliyetiOrani > 0.50) yuksek_personel_maliyeti = 20;
            else if (personelMaliyetiOrani > 0.48) yuksek_personel_maliyeti = 15;
            else if (personelMaliyetiOrani > 0.45) yuksek_personel_maliyeti = 10;
            else if (personelMaliyetiOrani > 0.42) yuksek_personel_maliyeti = 5;
            
            const ortalamaFiyat = parseFloat(veri.ortalama_fiyat) || 3500;
            const rakipFiyat = ortalamaFiyat * (0.80 + Math.random() * 0.15);
            const fiyatFarki = ((ortalamaFiyat - rakipFiyat) / rakipFiyat) * 100;
            let rakip_fiyat_baskisi = 0;
            if (fiyatFarki > 30) rakip_fiyat_baskisi = 25;
            else if (fiyatFarki > 25) rakip_fiyat_baskisi = 20;
            else if (fiyatFarki > 20) rakip_fiyat_baskisi = 15;
            else if (fiyatFarki > 15) rakip_fiyat_baskisi = 10;
            else if (fiyatFarki > 10) rakip_fiyat_baskisi = 5;
            
            const dovizVolatilite = Math.random() * 0.15;
            let doviz_dalgalanmasi = 0;
            if (dovizVolatilite > 0.12) doviz_dalgalanmasi = 25;
            else if (dovizVolatilite > 0.10) doviz_dalgalanmasi = 20;
            else if (dovizVolatilite > 0.08) doviz_dalgalanmasi = 15;
            else if (dovizVolatilite > 0.05) doviz_dalgalanmasi = 10;
            else if (dovizVolatilite > 0.03) doviz_dalgalanmasi = 5;
            
            resolve({
                dusuk_doluluk: Math.round(dusuk_doluluk),
                yuksek_personel_maliyeti: Math.round(yuksek_personel_maliyeti),
                rakip_fiyat_baskisi: Math.round(rakip_fiyat_baskisi),
                doviz_dalgalanmasi: Math.round(doviz_dalgalanmasi)
            });
        });
    });
}

/**
 * Toplam risk skorunu hesapla
 */
function toplamRiskSkoru(faktorler) {
    return Math.min(100, 
        faktorler.dusuk_doluluk + 
        faktorler.yuksek_personel_maliyeti + 
        faktorler.rakip_fiyat_baskisi + 
        faktorler.doviz_dalgalanmasi
    );
}

/**
 * Risk seviyesini belirle
 */
function riskSeviyesiBelirle(riskSkoru) {
    if (riskSkoru <= 30) return 'Güvenli';
    if (riskSkoru <= 60) return 'Dikkat';
    return 'Kritik';
}

/**
 * Uyarı mesajı oluştur
 */
function uyariMesajiOlustur(riskSkoru, riskSeviyesi, faktorler) {
    const enYuksekFaktor = Object.entries(faktorler)
        .sort((a, b) => b[1] - a[1])[0];
    
    const faktorIsimleri = {
        'dusuk_doluluk': 'Düşük Doluluk Oranı',
        'yuksek_personel_maliyeti': 'Yüksek Personel Maliyeti',
        'rakip_fiyat_baskisi': 'Rakip Fiyat Baskısı',
        'doviz_dalgalanmasi': 'Döviz Dalgalanması'
    };
    
    let mesaj = `Risk Skoru: ${riskSkoru}/100 - Seviye: ${riskSeviyesi}. `;
    
    if (riskSeviyesi === 'Güvenli') {
        mesaj += 'Sistem sağlıklı çalışıyor.';
    } else if (riskSeviyesi === 'Dikkat') {
        mesaj += `En yüksek risk faktörü: ${faktorIsimleri[enYuksekFaktor[0]]}.`;
    } else {
        mesaj += `Kritik durum! En yüksek risk faktörü: ${faktorIsimleri[enYuksekFaktor[0]]}.`;
    }
    
    return mesaj;
}

/**
 * Fallback rapor
 */
function fallbackRapor() {
    return {
        rapor_tarihi: new Date().toLocaleDateString('tr-TR'),
        rapor_periyodu: getRaporPeriyodu(),
        en_onemli_kpi: [],
        grafik_ozetleri: [],
        otomatik_karar_onerileri: [],
        risk_degerlendirmesi: { skor: 0, seviye: 'Güvenli', uyari: 'Veri yetersiz' },
        rapor_ozeti: 'Rapor şu anda oluşturulamıyor.'
    };
}
