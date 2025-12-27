# 🏨 Otel Karar Destek Sistemi (KDS)

**Versiyon:** 1.0.0  
**Lisans:** ISC  
**Durum:** Aktif Geliştirme

---

## 📋 İçindekiler

1. [Proje Tanımı](#proje-tanımı)
2. [Özellikler](#özellikler)
3. [Kurulum](#kurulum)
4. [Kullanım](#kullanım)
5. [API Dokümantasyonu](#api-dokümantasyonu)
6. [Dashboard Kullanımı](#dashboard-kullanımı)
7. [Tahmin Rapor Örnekleri](#tahmin-rapor-örnekleri)
8. [Katkıda Bulunma](#katkıda-bulunma)

---

## 🎯 Proje Tanımı

Otel Karar Destek Sistemi (KDS), otel işletmelerinin 6-12 aylık stratejik karar alma süreçlerini destekleyen, **karar vermeyen** bir analiz ve görselleştirme platformudur.

### Temel Prensipler

- ✅ **Analiz Sunar, Karar Vermez:** Sistem alternatifler ve olasılıklar sunar, nihai karar yöneticiye aittir
- ✅ **Belirsizlik Gösterir:** Tüm tahminler aralık (min-max) ve belirsizlik seviyesi ile sunulur
- ✅ **Gerçek Veri Tabanlı:** Geçmiş verilerden öğrenir ve gerçekçi tahminler üretir
- ✅ **Kullanıcı Dostu:** Modern, responsive dashboard arayüzü

### Kullanım Senaryoları

- 📊 **KPI İzleme:** Doluluk, gelir, kar marjı ve iptal oranı takibi
- 📈 **Trend Analizi:** Aylık doluluk ve gelir trendlerinin görselleştirilmesi
- 🔮 **Tahmin Yapma:** 6-12 aylık doluluk ve gelir tahminleri
- 🎲 **Senaryo Analizi:** İyimser, gerçekçi ve kötümser senaryoların karşılaştırılması
- ⚠️ **Risk Değerlendirmesi:** Gelecek dönem risk skorlarının hesaplanması

---

## ✨ Özellikler

### Backend

- 🚀 **RESTful API:** Modern, standart API yapısı
- 🗄️ **MySQL Veritabanı:** Güvenilir veri saklama
- 🔄 **Otomatik Trigger'lar:** Rezervasyon ve fiyat değişikliklerinin otomatik loglanması
- 📊 **Hesaplama Motoru:** Mevsimsellik ve trend analizi içeren tahmin algoritmaları

### Frontend

- 📱 **Responsive Dashboard:** Mobil ve masaüstü uyumlu
- 📈 **İnteraktif Grafikler:** Chart.js ile dinamik görselleştirmeler
- 🎨 **Modern UI:** Bootstrap 5 ile profesyonel tasarım
- ⚡ **Gerçek Zamanlı:** API'den dinamik veri çekme

---

## 🚀 Kurulum

### Gereksinimler

- **Node.js:** 16.0.0 veya üzeri
- **MySQL:** 8.0 veya üzeri
- **npm:** 7.0 veya üzeri

### Adım 1: Projeyi İndirin

```bash
git clone [repository-url]
cd kds
```

### Adım 2: Bağımlılıkları Yükleyin

```bash
npm install
```

Bu komut aşağıdaki paketleri yükler:
- `express` - Web framework
- `mysql2` - MySQL bağlantı kütüphanesi
- `chart.js` - Grafik kütüphanesi
- `dotenv` - Ortam değişkenleri yönetimi
- Ve diğer bağımlılıklar...

### Adım 3: Veritabanı Kurulumu

#### 3.1 MySQL Veritabanı Oluşturun

```sql
CREATE DATABASE kds_oteldb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### 3.2 Ortam Değişkenlerini Ayarlayın

Proje kök dizininde `.env` dosyası oluşturun:

```env
# Veritabanı Ayarları
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=root
DB_NAME=kds_oteldb
DB_PORT=8889

# Sunucu Ayarları
PORT=3001
```

**Not:** Mac kullanıcıları için MySQL port genellikle `8889` (MAMP) veya `3306` (standart) olabilir.

#### 3.3 Veritabanı Tablolarını Oluşturun

```bash
# Temel tabloları oluştur
node setup.js
```

#### 3.4 Örnek Verileri Yükleyin

Veriler veritabanı kurulum sırasında veya manuel olarak yüklenebilir.
```

### Adım 4: Sunucuyu Başlatın

```bash
npm start
```

Sunucu başarıyla başladığında şu mesajı göreceksiniz:

```
🚀 Server Başladı: http://localhost:3001
```

### Adım 5: Tarayıcıda Açın

- **Dashboard:** http://localhost:3001/dashboard.html
- **Ana Sayfa:** http://localhost:3001/index.html
- **API Test:** http://localhost:3001/api/dashboard/kpis

---

## 📖 Kullanım

### Temel Kullanım

1. **Sunucuyu Başlatın:**
   ```bash
   npm start
   ```

2. **Dashboard'u Açın:**
   Tarayıcıda `http://localhost:3001/dashboard.html` adresine gidin

3. **Filtreleri Kullanın:**
   - **Tarih Aralığı:** "Son 6 Ay" veya "Son 12 Ay" seçin
   - **Senaryo Tipi:** "İyimser", "Gerçekçi" veya "Kötümser" seçin

4. **Grafikleri İnceleyin:**
   - KPI kartları otomatik güncellenir
   - Trend grafikleri dinamik olarak çizilir
   - Tahmin aralıkları görselleştirilir

### API Kullanımı

API'leri doğrudan çağırabilirsiniz:

```bash
# KPI verilerini al
curl http://localhost:3001/api/dashboard/kpis

# Trend verilerini al (6 ay)
curl "http://localhost:3001/api/dashboard/trends?months=6"

# Doluluk tahmini al
curl "http://localhost:3001/api/doluluk-tahmini?months=6"
```

Detaylı API dokümantasyonu için [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) dosyasına bakın.

---

## 📚 API Dokümantasyonu

### Temel Endpoint'ler

#### 1. KPI Verileri

```http
GET /api/dashboard/kpis
```

**Yanıt Örneği:**
```json
{
  "doluluk": 72.5,
  "gelir": 3500000,
  "karMarji": 38.5,
  "iptalOrani": 12.5
}
```

#### 2. Trend Verileri

```http
GET /api/dashboard/trends?months=6
```

**Yanıt Örneği:**
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

#### 3. Doluluk Tahmini

```http
GET /api/doluluk-tahmini?months=6
```

**Yanıt Örneği:**
```json
{
  "min": 55.0,
  "max": 75.0,
  "belirsizlik": "orta"
}
```

#### 4. Senaryo Analizi

```http
GET /api/senaryo-analizi?type=optimistic
```

**Yanıt Örneği:**
```json
{
  "senaryoTipi": "optimistic",
  "doluluk": {
    "min": 69.0,
    "max": 97.8
  },
  "gelir": {
    "min": 3450000,
    "max": 4830000
  },
  "riskSkoru": 25,
  "etkiAciklama": "Agresif büyüme stratejisi değerlendirilebilir..."
}
```

#### 5. Risk Analizi

```http
GET /api/risk-analizi
```

**Yanıt Örneği:**
```json
{
  "riskSkoru": 42,
  "riskSeviyesi": "Orta",
  "riskAciklama": "Dikkat gerektiren risk seviyesi görülmektedir..."
}
```

**Tüm API endpoint'leri için detaylı dokümantasyon:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

---

## 🎨 Dashboard Kullanımı

### Dashboard Bileşenleri

#### 1. KPI Kartları

Dashboard'un üst kısmında 4 KPI kartı bulunur:

- **🟢 Doluluk Oranı:** Mevcut doluluk yüzdesi
- **🔵 Toplam Gelir:** Net gelir (TL)
- **🟡 Kar Marjı:** Kar marjı yüzdesi
- **🔴 İptal Oranı:** İptal edilen rezervasyon yüzdesi

**Renk Kodlaması:**
- 🟢 **Yeşil:** İyi performans (hedefin üzerinde)
- 🟡 **Sarı:** Orta performans (hedefe yakın)
- 🔴 **Kırmızı:** Dikkat gerektiren (hedefin altında)

#### 2. Trend Grafikleri

**Aylık Doluluk Trendi (Line Chart):**
- Son 6 veya 12 ayın doluluk oranlarını gösterir
- Trend çizgisi ile artış/azalış görselleştirilir
- Mavi renk kullanılır

**Aylık Gelir Trendi (Bar Chart):**
- Son 6 veya 12 ayın gelir değerlerini gösterir
- Bar chart ile aylık karşılaştırma yapılır
- Yeşil renk kullanılır

#### 3. Tahmin Aralığı Grafiği

**6-12 Aylık Tahmin Aralığı:**
- Doluluk ve gelir için min-max aralıkları gösterilir
- Belirsizlik seviyesi görselleştirilir
- Band chart formatında sunulur

#### 4. Senaryo Karşılaştırma Grafiği

**İyimser / Gerçekçi / Kötümser:**
- Üç farklı senaryo için kar/risk karşılaştırması
- Bar chart formatında
- Renk kodlu (yeşil: iyimser, mavi: gerçekçi, kırmızı: kötümser)

### Filtreler

#### Tarih Aralığı Seçici

- **Son 6 Ay:** Son 6 aylık verileri gösterir
- **Son 12 Ay:** Son 12 aylık verileri gösterir

**Kullanım:** Dropdown menüden seçim yapın, grafikler otomatik güncellenir.

#### Senaryo Tipi Seçici

- **İyimser:** Yüksek büyüme senaryosu
- **Gerçekçi:** Dengeli büyüme senaryosu
- **Kötümser:** Muhafazakar senaryo

**Kullanım:** Senaryo grafiğini güncellemek için seçim yapın.

---

## 📊 Tahmin Rapor Örnekleri

### Örnek 1: 6 Aylık Doluluk Tahmini

**API İsteği:**
```bash
curl "http://localhost:3001/api/doluluk-tahmini?months=6"
```

**Yanıt:**
```json
{
  "min": 55.0,
  "max": 75.0,
  "belirsizlik": "orta"
}
```

**Yorum:**
- Gelecek 6 ay için doluluk oranı %55-75 aralığında beklenmektedir
- Belirsizlik seviyesi "orta" - geçmiş veri miktarı yeterli
- Ortalama tahmin: %65
- **Karar Destek Notu:** Bu aralık, mevsimsellik ve geçmiş trendlere dayanmaktadır. Nihai karar yöneticiye aittir.

### Örnek 2: Senaryo Analizi Raporu

**API İsteği:**
```bash
curl "http://localhost:3001/api/senaryo-analizi?type=realistic"
```

**Yanıt:**
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

**Yorum:**
- **Gerçekçi Senaryo:** Dengeli büyüme yaklaşımı
- **Doluluk Aralığı:** %60-85
- **Gelir Aralığı:** 3.000.000 - 4.200.000 TL
- **Risk Skoru:** 40 (Orta risk)
- **Öneri:** Mevcut stratejiler sürdürülebilir görünmektedir

### Örnek 3: Risk Analizi Raporu

**API İsteği:**
```bash
curl "http://localhost:3001/api/risk-analizi"
```

**Yanıt:**
```json
{
  "riskSkoru": 42,
  "riskSeviyesi": "Orta",
  "riskAciklama": "Dikkat gerektiren risk seviyesi görülmektedir. Önleyici aksiyonlar değerlendirilebilir."
}
```

**Yorum:**
- **Risk Skoru:** 42/100
- **Risk Seviyesi:** Orta
- **Risk Faktörleri:**
  - İptal oranı: %12.5 (orta seviye)
  - Doluluk trendi: Düşüş eğilimi
  - Gelir dalgalanması: Normal
- **Öneri:** Önleyici aksiyonlar değerlendirilebilir, ancak kritik durum yoktur

---

## 🛠️ Geliştirme

### Proje Yapısı

```
kds/
├── controllers/          # İş mantığı controller'ları
│   ├── dashboardController.js
│   ├── tahminController.js
│   └── ...
├── routes/              # API route'ları
│   └── api.js
├── config/              # Konfigürasyon dosyaları
│   └── db.js
├── database.js          # Veritabanı bağlantısı
├── app.js               # Ana sunucu dosyası
├── dashboard.html       # Dashboard sayfası
├── dashboard.js         # Dashboard JavaScript
├── dashboard.css        # Dashboard stilleri
└── triggers.sql         # MySQL trigger'ları
```

### Script'ler

```bash
# Sunucuyu başlat
npm start

# Veritabanı kurulumu
node setup.js
```

### Ortam Değişkenleri

`.env` dosyasında ayarlanabilir değişkenler:

- `DB_HOST` - Veritabanı host adresi
- `DB_USER` - Veritabanı kullanıcı adı
- `DB_PASSWORD` - Veritabanı şifresi
- `DB_NAME` - Veritabanı adı
- `DB_PORT` - Veritabanı portu
- `PORT` - Sunucu portu

---

## 🧪 Test

Test planı ve test senaryoları için [TEST_PLAN.md](./TEST_PLAN.md) dosyasına bakın.

### Test Çalıştırma

```bash
# Birim testler
npm test

# API testleri
npm run test:api

# Entegrasyon testleri
npm run test:integration
```

---

## 📝 Lisans

ISC License

---

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

---

## 📞 İletişim

Sorularınız için issue açabilir veya dokümantasyonu inceleyebilirsiniz.

---

## 📚 Ek Kaynaklar

- [API Dokümantasyonu](./API_DOCUMENTATION.md)
- [Test Planı](./TEST_PLAN.md)

---

**Son Güncelleme:** 2024  
**Versiyon:** 1.0.0
