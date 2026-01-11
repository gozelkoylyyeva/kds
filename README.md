# 🏨 Otel Karar Destek Sistemi (KDS)

**Versiyon:** 1.0.0  
**Lisans:** ISC  
**Durum:** Aktif Geliştirme

---

## 📋 Proje Açıklaması

Otel Karar Destek Sistemi (KDS), otel işletmelerinin 6-12 aylık stratejik karar alma süreçlerini destekleyen, **MVC mimarisine uygun** geliştirilmiş bir web uygulamasıdır. Sistem, gerçek zamanlı veri analizi, tahmin ve senaryo analizi sunarak yöneticilere karar verme sürecinde destek sağlar.

### Proje Amacı

Bu proje, öğrencilerin aşağıdaki becerileri kazanmalarını sağlamak amacıyla geliştirilmiştir:

- ✅ **Sunucu taraflı yazılım geliştirme**
- ✅ **MVC mimarisini doğru ve tutarlı biçimde uygulama**
- ✅ **REST prensiplerine uygun API tasarlama**
- ✅ **Veri modeli, iş mantığı ve uç noktaları ayrıştırma**
- ✅ **Yazılım projelerinde okunabilirlik, sürdürülebilirlik ve ölçeklenebilirlik kazanma**

### Temel Özellikler

- 📊 **KPI İzleme:** Doluluk oranı, gelir, kar marjı, iptal oranı takibi
- 📈 **Trend Analizi:** Aylık doluluk ve gelir trendlerinin görselleştirilmesi
- 🔮 **Tahmin Yapma:** 6-12 aylık doluluk ve gelir tahminleri
- 🎲 **Senaryo Analizi:** İyimser, gerçekçi ve kötümser senaryoların karşılaştırılması
- ⚠️ **Risk Değerlendirmesi:** Gelecek dönem risk skorlarının hesaplanması
- 💰 **Rakip Fiyat Analizi:** Piyasa fiyat karşılaştırmaları ve rekabet analizi
- 👥 **Personel Yönetimi:** Doluluk oranına göre personel ihtiyacı tahmini

---

## 📖 Senaryo Tanımı

### İş Problemi

Otel işletmeleri, dinamik piyasa koşullarında stratejik kararlar almak zorundadır. Bu kararlar şunları içerir:
- Fiyatlandırma stratejileri
- Personel planlaması
- Pazarlama bütçesi yönetimi
- Rezervasyon kapasitesi planlaması

### Çözüm

KDS, otel yöneticilerine:
- Geçmiş verilere dayalı tahminler
- Çoklu senaryo analizleri
- Risk değerlendirmeleri
- Rakip fiyat karşılaştırmaları

sunarak karar verme sürecini destekler.

### Kullanıcı Tipleri

1. **Yönetici:** Tüm verilere erişim, rapor görüntüleme, senaryo analizi
2. **Operasyon Ekibi:** Günlük KPI takibi, rezervasyon analizi

---

## 🏗️ Mimari Yapı

### MVC Mimarisi

Proje, **katı MVC (Model-View-Controller) mimarisine** uygun olarak geliştirilmiştir:

```
kds/
├── controllers/          # Controller Katmanı (İş Mantığı)
│   ├── authController.js
│   ├── dashboardController.js
│   ├── otelController.js
│   ├── piyasaController.js
│   ├── tahminController.js
│   └── ...
├── models/              # Model Katmanı (Veri Modelleri)
│   ├── Rezervasyon.js
│   ├── Oda.js
│   ├── Personel.js
│   └── ...
├── views/               # View Katmanı (Arayüz)
│   ├── index.html
│   ├── analytics.html
│   └── ...
├── routes/              # Route Tanımlamaları
│   └── api.js
├── config/              # Konfigürasyon
│   └── db.js
└── app.js               # Ana Uygulama Dosyası
```

### Katman Sorumlulukları

