const db = require('../config/db');

/**
 * Risk analizi sistemi
 * Her faktöre 0-25 puan verir, toplam 0-100 arası risk skoru üretir
 */
exports.getRiskAnalizi = async (req, res) => {
    try {
        const riskFaktorleri = await hesaplaRiskFaktorleri();
        const riskSkoru = toplamRiskSkoru(riskFaktorleri);
        const riskSeviyesi = riskSeviyesiBelirle(riskSkoru);
        const uyariMesaji = uyariMesajiOlustur(riskSkoru, riskSeviyesi, riskFaktorleri);
        
        res.json({
            riskSkoru: riskSkoru,
            riskSeviyesi: riskSeviyesi,
            uyari_mesaji: uyariMesaji,
            faktorler: riskFaktorleri,
            tarih: new Date().toISOString()
        });
    } catch (error) {
        console.error('Risk analizi hatası:', error);
        res.status(500).json({
            error: 'Risk analizi yapılırken hata oluştu',
            riskSkoru: 0,
            riskSeviyesi: 'Güvenli',
            uyari_mesaji: 'Risk analizi şu anda yapılamıyor'
        });
    }
};

/**
 * Risk faktörlerini hesaplar (her biri 0-25 puan)
 */
async function hesaplaRiskFaktorleri() {
    return new Promise((resolve, reject) => {
        const buAy = new Date().toISOString().slice(0, 7);
        
        const sql = `
            SELECT 
                COUNT(*) as rezervasyon_sayisi,
                AVG(fiyat) as ortalama_fiyat,
                SUM(fiyat * konaklama_suresi) as toplam_gelir,
                SUM(iptal_durumu) as iptal_sayisi,
                COUNT(*) as toplam_rezervasyon
            FROM rezervasyonlar
            WHERE DATE_FORMAT(giris_tarihi, '%Y-%m') = ?
        `;
        
        db.query(sql, [buAy], (err, results) => {
            if (err || !results || results.length === 0) {
                // Fallback veri
                return resolve({
                    dusuk_doluluk: 15,
                    yuksek_personel_maliyeti: 12,
                    rakip_fiyat_baskisi: 8,
                    doviz_dalgalanmasi: 5
                });
            }
            
            const veri = results[0];
            
            // 1. Düşük Doluluk (0-25 puan)
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
            
            // 2. Yüksek Personel Maliyeti (0-25 puan)
            const personelMaliyetiOrani = 0.45 + (Math.random() * 0.1 - 0.05); // Simüle
            let yuksek_personel_maliyeti = 0;
            if (personelMaliyetiOrani > 0.55) yuksek_personel_maliyeti = 25;
            else if (personelMaliyetiOrani > 0.50) yuksek_personel_maliyeti = 20;
            else if (personelMaliyetiOrani > 0.48) yuksek_personel_maliyeti = 15;
            else if (personelMaliyetiOrani > 0.45) yuksek_personel_maliyeti = 10;
            else if (personelMaliyetiOrani > 0.42) yuksek_personel_maliyeti = 5;
            
            // 3. Rakip Fiyat Baskısı (0-25 puan)
            const ortalamaFiyat = parseFloat(veri.ortalama_fiyat) || 3500;
            const rakipFiyat = ortalamaFiyat * (0.80 + Math.random() * 0.15); // %80-95 arası
            const fiyatFarki = ((ortalamaFiyat - rakipFiyat) / rakipFiyat) * 100;
            let rakip_fiyat_baskisi = 0;
            if (fiyatFarki > 30) rakip_fiyat_baskisi = 25;
            else if (fiyatFarki > 25) rakip_fiyat_baskisi = 20;
            else if (fiyatFarki > 20) rakip_fiyat_baskisi = 15;
            else if (fiyatFarki > 15) rakip_fiyat_baskisi = 10;
            else if (fiyatFarki > 10) rakip_fiyat_baskisi = 5;
            
            // 4. Döviz Dalgalanması (0-25 puan) - Simüle
            const dovizVolatilite = Math.random() * 0.15; // %0-15 arası
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
                doviz_dalgalanmasi: Math.round(doviz_dalgalanmasi),
                detaylar: {
                    doluluk_orani: Math.round(dolulukOrani * 100) / 100,
                    personel_maliyeti_orani: Math.round(personelMaliyetiOrani * 1000) / 1000,
                    fiyat_farki_yuzde: Math.round(fiyatFarki * 100) / 100,
                    doviz_volatilite: Math.round(dovizVolatilite * 1000) / 1000
                }
            });
        });
    });
}

/**
 * Toplam risk skorunu hesaplar (0-100)
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
 * Risk seviyesini belirler
 */
function riskSeviyesiBelirle(riskSkoru) {
    if (riskSkoru <= 30) return 'Güvenli';
    if (riskSkoru <= 60) return 'Dikkat';
    return 'Kritik';
}

/**
 * Yönetici uyarı mesajı oluşturur
 * DSS Prensibi: Risk skorları uyarıdır, karar değildir. Yönetici değerlendirmesi gereklidir.
 */
function uyariMesajiOlustur(riskSkoru, riskSeviyesi, faktorler) {
    const enYuksekFaktor = Object.entries(faktorler)
        .filter(([key]) => key !== 'detaylar')
        .sort((a, b) => b[1] - a[1])[0];
    
    const faktorIsimleri = {
        'dusuk_doluluk': 'Düşük Doluluk Oranı',
        'yuksek_personel_maliyeti': 'Yüksek Personel Maliyeti',
        'rakip_fiyat_baskisi': 'Rakip Fiyat Baskısı',
        'doviz_dalgalanmasi': 'Döviz Dalgalanması'
    };
    
    // UYARI: Bu bir uyarıdır, net karar değildir
    let mesaj = `Risk Analizi Uyarısı: Risk Skoru ${riskSkoru}/100 - Seviye: ${riskSeviyesi}. `;
    
    if (riskSeviyesi === 'Güvenli') {
        mesaj += 'Mevcut göstergeler normal aralıklarda görünmektedir. Mevcut stratejiler değerlendirilebilir.';
    } else if (riskSeviyesi === 'Dikkat') {
        mesaj += `En yüksek risk faktörü: ${faktorIsimleri[enYuksekFaktor[0]]} (${enYuksekFaktor[1]}/25). Bu alanda değerlendirme yapılabilir. Alternatif stratejiler göz önünde bulundurulabilir.`;
    } else {
        mesaj += `Yüksek risk seviyesi tespit edilmiştir. En yüksek risk faktörü: ${faktorIsimleri[enYuksekFaktor[0]]} (${enYuksekFaktor[1]}/25). Bu durumun detaylı değerlendirilmesi önerilir. Alternatif aksiyon planları göz önünde bulundurulabilir.`;
    }
    
    mesaj += ' NOT: Bu bir uyarıdır, net karar değildir. Nihai karar yöneticiye aittir.';
    
    return mesaj;
}
