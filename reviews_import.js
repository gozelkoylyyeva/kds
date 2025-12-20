const fs = require('fs');
const mysql = require('mysql2');
const csv = require('csv-parser');
const Sentiment = require('sentiment'); // YENİ: Duygu Analizi kütüphanesi

console.log("🏁 Yorum Scripti Başlatıldı...");

// 1. Dosya Kontrolü (TripAdvisor dosya adını buraya yaz)
const csvFileName = 'tripadvisor_hotel_reviews.csv'; 
const sentiment = new Sentiment();

if (!fs.existsSync(csvFileName)) {
    console.error(`❌ HATA: '${csvFileName}' dosyası bulunamadı!`);
    process.exit(1);
}

// 2. MySQL Bağlantısı (Senin ayarların)
const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'root',      
    database: 'kds_oteldb', 
    port: 8889,            
    multipleStatements: true
});

connection.connect((err) => {
    if (err) {
        console.error("❌ Veritabanı hatası: " + err.message);
        process.exit(1);
    }
    console.log("✅ Bağlantı başarılı. Yorumlar analiz edilip yükleniyor...");
    startImport();
});

// Basit Kategori Belirleme Fonksiyonu
function getCategory(text) {
    const t = text.toLowerCase();
    if (t.includes('clean') || t.includes('dirty')) return 'Temizlik';
    if (t.includes('staff') || t.includes('reception')) return 'Personel';
    if (t.includes('food') || t.includes('breakfast')) return 'Yemek';
    if (t.includes('location') || t.includes('view')) return 'Konum';
    return 'Genel';
}

function startImport() {
    let results = [];
    let count = 0;

    fs.createReadStream(csvFileName)
        .pipe(csv())
        .on('data', (data) => {
            try {
                // CSV'deki başlıklar: 'Review', 'Rating'
                const yorum = data.Review || "";
                const puan = parseInt(data.Rating) || 0;

                // --- KDS BÖLÜMÜ: DUYGU ANALİZİ ---
                // Node.js burada yorumu okuyup bir skor üretecek
                const analiz = sentiment.analyze(yorum);
                const duyguSkoru = analiz.score; // Pozitifse +, Negatifse - değer döner

                const kategori = getCategory(yorum);

                // Tablo yapısına uygun satır
                let row = [
                    1,              // otel_id (Varsayılan 1)
                    yorum,          // yorum_metni
                    puan,           // puan
                    duyguSkoru,     // duygu_skoru (HESAPLANDI)
                    kategori        // kategori (BELİRLENDİ)
                ];

                results.push(row);
                count++;

                if (results.length >= 2000) { // Yorumlar uzun olduğu için batch'i biraz küçülttüm
                    bulkInsert(results);
                    results = [];
                    process.stdout.write(`\r🚀 ${count} yorum analiz edildi ve işlendi...`);
                }
            } catch (err) {}
        })
        .on('end', () => {
            if (results.length > 0) bulkInsert(results);
            console.log('\n✅ Okuma bitti. Son paket yazılıyor...');
            setTimeout(() => {
                console.log("🎉 HARİKA! Yorumlar ve Duygu Skorları yüklendi.");
                connection.end();
            }, 5000);
        });
}

function bulkInsert(rows) {
    let sql = `INSERT INTO yorumlar 
    (otel_id, yorum_metni, puan, duygu_skoru, kategori) 
    VALUES ?`;
    
    connection.query(sql, [rows], (err) => {
        if (err) console.error("\n❌ SQL Hatası:", err.message);
    });
}