const { db } = require('../database');

class Rezervasyon {
    static async findAll(filters = {}) {
        let query = 'SELECT * FROM rezervasyonlar WHERE 1=1';
        const params = [];

        if (filters.iptal_durumu !== undefined) {
            query += ' AND iptal_durumu = ?';
            params.push(filters.iptal_durumu);
        }

        if (filters.yil) {
            query += ' AND YEAR(giris_tarihi) = ?';
            params.push(filters.yil);
        }

        const [rows] = await db.query(query, params);
        return rows;
    }

    static async findByYear(yil) {
        const [rows] = await db.query(
            'SELECT * FROM rezervasyonlar WHERE YEAR(giris_tarihi) = ?',
            [yil]
        );
        return rows;
    }

    static async getAylikDoluluk() {
        const [rows] = await db.query(`
            SELECT 
                DATE_FORMAT(giris_tarihi, '%Y-%m') as ay,
                COUNT(*) as rezervasyon_sayisi
            FROM rezervasyonlar
            WHERE iptal_durumu = 0
            GROUP BY ay
            ORDER BY ay DESC
            LIMIT 24
        `);
        return rows;
    }

    static async getToplamRezervasyon() {
        const [rows] = await db.query('SELECT COUNT(*) as total FROM rezervasyonlar');
        return rows[0]?.total || 0;
    }

    static async getYillikIstatistikler() {
        const [rows] = await db.query(`
            SELECT 
                YEAR(giris_tarihi) as yil,
                COUNT(*) as toplam_rezervasyon,
                SUM(CASE WHEN iptal_durumu = 0 THEN 1 ELSE 0 END) as aktif_rezervasyon,
                SUM(CASE WHEN iptal_durumu = 1 THEN 1 ELSE 0 END) as iptal_sayisi,
                SUM(CASE WHEN iptal_durumu = 0 THEN fiyat * COALESCE(konaklama_suresi, 2) ELSE 0 END) as toplam_gelir,
                AVG(CASE WHEN iptal_durumu = 0 THEN fiyat ELSE NULL END) as ortalama_fiyat,
                SUM(CASE WHEN iptal_durumu = 0 THEN COALESCE(konaklama_suresi, 2) ELSE 0 END) as toplam_gece
            FROM rezervasyonlar
            WHERE YEAR(giris_tarihi) IN (2023, 2024, 2025)
            GROUP BY yil
            ORDER BY yil ASC
        `);
        return rows;
    }
}

module.exports = Rezervasyon;

