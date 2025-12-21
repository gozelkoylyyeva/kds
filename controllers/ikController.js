const db = require('../config/db');

exports.personelSimulasyon = (req, res) => {
    const { hedefDoluluk } = req.body;
    db.query(`SELECT COUNT(*) as max_oda FROM odalar`, (err, resKapasite) => {
        const kapasite = resKapasite[0] ? resKapasite[0].max_oda : 50;
        const hedefOda = Math.ceil(kapasite * (hedefDoluluk / 100));
        let temizlikIhtiyac = Math.ceil(hedefOda / 12);
        let servisIhtiyac = Math.ceil((hedefOda / 20) + 2);
        db.query("SELECT * FROM personeller", (err2, tumPersoneller) => {
            if (err2 || !tumPersoneller) return res.json({ temizlik: 0, servis: 0, toplam: 0, toplam_maliyet: 0, listeler: { gunduz: [], aksam: [], gece: [] } });
            const havuzTemizlik = tumPersoneller.filter(p => p.departman === 'Temizlik');
            const havuzServis = tumPersoneller.filter(p => p.departman === 'Servis');
            const havuzMutfak = tumPersoneller.filter(p => p.departman === 'Mutfak');
            const havuzOnBuro = tumPersoneller.filter(p => p.departman === 'Ön Büro');
            const havuzYonetim = tumPersoneller.filter(p => p.departman === 'Yönetim');
            const secilenler = [...havuzTemizlik.slice(0, temizlikIhtiyac), ...havuzServis.slice(0, servisIhtiyac), ...havuzMutfak.slice(0, 3), ...havuzOnBuro.slice(0, 2), ...havuzYonetim.slice(0, 1)];
            let toplamMaliyet = 0; let gunduz = [], aksam = [], gece = [];
            secilenler.forEach(p => { toplamMaliyet += p.maas; const kisi = { ad: p.ad_soyad, poz: p.pozisyon || p.departman }; if (p.vardiya === 'Gunduz') gunduz.push(kisi); else if (p.vardiya.includes('Aksam')) aksam.push(kisi); else gece.push(kisi); });
            res.json({ temizlik: temizlikIhtiyac, servis: servisIhtiyac, toplam: secilenler.length, toplam_maliyet: toplamMaliyet, listeler: { gunduz: gunduz, aksam: aksam, gece: gece } });
        });
    });
};