- **Model:** Veritabanı işlemleri ve veri modeli tanımları
- **View:** Kullanıcı arayüzü (HTML, CSS, JavaScript)
- **Controller:** İş mantığı, API endpoint'leri, veri işleme

---

## 🔧 Kurulum Adımları

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

### Adım 3: Ortam Değişkenlerini Ayarlayın

Proje kök dizininde `.env` dosyası oluşturun:

```bash
cp .env.example .env
```

`.env` dosyasını düzenleyin:

```env
# Veritabanı Ayarları
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=otel_kds_db
DB_PORT=8889

# Sunucu Ayarları
PORT=3001

# API Keys (Opsiyonel)
SERPAPI_KEY=your_serpapi_key_here
```

**Not:** Mac kullanıcıları için MySQL port genellikle `8889` (MAMP) veya `3306` (standart) olabilir.

### Adım 4: Veritabanı Kurulumu

#### 4.1 MySQL Veritabanı Oluşturun

```sql
CREATE DATABASE otel_kds_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### 4.2 Veritabanı Tablolarını Oluşturun

```bash
node setup.js
```

Bu komut gerekli tabloları otomatik olarak oluşturur.

### Adım 5: Sunucuyu Başlatın

```bash
npm start
```

Sunucu başarıyla başladığında şu mesajı göreceksiniz:

```
🚀 Server Başladı: http://localhost:3001
✅ Veritabanı Bağlantısı Başarılı
```

### Adım 6: Tarayıcıda Açın

- **Ana Dashboard:** http://localhost:3001/index.html
- **Analytics Sayfası:** http://localhost:3001/analytics.html
- **API Test:** http://localhost:3001/api/dashboard/kpis

---

## 📚 API Endpoint Listesi

### Dashboard API'leri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/dashboard/kpis` | KPI verilerini getirir |
| GET | `/api/dashboard/trends?months=6\|12` | Trend verilerini getirir |
| GET | `/api/dashboard/yillik-karsilastirma` | Yıllık karşılaştırma verilerini getirir |
| GET | `/api/dashboard/doluluk-tahmini?months=6\|12` | Doluluk tahmini getirir |
| GET | `/api/dashboard/gelir-kar-tahmini?months=6\|12` | Gelir ve kar tahmini getirir |
| GET | `/api/dashboard/senaryo-analizi?type=optimistic\|realistic\|pessimistic` | Senaryo analizi getirir |
| GET | `/api/dashboard/risk` | Risk analizi getirir |

### Rezervasyon API'leri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/ozet` | Genel özet verilerini getirir |
| GET | `/api/aylik-doluluk` | Aylık doluluk verilerini getirir |
| GET | `/api/mevsimsel-doluluk` | Mevsimsel doluluk verilerini getirir |
| GET | `/api/rezervasyon-kaynaklari` | Rezervasyon kaynaklarını getirir |

### Analiz API'leri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/rakip-analizi` | Rakip fiyat analizi getirir |
| GET | `/api/rakip-detay/:tip` | Oda tipi bazlı rakip detayları |
| GET | `/api/gelir-trend` | Gelir trend verilerini getirir |
| GET | `/api/kar-marji` | Kar marjı analizi getirir |
| GET | `/api/fiyat-trend-oda-tipi` | Oda tipi bazlı fiyat trendi |
| GET | `/api/tahmin-dogrulugu` | Tahmin doğruluğu analizi |

### Tahmin API'leri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/fiyat-stratejisi` | Fiyat stratejisi önerileri |
| GET | `/api/personel-ihtiyaci` | Personel ihtiyacı tahmini |
| GET | `/api/gelecek-risk-analizi?periyot=6\|12` | Gelecek risk analizi |
| GET | `/api/doluluk-tahmini?periyot=6\|12` | Doluluk tahmini |

