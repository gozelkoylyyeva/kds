const express = require('express');
const cors = require('cors');
const path = require('path');

// 🔥 DEĞİŞİKLİK BURADA: Dosyanın adı 'api.js' olduğu için burayı düzelttim
const apiRoutes = require('./routes/api'); 

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/analytics', (req, res) => res.sendFile(path.join(__dirname, 'analytics.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));

app.use('/api', apiRoutes);

app.listen(PORT, () => console.log(`🚀 Server Başladı: http://localhost:${PORT}`));