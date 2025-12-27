# RESTful API Dokümantasyonu - Otel KDS

**Versiyon:** 1.0.0  
**Base URL:** `http://localhost:3001/api`  
**Son Güncelleme:** 2024

---

## 📋 İçindekiler

1. [Genel Bilgiler](#genel-bilgiler)
2. [Kimlik Doğrulama](#kimlik-doğrulama)
3. [API Endpoint'leri](#api-endpointleri)
4. [Hata Yönetimi](#hata-yönetimi)
5. [Örnek Kullanım](#örnek-kullanım)

---

## 🔑 Genel Bilgiler

Bu API, **Karar Destek Sistemi (KDS)** mantığına uygun çıktı üretir. Sistem **net karar vermez**, sadece analiz ve alternatifler sunar. Nihai karar yöneticiye aittir.

### Temel Prensipler

- ✅ **Analiz Sunar:** Alternatifler ve olasılıklar gösterilir
- ✅ **Belirsizlik Belirtilir:** Tahminlerde belirsizlik seviyesi açıkça belirtilir
- ✅ **Yönetici Kararı:** Nihai karar yöneticiye aittir
- ✅ **JSON Format:** Tüm yanıtlar JSON formatındadır

### Response Format

Tüm API yanıtları JSON formatındadır:

```json
{
  "data": {...},
  "message": "İşlem başarılı"
}
```

### HTTP Durum Kodları

- `200` - Başarılı
- `400` - Geçersiz istek
- `404` - Bulunamadı
- `500` - Sunucu hatası

### Rate Limiting

Şu anda rate limiting yoktur. Gelecek versiyonlarda eklenebilir.

---

## 1️⃣ KPI Verileri

### GET /api/dashboard/kpis

Otel işletmesinin temel performans göstergelerini döndürür.

**Response:**
```json
{
  "doluluk": 72.5,
  "gelir": 3500000,
  "karMarji": 38.5,
  "iptalOrani": 12.5
}
```

**Alanlar:**
- `doluluk` (number): Doluluk oranı (%)
- `gelir` (number): Toplam gelir (TL)
- `karMarji` (number): Kar marjı (%)
- `iptalOrani` (number): İptal oranı (%)

**Örnek İstek:**
```bash
curl http://localhost:3001/api/dashboard/kpis
```

---

## 2️⃣ Trend Verileri

### GET /api/dashboard/trends?months={6|12}

Geçmiş aylık trend verilerini döndürür.

**Query Parameters:**
- `months` (string, optional): `6` veya `12` (varsayılan: `6`)

**Response:**
```json
{
  "dolulukTrend": [
    { "ay": "2024-01", "value": 65.5 },
    { "ay": "2024-02", "value": 68.2 }
  ],
  "gelirTrend": [
    { "ay": "2024-01", "value": 3200000 },
    { "ay": "2024-02", "value": 3450000 }
  ],
  "riskTrend": [
    { "ay": "2024-01", "skor": 35 },
    { "ay": "2024-02", "skor": 42 }
  ]
}
```

**Alanlar:**
- `dolulukTrend` (array): Aylık doluluk trendi `[{ay, value}]`
- `gelirTrend` (array): Aylık gelir trendi `[{ay, value}]`
- `riskTrend` (array): Aylık risk skoru trendi `[{ay, skor}]`

**Örnek İstek:**
```bash
curl "http://localhost:3001/api/dashboard/trends?months=12"
```

---

## 3️⃣ Tahmin API'ları

### GET /api/doluluk-tahmini?months={6|12}

Gelecek dönem için doluluk tahmini aralığı döndürür.

**Query Parameters:**
- `months` (string, optional): `6` veya `12` (varsayılan: `6`)

**Response:**
```json
{
  "min": 55.0,
  "max": 75.0,
  "belirsizlik": "orta"
}
```

**Alanlar:**
- `min` (number): Minimum tahmini doluluk (%)
- `max` (number): Maksimum tahmini doluluk (%)
- `belirsizlik` (string): `"düşük"` | `"orta"` | `"yüksek"`

**Örnek İstek:**
```bash
curl "http://localhost:3001/api/doluluk-tahmini?months=12"
```

**Alternatif Endpoint:**
- `GET /api/dashboard/doluluk-tahmini?months={6|12}` (aynı format)

---

### GET /api/gelir-kar-tahmini?months={6|12}

Gelecek dönem için gelir ve kar tahmini aralığı döndürür.

**Query Parameters:**
- `months` (string, optional): `6` veya `12` (varsayılan: `6`)

**Response:**
```json
{
  "min": 3420000,
  "max": 4180000,
  "belirsizlik": "orta"
}
```

**Alanlar:**
- `min` (number): Minimum tahmini gelir (TL)
- `max` (number): Maksimum tahmini gelir (TL)
- `belirsizlik` (string): `"düşük"` | `"orta"` | `"yüksek"`

**Örnek İstek:**
```bash
curl "http://localhost:3001/api/gelir-kar-tahmini?months=6"
```

**Alternatif Endpoint:**
- `GET /api/dashboard/gelir-kar-tahmini?months={6|12}` (aynı format)

---

## 4️⃣ Senaryo Analizi

### GET /api/senaryo-analizi?type={optimistic|realistic|pessimistic}

Senaryo bazlı analiz döndürür. Sistem net karar vermez, sadece alternatifler sunar.

**Query Parameters:**
- `type` (string, optional): `"optimistic"` | `"realistic"` | `"pessimistic"` (varsayılan: `"realistic"`)

**Response:**
```json
{
  "senaryoTipi": "realistic",
  "doluluk": {
    "min": 60.0,
    "max": 85.0
  },
  "gelir": {
    "min": 3000000,
    "max": 4200000
  },
  "riskSkoru": 40,
  "etkiAciklama": "Dengeli büyüme yaklaşımı değerlendirilebilir. Sürdürülebilir strateji olarak görülmektedir."
}
```

**Alanlar:**
- `senaryoTipi` (string): Senaryo tipi
- `doluluk` (object): Doluluk aralığı `{min, max}`
- `gelir` (object): Gelir aralığı `{min, max}`
- `riskSkoru` (number): Risk skoru (0-100)
- `etkiAciklama` (string): Senaryo açıklaması

**Örnek İstek:**
```bash
curl "http://localhost:3001/api/senaryo-analizi?type=optimistic"
```

**Alternatif Endpoint:**
- `GET /api/dashboard/senaryo-analizi?type={optimistic|realistic|pessimistic}` (aynı format)

---

## 5️⃣ Risk Analizi

### GET /api/risk-analizi

Genel risk analizi döndürür. Sistem uyarı niteliğindedir, kesin hüküm değildir.

**Response:**
```json
{
  "riskSkoru": 42,
  "riskSeviyesi": "Orta",
  "riskAciklama": "Dikkat gerektiren risk seviyesi görülmektedir. Önleyici aksiyonlar değerlendirilebilir."
}
```

**Alanlar:**
- `riskSkoru` (number): Risk skoru (0-100)
- `riskSeviyesi` (string): `"Düşük"` | `"Orta"` | `"Yüksek"`
- `riskAciklama` (string): Risk açıklaması

**Örnek İstek:**
```bash
curl http://localhost:3001/api/risk-analizi
```

**Alternatif Endpoint:**
- `GET /api/dashboard/risk` (aynı format)

---

## Hata Yönetimi

Tüm endpoint'ler hata durumunda uygun HTTP durum kodları döndürür:

**400 Bad Request:**
```json
{
  "error": "Geçersiz parametre",
  "detay": "months parametresi 6 veya 12 olmalıdır"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Sunucu hatası",
  "detay": "Veritabanı bağlantı hatası"
}
```

---

## Karar Destek Sistemi Prensibi

Tüm API yanıtları **karar destek mantığına uygun** çıktı üretir:

1. **Net karar vermez**: Sistem "şunu yapmalısınız" demez, sadece analiz sunar.
2. **Alternatifler sunar**: Farklı senaryolar ve olasılıklar gösterilir.
3. **Belirsizlik belirtilir**: Tahminlerde belirsizlik seviyesi açıkça belirtilir.
4. **Yönetici kararı**: Nihai karar yöneticiye aittir.

**Örnek:**
- ❌ "Fiyatı %10 artırmalısınız"
- ✅ "Fiyat artışı alternatifi değerlendirilebilir. Olası etkiler: doluluk %2-5 düşebilir, gelir artışı potansiyeli var."

---

## Test Senaryoları

### Tüm Endpoint'leri Test Etme

```bash
# KPI Verileri
curl http://localhost:3001/api/dashboard/kpis

# Trend Verileri (6 ay)
curl "http://localhost:3001/api/dashboard/trends?months=6"

# Trend Verileri (12 ay)
curl "http://localhost:3001/api/dashboard/trends?months=12"

# Doluluk Tahmini (6 ay)
curl "http://localhost:3001/api/doluluk-tahmini?months=6"

# Doluluk Tahmini (12 ay)
curl "http://localhost:3001/api/doluluk-tahmini?months=12"

# Gelir-Kar Tahmini (6 ay)
curl "http://localhost:3001/api/gelir-kar-tahmini?months=6"

# Gelir-Kar Tahmini (12 ay)
curl "http://localhost:3001/api/gelir-kar-tahmini?months=12"

# Senaryo Analizi (İyimser)
curl "http://localhost:3001/api/senaryo-analizi?type=optimistic"

# Senaryo Analizi (Gerçekçi)
curl "http://localhost:3001/api/senaryo-analizi?type=realistic"

# Senaryo Analizi (Kötümser)
curl "http://localhost:3001/api/senaryo-analizi?type=pessimistic"

# Risk Analizi
curl http://localhost:3001/api/risk-analizi
```

---

## Teknik Detaylar

- **Backend:** Node.js + Express.js
- **Veritabanı:** MySQL
- **Async/Await:** Tüm veritabanı sorguları async/await kullanır
- **Hata Yönetimi:** Try-catch blokları ile kapsamlı hata yönetimi
- **Fallback:** Veri yoksa varsayılan değerler döndürülür

---

## Güncelleme Notları

- **v1.0.0** (2024): İlk RESTful API sürümü
  - Tüm temel endpoint'ler eklendi
  - Karar destek sistemi mantığına uygun çıktılar
  - Gerçek veritabanı entegrasyonu

