const db = require('../db');

function getUsers(req, res) {
  const users = db.prepare('SELECT id, name, age FROM users ORDER BY id').all();
  res.json(users);
}

function addUser(req, res) {
  const { name, age } = req.body;
  db.prepare('INSERT INTO users (name, age) VALUES (?, ?)').run(name, age);
  const users = db.prepare('SELECT id, name, age FROM users ORDER BY id').all();
  res.status(201).json(users);
}

function updateUser(req, res) {
  const id = parseInt(req.params.id, 10);
  const { name, age } = req.body;
  const result = db.prepare('UPDATE users SET name = ?, age = ? WHERE id = ?').run(name, age, id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Not found' });
  }
  const users = db.prepare('SELECT id, name, age FROM users ORDER BY id').all();
  res.json(users);
}

function deleteUser(req, res) {
  const id = parseInt(req.params.id, 10);
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Not found' });
  }
  const users = db.prepare('SELECT id, name, age FROM users ORDER BY id').all();
  res.json(users);
}

module.exports = { getUsers, addUser, updateUser, deleteUser };
