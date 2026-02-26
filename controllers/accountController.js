const db = require('../db');

async function getAccounts(req, res) {
  const accounts = await db.all('SELECT id, email, role, created_at FROM auth_users ORDER BY id');
  res.json(accounts);
}

async function updateAccount(req, res) {
  const id = parseInt(req.params.id, 10);
  const { email, role } = req.body;
  const account = await db.get('SELECT id FROM auth_users WHERE id = ?', id);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }
  try {
    if (email) {
      await db.run('UPDATE auth_users SET email = ? WHERE id = ?', email, id);
    }
    if (role && ['user', 'admin'].includes(role)) {
      await db.run('UPDATE auth_users SET role = ? WHERE id = ?', role, id);
    }
    const updated = await db.get('SELECT id, email, role, created_at FROM auth_users WHERE id = ?', id);
    res.json(updated);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Email already in use' });
    }
    throw err;
  }
}

async function deleteAccount(req, res) {
  const id = parseInt(req.params.id, 10);
  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }
  const result = await db.run('DELETE FROM auth_users WHERE id = ?', id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Account not found' });
  }
  await db.run('DELETE FROM password_reset_tokens WHERE user_id = ?', id);
  res.json({ message: 'Account deleted' });
}

module.exports = { getAccounts, updateAccount, deleteAccount };
