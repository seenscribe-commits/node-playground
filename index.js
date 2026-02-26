const express = require('express');
const db = require('./db');
const routes = require('./routes');

const app = express();

app.use(express.json());
app.use(routes);

async function start() {
  await db.init();
  app.listen(3000, () => {
    console.log('Server running at http://localhost:3000/');
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
