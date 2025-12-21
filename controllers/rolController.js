/**
 * Rol bazlı dashboard yapısı
 * Her role özel KPI'lar, modüller ve grafikler
 */

const ROL_YAPISI = {
    otel_muduru: {
        kpi: ['doluluk_orani', 'toplam_gelir', 'kar_marji', 'iptal_orani', 'risk_skoru'],
        moduller: ['sayfa-ozet', 'sayfa-simulasyon', 'sayfa-analytics', 'sayfa-karar-destek', 'sayfa-rakip', 'sayfa-ik'],
        grafikler: ['dolulukGrafigi', 'mevsimGrafigi', 'gelirTrendGrafigi', 'riskAnaliziGrafigi'],
        aciklama: 'Tüm modüllere erişim. Tam yetki.'
    },
    satis_pazarlama: {
        kpi: ['doluluk_orani', 'toplam_gelir', 'iptal_orani'],
        moduller: ['sayfa-ozet', 'sayfa-simulasyon', 'sayfa-karar-destek', 'sayfa-rakip'],
        grafikler: ['dolulukGrafigi', 'gelirTrendGrafigi', 'fiyatEsneklikGrafigi'],
        aciklama: 'Satış ve pazarlama odaklı dashboard.'
    },
    ik_yonetici: {
        kpi: ['personel_maliyeti', 'doluluk_orani'],
        moduller: ['sayfa-ozet', 'sayfa-ik', 'sayfa-karar-destek'],
        grafikler: ['dolulukGrafigi'],
        aciklama: 'İK ve personel yönetimi odaklı dashboard.'
    },
    on_buro: {
        kpi: ['doluluk_orani', 'iptal_orani'],
        moduller: ['sayfa-ozet', 'sayfa-rakip'],
        grafikler: ['dolulukGrafigi'],
        aciklama: 'Ön büro operasyonları odaklı sınırlı dashboard.'
    }
};

exports.getRolYapisi = (req, res) => {
    const rol = req.query.rol || 'otel_muduru';
    
    if (!ROL_YAPISI[rol]) {
        return res.status(400).json({ error: 'Geçersiz rol' });
    }
    
    res.json({
        rol: rol,
        yapi: ROL_YAPISI[rol],
        tum_roller: Object.keys(ROL_YAPISI)
    });
};

exports.getRoller = (req, res) => {
    res.json({
        roller: Object.keys(ROL_YAPISI).map(rol => ({
            rol_kodu: rol,
            rol_adi: rolAdiCevir(rol),
            aciklama: ROL_YAPISI[rol].aciklama
        }))
    });
};

function rolAdiCevir(rol) {
    const ceviriler = {
        'otel_muduru': 'Otel Müdürü',
        'satis_pazarlama': 'Satış & Pazarlama',
        'ik_yonetici': 'İK Yöneticisi',
        'on_buro': 'Ön Büro'
    };
    return ceviriler[rol] || rol;
}
