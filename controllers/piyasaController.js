const db = require('../config/db');
const axios = require('axios');

exports.getDoviz = async (req, res) => { res.json([{ kod: 'USD', isim: 'ABD Doları', alis: '34.50', satis: '34.60', fark: '0.10' }]); };
exports.getDovizGecmis = (req, res) => { res.json([]); };
// Rakip analizi endpoint'i - SerpAPI ile rating dahil
exports.getRakipAnalizi = async (req, res) => {
    try {
        const SERPAPI_KEY = process.env.SERPAPI_KEY || "e405919429b8e2a20a810ab8f069fe0bca60b4bd3d1fed29e6266d147296ef25";
        const yarin = new Date(); 
        yarin.setDate(yarin.getDate() + 1);
        const cikis = new Date(); 
        cikis.setDate(cikis.getDate() + 2);
        const tarihFormat = (d) => d.toISOString().split('T')[0];

        // Bizim otel fiyatlarını veritabanından al
        let bizimFiyatlar = { 'Standart': 3000, 'Deluxe': 4500, 'Suit': 7500, 'Kral Dairesi': 25000 };
        db.query("SELECT oda_tipi, AVG(fiyat) as ortalama FROM fiyat_gecmisi GROUP BY oda_tipi", (err, results) => {
            if (!err && results && results.length > 0) {
                results.forEach(row => {
                    if (bizimFiyatlar[row.oda_tipi]) {
                        bizimFiyatlar[row.oda_tipi] = Math.round(row.ortalama);
                    }
                });
            }

            // SerpAPI üzerinden Google Hotels API'den veri çek - İzmir'deki oteller
            console.log('\n🌐 ========== GOOGLE HOTELS API İSTEĞİ ==========');
            console.log('📡 API: SerpAPI (Google Hotels engine)');
            console.log('🔍 Arama: Hotels in Izmir');
            const yarin = new Date();
            yarin.setDate(yarin.getDate() + 1);
            const cikis = new Date();
            cikis.setDate(cikis.getDate() + 2);
            console.log('📅 Check-in:', tarihFormat(yarin));
            console.log('📅 Check-out:', tarihFormat(cikis));
            console.log('👥 Yetişkin: 2');
            console.log('💱 Para birimi: TRY (Türk Lirası)');
            console.log('🌍 Dil: Türkçe (tr)');
            console.log('==========================================\n');
            
            axios.get('https://serpapi.com/search.json', {
                params: {
                    engine: "google_hotels", 
                    q: "Hotels in Izmir", 
                    check_in_date: tarihFormat(yarin), 
                    check_out_date: tarihFormat(cikis),
                    adults: "2", 
                    currency: "TRY", 
                    hl: "tr", 
                    gl: "tr", 
                    api_key: SERPAPI_KEY
                },
                timeout: 10000 // 10 saniye timeout
            }).then(response => {
                console.log('\n🔍 ========== GOOGLE HOTELS API YANIT KONTROLÜ ==========');
                console.log('📡 API Kaynağı: SerpAPI (Google Hotels engine)');
                console.log('🌐 Google Hotels API üzerinden veri çekiliyor');
                console.log('SerpAPI Response Status:', response.status);
                console.log('Response Data var mı?', !!response.data);
                console.log('Properties array var mı?', !!response.data?.properties);
                console.log('Properties sayısı:', response.data?.properties?.length || 0);
                
                // Google Hotels API'den gelen ham yanıtı göster
                if (response.data) {
                    console.log('\n📦 GOOGLE HOTELS API HAM YANITI (ilk 200 karakter):');
                    const responseStr = JSON.stringify(response.data).substring(0, 500);
                    console.log(responseStr + '...');
                }
                
                // İlk otelin ham verisini göster (Google'dan gelen tam veri)
                if (response.data?.properties && response.data.properties.length > 0) {
                    console.log('\n📦 İLK OTEL HAM VERİSİ (Google Hotels API\'den):');
                    console.log(JSON.stringify(response.data.properties[0], null, 2));
                    console.log('\n');
                }
                
                if (response.data && response.data.properties && response.data.properties.length > 0) {
                    console.log('✅ GERÇEK VERİ: Google Hotels API\'den', response.data.properties.length, 'otel verisi çekildi');
                    console.log('📡 Kaynak: SerpAPI (Google Hotels engine) - Bu Google\'ın gerçek fiyat verileridir');
                    console.log('==========================================\n');
                    const rakipler = response.data.properties.slice(0, 12).map(otel => {
                        // Fiyat ayrıştırma - Google Hotels API'den gelen fiyatları işle
                        let fiyat = 0;
                        let hamFiyat = null;
                        let fiyatKaynagi = 'Bilinmiyor';
                        
                        // Google Hotels API'den gelen tüm fiyat bilgilerini topla
                        if (otel.rate_per_night) {
                            hamFiyat = otel.rate_per_night.lowest;
                            fiyatKaynagi = 'rate_per_night.lowest (Google Hotels)';
                            
                            if (typeof otel.rate_per_night.lowest === 'string') {
                                fiyat = parseFloat(otel.rate_per_night.lowest.replace(/[^0-9,.]/g, '').replace(',', '.')) || 0;
                            } else if (typeof otel.rate_per_night.lowest === 'number') {
                                fiyat = otel.rate_per_night.lowest;
                            }
                        }
                        
                        // Alternatif fiyat alanlarını kontrol et
                        if (!fiyat && otel.price) {
                            hamFiyat = otel.price;
                            fiyatKaynagi = 'price (Google Hotels)';
                            if (typeof otel.price === 'string') {
                                fiyat = parseFloat(otel.price.replace(/[^0-9,.]/g, '').replace(',', '.')) || 0;
                            } else if (typeof otel.price === 'number') {
                                fiyat = otel.price;
                            }
                        }
                        
                        // Google'dan çekilen fiyatı terminalde yazdır - Google karşılaştırması için
                        console.log(`\n🏨 Otel: ${otel.name || 'Bilinmeyen'}`);
                        console.log(`   🔗 Google Hotels Link: ${otel.link || 'Yok'}`);
                        console.log(`   📍 Adres: ${otel.address || 'Yok'}`);
                        console.log(`   ⭐ Google Rating: ${otel.overall_rating || otel.rating || 'Yok'}`);
                        console.log(`   💰 Google'dan çekilen HAM fiyat: ${hamFiyat || 'Yok'} (Kaynak: ${fiyatKaynagi})`);
                        console.log(`   💵 İşlenmiş fiyat (parseFloat sonrası): ${fiyat}`);
                        console.log(`   🔄 Fiyat tipi: ${typeof hamFiyat}`);
                        
                        // Google Hotels API'den gelen tüm fiyat objesini göster
                        if (otel.rate_per_night) {
                            console.log(`   📦 rate_per_night objesi (Google'dan):`, JSON.stringify(otel.rate_per_night, null, 2));
                            if (otel.rate_per_night.currency) {
                                console.log(`   💱 Para birimi: ${otel.rate_per_night.currency}`);
                            }
                            if (otel.rate_per_night.highest) {
                                console.log(`   📊 En yüksek fiyat (highest): ${otel.rate_per_night.highest}`);
                            }
                        }
                        
                        // Eğer fiyat 0 ise uyarı ver
                        if (fiyat === 0) {
                            console.warn(`   ⚠️  UYARI: Bu otel için Google'da fiyat bulunamadı! Google Hotels'te fiyat gösterilmiyor olabilir.`);
                        } else {
                            console.log(`   ✅ Google'dan fiyat başarıyla çekildi: ${fiyat} TL (yuvarlanmadan)`);
                        }
                        
                        // Fiyatı yuvarlama - Google'dan çekilen fiyatı olduğu gibi kullan (4.081 TL gibi)
                        // fiyat = Math.round(fiyat); // KALDIRILDI - Fiyatlar yuvarlanmadan gösterilecek
                        
                        // Rating bilgisi
                        const rating = parseFloat(otel.overall_rating) || parseFloat(otel.rating) || 0;
                        const reviewCount = parseInt(otel.reviews || otel.review_count || 0) || 0;
                        
                        // Bizim otel tespiti
                        const otelAdiLower = otel.name.toLowerCase();
                        const bizimOtel = otelAdiLower.includes('grand') || 
                                         otelAdiLower.includes('bizim') ||
                                         otelAdiLower.includes('hotel kds') ||
                                         otelAdiLower.includes('kds otel');
                        
                        // Tüm oda tipleri için fiyat karşılaştırması
                        // NOT: Google Hotels API'den sadece standart oda fiyatı geliyor
                        // Diğer oda tipleri için Google'dan çekilen standart fiyatı baz alarak scale ediyoruz
                        const fiyatKarsilastirmalari = {};
                        Object.keys(bizimFiyatlar).forEach(odaTipi => {
                            const bizimFiyat = bizimFiyatlar[odaTipi];
                            // Google Hotels API'den gelen standart fiyatı baz al
                            // Google'dan sadece standart oda fiyatı geldiği için, diğer oda tipleri için tahmin yapıyoruz
                            let rakipFiyat = fiyat; // Google'dan çekilen standart fiyat
                            
                            // Standart oda dışındaki oda tipleri için Google'dan çekilen fiyatı scale et
                            // (Google Hotels API genellikle sadece standart oda fiyatını döndürür)
                            if (odaTipi === 'Deluxe' && fiyat > 0) rakipFiyat = fiyat * 1.5;
                            else if (odaTipi === 'Suit' && fiyat > 0) rakipFiyat = fiyat * 2.5;
                            else if (odaTipi === 'Kral Dairesi' && fiyat > 0) rakipFiyat = fiyat * 5;
                            // Standart oda için Google'dan çekilen fiyatı direkt kullan
                            
                            // Rakip fiyatı ve bizim fiyatı sayısal değerlere çevir (değiştirmeden)
                            const rakipFiyatNum = fiyat > 0 ? parseFloat(rakipFiyat) : null;
                            const bizimFiyatNum = parseFloat(bizimFiyat);
                            
                            // Fark hesaplama: Rakip fiyat - Bizim fiyat (değiştirmeden, olduğu gibi)
                            // Pozitif fark = Rakip daha pahalı
                            // Negatif fark = Rakip daha ucuz
                            const fark = rakipFiyatNum !== null && bizimFiyatNum !== null 
                                ? (rakipFiyatNum - bizimFiyatNum) 
                                : null;
                            
                            // Fark yüzdesi: (Fark / Bizim Fiyat) * 100
                            // Pozitif yüzde = Rakip bizimkinden %X daha pahalı
                            // Negatif yüzde = Rakip bizimkinden %X daha ucuz
                            const farkYuzde = fark !== null && bizimFiyatNum > 0 
                                ? parseFloat(((fark / bizimFiyatNum) * 100).toFixed(1))
                                : null;
                            
                            fiyatKarsilastirmalari[odaTipi] = {
                                bizim_fiyat: bizimFiyatNum, // Değiştirmeden, olduğu gibi
                                rakip_fiyat: rakipFiyatNum, // Değiştirmeden, olduğu gibi (Google'dan gelen)
                                fark: fark !== null ? parseFloat(fark.toFixed(2)) : null, // Rakip fiyat - Bizim fiyat (2 ondalık basamak)
                                fark_yuzde: farkYuzde, // (Fark / Bizim Fiyat) * 100
                                rekabet_durumu: fiyat > 0 && farkYuzde !== null
                                    ? (farkYuzde > 20 ? 'pahali' : (farkYuzde < -10 ? 'ucuz' : 'benzer'))
                                    : 'bilinmiyor',
                                google_fiyat_kaynak: odaTipi === 'Standart' ? 'Google Hotels API (direkt)' : 'Google Hotels API (tahmin)'
                            };
                        });
                        
                        // Standart oda için ana karşılaştırma
                        const bizimFiyat = bizimFiyatlar['Standart'] || 3000;
                        const fiyatFarki = fiyat - bizimFiyat;
                        const fiyatFarkiYuzde = bizimFiyat > 0 ? ((fiyatFarki / bizimFiyat) * 100).toFixed(1) : 0;
                        
                        const otelVerisi = {
                            otel_adi: otel.name,
                            fiyat: fiyat, // Google'dan çekilen fiyat (yuvarlanmadan - 4.081 TL gibi)
                            rating: rating,
                            review_count: reviewCount,
                            bizim_otel: bizimOtel,
                            bizim_fiyat: bizimFiyat,
                            fiyat_farki: fiyatFarki, // Yuvarlanmadan
                            fiyat_farki_yuzde: parseFloat(fiyatFarkiYuzde),
                            fiyat_karsilastirmalari: fiyatKarsilastirmalari, // Tüm oda tipleri için
                            link: otel.link || null,
                            thumbnail: otel.thumbnail || null,
                            address: otel.address || null,
                            stars: otel.stars || null
                        };
                        
                        // İşlenmiş otel verisini terminalde yazdır
                        console.log(`   ✅ Final fiyat: ${otelVerisi.fiyat} TL`);
                        console.log(`   ⭐ Rating: ${otelVerisi.rating}`);
                        console.log(`   📊 Fiyat karşılaştırmaları:`, otelVerisi.fiyat_karsilastirmalari);
                        console.log('   ---');
                        
                        return otelVerisi;
                    });

                    // En ucuz ve en pahalı otelleri işaretle
                    const fiyatlar = rakipler.map(r => r.fiyat).filter(f => f > 0);
                    const minFiyat = fiyatlar.length > 0 ? Math.min(...fiyatlar) : 0;
                    const maxFiyat = fiyatlar.length > 0 ? Math.max(...fiyatlar) : 0;
                    
                    // Ortalama fiyat hesapla
                    const ortalamaFiyat = fiyatlar.length > 0 
                        ? fiyatlar.reduce((sum, f) => sum + f, 0) / fiyatlar.length 
                        : 0;
                    
                    const rakiplerIsaretli = rakipler.map(r => ({
                        ...r,
                        en_ucuz: r.fiyat === minFiyat && !r.bizim_otel && fiyatlar.length > 0,
                        en_pahali: r.fiyat === maxFiyat && !r.bizim_otel && fiyatlar.length > 0,
                        pazar_pozisyonu: r.fiyat < ortalamaFiyat * 0.9 ? 'ucuz' : 
                                        (r.fiyat > ortalamaFiyat * 1.1 ? 'pahali' : 'orta')
                    }));

                    // Özet istatistikler
                    const bizimStandartFiyat = bizimFiyatlar['Standart'] || 3000;
                    const bizimPazarPozisyonu = bizimStandartFiyat < ortalamaFiyat * 0.9 ? 'ucuz' : 
                                                (bizimStandartFiyat > ortalamaFiyat * 1.1 ? 'pahali' : 'orta');

                    // Tüm çekilen otel fiyatlarını özet olarak terminalde yazdır
                    console.log('\n📋 ========== RAKİP OTEL FİYAT ÖZETİ ==========');
                    console.log(`Toplam ${rakiplerIsaretli.length} otel fiyatı çekildi:`);
                    rakiplerIsaretli.forEach((otel, index) => {
                        console.log(`${index + 1}. ${otel.otel_adi}: ${otel.fiyat} TL (Rating: ${otel.rating})`);
                    });
                    console.log(`Ortalama Fiyat: ${Math.round(ortalamaFiyat)} TL`);
                    console.log(`Min Fiyat: ${minFiyat} TL`);
                    console.log(`Max Fiyat: ${maxFiyat} TL`);
                    console.log(`Bizim Standart Fiyat: ${bizimStandartFiyat} TL`);
                    console.log(`Pazar Pozisyonu: ${bizimPazarPozisyonu}`);
                    console.log('==========================================\n');

                    res.json({
                        properties: rakiplerIsaretli,
                        bizim_fiyatlar: bizimFiyatlar,
                        pazar_analizi: {
                            ortalama_fiyat: ortalamaFiyat, // Yuvarlanmadan
                            min_fiyat: minFiyat, // Yuvarlanmadan
                            max_fiyat: maxFiyat, // Yuvarlanmadan
                            bizim_pazar_pozisyonu: bizimPazarPozisyonu,
                            bizim_fiyat_farki_yuzde: ortalamaFiyat > 0 
                                ? parseFloat((((bizimStandartFiyat - ortalamaFiyat) / ortalamaFiyat) * 100).toFixed(1))
                                : 0,
                            toplam_otel_sayisi: rakiplerIsaretli.length
                        },
                        tarih: {
                            check_in: tarihFormat(yarin),
                            check_out: tarihFormat(cikis)
                        }
                    });
                } else {
                    console.warn('\n⚠️  UYARI: SerpAPI\'den veri alınamadı veya properties boş!');
                    console.warn('📝 Şu anda FALLBACK (ÖRNEK) veri kullanılıyor - Bu gerçek veri değil!');
                    console.warn('🔧 Kontrol edilmesi gerekenler:');
                    console.warn('   1. SerpAPI key geçerli mi?');
                    console.warn('   2. API limiti aşıldı mı?');
                    console.warn('   3. İnternet bağlantısı var mı?');
                    console.warn('   4. SerpAPI servisi çalışıyor mu?');
                    console.warn('==========================================\n');
                    // Fallback veri
                    res.json({
                        properties: [
                            {
                                otel_adi: 'Bizim Otel',
                                fiyat: bizimFiyatlar['Standart'],
                                rating: 4.5,
                                review_count: 1250,
                                bizim_otel: true,
                                bizim_fiyat: bizimFiyatlar['Standart'],
                                fiyat_farki: 0,
                                fiyat_farki_yuzde: 0,
                                en_ucuz: false,
                                en_pahali: false
                            },
                            {
                                otel_adi: 'Swissôtel Büyük Efes',
                                fiyat: Math.round(bizimFiyatlar['Standart'] * 1.8),
                                rating: 4.7,
                                review_count: 3200,
                                bizim_otel: false,
                                bizim_fiyat: bizimFiyatlar['Standart'],
                                fiyat_farki: Math.round(bizimFiyatlar['Standart'] * 0.8),
                                fiyat_farki_yuzde: 80,
                                en_ucuz: false,
                                en_pahali: true
                            },
                            {
                                otel_adi: 'Mövenpick Hotel',
                                fiyat: Math.round(bizimFiyatlar['Standart'] * 1.5),
                                rating: 4.6,
                                review_count: 2100,
                                bizim_otel: false,
                                bizim_fiyat: bizimFiyatlar['Standart'],
                                fiyat_farki: Math.round(bizimFiyatlar['Standart'] * 0.5),
                                fiyat_farki_yuzde: 50,
                                en_ucuz: false,
                                en_pahali: false
                            },
                            {
                                otel_adi: 'İbis Alsancak',
                                fiyat: Math.round(bizimFiyatlar['Standart'] * 0.9),
                                rating: 4.2,
                                review_count: 850,
                                bizim_otel: false,
                                bizim_fiyat: bizimFiyatlar['Standart'],
                                fiyat_farki: Math.round(bizimFiyatlar['Standart'] * -0.1),
                                fiyat_farki_yuzde: -10,
                                en_ucuz: true,
                                en_pahali: false
                            }
                        ],
                        bizim_fiyatlar: bizimFiyatlar
                    });
                }
            }).catch(error => {
                console.error('\n❌ ========== SERPAPI HATA ==========');
                console.error("SerpAPI Hatası:", error.message);
                console.error("HTTP Status:", error.response?.status);
                console.error("Error Data:", error.response?.data);
                console.error('📝 FALLBACK (ÖRNEK) veri kullanılıyor - Bu gerçek veri değil!');
                console.error('==========================================\n');
                // Fallback veri döndür
                res.json({
                    properties: [
                        {
                            otel_adi: 'Bizim Otel',
                            fiyat: bizimFiyatlar['Standart'],
                            rating: 4.5,
                            review_count: 1250,
                            bizim_otel: true,
                            bizim_fiyat: bizimFiyatlar['Standart'],
                            fiyat_farki: 0,
                            fiyat_farki_yuzde: 0,
                            en_ucuz: false,
                            en_pahali: false
                        }
                    ],
                    bizim_fiyatlar: bizimFiyatlar,
                    error: 'SerpAPI bağlantı hatası, örnek veri gösteriliyor'
                });
            });
        });
    } catch (error) {
        console.error('Rakip analizi hatası:', error);
        res.status(500).json({ error: 'Rakip analizi yapılamadı', properties: [] });
    }
};
exports.getTahmin = (req, res) => { res.json([]); };

