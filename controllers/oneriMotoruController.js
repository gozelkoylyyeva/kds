const db = require('../config/db');

/**
 * Kural tabanlı karar destek analiz motoru
 * Orta düzey yöneticilere karar alternatifleri, olası etkiler ve riskler sunar
 * NOT: Sistem net karar vermez, sadece bilgi ve analiz sağlar
 */
exports.getOneriler = async (req, res) => {
    try {
        // Girdileri topla
        const girdiler = await toplaGirdiler();
        
        // Kuralları değerlendir ve analiz alternatiflerini üret
        const analizler = degerlendirKurallar(girdiler);
        
        // Önem seviyesine göre sırala
        analizler.sort((a, b) => {
            const onemSirasi = { 'yüksek': 3, 'orta': 2, 'düşük': 1 };
            return onemSirasi[b.onem_seviyesi] - onemSirasi[a.onem_seviyesi];
        });
        
        res.json({
            analizler: analizler, // "öneriler" yerine "analizler"
            toplam_analiz: analizler.length,
            tarih: new Date().toISOString(),
            not: 'Bu analizler karar alternatifleri sunar. Nihai karar yöneticiye aittir.'
        });
    } catch (error) {
        console.error('Analiz motoru hatası:', error);
        res.status(500).json({ 
            error: 'Analiz motoru çalışırken hata oluştu',
            analizler: []
        });
    }
};

/**
 * Girdileri veritabanından toplar
 */
