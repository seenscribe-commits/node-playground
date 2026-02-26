const db = require('../db');

async function getUsers(req, res) {
  const users = await db.all('SELECT id, name, age FROM users ORDER BY id');
  res.json(users);
}

async function addUser(req, res) {
  const { name, age } = req.body;
  await db.run('INSERT INTO users (name, age) VALUES (?, ?)', name, age);
  const users = await db.all('SELECT id, name, age FROM users ORDER BY id');
  res.status(201).json(users);
}

async function updateUser(req, res) {
  const id = parseInt(req.params.id, 10);
  const { name, age } = req.body;
  const result = await db.run('UPDATE users SET name = ?, age = ? WHERE id = ?', name, age, id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Not found' });
  }
  const users = await db.all('SELECT id, name, age FROM users ORDER BY id');
  res.json(users);
}

async function deleteUser(req, res) {
  const id = parseInt(req.params.id, 10);
  const result = await db.run('DELETE FROM users WHERE id = ?', id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Not found' });
  }
  const users = await db.all('SELECT id, name, age FROM users ORDER BY id');
  res.json(users);
}

module.exports = { getUsers, addUser, updateUser, deleteUser };