exports.simulasyonYap = (req, res) => {
    const { fiyatDegisimi, kampanyaTuru, personelSayisi, pazarlamaButcesi } = req.body;
    const degisim = parseFloat(fiyatDegisimi) || 0;
    const personelSayisiInt = parseInt(personelSayisi) || 0;
    const pazarlamaButcesiNum = parseFloat(pazarlamaButcesi) || 0;
    
    // Veritabanından veri çek, çekemezsen varsayılan kullan
    db.query(`SELECT SUM(fiyat*konaklama_suresi) as mevcut_ciro, SUM(konaklama_suresi) as toplam_gece FROM rezervasyonlar WHERE iptal_durumu=0`, (err, sonuc) => {
        let mevcutCiro = 500000;
        let ortalamaFiyat = 3500;
        
        if (!err && sonuc && sonuc[0] && sonuc[0].mevcut_ciro) {
            mevcutCiro = parseFloat(sonuc[0].mevcut_ciro);
            const toplamGece = parseFloat(sonuc[0].toplam_gece) || 1;
            ortalamaFiyat = mevcutCiro / toplamGece;
        }

        // Mevcut personel sayısını veritabanından al (varsayılan: 20)
        let mevcutPersonelSayisi = 20;
        db.query(`SELECT COUNT(*) as toplam FROM personeller`, (errPersonel, sonucPersonel) => {
            if (!errPersonel && sonucPersonel && sonucPersonel[0]) {
                mevcutPersonelSayisi = parseInt(sonucPersonel[0].toplam) || 20;
            }
            
            // Personel maliyeti hesaplama
            const ortalamaMaaş = 15000; // TL/ay (ortalama personel maliyeti)
            const personelFark = personelSayisiInt - mevcutPersonelSayisi;
            const aylikPersonelMaliyetFark = personelFark * ortalamaMaaş;
            const yillikPersonelMaliyetFark = aylikPersonelMaliyetFark * 12; // Yıllık maliyet farkı
            
            // Personel sayısının doluluk ve hizmet kalitesine etkisi
            // Daha fazla personel = daha iyi hizmet = potansiyel doluluk artışı
            // Ancak maliyet de artar
            const personelEtkiCarpan = personelFark > 0 
                ? 1 + (personelFark * 0.01) // Her ek personel %1 doluluk artışı potansiyeli
                : 1 + (personelFark * 0.005); // Personel azaltma daha az etki

        const kMaliyet = (kampanyaTuru==='sosyal'?20000:(kampanyaTuru==='google'?35000:(kampanyaTuru==='influencer'?60000:(kampanyaTuru==='tv'?120000:0))));
            const toplamEkMaliyet = kMaliyet + pazarlamaButcesiNum + (yillikPersonelMaliyetFark / 12); // Aylık personel maliyet farkı
        const mevcutKar = mevcutCiro * 0.4; // Tahmini kar marjı

            // Senaryo Hesaplamaları (personel etkisi dahil)
            const etkiRealist = (1 + (degisim * -0.8 / 100)) * personelEtkiCarpan;
        const ciroRealist = mevcutCiro * (1 + degisim/100) * etkiRealist;
            const karRealist = (ciroRealist * 0.4) - toplamEkMaliyet;

        const ciroIyimser = ciroRealist * 1.15;
            const karIyimser = (ciroIyimser * 0.45) - toplamEkMaliyet;

        const ciroKotumser = ciroRealist * 0.85;
            const karKotumser = (ciroKotumser * 0.30) - toplamEkMaliyet;

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
                                personel_analizi: {
                                    mevcut: mevcutPersonelSayisi,
                                    yeni: personelSayisiInt,
                                    fark: personelFark,
                                    aylikMaliyetFark: aylikPersonelMaliyetFark,
                                    yillikMaliyetFark: yillikPersonelMaliyetFark,
                                    etkiCarpan: personelEtkiCarpan,
                                    aciklama: personelFark > 0 
                                        ? `Personel sayısı ${personelFark} artırılıyor. Aylık maliyet artışı: ${aylikPersonelMaliyetFark.toLocaleString('tr-TR')} TL. Hizmet kalitesi ve doluluk potansiyeli artabilir.`
                                        : personelFark < 0
                                        ? `Personel sayısı ${Math.abs(personelFark)} azaltılıyor. Aylık maliyet tasarrufu: ${Math.abs(aylikPersonelMaliyetFark).toLocaleString('tr-TR')} TL. Hizmet kalitesi etkilenebilir.`
                                        : 'Personel sayısı değişmiyor.'
                                },
                                gecmis: (!errHist && gecmis) ? gecmis : [],
                                ai_mesaj: karRealist > mevcutKar ? "✅ Başarılı Senaryo" : "⚠️ Riskli Senaryo",
                                senaryoKarsilastirma: senaryoKarsilastirma
                            });
                        });
                    }
                }
            );
        });
        }); // personel query kapanışı
    });
};

// Senaryo listesi endpoint'i
exports.getSenaryolar = (req, res) => {
    try {
        db.query(`SELECT * FROM senaryolar ORDER BY tarih DESC, id DESC LIMIT 5`, (err, sonuc) => {
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
            const SERPAPI_KEY = process.env.SERPAPI_KEY || "e405919429b8e2a20a810ab8f069fe0bca60b4bd3d1fed29e6266d147296ef25";
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