# Veritabanı Şema Dokümantasyonu

## 📊 İlişkisel Veritabanı Yapısı

Bu dokümantasyon, HotelVision - Karar Destek Platformu'nun ilişkisel veritabanı yapısını açıklar.

---

## 🗂️ Tablolar

### 1. **oda_tipleri** (Master Table)
Oda tiplerinin tanımlandığı referans tablosu.

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | INT (PK) | Oda tipi ID |
| `oda_tipi_adi` | VARCHAR(50) | Oda tipi adı (Standart, Deluxe, Suit, Kral Dairesi) |
| `aciklama` | TEXT | Oda tipi açıklaması |
| `varsayilan_fiyat` | DECIMAL(10,2) | Varsayılan fiyat |
| `olusturulma_tarihi` | TIMESTAMP | Oluşturulma tarihi |

**İlişkiler:**
- `rezervasyonlar.oda_tipi_id` → `oda_tipleri.id` (FK)
- `fiyat_gecmisi.oda_tipi_id` → `oda_tipleri.id` (FK)
- `odalar.oda_tipi_id` → `oda_tipleri.id` (FK)

---

### 2. **rezervasyonlar** (Fact Table)
Rezervasyon bilgilerinin tutulduğu ana tablo.

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | INT (PK) | Rezervasyon ID |
| `oda_tipi` | VARCHAR(50) | Oda tipi adı (eski kolon, geriye dönük uyumluluk için) |
| `oda_tipi_id` | INT (FK) | Oda tipi ID (yeni ilişkisel kolon) |
| `fiyat` | DECIMAL(10,2) | Rezervasyon fiyatı |
| `giris_tarihi` | DATE | Giriş tarihi |
| `konaklama_suresi` | INT | Konaklama süresi (gece) |
| `iptal_durumu` | TINYINT | İptal durumu (0: Aktif, 1: İptal) |
| ... | ... | Diğer rezervasyon kolonları |

**İlişkiler:**
- `oda_tipi_id` → `oda_tipleri.id` (FK, ON DELETE SET NULL, ON UPDATE CASCADE)

**Index'ler:**
- `idx_giris_tarihi` (giris_tarihi)
- `idx_iptal_durumu` (iptal_durumu)
- `idx_oda_tipi_id` (oda_tipi_id)

---

### 3. **fiyat_gecmisi** (Fact Table)
Fiyat geçmişi bilgilerinin tutulduğu tablo.

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | INT (PK) | Fiyat geçmişi ID |
| `oda_tipi` | VARCHAR(50) | Oda tipi adı (eski kolon) |
| `oda_tipi_id` | INT (FK) | Oda tipi ID (yeni ilişkisel kolon) |
| `fiyat` | DECIMAL(10,2) | Fiyat |
| `tarih` | DATE | Fiyat tarihi |
| ... | ... | Diğer fiyat kolonları |

**İlişkiler:**
- `oda_tipi_id` → `oda_tipleri.id` (FK, ON DELETE SET NULL, ON UPDATE CASCADE)

**Index'ler:**
- `idx_tarih` (tarih)
- `idx_oda_tipi_id` (oda_tipi_id)

---

### 4. **odalar** (Dimension Table)
Oda bilgilerinin tutulduğu tablo.

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | INT (PK) | Oda ID |
| `oda_no` | VARCHAR(20) | Oda numarası (UNIQUE) |
| `oda_tipi_id` | INT (FK) | Oda tipi ID |
| `durum` | ENUM | Oda durumu (Bos, Dolu, Temizlik, Bakim) |
| `olusturulma_tarihi` | TIMESTAMP | Oluşturulma tarihi |

**İlişkiler:**
- `oda_tipi_id` → `oda_tipleri.id` (FK, ON DELETE SET NULL, ON UPDATE CASCADE)

**Index'ler:**
- `idx_oda_tipi_id` (oda_tipi_id)
- `idx_durum` (durum)

---

### 5. **senaryolar** (Fact Table)
Kaydedilen senaryo analizlerinin tutulduğu tablo.

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | INT (PK) | Senaryo ID |
| `senaryo_adi` | VARCHAR(255) | Senaryo adı |
| `senaryo_tipi` | ENUM | Senaryo tipi (iyimser, realist, kotumser, simulasyon) |
| `fiyat_degisimi` | DECIMAL(5,2) | Fiyat değişimi yüzdesi |
| `kampanya_turu` | VARCHAR(100) | Kampanya türü |
| `sonuc_veri` | JSON | Senaryo sonuç verileri (JSON) |
| `sonuc_durumu` | ENUM | Sonuç durumu (Başarılı, Orta, Riskli) |
| `tarih` | TIMESTAMP | Oluşturulma tarihi |

**Index'ler:**
- `idx_senaryo_tarih` (tarih)
- `idx_senaryo_tip` (senaryo_tipi)
- `idx_senaryo_durum` (sonuc_durumu)

---

### 6. **personeller** (Dimension Table)
Personel bilgilerinin tutulduğu tablo.

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | INT (PK) | Personel ID |
| `ad_soyad` | VARCHAR(255) | Personel adı soyadı |
| `departman` | VARCHAR(100) | Departman |
| `pozisyon` | VARCHAR(100) | Pozisyon |
| `maas` | DECIMAL(10,2) | Maaş |
| `vardiya` | VARCHAR(50) | Vardiya |
| `olusturulma_tarihi` | TIMESTAMP | Oluşturulma tarihi |

**Index'ler:**
- `idx_departman` (departman)

---