### Senaryo API'leri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/simulasyon` | Fiyat simülasyonu yapar |
| POST | `/api/senaryo-kaydet` | Senaryo analizi kaydeder |
| GET | `/api/senaryo-rapor/:id` | Senaryo raporu getirir |
| GET | `/api/senaryo-raporlari` | Tüm senaryo raporlarını getirir |
| GET | `/api/senaryolar` | Senaryo listesini getirir |

### KPI ve Rapor API'leri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/gelismis-kpi` | Gelişmiş KPI verilerini getirir |
| GET | `/api/kpi-detay?kpiTipi=doluluk&periyot=6` | KPI detay verilerini getirir |
| GET | `/api/aylik-rapor` | Aylık rapor getirir |
| GET | `/api/oneriler` | Öneriler motoru sonuçları |

### Kimlik Doğrulama API'leri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/login` | Kullanıcı girişi |

**Detaylı API dokümantasyonu için:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

---

## 💾 CRUD İşlemleri

Proje aşağıdaki CRUD (Create, Read, Update, Delete) işlemlerini içermektedir:

### 1. Rezervasyon Yönetimi

- **Create:** Yeni rezervasyon oluşturma (veritabanı üzerinden)
- **Read:** Rezervasyon listesi ve detay görüntüleme
- **Update:** Rezervasyon bilgilerini güncelleme
- **Delete:** Rezervasyon silme (iş kurallarına göre)

### 2. Senaryo Yönetimi

- **Create:** Yeni senaryo analizi kaydetme (`POST /api/senaryo-kaydet`)
- **Read:** Senaryo listesi ve rapor görüntüleme
- **Update:** Senaryo bilgilerini güncelleme
- **Delete:** Senaryo silme

### 3. Fiyat Geçmişi Yönetimi

- **Create:** Fiyat geçmişi kaydı oluşturma
- **Read:** Fiyat trend analizi görüntüleme
- **Update:** Fiyat bilgilerini güncelleme

---

## ⚙️ İş Kuralları (Business Rules)

Proje, aşağıdaki özel iş kurallarını içermektedir:

### 1. Tarihi Geçmiş Rezervasyon İptal Kuralı

**Kural:** Tarihi geçmiş rezervasyonlar silinemez veya iptal edilemez.

**Uygulama:** 
- Rezervasyon silme/iptal işlemlerinde `giris_tarihi < CURDATE()` kontrolü yapılır
- Geçmiş tarihli rezervasyonlar için işlem engellenir
- Kullanıcıya uyarı mesajı gösterilir

**Kod Konumu:** `controllers/otelController.js`, `controllers/dashboardController.js`

### 2. Personel İhtiyacı Tahmin Kuralı

**Kural:** Doluluk oranına göre personel ihtiyacı otomatik hesaplanır. Düşük doluluk oranlarında personel azaltılabilir, yüksek doluluk oranlarında personel artırılması önerilir.

**Uygulama:**
- Doluluk oranı < %50 ise: Personel azaltma önerilir
- Doluluk oranı > %80 ise: Personel artırma önerilir
- Personel maliyeti toplam gelirin %48'ini geçemez

**Kod Konumu:** `controllers/tahminController.js` - `getPersonelIhtiyaci()`

### 3. Senaryo Kaydetme Validasyon Kuralı

**Kural:** Senaryo kaydetme işleminde gerekli alanlar kontrol edilir ve senaryo tipine göre validasyon yapılır.

**Uygulama:**
- Senaryo adı ve verisi zorunludur
- Simülasyon senaryolarında fiyat değişimi ve personel sayısı kontrol edilir
- Risk seviyesi hesaplanarak sonuç durumu belirlenir

**Kod Konumu:** `controllers/tahminController.js` - `kaydetSenaryoAnalizi()`

### 4. Risk Skoru Hesaplama Kuralı

**Kural:** Risk skoru, düşük doluluk, gelir dalgalanması, personel maliyeti ve rakip fiyat baskısı faktörlerine göre hesaplanır. Her faktör 0-25 puan arasında değerlendirilir.

