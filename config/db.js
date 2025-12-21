const mysql = require('mysql2');

const db = mysql.createConnection({
    host: '127.0.0.1', user: 'root', password: 'root', 
    database: 'kds_oteldb', port: 8889, multipleStatements: true
});

db.connect(err => { 
    if(err) console.error('❌ DB Hatası:', err.message); 
    else console.log('✅ Veritabanı Bağlantısı Başarılı (Config).'); 
});

module.exports = db;