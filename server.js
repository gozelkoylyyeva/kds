require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { db, initDb } = require('./database'); // Veritabanı modülünü ekle

// 🔥 DEĞİŞİKLİK BURADA: Dosyanın adı 'api.js' olduğu için burayı düzelttim
const apiRoutes = require('./routes/api'); 

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Sunucuyu başlatmadan önce veritabanının hazır olduğundan emin ol
async function startServer() {
    try {
        await initDb();
        
        // Veritabanı bağlantısını ve veri durumunu kontrol et
        const [rows] = await db.query('SELECT COUNT(*) as count FROM bookings');
        console.log(`📊 Veritabanı Durumu: bookings tablosunda ${rows[0].count} kayıt var.`);

        if (rows[0].count === 0) {
            console.warn("⚠️ UYARI: Tablo boş! Lütfen 'node import_data.js' komutunu çalıştırarak verileri yükleyin.");
        }

        app.listen(PORT, () => console.log(`🚀 Server Başladı: http://localhost:${PORT}`));
    } catch (err) {
        console.error("❌ Sunucu başlatılamadı, veritabanı hatası:", err);
    }
}

// --- RAKİP FİYAT ANALİZİ ENDPOINT'İ ---
app.get('/api/competitor-prices', (req, res) => {
    const API_KEY = process.env.COMPETITOR_API_KEY;
    
    // NOT: Gerçek bir API sağlayıcınız (Google Hotels, Expedia vb.) olduğunda 
    // burada axios ile o servise istek atıp API_KEY'i header'da göndermelisiniz.
    // Şimdilik dashboard'da grafiğin çalışması için örnek veri döndürüyoruz.
    
    const mockData = {
        labels: ['Standart Oda', 'Deluxe Oda', 'Suit', 'Kral Dairesi'],
        datasets: [
            {
                label: 'Bizim Otel',
                data: [1500, 2200, 4500, 12000],
                backgroundColor: 'rgba(59, 130, 246, 0.8)', // Primary Blue
                borderRadius: 4
            },
            {
                label: 'Rakip A (Grand Hotel)',
                data: [1450, 2100, 4800, 11500],
                backgroundColor: 'rgba(239, 68, 68, 0.8)', // Red
                borderRadius: 4
            },
            {
                label: 'Rakip B (City Plaza)',
                data: [1600, 2300, 4200, 12500],
                backgroundColor: 'rgba(16, 185, 129, 0.8)', // Green
                borderRadius: 4
            }
        ]
    };
    
    res.json(mockData);
});

// --- TOPLAM REZERVASYON SAYISI ENDPOINT'İ ---
app.get('/api/total-bookings', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT COUNT(*) as total FROM bookings');
        res.json({ total: rows[0].total });
    } catch (err) {
        console.error('Toplam rezervasyon sayısı alınırken hata:', err);
        res.status(500).json({ error: 'Veritabanı sorgusu başarısız oldu.' });
    }
});

// --------------------------------------

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/analytics', (req, res) => res.sendFile(path.join(__dirname, 'analytics.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));

app.use('/api', apiRoutes);

startServer();