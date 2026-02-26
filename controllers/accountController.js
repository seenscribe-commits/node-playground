const db = require('../db');

function getAccounts(req, res) {
  const accounts = db.prepare(`
    SELECT id, email, role, created_at FROM auth_users ORDER BY id
  `).all();
  res.json(accounts);
}

function updateAccount(req, res) {
  const id = parseInt(req.params.id, 10);
  const { email, role } = req.body;
  const account = db.prepare('SELECT id FROM auth_users WHERE id = ?').get(id);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }
  try {
    if (email) {
      db.prepare('UPDATE auth_users SET email = ? WHERE id = ?').run(email, id);
    }
    if (role && ['user', 'admin'].includes(role)) {
      db.prepare('UPDATE auth_users SET role = ? WHERE id = ?').run(role, id);
    }
    const updated = db.prepare('SELECT id, email, role, created_at FROM auth_users WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Email already in use' });
    }
    throw err;
  }
}

function deleteAccount(req, res) {
  const id = parseInt(req.params.id, 10);
  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }
  const result = db.prepare('DELETE FROM auth_users WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Account not found' });
  }
  db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(id);
  res.json({ message: 'Account deleted' });
}

module.exports = { getAccounts, updateAccount, deleteAccount };