async function toplaGirdiler() {
    return new Promise((resolve, reject) => {
        // Mevcut ay verileri
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
            if (err) {
                // Fallback veri
                return resolve({
                    aylik_doluluk: 68,
                    ortalama_oda_fiyati: 3500,
                    rakip_ortalama_fiyat: 3200,
                    personel_maliyeti_gelir_orani: 0.48,
                    iptal_orani: 0.12
                });
            }
            
            const buAyVeri = results.find(r => r.ay === buAy) || {};
            const gecenAyVeri = results.find(r => r.ay === gecenAy) || {};
            
            // Toplam oda sayısı (varsayılan 100)
            const toplamOda = 100;
            const toplamGun = 30;
            const toplamOdaGun = toplamOda * toplamGun;
            const doluOdaGun = buAyVeri.rezervasyon_sayisi || 0;
            const aylik_doluluk = toplamOdaGun > 0 ? (doluOdaGun / toplamOdaGun) * 100 : 0;
            
            // Personel maliyeti (toplam gelirin %40-50 arası simüle)
            const personel_maliyeti_gelir_orani = 0.45 + (Math.random() * 0.1 - 0.05);
                        
                        // İptal oranı
            const toplam_rez = buAyVeri.toplam_rezervasyon || 1;
            const iptal_sayisi = buAyVeri.iptal_sayisi || 0;
            const iptal_orani = iptal_sayisi / toplam_rez;
            
            // Rakip fiyat (ortalama fiyatın %85-95'i arası)
            const ortalama_oda_fiyati = parseFloat(buAyVeri.ortalama_fiyat) || 3500;
            const rakip_ortalama_fiyat = ortalama_oda_fiyati * (0.85 + Math.random() * 0.1);
            
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
 * Kuralları değerlendirir ve karar alternatifleri ile analizler üretir
 * DSS Prensibi: Net karar vermez, sadece alternatifler ve olası etkileri sunar
 */
function degerlendirKurallar(girdiler) {
    const analizler = [];
    
    // ANALİZ 1: Doluluk ve fiyat rekabet analizi
    // Alternatifler: Fiyat indirimi, fiyat sabit tutma, farklılaştırma stratejisi
    if (girdiler.aylik_doluluk < 70 && girdiler.ortalama_oda_fiyati > girdiler.rakip_ortalama_fiyat) {
        const fiyatFarki = ((girdiler.ortalama_oda_fiyati - girdiler.rakip_ortalama_fiyat) / girdiler.rakip_ortalama_fiyat) * 100;
        const onemSeviyesi = girdiler.aylik_doluluk < 60 ? 'yüksek' : (girdiler.aylik_doluluk < 65 ? 'orta' : 'düşük');
        
        // Olası alternatifler ve etkileri
        const alternatifFiyatIndirimi = Math.min(15, fiyatFarki);
        const alternatifFiyat = Math.round(girdiler.ortalama_oda_fiyati * (1 - alternatifFiyatIndirimi / 100));
        const olasıDolulukArtisi = Math.min(15, (70 - girdiler.aylik_doluluk) * 0.5);
        
        analizler.push({
            analiz_metni: `Doluluk oranı %${girdiler.aylik_doluluk.toFixed(1)} seviyesinde ve rakip fiyatların %${fiyatFarki.toFixed(1)} üzerindesiniz. Bu durumda değerlendirilebilecek alternatifler: (1) Fiyat indirimi (%${alternatifFiyatIndirimi.toFixed(1)}): Olası doluluk artışı %${olasıDolulukArtisi.toFixed(1)} civarında olabilir, ancak gelir marjı düşebilir. (2) Fiyat sabit tutma: Mevcut durum korunur, rekabet avantajı kaybedilebilir. (3) Farklılaştırma: Hizmet kalitesi artırılarak fiyat farkı gerekçelendirilebilir.`,
            analiz_tipi: 'fiyat',
            onem_seviyesi: onemSeviyesi,
            alternatifler: [
                {
                    alternatif: 'Fiyat İndirimi',
                    olası_etkiler: {
                        doluluk_artisi: `%${olasıDolulukArtisi.toFixed(1)} civarı`,
                        gelir_etkisi: 'Gelir marjı düşebilir, toplam gelir artabilir veya azalabilir',
                        risk: 'Fiyat savaşına yol açabilir'
                    },
                    belirsizlik_seviyesi: 'orta'
                },
                {
                    alternatif: 'Fiyat Sabit Tutma',
                    olası_etkiler: {
                        doluluk_etkisi: 'Mevcut trend devam edebilir',
                        rekabet_etkisi: 'Rekabet avantajı kaybedilebilir',
                        risk: 'Düşük'
                    },
                    belirsizlik_seviyesi: 'düşük'
                },
                {
                    alternatif: 'Farklılaştırma Stratejisi',
                    olası_etkiler: {
                        fiyat_etkisi: 'Fiyat farkı gerekçelendirilebilir',
                        doluluk_etkisi: 'Hizmet kalitesine bağlı',
                        risk: 'Yatırım gerektirir'
                    },
                    belirsizlik_seviyesi: 'yüksek'
                }
            ],
            analiz_detay: {
                mevcut_fiyat: girdiler.ortalama_oda_fiyati,
                alternatif_fiyat_araligi: {
                    min: alternatifFiyat,
                    max: girdiler.ortalama_oda_fiyati
                },
                olası_doluluk_araligi: {
                    min: girdiler.aylik_doluluk,
                    max: Math.min(95, girdiler.aylik_doluluk + olasıDolulukArtisi)
                }
            }
        });
    }
    
    // ANALİZ 2: Personel maliyeti analizi
    // Alternatifler: Vardiya optimizasyonu, personel verimliliği, personel azaltma
    if (girdiler.personel_maliyeti_gelir_orani > 0.45) {
        const asimOrani = ((girdiler.personel_maliyeti_gelir_orani - 0.45) / 0.45) * 100;
        const onemSeviyesi = girdiler.personel_maliyeti_gelir_orani > 0.50 ? 'yüksek' : 'orta';
        
        const tasarrufPotansiyeli = Math.round(asimOrani * 10000);
        
        analizler.push({
            analiz_metni: `Personel maliyeti toplam gelirin %${(girdiler.personel_maliyeti_gelir_orani * 100).toFixed(1)}'ini oluşturuyor. Hedef oran (%45) %${asimOrani.toFixed(1)} aşılmış durumda. Bu durumda değerlendirilebilecek alternatifler: (1) Vardiya optimizasyonu: Personel sayısı azaltılmadan maliyet düşürülebilir, ancak hizmet kalitesi etkilenebilir. (2) Personel verimliliği artırma: Eğitim ve teknoloji yatırımı gerekir, uzun vadeli etki. (3) Personel azaltma: Hızlı maliyet düşüşü, ancak hizmet kapasitesi azalabilir.`,
            analiz_tipi: 'personel',
            onem_seviyesi: onemSeviyesi,
            alternatifler: [
                {
                    alternatif: 'Vardiya Optimizasyonu',
                    olası_etkiler: {
                        maliyet_etkisi: `%${(asimOrani * 0.5).toFixed(1)} civarı tasarruf potansiyeli`,
                        hizmet_etkisi: 'Hizmet kalitesi etkilenebilir',
                        risk: 'Orta - Personel memnuniyeti düşebilir'
                    },
                    belirsizlik_seviyesi: 'orta'
                },
                {
                    alternatif: 'Personel Verimliliği Artırma',
                    olası_etkiler: {
                        maliyet_etkisi: 'Uzun vadede %10-15 tasarruf',
                        hizmet_etkisi: 'Hizmet kalitesi artabilir',
                        risk: 'Düşük - Yatırım gerektirir'
                    },
                    belirsizlik_seviyesi: 'yüksek'
                },
                {
                    alternatif: 'Personel Azaltma',
                    olası_etkiler: {
                        maliyet_etkisi: `%${asimOrani.toFixed(1)} civarı tasarruf`,
                        hizmet_etkisi: 'Hizmet kapasitesi azalabilir',
                        risk: 'Yüksek - Müşteri memnuniyeti etkilenebilir'
                    },
                    belirsizlik_seviyesi: 'orta'
                }
            ],
            analiz_detay: {
                mevcut_oran: (girdiler.personel_maliyeti_gelir_orani * 100).toFixed(1) + '%',
                hedef_oran: '45%',
                tasarruf_potansiyeli_araligi: {
                    min: Math.round(tasarrufPotansiyeli * 0.5),
                    max: tasarrufPotansiyeli
                }
            }
        });
    }
    
    // ANALİZ 3: İptal oranı analizi
    // Alternatifler: Esnek iptal politikası, erken rezervasyon kampanyası, iptal ücreti
    if (girdiler.iptal_orani > 0.10) {
        const iptalFarki = (girdiler.iptal_orani - 0.10) * 100;
        const onemSeviyesi = girdiler.iptal_orani > 0.15 ? 'yüksek' : (girdiler.iptal_orani > 0.12 ? 'orta' : 'düşük');
        
        analizler.push({
            analiz_metni: `İptal oranı %${(girdiler.iptal_orani * 100).toFixed(1)} seviyesinde. Hedef oran (%10) %${iptalFarki.toFixed(1)} aşılmış. Bu durumda değerlendirilebilecek alternatifler: (1) Esnek iptal politikası: Müşteri memnuniyeti artabilir, ancak gelir belirsizliği artabilir. (2) Erken rezervasyon kampanyası: İptal oranı düşebilir, ancak fiyat indirimi gerekebilir. (3) İptal ücreti: İptal oranı düşebilir, ancak müşteri memnuniyeti etkilenebilir.`,
            analiz_tipi: 'pazarlama',
            onem_seviyesi: onemSeviyesi,
            alternatifler: [
                {
                    alternatif: 'Esnek İptal Politikası',
                    olası_etkiler: {
                        iptal_etkisi: 'İptal oranı %2-5 artabilir veya azalabilir',
                        müşteri_etkisi: 'Müşteri memnuniyeti artabilir',
                        gelir_etkisi: 'Gelir belirsizliği artabilir',
                        risk: 'Orta'
                    },
                    belirsizlik_seviyesi: 'yüksek'
                },
                {
                    alternatif: 'Erken Rezervasyon Kampanyası',
                    olası_etkiler: {
                        iptal_etkisi: 'İptal oranı %3-8 düşebilir',
                        gelir_etkisi: 'Fiyat indirimi nedeniyle gelir etkilenebilir',
                        risk: 'Düşük'
                    },
                    belirsizlik_seviyesi: 'orta'
                },
                {
                    alternatif: 'İptal Ücreti Uygulama',
                    olası_etkiler: {
                        iptal_etkisi: 'İptal oranı %5-10 düşebilir',
                        müşteri_etkisi: 'Müşteri memnuniyeti etkilenebilir',
                        risk: 'Yüksek'
                    },
                    belirsizlik_seviyesi: 'orta'
                }
            ],
            analiz_detay: {
                mevcut_iptal_orani: (girdiler.iptal_orani * 100).toFixed(1) + '%',
                hedef_iptal_orani: '10%',
                olası_iptal_orani_araligi: {
                    min: Math.max(5, (girdiler.iptal_orani - 0.08) * 100),
                    max: (girdiler.iptal_orani + 0.05) * 100
                }
            }
        });
    }
    
    // ANALİZ 4: Rekabet analizi - UYARI (karar değil)
    const fiyatFarkiYuzde = ((girdiler.ortalama_oda_fiyati - girdiler.rakip_ortalama_fiyat) / girdiler.rakip_ortalama_fiyat) * 100;
    if (fiyatFarkiYuzde > 15) {
        const onemSeviyesi = fiyatFarkiYuzde > 25 ? 'yüksek' : (fiyatFarkiYuzde > 20 ? 'orta' : 'düşük');
        
        analizler.push({
            analiz_metni: `Rakip oteller ortalama %${fiyatFarkiYuzde.toFixed(1)} daha düşük fiyat uyguluyor. Bu durum rekabet pozisyonunuzu etkileyebilir. Fiyat stratejisi değerlendirilebilir, ancak nihai karar yöneticiye aittir.`,
            analiz_tipi: 'risk',
            onem_seviyesi: onemSeviyesi,
            uyari_tipi: 'rekabet_baskisi', // Karar değil, uyarı
            alternatifler: [
                {
                    alternatif: 'Fiyat Uyarlama',
                    olası_etkiler: {
                        rekabet_etkisi: 'Rekabet pozisyonu iyileşebilir',
                        gelir_etkisi: 'Gelir marjı düşebilir',
                        risk: 'Fiyat savaşına yol açabilir'
                    },
                    belirsizlik_seviyesi: 'yüksek'
                },
                {
                    alternatif: 'Fiyat Sabit Tutma',
                    olası_etkisi: {
                        rekabet_etkisi: 'Rekabet avantajı kaybedilebilir',
                        gelir_etkisi: 'Mevcut gelir korunabilir',
                        risk: 'Pazar payı kaybı riski'
                    },
                    belirsizlik_seviyesi: 'orta'
                }
            ],
            analiz_detay: {
                bizim_fiyat: girdiler.ortalama_oda_fiyati,
                rakip_fiyat: girdiler.rakip_ortalama_fiyat,
                fiyat_farki: fiyatFarkiYuzde.toFixed(1) + '%',
                not: 'Bu bir uyarıdır, net karar değildir. Yönetici değerlendirmesi gereklidir.'
            }
        });
    }
    
    // Eğer hiç analiz yoksa genel durum bilgisi
    if (analizler.length === 0) {
        analizler.push({
            analiz_metni: 'Mevcut performans göstergeleri hedef aralıklarda görünmektedir. Sistem sağlıklı çalışıyor. Mevcut stratejiler değerlendirilebilir.',
            analiz_tipi: 'genel',
            onem_seviyesi: 'düşük',
            alternatifler: [
                {
                    alternatif: 'Mevcut Stratejileri Sürdürme',
                    olası_etkiler: {
                        durum: 'Mevcut trend devam edebilir',
                        risk: 'Düşük'
                    },
                    belirsizlik_seviyesi: 'düşük'
                }
            ],
            analiz_detay: {
                durum: 'Normal',
                not: 'Sürekli izleme önerilir'
            }
        });
    }
    
    return analizler;
}
