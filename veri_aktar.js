const fs = require('fs');
const mysql = require('mysql2');
const csv = require('csv-parser');

// Veritabanı Bağlantısı
const db = mysql.createConnection({
    host: '127.0.0.1', 
    user: 'root', 
    password: 'root', 
    database: 'kds_oteldb', 
    port: 8889
});

// Oda Tipi Eşleştirme
const odaTipiMap = {
    'A': 'Standart', 'B': 'Standart', 'C': 'Standart', 'L': 'Standart',
    'D': 'Deluxe',   'E': 'Deluxe',   'K': 'Deluxe',
    'F': 'Suit',     'G': 'Suit',
    'H': 'Kral Dairesi', 'P': 'Kral Dairesi'
};

// 🔥 FİYAT ÇARPANI (Döviz Kuru ve Enflasyon Farkı)
// Orijinal verideki 100 birim -> 3500 TL olacak
const FIYAT_CARPANI = 35.0; 

const veriler = [];

db.connect(err => {
    if (err) {
        console.error("❌ Veritabanı bağlantı hatası:", err.message);
        return;
    }
    console.log("✅ Veritabanına bağlanıldı. Eski veriler siliniyor...");

    // Tabloyu Temizle
    db.query("DROP TABLE IF EXISTS fiyat_gecmisi", () => {
        const createTableSQL = `
            CREATE TABLE fiyat_gecmisi (
                id INT AUTO_INCREMENT PRIMARY KEY,
                oda_tipi VARCHAR(50),
                fiyat DECIMAL(10,2),
                tarih DATE
            )
        `;
        
        db.query(createTableSQL, () => {
            console.log("✅ Tablo temizlendi. CSV okunuyor (Fiyatlar x35 yapılıyor)...");

            fs.createReadStream('hotel_bookings.csv')
                .pipe(csv())
                .on('data', (row) => {
                    const tipKod = row.reserved_room_type;
                    const tip = odaTipiMap[tipKod] || 'Standart';
                    
                    // --- 🔥 FİYAT GÜNCELLEME ---
                    // Orijinal fiyatı çarpanla çarpıyoruz
                    let hamFiyat = parseFloat(row.adr);
                    
                    // Bazı verilerde 0 veya negatif fiyat olabiliyor, onları filtrele
                    if (hamFiyat <= 0) return;

                    // Kral Dairesi gibi özel odalar veride az olabilir, fiyatını ekstra artıralım
                    let ekstraCarpan = 1;
                    if (tip === 'Suit') ekstraCarpan = 1.5;
                    if (tip === 'Kral Dairesi') ekstraCarpan = 3.0;

                    const guncelFiyat = hamFiyat * FIYAT_CARPANI * ekstraCarpan;
                    
                    // --- TARİH GÜNCELLEME (8 Yıl İleri) ---
                    if (row.reservation_status_date) {
                        let tarihObj = new Date(row.reservation_status_date);
                        tarihObj.setFullYear(tarihObj.getFullYear() + 8); // 2015 -> 2023
                        const yeniTarih = tarihObj.toISOString().split('T')[0];

                        // Veri listesine ekle
                        veriler.push([tip, guncelFiyat, yeniTarih]);
                    }
                })
                .on('end', () => {
                    console.log(`📊 Toplam ${veriler.length} adet veri işlendi.`);
                    console.log(`💰 Örnek Fiyat: ${veriler[0][1].toFixed(2)} TL (Eskisi: ${(veriler[0][1]/FIYAT_CARPANI).toFixed(2)})`);
                    console.log("💾 Veritabanına yazılıyor...");

                    const chunkSize = 1000;
                    let islenen = 0;

                    function veriYukle() {
                        if (veriler.length === 0) {
                            console.log("🎉 İŞLEM TAMAM! Fiyatlar güncel kurla (x35) veritabanına işlendi.");
                            console.log("👉 Şimdi sunucuyu yeniden başlat: 'node server.js'");
                            process.exit();
                        }

                        const paket = veriler.splice(0, chunkSize);
                        const sql = "INSERT INTO fiyat_gecmisi (oda_tipi, fiyat, tarih) VALUES ?";
                        
                        db.query(sql, [paket], (err) => {
                            if (err) {
                                console.error("❌ Hata:", err);
                                process.exit(1);
                            }
                            islenen += paket.length;
                            process.stdout.write(`\r⏳ Yüklenen: ${islenen}...`);
                            veriYukle();
                        });
                    }
                    veriYukle();
                });
        });
    });
});