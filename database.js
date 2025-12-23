const mysql = require('mysql2');
require('dotenv').config();

// MySQL Bağlantı Havuzu
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '12345678', // MySQL şifrenizi buraya girin
    database: process.env.DB_NAME || 'otel_kds_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const db = pool.promise();

async function initDb() {
    try {
        // Tabloları yeniden oluşturmadan önce yabancı anahtar (foreign key) kısıtlamalarına takılmamak için
        // doğru sırada (önce bookings) siliyoruz.
        // await db.query(`DROP TABLE IF EXISTS bookings`);
        // await db.query(`DROP TABLE IF EXISTS hotels`);
        // await db.query(`DROP TABLE IF EXISTS countries`);
        // await db.query(`DROP TABLE IF EXISTS market_segments`);

        // 1. Oteller Tablosu (Dimension)
        await db.query(`CREATE TABLE IF NOT EXISTS hotels (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) UNIQUE
        )`);

        // 2. Ülkeler Tablosu (Dimension)
        await db.query(`CREATE TABLE IF NOT EXISTS countries (
            id INT AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(10) UNIQUE
        )`);

        // 3. Pazar Segmentleri (Dimension)
        await db.query(`CREATE TABLE IF NOT EXISTS market_segments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) UNIQUE
        )`);

        // 4. Rezervasyonlar Tablosu (Fact Table)
        await db.query(`CREATE TABLE IF NOT EXISTS bookings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            hotel_id INT,
            country_id INT,
            market_segment_id INT,
            is_canceled BOOLEAN,
            lead_time INT,
            arrival_date DATE,
            stays_nights INT,
            adults INT,
            children INT,
            meal VARCHAR(50),
            distribution_channel VARCHAR(50),
            is_repeated_guest BOOLEAN,
            reserved_room_type VARCHAR(10),
            assigned_room_type VARCHAR(10),
            deposit_type VARCHAR(50),
            agent INT,
            company INT,
            customer_type VARCHAR(50),
            adr DECIMAL(10, 2),
            reservation_status VARCHAR(50),
            reservation_status_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (hotel_id) REFERENCES hotels(id),
            FOREIGN KEY (country_id) REFERENCES countries(id),
            FOREIGN KEY (market_segment_id) REFERENCES market_segments(id)
        )`);

        console.log('MySQL tabloları başarıyla oluşturuldu/kontrol edildi.');
    } catch (err) {
        console.error('Veritabanı başlatma hatası:', err);
        console.error(`Bağlantı Detayları: Host=${process.env.DB_HOST}, Port=${process.env.DB_PORT}, User=${process.env.DB_USER}, DB=${process.env.DB_NAME}`);
        throw err; // Hata varsa işlemi durdurmak için hatayı fırlat
    }
}

module.exports = { db, initDb };