### 7. **rezervasyon_log** (Log Table)
Rezervasyon değişikliklerinin loglandığı tablo.

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | INT (PK) | Log ID |
| `rezervasyon_id` | INT | Rezervasyon ID |
| `islem_tipi` | ENUM | İşlem tipi (INSERT, UPDATE, DELETE) |
| `eski_deger` | TEXT | Eski değer (JSON) |
| `yeni_deger` | TEXT | Yeni değer (JSON) |
| `islem_tarihi` | TIMESTAMP | İşlem tarihi |

**Index'ler:**
- `idx_rezervasyon_id` (rezervasyon_id)
- `idx_islem_tarihi` (islem_tarihi)

---

### 8. **fiyat_gecmisi_log** (Log Table)
Fiyat değişikliklerinin loglandığı tablo.

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | INT (PK) | Log ID |
| `fiyat_gecmisi_id` | INT | Fiyat geçmişi ID |
| `eski_fiyat` | DECIMAL(10,2) | Eski fiyat |
| `yeni_fiyat` | DECIMAL(10,2) | Yeni fiyat |
| `oda_tipi_id` | INT (FK) | Oda tipi ID |
| `degisim_tarihi` | TIMESTAMP | Değişim tarihi |

**İlişkiler:**
- `oda_tipi_id` → `oda_tipleri.id` (FK)

**Index'ler:**
- `idx_fiyat_gecmisi_id` (fiyat_gecmisi_id)
- `idx_oda_tipi_id` (oda_tipi_id)
- `idx_degisim_tarihi` (degisim_tarihi)

---

### 9. **doluluk_ozeti** (Summary Table)
Doluluk özet bilgilerinin tutulduğu tablo.

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | INT (PK) | Özet ID |
| `tarih` | DATE | Tarih (UNIQUE) |
| `toplam_oda` | INT | Toplam oda sayısı |
| `dolu_oda` | INT | Dolu oda sayısı |
| `bos_oda` | INT | Boş oda sayısı |
| `doluluk_orani` | DECIMAL(5,2) | Doluluk oranı (%) |
| `guncelleme_tarihi` | TIMESTAMP | Güncelleme tarihi |

**Index'ler:**
- `unique_tarih` (tarih, UNIQUE)
- `idx_tarih` (tarih)

---

### 10. **karar_onerileri** (Decision Support Table)
Karar önerilerinin tutulduğu tablo.

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | INT (PK) | Öneri ID |
| ... | ... | Öneri kolonları |

---

### 11. **tahminler** (Forecast Table)
Tahmin verilerinin tutulduğu tablo.

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | INT (PK) | Tahmin ID |
| ... | ... | Tahmin kolonları |

---

### 12. **simulasyon_gecmisi** (Simulation History Table)
Simülasyon geçmişinin tutulduğu tablo.

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | INT (PK) | Simülasyon ID |
| ... | ... | Simülasyon kolonları |

---

### 13. **taslak_senaryolar** (Draft Scenarios Table)
Taslak senaryoların tutulduğu tablo.

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | INT (PK) | Taslak ID |
| ... | ... | Taslak kolonları |

---

## 🔗 İlişkisel Yapı Diyagramı

```
oda_tipleri (Master)
    │
    ├─→ rezervasyonlar.oda_tipi_id
    ├─→ fiyat_gecmisi.oda_tipi_id
    ├─→ odalar.oda_tipi_id
    └─→ fiyat_gecmisi_log.oda_tipi_id

rezervasyonlar (Fact)
    └─→ rezervasyon_log.rezervasyon_id (opsiyonel)

fiyat_gecmisi (Fact)
    └─→ fiyat_gecmisi_log.fiyat_gecmisi_id (opsiyonel)
```

---

## 🗑️ Silinen Tablolar

Aşağıdaki tablolar kullanılmadığı için veritabanından silinmiştir:

- `bookings` (eski rezervasyon tablosu, `rezervasyonlar` kullanılıyor)
- `countries` (kullanılmıyor)
- `hotel_bookings_raw` (kullanılmıyor)
- `hotels` (kullanılmıyor)
- `market_segments` (kullanılmıyor)
- `musteriler` (kullanılmıyor)
- `rakip_fiyatlari` (kullanılmıyor, API'den çekiliyor)

---

## 📝 Notlar

1. **Geriye Dönük Uyumluluk**: `rezervasyonlar` ve `fiyat_gecmisi` tablolarında hem `oda_tipi` (VARCHAR) hem de `oda_tipi_id` (INT FK) kolonları bulunmaktadır. Bu, mevcut kodun çalışmaya devam etmesi için gereklidir.

2. **Foreign Key Politikaları**:
   - `ON DELETE SET NULL`: Ana kayıt silindiğinde, ilişkili kayıtların foreign key değeri NULL olur.
   - `ON UPDATE CASCADE`: Ana kayıt güncellendiğinde, ilişkili kayıtlar otomatik güncellenir.

3. **Index'ler**: Sık kullanılan sorgular için performans optimizasyonu amacıyla index'ler eklenmiştir.

4. **Trigger'lar**: `rezervasyon_log`, `fiyat_gecmisi_log` ve `doluluk_ozeti` tabloları MySQL trigger'ları tarafından otomatik olarak güncellenir.

---

## 🚀 Kurulum

İlişkisel veritabanı yapısını oluşturmak için:

```bash
node create_relational_db.js
```

Bu script:
- Kullanılmayan tabloları siler
- `oda_tipleri` master tablosunu oluşturur
- Mevcut tablolara foreign key'leri ekler
- Index'leri oluşturur
- Veri bütünlüğünü sağlar

---

## 📊 Veri Bütünlüğü

İlişkisel yapı sayesinde:
- ✅ Oda tipi referansları tutarlıdır
- ✅ Referans bütünlüğü korunur
- ✅ Veri tekrarı azalır
- ✅ Sorgu performansı artar
- ✅ Veri güncellemeleri kolaylaşır

---

**Son Güncelleme**: 2024
**Versiyon**: 1.0

