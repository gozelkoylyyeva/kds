const db = require('../config/db');
const { promisify } = require('util');
const query = promisify(db.query).bind(db);

class Senaryo {
    static async findAll(limit = 5) {
        return new Promise((resolve, reject) => {
            db.query(
                'SELECT * FROM senaryolar ORDER BY tarih DESC, id DESC LIMIT ?',
                [limit],
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                }
            );
        });
    }

    static async findById(id) {
        return new Promise((resolve, reject) => {
            db.query(
                'SELECT * FROM senaryolar WHERE id = ?',
                [id],
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results[0]);
                }
            );
        });
    }

    static async create(senaryoData) {
        return new Promise((resolve, reject) => {
            db.query(
                'INSERT INTO senaryolar (senaryo_adi, senaryo_tipi, fiyat_degisimi, kampanya_turu, sonuc_veri, sonuc_durumu) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    senaryoData.senaryo_adi,
                    senaryoData.senaryo_tipi,
                    senaryoData.fiyat_degisimi,
                    senaryoData.kampanya_turu,
                    JSON.stringify(senaryoData.sonuc_veri),
                    senaryoData.sonuc_durumu
                ],
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results.insertId);
                }
            );
        });
    }

    static async delete(id) {
        return new Promise((resolve, reject) => {
            db.query(
                'DELETE FROM senaryolar WHERE id = ?',
                [id],
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results.affectedRows);
                }
            );
        });
    }
}

module.exports = Senaryo;

