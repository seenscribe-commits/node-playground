const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data', 'userhub.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let _db = null;

function run(sql, ...params) {
  return new Promise((resolve, reject) => {
    const callback = function (err) {
      if (err) reject(err);
      else resolve({ changes: this.changes, lastID: this.lastID });
    };
    _db.run(sql, params.length ? params : [], callback);
  });
}

function get(sql, ...params) {
  return new Promise((resolve, reject) => {
    _db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, ...params) {
  return new Promise((resolve, reject) => {
    _db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

async function init() {
  return new Promise((resolve, reject) => {
    _db = new sqlite3.Database(dbPath, async (err) => {
      if (err) return reject(err);
      try {
        await run(`
          CREATE TABLE IF NOT EXISTS password_reset_tokens (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            expires_at DATETIME NOT NULL,
            FOREIGN KEY (user_id) REFERENCES auth_users(id)
          )
        `);
        await run(`
          CREATE TABLE IF NOT EXISTS auth_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        try {
          await run(`ALTER TABLE auth_users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`);
        } catch (e) {
          if (!e.message.includes('duplicate column name')) throw e;
        }
        const adminEmail = process.env.ADMIN_EMAIL || 'hossein@gmail.com';
        await run('UPDATE auth_users SET role = ? WHERE LOWER(email) = LOWER(?)', 'admin', adminEmail);
        await run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            age INTEGER NOT NULL
          )
        `);
        const usersJsonPath = path.join(__dirname, 'users.json');
        if (fs.existsSync(usersJsonPath)) {
          const count = await get('SELECT COUNT(*) as count FROM users');
          if (count.count === 0) {
            const users = JSON.parse(fs.readFileSync(usersJsonPath, 'utf8'));
            for (const u of users) {
              await run('INSERT INTO users (name, age) VALUES (?, ?)', u.name, u.age);
            }
            console.log(`Migrated ${users.length} users from users.json to SQLite`);
          }
        }
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });
}

module.exports = { init, run, get, all };
