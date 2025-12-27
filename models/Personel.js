const { db } = require('../database');

class Personel {
    static async findAll() {
        const [rows] = await db.query('SELECT * FROM personeller');
        return rows;
    }

    static async findByDepartman(departman) {
        const [rows] = await db.query(
            'SELECT * FROM personeller WHERE departman = ?',
            [departman]
        );
        return rows;
    }

    static async count() {
        const [rows] = await db.query('SELECT COUNT(*) as total FROM personeller');
        return rows[0]?.total || 0;
    }

    static async getPersonelByVardiya() {
        const [rows] = await db.query(`
            SELECT vardiya, COUNT(*) as sayi 
            FROM personeller 
            GROUP BY vardiya
        `);
        return rows;
    }
}

module.exports = Personel;

