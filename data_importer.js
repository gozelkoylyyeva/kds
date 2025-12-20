const fs = require('fs');
const mysql = require('mysql2');
const csv = require('csv-parser');

console.log("🏁 Script başlatıldı...");

// 1. Dosya Kontrolü
const csvFileName = 'hotel_bookings.csv';
if (!fs.existsSync(csvFileName)) {
    console.error(`❌ HATA: '${csvFileName}' dosyası bulunamadı!`);
    process.exit(1);
}

// 2. MySQL Bağlantı Ayarları
const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'root',      // MAMP şifresi
    database: 'kds_oteldb', // Veritabanı adı
    port: 8889,            // MAMP portu
    multipleStatements: true
});

connection.connect((err) => {
    if (err) {
        console.error("❌ Veritabanı bağlantı hatası: " + err.message);
        process.exit(1);
    }
    console.log("✅ Veritabanı bağlantısı başarılı. Veri aktarımı başlıyor...");
    startImport();
});

const monthMap = {
    "January": "01", "February": "02", "March": "03", "April": "04", "May": "05", "June": "06",
    "July": "07", "August": "08", "September": "09", "October": "10", "November": "11", "December": "12"
};

function startImport() {
    let results = [];
    let count = 0;

    fs.createReadStream(csvFileName)
        .pipe(csv())
        .on('data', (data) => {
            try {
                let monthNum = monthMap[data.arrival_date_month] || "01";
                let dayNum = (data.arrival_date_day_of_month || "01").padStart(2, '0');
                let fullDate = `${data.arrival_date_year}-${monthNum}-${dayNum}`;

                let row = [
                    data.hotel,
                    parseInt(data.is_canceled) || 0,
                    fullDate,
                    (parseInt(data.stays_in_weekend_nights) || 0) + (parseInt(data.stays_in_week_nights) || 0),
                    parseInt(data.adults) || 0,
                    parseInt(data.children) || 0,
                    data.country || 'UNK',
                    data.market_segment,
                    parseInt(data.is_repeated_guest) || 0,
                    data.reserved_room_type,
                    parseFloat(data.adr) || 0.0,
                    parseInt(data.total_of_special_requests) || 0
                ];
                results.push(row);
                count++;

                if (results.length >= 5000) {
                    bulkInsert(results);
                    results = [];
                    process.stdout.write(`\r🚀 ${count} satır işlendi...`);
                }
            } catch (err) {}
        })
        .on('end', () => {
            if (results.length > 0) bulkInsert(results);
            console.log('\n✅ Okuma bitti. Son veriler yazılıyor...');
            setTimeout(() => {
                console.log("🎉 TEBRİKLER! Tüm veriler başarıyla yüklendi.");
                connection.end();
            }, 5000);
        });
}

function bulkInsert(rows) {
    let sql = `INSERT INTO rezervasyonlar 
    (otel_tipi, iptal_durumu, giris_tarihi, konaklama_suresi, yetiskin_sayisi, cocuk_sayisi, ulke, market_segmenti, tekrar_gelen, oda_tipi, fiyat, ozel_istek_sayisi) 
    VALUES ?`;
    connection.query(sql, [rows], (err) => {
        if (err) console.error("\n❌ SQL Hatası:", err.message);
    });
}
