const fs = require('fs');
const mysql = require('mysql2');
const csv = require('csv-parser');

// Veritabanı Bağlantısı (MAMP Port: 8889)
const db = mysql.createConnection({
    host: '127.0.0.1', user: 'root', password: 'root', database: 'kds_oteldb', port: 8889
});

const odaTipiMap = {
    'A': 'Standart', 'B': 'Standart', 'C': 'Standart', 'L': 'Standart',
    'D': 'Deluxe',   'E': 'Deluxe',   'K': 'Deluxe',
    'F': 'Suit',     'G': 'Suit',     'H': 'Kral Dairesi', 'P': 'Kral Dairesi'
};

// 🔥 FİYAT ÇARPANI (Döviz -> TL Dönüşümü)
const FIYAT_CARPANI = 35.0; 

const veriler = [];

db.connect(err => {
    if (err) { console.error("❌ Veritabanı hatası:", err.message); return; }
    console.log("✅ Veritabanı bağlandı. Tablo sıfırlanıyor...");

    db.query("DROP TABLE IF EXISTS fiyat_gecmisi", () => {
        const createTableSQL = `CREATE TABLE fiyat_gecmisi (id INT AUTO_INCREMENT PRIMARY KEY, oda_tipi VARCHAR(50), fiyat DECIMAL(10,2), tarih DATE)`;
        
        db.query(createTableSQL, () => {
            console.log("✅ Tablo hazır. CSV işleniyor...");

            fs.createReadStream('hotel_bookings.csv')
                .pipe(csv())
                .on('data', (row) => {
                    const tip = odaTipiMap[row.reserved_room_type] || 'Standart';
                    let hamFiyat = parseFloat(row.adr);
                    
                    if (hamFiyat <= 0) return;

                    // Fiyat Artırımı
                    let ekstraCarpan = (tip === 'Suit') ? 1.5 : (tip === 'Kral Dairesi' ? 3.0 : 1);
                    const guncelFiyat = hamFiyat * FIYAT_CARPANI * ekstraCarpan;
                    
                    // Tarih Kaydırma (+8 Yıl)
                    if (row.reservation_status_date) {
                        let tarihObj = new Date(row.reservation_status_date);
                        tarihObj.setFullYear(tarihObj.getFullYear() + 8);
                        const yeniTarih = tarihObj.toISOString().split('T')[0];
                        veriler.push([tip, guncelFiyat, yeniTarih]);
                    }
                })
                .on('end', () => {
                    console.log(`📊 ${veriler.length} kayıt işlendi. DB'ye yazılıyor...`);
                    const chunkSize = 1000;
                    
                    function veriYukle() {
                        if (veriler.length === 0) {
                            console.log("🎉 İŞLEM TAMAM! Sunucuyu başlatabilirsin.");
                            process.exit();
                        }
                        const paket = veriler.splice(0, chunkSize);
                        db.query("INSERT INTO fiyat_gecmisi (oda_tipi, fiyat, tarih) VALUES ?", [paket], (err) => {
                            if (err) { console.error(err); process.exit(1); }
                            process.stdout.write(`\r⏳ Kalan veri: ${veriler.length}`);
                            veriYukle();
                        });
                    }
                    veriYukle();
                });
        });
    });
});

