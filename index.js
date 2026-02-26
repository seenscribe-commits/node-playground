const express = require('express');
const db = require('./db');
const routes = require('./routes');

const app = express();

app.use(express.json());
app.use(routes);

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000/');
});
