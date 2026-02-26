const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

async function register(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const passwordHash = bcrypt.hashSync(password, 10);
  const role = ADMIN_EMAIL && email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user';
  try {
    await db.run('INSERT INTO auth_users (email, password_hash, role) VALUES (?, ?, ?)', email, passwordHash, role);
    const user = await db.get('SELECT id, email, role FROM auth_users WHERE email = ?', email);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    throw err;
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const user = await db.get('SELECT id, email, password_hash, role FROM auth_users WHERE email = ?', email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const role = user.role || 'user';
  const token = jwt.sign({ id: user.id, email: user.email, role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, role } });
}

async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  const user = await db.get('SELECT id FROM auth_users WHERE email = ?', email);
  if (!user) {
    return res.json({ message: 'If that email exists, a reset link has been sent.' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await db.run('DELETE FROM password_reset_tokens WHERE user_id = ?', user.id);
  await db.run('INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES (?, ?, ?)', token, user.id, expiresAt);
  const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;
  res.json({ message: 'If that email exists, a reset link has been sent.', resetLink });
}

async function resetPassword(req, res) {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Token and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const row = await db.get('SELECT user_id, expires_at FROM password_reset_tokens WHERE token = ?', token);
  if (!row) {
    return res.status(400).json({ error: 'Invalid or expired reset link' });
  }
  if (new Date(row.expires_at) < new Date()) {
    await db.run('DELETE FROM password_reset_tokens WHERE token = ?', token);
    return res.status(400).json({ error: 'Reset link has expired' });
  }
  const passwordHash = bcrypt.hashSync(password, 10);
  await db.run('UPDATE auth_users SET password_hash = ? WHERE id = ?', passwordHash, row.user_id);
  await db.run('DELETE FROM password_reset_tokens WHERE token = ?', token);
  res.json({ message: 'Password reset successfully. You can now log in.' });
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  const user = await db.get('SELECT id, password_hash FROM auth_users WHERE id = ?', req.user.id);
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  const passwordHash = bcrypt.hashSync(newPassword, 10);
  await db.run('UPDATE auth_users SET password_hash = ? WHERE id = ?', passwordHash, user.id);
  res.json({ message: 'Password changed successfully' });
}

module.exports = { register, login, forgotPassword, resetPassword, changePassword };
