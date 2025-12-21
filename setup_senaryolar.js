const mysql = require('mysql2');

// Veritabanı Bağlantısı (Mac için Port 8889)
const db = mysql.createConnection({
    host: '127.0.0.1', user: 'root', password: 'root', 
    database: 'kds_oteldb', port: 8889, multipleStatements: true
});

const sql = `
    CREATE TABLE IF NOT EXISTS senaryolar (
        id INT AUTO_INCREMENT PRIMARY KEY,
        senaryo_adi VARCHAR(255) NOT NULL,
        senaryo_tipi ENUM('iyimser', 'realist', 'kotumser') NOT NULL,
        fiyat_degisimi DECIMAL(5,2) DEFAULT 0,
        kampanya_turu VARCHAR(100),
        sonuc_veri JSON,
        sonuc_durumu ENUM('Başarılı', 'Riskli') DEFAULT 'Riskli',
        tarih TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tarih (tarih),
        INDEX idx_tip (senaryo_tipi)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

db.connect(err => {
    if(err) { 
        console.error("❌ Veritabanı Bağlantı Hatası:", err.message); 
        process.exit(1); 
    }
    
    db.query(sql, (err) => {
        if(err) {
            console.error("❌ Tablo Oluşturma Hatası:", err.message);
            process.exit(1);
        }
        console.log("✅ Senaryolar tablosu oluşturuldu!");
        process.exit(0);
    });
});

