const db = require('../config/db');

class Oda {
    static async findAll() {
        return new Promise((resolve, reject) => {
            db.query('SELECT * FROM odalar', (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });
    }

    static async count() {
        return new Promise((resolve, reject) => {
            db.query('SELECT COUNT(*) as total FROM odalar', (err, results) => {
                if (err) reject(err);
                else resolve(results[0]?.total || 0);
            });
        });
    }

    static async findByDurum(durum) {
        return new Promise((resolve, reject) => {
            db.query(
                'SELECT * FROM odalar WHERE durum = ?',
                [durum],
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                }
            );
        });
    }

    static async findByOdaTipi(oda_tipi_id) {
        return new Promise((resolve, reject) => {
            db.query(
                'SELECT * FROM odalar WHERE oda_tipi_id = ?',
                [oda_tipi_id],
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                }
            );
        });
    }
}

module.exports = Oda;

