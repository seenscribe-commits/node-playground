const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function register(req, res) {
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
    db.prepare('INSERT INTO auth_users (email, password_hash, role) VALUES (?, ?, ?)').run(email, passwordHash, role);
    const user = db.prepare('SELECT id, email, role FROM auth_users WHERE email = ?').get(email);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    throw err;
  }
}

function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const user = db.prepare('SELECT id, email, password_hash, role FROM auth_users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const role = user.role || 'user';
  const token = jwt.sign({ id: user.id, email: user.email, role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, role } });
}

function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  const user = db.prepare('SELECT id FROM auth_users WHERE email = ?').get(email);
  if (!user) {
    return res.json({ message: 'If that email exists, a reset link has been sent.' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(user.id);
  db.prepare('INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, user.id, expiresAt);
  const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;
  res.json({ message: 'If that email exists, a reset link has been sent.', resetLink });
}

function resetPassword(req, res) {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Token and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const row = db.prepare('SELECT user_id, expires_at FROM password_reset_tokens WHERE token = ?').get(token);
  if (!row) {
    return res.status(400).json({ error: 'Invalid or expired reset link' });
  }
  if (new Date(row.expires_at) < new Date()) {
    db.prepare('DELETE FROM password_reset_tokens WHERE token = ?').run(token);
    return res.status(400).json({ error: 'Reset link has expired' });
  }
  const passwordHash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE auth_users SET password_hash = ? WHERE id = ?').run(passwordHash, row.user_id);
  db.prepare('DELETE FROM password_reset_tokens WHERE token = ?').run(token);
  res.json({ message: 'Password reset successfully. You can now log in.' });
}

function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  const user = db.prepare('SELECT id, password_hash FROM auth_users WHERE id = ?').get(req.user.id);
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  const passwordHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE auth_users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);
  res.json({ message: 'Password changed successfully' });
}

module.exports = { register, login, forgotPassword, resetPassword, changePassword };
