const { db } = require('../database');

class FiyatGecmisi {
    static async findAll(filters = {}) {
        let query = 'SELECT * FROM fiyat_gecmisi WHERE 1=1';
        const params = [];

        if (filters.oda_tipi_id) {
            query += ' AND oda_tipi_id = ?';
            params.push(filters.oda_tipi_id);
        }

        if (filters.baslangic_tarihi) {
            query += ' AND tarih >= ?';
            params.push(filters.baslangic_tarihi);
        }

        if (filters.bitis_tarihi) {
            query += ' AND tarih <= ?';
            params.push(filters.bitis_tarihi);
        }

        query += ' ORDER BY tarih DESC';

        const [rows] = await db.query(query, params);
        return rows;
    }

    static async getAylikOrtalama(baslangic, bitis) {
        const [rows] = await db.query(`
            SELECT 
                DATE_FORMAT(tarih, '%Y-%m') as ay,
                AVG(fiyat) as ortalama_fiyat
            FROM fiyat_gecmisi
            WHERE tarih BETWEEN ? AND ?
            GROUP BY ay
            ORDER BY ay ASC
        `, [baslangic, bitis]);
        return rows;
    }

    static async getSonFiyatlar(limit = 30) {
        const [rows] = await db.query(`
            SELECT * FROM fiyat_gecmisi
            ORDER BY tarih DESC
            LIMIT ?
        `, [limit]);
        return rows;
    }
}

module.exports = FiyatGecmisi;

