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
router.get('/risk-analizi', otelController.getRiskAnalizi);
router.get('/tahmin-dogrulugu', otelController.getTahminDogrulugu);

router.post('/personel-simulasyon', ikController.personelSimulasyon);
router.post('/login', authController.login);

// Yeni Karar Destek API'leri
router.get('/oneriler', oneriMotoruController.getOneriler);
router.get('/risk-analizi-detay', riskAnaliziController.getRiskAnalizi);
router.get('/gelismis-kpi', kpiController.getGelismisKPI);
router.get('/rol-yapisi', rolController.getRolYapisi);
router.get('/roller', rolController.getRoller);
router.get('/aylik-rapor', raporController.getAylikRapor);

// Tahmin ve Karar Destek Fonksiyonları
router.get('/doluluk-tahmini', tahminController.getDolulukTahmini);
router.get('/fiyat-stratejisi', tahminController.getFiyatStratejisi);
router.get('/gelir-kar-tahmini', tahminController.getGelirKarTahmini);
router.get('/personel-ihtiyaci', tahminController.getPersonelIhtiyaci);
router.get('/gelecek-risk-analizi', tahminController.getGelecekRiskAnalizi);
router.get('/senaryo-analizi', tahminController.getSenaryoAnalizi);

// Senaryo Kaydetme ve Rapor Fonksiyonları
router.post('/senaryo-kaydet', tahminController.kaydetSenaryoAnalizi);
router.get('/senaryo-rapor/:id', tahminController.getSenaryoRaporu);
router.get('/senaryo-raporlari', tahminController.getSenaryoRaporlari);

// Dashboard REST API (karar destek odaklı)
// Swagger benzeri açıklama: Tüm yanıtlar JSON, DSS diliyle bilgi/analiz sunar, net karar vermez.
router.get('/dashboard/kpis', dashboardController.getKpis);
router.get('/dashboard/trends', dashboardController.getTrends); // ?months=6|12
router.get('/dashboard/doluluk-tahmini', dashboardController.getDolulukTahmini); // ?months=6|12
router.get('/dashboard/gelir-kar-tahmini', dashboardController.getGelirKarTahmini); // ?months=6|12
router.get('/dashboard/senaryo-analizi', dashboardController.getSenaryoAnalizi); // ?type=optimistic|realistic|pessimistic
router.get('/dashboard/risk', dashboardController.getRiskAnalizi);

module.exports = router;