const mysql = require('mysql2');

// Veritabanı Bağlantısı (Mac için Port 8889)
const db = mysql.createConnection({
    host: '127.0.0.1', user: 'root', password: 'root', 
    database: 'kds_oteldb', port: 8889, multipleStatements: true
});

const sql = `
    DROP TABLE IF EXISTS fiyat_gecmisi;

    CREATE TABLE fiyat_gecmisi (
        id INT AUTO_INCREMENT PRIMARY KEY,
        oda_tipi VARCHAR(50),
        fiyat DECIMAL(10,2),
        tarih DATE
    );
`;

db.connect(err => {
    if(err) { console.error("❌ Veritabanı Bağlantı Hatası:", err.message); process.exit(1); }
    
    db.query(sql, () => {
        console.log("✅ Tablo Oluşturuldu: fiyat_gecmisi");
        
        // --- RASTGELE GEÇMİŞ VERİSİ ÜRET ---
        let veriler = [];
        const odalar = { 'Standart': 3000, 'Deluxe': 4500, 'Suit': 7500, 'Kral Dairesi': 25000 };
        const aylar = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // 12 Aylık veri

        for (const [tip, bazFiyat] of Object.entries(odalar)) {
            aylar.forEach(ay => {
                // Rastgele bir tarih (2024 yılı)
                let tarih = `2024-${String(ay).padStart(2, '0')}-15`;
                
                // Sezonluk Fiyat Dalgalanması
                let carpan = 1.0;
                if(ay >= 6 && ay <= 9) carpan = 1.4; // Yazın pahalı
                if(ay <= 2 || ay >= 11) carpan = 0.8; // Kışın ucuz

                let fiyat = bazFiyat * carpan * (1 + (Math.random() * 0.1 - 0.05));
                veriler.push([tip, Math.round(fiyat), tarih]);
            });
        }

        const insertSql = "INSERT INTO fiyat_gecmisi (oda_tipi, fiyat, tarih) VALUES ?";
        db.query(insertSql, [veriler], (err) => {
            if(err) console.error("❌ Veri Ekleme Hatası:", err);
            else console.log("✅ GEÇMİŞ VERİLER YÜKLENDİ (Grafikler artık çalışacak).");
            process.exit();
        });
    });
});