const fs = require('fs');
const mysql = require('mysql2');
const csv = require('csv-parser');

console.log("🏁 VERİTABANI SIFIRLAMA VE YÜKLEME BAŞLATILDI (V7.0)...");

// Dosya Kontrolü
if (!fs.existsSync('hotel_bookings.csv')) {
    console.error("❌ HATA: 'hotel_bookings.csv' dosyası bulunamadı!");
    process.exit(1);
}

// Bağlantı
const db = mysql.createConnection({
    host: '127.0.0.1', user: 'root', password: 'root', 
    database: 'kds_oteldb', port: 8889, multipleStatements: true
});

const setupSQL = `
    DROP TABLE IF EXISTS rezervasyonlar;
    DROP TABLE IF EXISTS rakip_fiyatlari;

    CREATE TABLE rezervasyonlar (
        id INT AUTO_INCREMENT PRIMARY KEY,
        oda_no INT, oda_tipi VARCHAR(50), giris_tarihi DATE, konaklama_suresi INT, fiyat DECIMAL(10,2), iptal_durumu TINYINT DEFAULT 0
    );

    CREATE TABLE rakip_fiyatlari (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ay VARCHAR(10), bizim_fiyat_tl DECIMAL(10,2), rakip1_euro DECIMAL(10,2), rakip2_euro DECIMAL(10,2)
    );
`;

const AY_HARITASI = {'January':'01','February':'02','March':'03','April':'04','May':'05','June':'06','July':'07','August':'08','September':'09','October':'10','November':'11','December':'12'};
const ODA_HARITASI = {'A':'Standart','B':'Standart','C':'Standart','D':'Deluxe','E':'Deluxe','F':'Suit','G':'Suit','H':'Kral Dairesi','L':'Standart','P':'Standart'};

db.connect(err => {
    if (err) { console.error("❌ Bağlantı Hatası:", err.message); process.exit(1); }
    db.query(setupSQL, (err) => {
        if (err) { console.error("❌ Tablo Hatası:", err.message); process.exit(1); }
        console.log("✅ Tablolar temizlendi. Veri aktarımı başlıyor...");
        startImport();
    });
});

function startImport() {
    let results = [];
    let count = 0;

    fs.createReadStream('hotel_bookings.csv')
        .pipe(csv())
        .on('data', (data) => {
            try {
                // Tarih Düzeltme (2015 -> 2024)
                let yil = parseInt(data.arrival_date_year) + 9;
                let ayIsmi = data.arrival_date_month.trim();
                let ay = AY_HARITASI[ayIsmi] || "01";
                let gun = parseInt(data.arrival_date_day_of_month);
                
                // Artık Yıl (29 Şubat) Hatasını Önle
                if (ayIsmi === 'February' && gun > 28) gun = 28;
                
                let tamTarih = `${yil}-${ay}-${String(gun).padStart(2,'0')}`;

                // Fiyat (Euro -> TL)
                let adr = parseFloat(data.adr);
                if (isNaN(adr) || adr < 0) adr = 100;
                let fiyat = (adr * 35).toFixed(2);

                let oda = ODA_HARITASI[data.reserved_room_type] || 'Standart';
                let sure = (parseInt(data.stays_in_weekend_nights)||0) + (parseInt(data.stays_in_week_nights)||0) || 1;
                let iptal = parseInt(data.is_canceled) || 0;
                let odaNo = 100 + Math.floor(Math.random() * 100);

                results.push([odaNo, oda, tamTarih, sure, fiyat, iptal]);
                count++;

                if (results.length >= 2000) {
                    bulkInsert(results);
                    results = [];
                    process.stdout.write(`\r🚀 İşlenen: ${count}`);
                }
            } catch (err) {}
        })
        .on('end', () => {
            if (results.length > 0) bulkInsert(results);
            console.log('\n✅ CSV Aktarımı Bitti. Rakipler oluşturuluyor...');
            setTimeout(rakipleriOlustur, 2000);
        });
}

function bulkInsert(rows) {
    db.query("INSERT INTO rezervasyonlar (oda_no, oda_tipi, giris_tarihi, konaklama_suresi, fiyat, iptal_durumu) VALUES ?", [rows], (err) => {});
}

function rakipleriOlustur() {
    let vals = [];
    const yillar = [2023, 2024, 2025, 2026];
    const aylar = ['01','02','03','04','05','06','07','08','09','10','11','12'];
    
    yillar.forEach(y => {
        aylar.forEach(m => {
            const isSezon = (m==='06'||m==='07'||m==='08');
            vals.push([`${y}-${m}`, isSezon?4500:3000, isSezon?150:100, isSezon?90:60]);
        });
    });

    db.query("INSERT INTO rakip_fiyatlari (ay, bizim_fiyat_tl, rakip1_euro, rakip2_euro) VALUES ?", [vals], () => {
        console.log("🎉 TEBRİKLER! Veritabanı başarıyla kuruldu.");
        console.log("👉 Şimdi 'node server.js' komutunu çalıştırın.");
        process.exit();
    });
}