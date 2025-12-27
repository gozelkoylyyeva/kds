const express = require('express');
const router = express.Router();
const otelController = require('../controllers/otelController');
const piyasaController = require('../controllers/piyasaController');
const ikController = require('../controllers/ikController');
const authController = require('../controllers/authController');
const oneriMotoruController = require('../controllers/oneriMotoruController');
const riskAnaliziController = require('../controllers/riskAnaliziController');
const kpiController = require('../controllers/kpiController');
const rolController = require('../controllers/rolController');
const raporController = require('../controllers/raporController');
const tahminController = require('../controllers/tahminController');
const dashboardController = require('../controllers/dashboardController');

// ========================================
// RESTful API - Karar Destek Sistemi (Öncelikli)
// ========================================
// Tüm endpoint'ler karar destek mantığına uygun çıktı üretir.
// Sistem net karar vermez, sadece analiz ve alternatifler sunar.
// Nihai karar yöneticiye aittir.

// 1️⃣ KPI Verileri
router.get('/dashboard/kpis', dashboardController.getKpis);

// 2️⃣ Trend Verileri
router.get('/dashboard/trends', dashboardController.getTrends); // ?months=6|12

// 3️⃣ Tahmin API'ları
router.get('/doluluk-tahmini', dashboardController.getDolulukTahmini); // ?months=6|12
router.get('/gelir-kar-tahmini', dashboardController.getGelirKarTahmini); // ?months=6|12

// 4️⃣ Senaryo Analizi
router.get('/senaryo-analizi', dashboardController.getSenaryoAnalizi); // ?type=optimistic|realistic|pessimistic

// 5️⃣ Risk Analizi
router.get('/risk-analizi', dashboardController.getRiskAnalizi);

// 6️⃣ Yıllık Karşılaştırma
router.get('/dashboard/yillik-karsilastirma', dashboardController.getYillikKarsilastirma);

// Dashboard REST API (alternatif path'ler)
router.get('/dashboard/doluluk-tahmini', dashboardController.getDolulukTahmini); // ?months=6|12
router.get('/dashboard/gelir-kar-tahmini', dashboardController.getGelirKarTahmini); // ?months=6|12
router.get('/dashboard/senaryo-analizi', dashboardController.getSenaryoAnalizi); // ?type=optimistic|realistic|pessimistic
router.get('/dashboard/risk', dashboardController.getRiskAnalizi);

// ========================================
// Diğer API Endpoint'leri
// ========================================

router.get('/ozet', otelController.getOzet);
router.get('/aylik-doluluk', otelController.getAylikDoluluk);
router.get('/mevsimsel-doluluk', otelController.getMevsimselDoluluk);
router.get('/doviz', piyasaController.getDoviz);
router.get('/doviz-gecmis/:kod', piyasaController.getDovizGecmis);
router.get('/rakip-analizi', piyasaController.getRakipAnalizi);
router.post('/simulasyon', piyasaController.simulasyonYap);
router.post('/simule-et', piyasaController.simuleEt);
router.get('/rakip-detay/:tip', piyasaController.rakipDetay);
router.get('/senaryolar', piyasaController.getSenaryolar);
router.get('/tahmin', piyasaController.getTahmin);

// Karar Destek Sistemi API'leri
router.get('/gelir-trend', otelController.getGelirTrend);
router.get('/doluluk-orani', otelController.getDolulukOrani);
router.get('/oda-tipi-performans', otelController.getOdaTipiPerformansi);
router.get('/kar-marji', otelController.getKarMarjiAnalizi);
router.get('/rezervasyon-kaynaklari', otelController.getRezervasyonKaynaklari);
router.get('/fiyat-esneklik', otelController.getFiyatEsneklik);
router.get('/fiyat-trend-oda-tipi', otelController.getFiyatTrendOdaTipi);
// NOT: /api/risk-analizi endpoint'i yukarıda dashboardController'a yönlendirilmiştir
router.get('/tahmin-dogrulugu', otelController.getTahminDogrulugu);

router.post('/personel-simulasyon', ikController.personelSimulasyon);
router.post('/login', authController.login);

// Yeni Karar Destek API'leri
router.get('/oneriler', oneriMotoruController.getOneriler);
router.get('/risk-analizi-detay', riskAnaliziController.getRiskAnalizi);
router.get('/gelismis-kpi', kpiController.getGelismisKPI);
router.get('/kpi-detay', kpiController.getKpiDetay); // ?kpiTipi=doluluk&periyot=6
router.get('/rol-yapisi', rolController.getRolYapisi);
router.get('/roller', rolController.getRoller);
router.get('/aylik-rapor', raporController.getAylikRapor);

// Tahmin ve Karar Destek Fonksiyonları
// NOT: /api/doluluk-tahmini, /api/gelir-kar-tahmini, /api/senaryo-analizi, /api/risk-analizi
// endpoint'leri dashboardController'a yönlendirilmiştir (RESTful API formatı için)
router.get('/fiyat-stratejisi', tahminController.getFiyatStratejisi);
router.get('/personel-ihtiyaci', tahminController.getPersonelIhtiyaci);
router.get('/gelecek-risk-analizi', tahminController.getGelecekRiskAnalizi);

// Senaryo Kaydetme ve Rapor Fonksiyonları
router.post('/senaryo-kaydet', tahminController.kaydetSenaryoAnalizi);
router.get('/senaryo-rapor/:id', tahminController.getSenaryoRaporu);
router.get('/senaryo-raporlari', tahminController.getSenaryoRaporlari);

module.exports = router;