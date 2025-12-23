const fs = require('fs');
const csv = require('csv-parser');
const { db, initDb } = require('./database');

// CSV dosyasını kontrol et (hotel_booking.csv veya booking.csv)
let csvFilePath = './hotel_bookings.csv';
if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ HATA: '${csvFilePath}' dosyası bulunamadı!`);
    process.exit(1);
}

// Ay isimlerini numaraya çevirmek için harita
const monthMap = {
    'January': '01', 'February': '02', 'March': '03', 'April': '04', 'May': '05', 'June': '06',
    'July': '07', 'August': '08', 'September': '09', 'October': '10', 'November': '11', 'December': '12'
};

// İlişkisel tablolardan ID getiren veya yoksa ekleyen yardımcı fonksiyon
async function getOrInsert(table, column, value) {
    if (!value || value === 'NULL') return null;
    
    // Önce var mı diye bak
    const [rows] = await db.query(`SELECT id FROM ${table} WHERE ${column} = ?`, [value]);
    if (rows.length > 0) return rows[0].id;

    // Yoksa ekle
    const [result] = await db.query(`INSERT INTO ${table} (${column}) VALUES (?)`, [value]);
    return result.insertId;
}

async function importCsv() {
    try {
        await initDb(); // Tabloların hazır olduğundan emin ol
        console.log('Veritabanı tabloları başarıyla sıfırlandı/oluşturuldu.');
    } catch (error) {
        console.error("❌ Veritabanı bağlantısı sağlanamadı. Lütfen MySQL'in çalıştığından ve .env dosyasındaki bilgilerin doğru olduğundan emin olun.");
        process.exit(1);
    }
    
    const batchSize = 1000;
    let batch = [];
    let totalProcessed = 0;
    const connection = await db.getConnection(); // Transaction için tek bir bağlantı al

    console.log('CSV dosyası okunuyor ve veritabanına aktarılıyor...');
    console.log("Bu işlem birkaç dakika sürebilir, lütfen bekleyin...");

    const stream = fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', async (row) => {
            batch.push(row);
            if (batch.length >= batchSize) {
                stream.pause(); // Akışı duraklat
                await processBatch(batch, connection);
                totalProcessed += batch.length;
                console.log(`${totalProcessed} satır işlendi...`);
                batch = []; // Batch'i sıfırla
                stream.resume(); // Akışa devam et
            }
        })
        .on('end', async () => {
            if (batch.length > 0) {
                await processBatch(batch, connection);
                totalProcessed += batch.length;
            }
            console.log("tüm veriler işlendi");
            connection.release();
            process.exit(0);
        })
        .on('error', (error) => {
            console.error("❌ CSV okuma sırasında hata:", error);
            connection.release();
            process.exit(1);
        });
}

async function processBatch(batch, connection) {
    try {
        await connection.beginTransaction();
        for (const row of batch) {
            // 1. İlişkisel Verileri Hazırla (Dimension Tables)
            const hotelId = await getOrInsert('hotels', 'name', row.hotel);
            const countryId = await getOrInsert('countries', 'code', row.country);
            const marketSegmentId = await getOrInsert('market_segments', 'name', row.market_segment);

            // 2. Tarih Formatını Düzenle (YYYY-MM-DD)
            const month = monthMap[row.arrival_date_month] || '01';
            const day = row.arrival_date_day_of_month.padStart(2, '0');
            const arrivalDate = `${row.arrival_date_year}-${month}-${day}`;
            
            // Toplam kalış süresi
            const staysNights = parseInt(row.stays_in_weekend_nights) + parseInt(row.stays_in_week_nights);

            // 3. Rezervasyonu Ekle
            await connection.query(
                `INSERT INTO bookings SET ?`, 
                {
                    hotel_id: hotelId,
                    country_id: countryId,
                    market_segment_id: marketSegmentId,
                    is_canceled: parseInt(row.is_canceled),
                    lead_time: parseInt(row.lead_time),
                    arrival_date: arrivalDate,
                    stays_nights: staysNights,
                    adults: parseInt(row.adults),
                    children: parseInt(row.children) || 0,
                    meal: row.meal,
                    distribution_channel: row.distribution_channel,
                    is_repeated_guest: parseInt(row.is_repeated_guest),
                    reserved_room_type: row.reserved_room_type,
                    assigned_room_type: row.assigned_room_type,
                    deposit_type: row.deposit_type,
                    agent: row.agent === 'NULL' ? null : parseInt(row.agent),
                    company: row.company === 'NULL' ? null : parseInt(row.company),
                    customer_type: row.customer_type,
                    adr: parseFloat(row.adr),
                    reservation_status: row.reservation_status,
                    reservation_status_date: row.reservation_status_date
                }
            );
        }
        await connection.commit(); // Her şey yolundaysa batch'i onayla
    } catch (error) {
        await connection.rollback(); // Hata varsa batch'i geri al
        console.error("❌ Toplu aktarım sırasında hata, işlem geri alındı:", error);
        throw error; // Hata fırlatarak ana süreci durdur
    }
}

// Scripti başlat
importCsv();