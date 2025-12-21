// Rol bazlı kullanıcı yapısı (gerçek uygulamada veritabanından alınmalı)
const kullanicilar = {
    'admin': { sifre: '1234', rol: 'otel_muduru', ad: 'Otel Müdürü' },
    'satis': { sifre: '1234', rol: 'satis_pazarlama', ad: 'Satış Müdürü' },
    'ik': { sifre: '1234', rol: 'ik_yonetici', ad: 'İK Yöneticisi' },
    'onburo': { sifre: '1234', rol: 'on_buro', ad: 'Ön Büro Sorumlusu' }
};

exports.login = (req, res) => {
    const { kadi, sifre } = req.body;
    
    const kullanici = kullanicilar[kadi];
    
    if (kullanici && kullanici.sifre === sifre) {
        res.json({
            success: true,
            rol: kullanici.rol,
            ad: kullanici.ad,
            kullaniciAdi: kadi
        });
    } else {
        res.json({
            success: false,
            mesaj: 'Kullanıcı adı veya şifre hatalı'
        });
    }
};