# 🏨 Otel Karar Destek Sistemi - Proje Özeti

## 📋 Proje Hakkında

**Otel Karar Destek Sistemi (KDS)** - HotelVision, otel işletmelerinin 6-12 aylık stratejik karar alma süreçlerini destekleyen, veri odaklı bir analiz ve görselleştirme platformudur. Sistem, karar vermez; sadece analizler, tahminler ve alternatifler sunar. Nihai karar yöneticiye aittir.

---

## 🎯 Temel Özellikler

### 1. **KPI İzleme ve Dashboard**
- Doluluk oranı, toplam gelir, kar marjı, iptal oranı takibi
- Aylık trend analizleri ve görselleştirmeler
- Gerçek zamanlı veri güncellemeleri

### 2. **Tahmin ve Analiz**
- 6-12 aylık doluluk tahminleri (min-max aralıkları)
- Gelir ve kar tahminleri
- Belirsizlik seviyesi göstergeleri

### 3. **Senaryo Analizi**
- İyimser, gerçekçi ve kötümser senaryolar
- Farklı stratejilerin karşılaştırılması
- Risk skorları ve etki analizleri

### 4. **Rakip Analizi**
- Piyasa fiyat karşılaştırmaları
- Rekabet pozisyonu analizi
- Oda tipi bazlı fiyat karşılaştırmaları

### 5. **Personel ve Kaynak Yönetimi**
- Doluluk oranına göre personel ihtiyacı tahmini
- Departman bazlı öneriler
- Maliyet optimizasyon analizleri

### 6. **Risk Analizi**
- Gelecek dönem risk skorları
- Risk seviyesi değerlendirmeleri
- Uyarı ve öneriler

---

## 🛠️ Teknik Yapı

### Backend
- **Framework:** Node.js + Express.js
- **Veritabanı:** MySQL (İlişkisel veritabanı yapısı)
- **API:** RESTful API yapısı
- **Trigger'lar:** Otomatik veri loglama ve güncelleme

### Frontend
- **UI Framework:** Bootstrap 5
- **Grafik Kütüphanesi:** Chart.js
- **Responsive:** Mobil ve masaüstü uyumlu
- **İnteraktif Dashboard:** Dinamik filtreleme ve görselleştirme

### Veritabanı Yapısı
- **Ana Tablolar:** `rezervasyonlar`, `fiyat_gecmisi`, `oda_tipleri`, `odalar`
- **Analiz Tabloları:** `senaryolar`, `tahminler`, `doluluk_ozeti`
- **Log Tabloları:** `rezervasyon_log`, `fiyat_gecmisi_log`
- **İlişkisel Yapı:** Foreign key'ler ve index'ler ile veri bütünlüğü

---

## 📊 Kullanım Senaryoları

1. **Fiyat Stratejisi:** Rakip fiyat analizi ve fiyatlandırma kararları
2. **Rezervasyon Yönetimi:** Doluluk tahminleri ve planlaması
3. **Personel Planlaması:** İş gücü optimizasyonu ve maliyet yönetimi
4. **Pazarlama Bütçesi:** Kampanya etkinliği ve ROI analizi
5. **Risk Yönetimi:** Senaryo analizi ve stratejik planlama

---

## 🚀 Hızlı Başlangıç

### Gereksinimler
- Node.js 16.0.0+
- MySQL 8.0+
- npm 7.0+

### Kurulum
```bash
# Bağımlılıkları yükle
npm install

# Veritabanı kurulumu
node setup.js

# Sunucuyu başlat
npm start
```

### Erişim
- **Dashboard:** http://localhost:3001/dashboard.html
- **Ana Sayfa:** http://localhost:3001/index.html
- **API Base URL:** http://localhost:3001/api

---

## 📚 Ana Dosyalar

### Backend
- `app.js` - Ana sunucu dosyası
- `database.js` - Veritabanı bağlantısı
- `routes/api.js` - API route'ları
- `controllers/` - İş mantığı controller'ları

### Frontend
- `dashboard.html` - Ana dashboard sayfası
- `dashboard.js` - Dashboard JavaScript
- `dashboard.css` - Dashboard stilleri

### Veritabanı
- `setup_complete_database.js` - Veritabanı kurulum script'i

---

## 🎯 Karar Destek Sistemi Prensipleri

1. **Analiz Sunar, Karar Vermez:** Sistem alternatifler ve olasılıklar sunar
2. **Belirsizlik Gösterir:** Tüm tahminler aralık ve belirsizlik seviyesi ile sunulur
3. **Gerçek Veri Tabanlı:** Geçmiş verilerden öğrenir ve gerçekçi tahminler üretir
4. **Yönetici Kararı:** Nihai karar yöneticiye aittir

---

## 📖 Dokümantasyon

- **README.md** - Genel proje dokümantasyonu
- **API_DOCUMENTATION.md** - API endpoint dokümantasyonu
- **DATABASE_SCHEMA.md** - Veritabanı şema dokümantasyonu
- **KARAR_DESTEK_REHBERI.md** - Kullanım rehberi ve sunum kılavuzu
- **TEST_PLAN.md** - Test planı ve senaryoları

---

## 📈 Örnek Kullanım

### API Kullanımı
```bash
# KPI verilerini al
curl http://localhost:3001/api/dashboard/kpis

# Trend verilerini al (6 ay)
curl "http://localhost:3001/api/dashboard/trends?months=6"

# Doluluk tahmini al
curl "http://localhost:3001/api/doluluk-tahmini?months=6"

# Senaryo analizi
curl "http://localhost:3001/api/senaryo-analizi?type=realistic"
```

---

## 🔧 Önemli Notlar

- Sistem karar vermez, sadece analiz ve alternatifler sunar
- Tüm tahminler belirsizlik seviyesi ile birlikte sunulur
- Senaryo analizleri farklı stratejilerin sonuçlarını gösterir
- Risk analizleri uyarı niteliğindedir, kesin hüküm değildir
- Veriler geçmiş verilerden öğrenilir ve gerçekçi tahminler üretilir

---

**Versiyon:** 1.0.0  
**Lisans:** ISC  
**Durum:** Aktif Geliştirme  
**Son Güncelleme:** 2024

