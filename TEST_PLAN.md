# Test Planı - Otel Karar Destek Sistemi (KDS)

**Proje:** Otel KDS  
**Versiyon:** 1.0.0  
**Tarih:** 2024  
**Hazırlayan:** Test Ekibi

---

## 📋 İçindekiler

1. [Test Stratejisi](#test-stratejisi)
2. [Birim Testler](#birim-testler)
3. [Entegrasyon Testleri](#entegrasyon-testleri)
4. [Yük Testleri](#yük-testleri)
5. [Kullanıcı Kabul Testi](#kullanıcı-kabul-testi)
6. [Test Raporu](#test-raporu)

---

## 🎯 Test Stratejisi

### Test Kapsamı

Bu test planı, Otel Karar Destek Sistemi'nin tüm bileşenlerini kapsar:

- **Backend API'leri** - RESTful endpoint'ler
- **Hesaplama Fonksiyonları** - Tahmin ve risk analizi algoritmaları
- **Frontend Dashboard** - Kullanıcı arayüzü ve görselleştirmeler
- **Veritabanı İşlemleri** - Trigger'lar ve sorgular
- **Performans** - Yük altında sistem davranışı

### Test Ortamı

- **Backend:** Node.js + Express.js
- **Veritabanı:** MySQL 8.0+
- **Frontend:** Vanilla JavaScript + Chart.js
- **Test Framework:** Jest (birim testler), Supertest (API testleri)

---

## 1️⃣ Birim Testler

### 1.1 API Endpoint Testleri

#### Test Senaryosu 1.1.1: KPI Verileri Endpoint'i

**Endpoint:** `GET /api/dashboard/kpis`

**Beklenen Sonuç:**
```json
{
  "doluluk": 72.5,
  "gelir": 3500000,
  "karMarji": 38.5,
  "iptalOrani": 12.5
}
```

**Test Adımları:**
1. Endpoint'e GET isteği gönder
2. HTTP 200 status code kontrolü
3. Response body format kontrolü
4. Tüm alanların varlığı kontrolü
5. Veri tipleri kontrolü (number)

**Test Kodu Örneği:**
```javascript
describe('GET /api/dashboard/kpis', () => {
  test('should return KPI data with correct structure', async () => {
    const response = await request(app)
      .get('/api/dashboard/kpis')
      .expect(200);
    
    expect(response.body).toHaveProperty('doluluk');
    expect(response.body).toHaveProperty('gelir');
    expect(response.body).toHaveProperty('karMarji');
    expect(response.body).toHaveProperty('iptalOrani');
    
    expect(typeof response.body.doluluk).toBe('number');
    expect(response.body.doluluk).toBeGreaterThanOrEqual(0);
    expect(response.body.doluluk).toBeLessThanOrEqual(100);
  });
});
```

**Test Sonucu:** ✅ Başarılı / ❌ Başarısız

---

#### Test Senaryosu 1.1.2: Trend Verileri Endpoint'i

**Endpoint:** `GET /api/dashboard/trends?months=6`

**Beklenen Sonuç:**
```json
{
  "dolulukTrend": [
    { "ay": "2024-07", "value": 65.5 },
    { "ay": "2024-08", "value": 68.2 }
  ],
  "gelirTrend": [
    { "ay": "2024-07", "value": 3200000 },
    { "ay": "2024-08", "value": 3450000 }
  ],
  "riskTrend": [
    { "ay": "2024-07", "skor": 35 },
    { "ay": "2024-08", "skor": 42 }
  ]
}
```

**Test Adımları:**
1. Endpoint'e GET isteği gönder (months=6)
2. HTTP 200 status code kontrolü
3. Array yapısı kontrolü
4. Her trend için veri sayısı kontrolü (6 ay = 6 kayıt)
5. Veri formatı kontrolü

**Test Sonucu:** ✅ Başarılı / ❌ Başarısız

---

#### Test Senaryosu 1.1.3: Doluluk Tahmini Endpoint'i

**Endpoint:** `GET /api/doluluk-tahmini?months=6`

**Beklenen Sonuç:**
```json
{
  "min": 55.0,
  "max": 75.0,
  "belirsizlik": "orta"
}
```

**Test Adımları:**
1. Endpoint'e GET isteği gönder
2. HTTP 200 status code kontrolü
3. min < max kontrolü
4. belirsizlik değeri kontrolü ("düşük" | "orta" | "yüksek")
5. min ve max değerlerinin 0-100 aralığında olması

**Test Sonucu:** ✅ Başarılı / ❌ Başarısız

---

#### Test Senaryosu 1.1.4: Senaryo Analizi Endpoint'i

**Endpoint:** `GET /api/senaryo-analizi?type=optimistic`

**Beklenen Sonuç:**
```json
{
  "senaryoTipi": "optimistic",
  "doluluk": { "min": 69.0, "max": 97.8 },
  "gelir": { "min": 3450000, "max": 4830000 },
  "riskSkoru": 25,
  "etkiAciklama": "Agresif büyüme stratejisi..."
}
```

**Test Adımları:**
1. Endpoint'e GET isteği gönder (type=optimistic)
2. HTTP 200 status code kontrolü
3. Senaryo tipi kontrolü
4. Doluluk ve gelir aralıkları kontrolü
5. Risk skoru 0-100 aralığında kontrolü

**Test Sonucu:** ✅ Başarılı / ❌ Başarısız

---

### 1.2 Hesaplama Fonksiyonları Testleri

#### Test Senaryosu 1.2.1: Doluluk Tahmini Hesaplama

**Fonksiyon:** `hesaplaDolulukTahmini(gecmisVeri, periyot)`

**Test Verisi:**
```javascript
const gecmisVeri = [
  { ay: '2024-01', rezervasyon_sayisi: 2500 },
  { ay: '2024-02', rezervasyon_sayisi: 2400 },
  { ay: '2024-03', rezervasyon_sayisi: 2700 }
];
const periyot = 6;
```

**Beklenen Sonuç:**
- Tahminler array'i döndürmeli
- Her tahmin objesi şu alanları içermeli:
  - `ay` (string, format: YYYY-MM)
  - `tahmini_doluluk_araligi` (object: min, max, ortalama)
  - `belirsizlik_seviyesi` (string)

**Test Adımları:**
1. Fonksiyonu test verisi ile çağır
2. Dönen array'in uzunluğu periyot'a eşit olmalı
3. Her tahmin objesi gerekli alanları içermeli
4. Doluluk değerleri 0-100 aralığında olmalı
5. min <= ortalama <= max kontrolü

**Test Sonucu:** ✅ Başarılı / ❌ Başarısız

---

#### Test Senaryosu 1.2.2: Risk Skoru Hesaplama

**Fonksiyon:** `hesaplaGelecekRiskAnalizi(gecmisVeri, periyot)`

**Test Verisi:**
```javascript
const gecmisVeri = [
  { 
    ay: '2024-01',
    rezervasyon_sayisi: 2000,
    toplam_gelir: 3000000,
    ortalama_fiyat: 3500
  }
];
```

**Beklenen Sonuç:**
- Risk skoru 0-100 aralığında
- Risk seviyesi: "Düşük" | "Orta" | "Yüksek"
- Risk faktörleri hesaplanmış olmalı

**Test Adımları:**
1. Fonksiyonu test verisi ile çağır
2. Risk skoru 0-100 aralığında kontrolü
3. Risk seviyesi string kontrolü
4. Faktörler objesi kontrolü

**Test Sonucu:** ✅ Başarılı / ❌ Başarısız

---

## 2️⃣ Entegrasyon Testleri

### 2.1 Dashboard API → Frontend Bağlantısı

#### Test Senaryosu 2.1.1: KPI Verilerinin Dashboard'a Yüklenmesi

**Test Senaryosu:**
1. Dashboard sayfası açılır
2. JavaScript `loadKpis()` fonksiyonu çağrılır
3. API'den veri çekilir
4. KPI kartları DOM'a render edilir

**Beklenen Sonuç:**
- API çağrısı başarılı (HTTP 200)
- KPI kartlarında değerler görünür
- Format doğru (yüzde, para birimi)

**Test Adımları:**
```javascript
// Selenium/Playwright ile
test('KPI verileri dashboard\'a yüklenmeli', async () => {
  await page.goto('http://localhost:3001/dashboard.html');
  
  // API çağrısını bekle
  await page.waitForResponse(response => 
    response.url().includes('/api/dashboard/kpis')
  );
  
  // KPI değerlerini kontrol et
  const doluluk = await page.textContent('#kpiDoluluk');
  expect(doluluk).toMatch(/\d+\.?\d*%/);
  
  const gelir = await page.textContent('#kpiGelir');
  expect(gelir).toContain('₺');
});
```

**Test Sonucu:** ✅ Başarılı / ❌ Başarısız

---

#### Test Senaryosu 2.1.2: Trend Grafiklerinin Çizilmesi

**Test Senaryosu:**
1. Dashboard sayfası açılır
2. Ay seçici "Son 6 Ay" seçilir
3. Trend verileri API'den çekilir
4. Chart.js ile grafikler çizilir

**Beklenen Sonuç:**
- Doluluk trend grafiği görünür
- Gelir trend grafiği görünür
- Her grafikte 6 veri noktası var
- Grafikler responsive

**Test Adımları:**
```javascript
test('Trend grafikleri çizilmeli', async () => {
  await page.goto('http://localhost:3001/dashboard.html');
  
  // Ay seçiciyi değiştir
  await page.selectOption('#monthSelector', '6');
  
  // Grafiklerin oluşmasını bekle
  await page.waitForSelector('#dolulukTrendChart');
  await page.waitForSelector('#gelirTrendChart');
  
  // Chart.js instance'larının oluştuğunu kontrol et
  const dolulukChart = await page.evaluate(() => {
    return window.charts?.dolulukTrend !== null;
  });
  expect(dolulukChart).toBe(true);
});
```

**Test Sonucu:** ✅ Başarılı / ❌ Başarısız

---

### 2.2 Senaryo API → Grafik Kontrolleri

#### Test Senaryosu 2.2.1: Senaryo Analizi Grafiği

**Test Senaryosu:**
1. Senaryo seçici "İyimser" seçilir
2. API'den senaryo verisi çekilir
3. Grafik güncellenir

**Beklenen Sonuç:**
- Senaryo grafiği 3 bar gösterir (İyimser, Gerçekçi, Kötümser)
- İyimser senaryo en yüksek değeri gösterir
- Grafik renkleri doğru (yeşil, mavi, kırmızı)

**Test Sonucu:** ✅ Başarılı / ❌ Başarısız

---

## 3️⃣ Yük Testleri

### 3.1 1000+ Rezervasyon Veri ile API Performansı

#### Test Senaryosu 3.1.1: KPI Endpoint Performans Testi

**Test Senaryosu:**
- Veritabanında 1000+ rezervasyon kaydı var
- KPI endpoint'ine 100 eşzamanlı istek gönderilir

**Beklenen Sonuç:**
- Tüm istekler 200 status code döndürmeli
- Ortalama response time < 500ms
- %95'lik yanıt süresi < 1000ms
- Hata oranı < 1%

**Test Kodu:**
```javascript
const loadtest = require('loadtest');

const options = {
  url: 'http://localhost:3001/api/dashboard/kpis',
  maxRequests: 100,
  concurrency: 10,
  method: 'GET'
};

loadtest.loadTest(options, (error, result) => {
  console.log('Test Sonuçları:');
  console.log('Total Requests:', result.totalRequests);
  console.log('Total Errors:', result.totalErrors);
  console.log('Mean Latency:', result.meanLatencyMs, 'ms');
  console.log('Max Latency:', result.maxLatencyMs, 'ms');
  
  // Başarı kriterleri
  expect(result.totalErrors).toBeLessThan(1);
  expect(result.meanLatencyMs).toBeLessThan(500);
});
```

**Test Sonucu:** ✅ Başarılı / ❌ Başarısız

**Performans Metrikleri:**
- Ortalama Response Time: ___ ms
- Max Response Time: ___ ms
- Min Response Time: ___ ms
- Hata Oranı: ___ %

---

#### Test Senaryosu 3.1.2: Trend Endpoint Performans Testi

**Test Senaryosu:**
- 12 aylık veri ile trend endpoint'i test edilir
- 50 eşzamanlı istek gönderilir

**Beklenen Sonuç:**
- Ortalama response time < 800ms
- Tüm istekler başarılı

**Test Sonucu:** ✅ Başarılı / ❌ Başarısız

---

### 3.2 Dashboard Görselleştirme Testleri

#### Test Senaryosu 3.2.1: Büyük Veri Seti ile Grafik Render

**Test Senaryosu:**
- 12 aylık veri ile dashboard açılır
- Tüm grafikler render edilir

**Beklenen Sonuç:**
- Sayfa yükleme süresi < 3 saniye
- Grafikler 2 saniye içinde görünür
- Sayfa donmaz, kullanıcı etkileşimi mümkün

**Test Sonucu:** ✅ Başarılı / ❌ Başarısız

---

## 4️⃣ Kullanıcı Kabul Testi

### 4.1 KPI Kartlarının Doğruluğu

#### Test Senaryosu 4.1.1: Doluluk Oranı Hesaplama Doğruluğu

**Test Senaryosu:**
1. Veritabanında bilinen rezervasyon verileri var
2. Manuel hesaplama yapılır
3. API'den gelen değer ile karşılaştırılır

**Test Verisi:**
- Toplam oda: 100
- Son 30 günde dolu gün: 22
- Beklenen doluluk: (22 / (100 * 30)) * 100 = 0.73%

**Beklenen Sonuç:**
- API'den gelen doluluk değeri manuel hesaplamaya yakın olmalı
- Fark < %5 olmalı

**Test Sonucu:** ✅ Başarılı / ❌ Başarısız

---

#### Test Senaryosu 4.1.2: Gelir Hesaplama Doğruluğu

**Test Senaryosu:**
- Veritabanında toplam gelir bilinen
- API'den gelen gelir değeri kontrol edilir

**Beklenen Sonuç:**
- API değeri veritabanı toplamına eşit veya çok yakın olmalı
- Fark < 100 TL olmalı

**Test Sonucu:** ✅ Başarılı / ❌ Başarısız

---

### 4.2 Tahmin Aralıklarının Tutarlılığı

#### Test Senaryosu 4.2.1: Doluluk Tahmin Aralığı Tutarlılığı

**Test Senaryosu:**
1. 6 aylık tahmin alınır
2. 12 aylık tahmin alınır
3. Aralıklar karşılaştırılır

**Beklenen Sonuç:**
- 12 aylık tahminin belirsizliği 6 aylıktan yüksek olmalı
- min < max her zaman
- Aralıklar mantıklı (örn: %40-95 arası)

**Test Sonucu:** ✅ Başarılı / ❌ Başarısız

---

#### Test Senaryosu 4.2.2: Senaryo Karşılaştırması Tutarlılığı

**Test Senaryosu:**
1. İyimser senaryo alınır
2. Gerçekçi senaryo alınır
3. Kötümser senaryo alınır
4. Değerler karşılaştırılır

**Beklenen Sonuç:**
- İyimser > Gerçekçi > Kötümser (doluluk ve gelir)
- İyimser < Gerçekçi < Kötümser (risk skoru)
- Aralıklar çakışmamalı

**Test Sonucu:** ✅ Başarılı / ❌ Başarısız

---

## 📊 Test Raporu

### Test Özeti

| Test Kategorisi | Toplam Test | Başarılı | Başarısız | Başarı Oranı |
|----------------|-------------|----------|-----------|--------------|
| Birim Testler | 6 | ___ | ___ | ___% |
| Entegrasyon Testleri | 3 | ___ | ___ | ___% |
| Yük Testleri | 3 | ___ | ___ | ___% |
| Kullanıcı Kabul Testi | 4 | ___ | ___ | ___% |
| **TOPLAM** | **16** | **___** | **___** | **___%** |

### Kritik Hatalar

1. ❌ [Hata açıklaması]
2. ❌ [Hata açıklaması]

### Öneriler

1. ⚠️ [Öneri 1]
2. ⚠️ [Öneri 2]

### Sonuç

Test sonuçlarına göre sistem **✅ Üretime Hazır** / **❌ Üretime Hazır Değil**

**Test Tarihi:** ___  
**Test Edilen Versiyon:** 1.0.0  
**Test Edilen:** [İsim]

---

## 🔧 Test Ortamı Kurulumu

### Gereksinimler

```bash
npm install --save-dev jest supertest
npm install --save-dev @testing-library/jest-dom
```

### Test Çalıştırma

```bash
# Tüm testler
npm test

# Belirli bir test dosyası
npm test -- api.test.js

# Coverage raporu
npm test -- --coverage
```

---

**Son Güncelleme:** 2024  
**Versiyon:** 1.0.0