**Uygulama:**
- Toplam risk skoru 0-100 arasında
- Risk seviyesi: 0-30 (Düşük), 31-60 (Orta), 61-100 (Yüksek)
- Risk skoru > 60 ise uyarı mesajı gösterilir

**Kod Konumu:** `controllers/tahminController.js` - `hesaplaGelecekRiskAnalizi()`

---

## 📊 Veritabanı Yapısı (ER Diyagramı)

Projenin veritabanı yapısı için ER diyagramı `ER_DIYAGRAM.png` veya `ER_DIYAGRAM.pdf` dosyasında bulunmaktadır.

### Ana Tablolar

1. **rezervasyonlar** - Rezervasyon bilgileri
2. **oda_tipleri** - Oda tipi tanımları
3. **fiyat_gecmisi** - Fiyat geçmişi kayıtları
4. **senaryolar** - Senaryo analizleri
5. **personeller** - Personel bilgileri
6. **rezervasyon_log** - Rezervasyon değişiklik logları

**Detaylı veritabanı şeması için:** [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)

---

## 🛠️ Teknik Detaylar

### Backend Teknolojileri

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MySQL2** - Veritabanı bağlantı kütüphanesi
- **dotenv** - Ortam değişkenleri yönetimi
- **Axios** - HTTP client (dış API'ler için)

### Frontend Teknolojileri

- **HTML5** - Yapısal markup
- **CSS3** - Stil tanımlamaları
- **JavaScript (ES6+)** - İstemci tarafı mantık
- **Bootstrap 5** - CSS framework
- **Chart.js** - Grafik kütüphanesi

### REST API Prensipleri

- **RESTful tasarım:** HTTP metodları doğru kullanılmıştır (GET, POST)
- **Resource-based URL'ler:** Endpoint'ler kaynak bazlıdır
- **JSON format:** Tüm API yanıtları JSON formatındadır
- **Stateless:** Her istek bağımsızdır
- **Hata yönetimi:** Standart HTTP status kodları kullanılmıştır

---

## 📝 Kullanım Örnekleri

### API Kullanımı

```bash
# KPI verilerini al
curl http://localhost:3001/api/dashboard/kpis

# Doluluk tahmini al (6 ay)
curl "http://localhost:3001/api/dashboard/doluluk-tahmini?months=6"

# Senaryo analizi al (gerçekçi)
curl "http://localhost:3001/api/dashboard/senaryo-analizi?type=realistic"

# Risk analizi al
curl http://localhost:3001/api/dashboard/risk
```

### Senaryo Kaydetme

```bash
curl -X POST http://localhost:3001/api/senaryo-kaydet \
  -H "Content-Type: application/json" \
  -d '{
    "senaryo_adi": "Fiyat Artışı Senaryosu",
    "periyot": 6,
    "senaryo_verisi": {
      "senaryo_tipi": "simulasyon",
      "fiyat_degisimi": 10,
      "personel_sayisi": 25,
      "tahmini_ciro": 5000000,
      "net_kar": 2000000
    }
  }'
```

---

## 🧪 Test

Test planı ve test senaryoları için [TEST_PLAN.md](./TEST_PLAN.md) dosyasına bakın.

---

## 📄 Lisans

ISC License

---

## 👥 Katkıda Bulunanlar

Bu proje akademik amaçlı geliştirilmiştir.

---

## 📞 İletişim

Sorularınız için issue açabilir veya dokümantasyonu inceleyebilirsiniz.

---

## 📚 Ek Kaynaklar

- [API Dokümantasyonu](./API_DOCUMENTATION.md)
- [Veritabanı Şeması](./DATABASE_SCHEMA.md)
- [Test Planı](./TEST_PLAN.md)
- [Proje Özeti](./PROJE_OZET.md)

---

**Son Güncelleme:** 2024  
**Versiyon:** 1.0.0
