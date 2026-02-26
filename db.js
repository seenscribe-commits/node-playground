const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data', 'userhub.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Create password_reset_tokens table
db.exec(`
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES auth_users(id)
  )
`);

// Create auth_users table for login/register
db.exec(`
  CREATE TABLE IF NOT EXISTS auth_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Add role column if it doesn't exist (migration for existing DBs)
try {
  db.exec(`ALTER TABLE auth_users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`);
} catch (e) {
  if (!e.message.includes('duplicate column name')) throw e;
}

// Promote admin: set ADMIN_EMAIL env var, or grant hossein@gmail.com admin rights
const adminEmail = process.env.ADMIN_EMAIL || 'hossein@gmail.com';
db.prepare('UPDATE auth_users SET role = ? WHERE LOWER(email) = LOWER(?)').run('admin', adminEmail);

// Create users table (app data)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER NOT NULL
  )
`);

// Migrate existing users from users.json if it exists and table is empty
const usersJsonPath = path.join(__dirname, 'users.json');
if (fs.existsSync(usersJsonPath)) {
  const count = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (count.count === 0) {
    const users = JSON.parse(fs.readFileSync(usersJsonPath, 'utf8'));
    const insert = db.prepare('INSERT INTO users (name, age) VALUES (?, ?)');
    const insertMany = db.transaction((users) => {
      for (const u of users) {
        insert.run(u.name, u.age);
      }
    });
    insertMany(users);
    console.log(`Migrated ${users.length} users from users.json to SQLite`);
  }
}

module.exports = db;
