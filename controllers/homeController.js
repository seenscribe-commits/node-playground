const fs = require('fs');
const path = require('path');

const homeViewPath = path.join(__dirname, '..', 'views', 'home.html');
const resetPasswordViewPath = path.join(__dirname, '..', 'views', 'reset-password.html');

function getHome(req, res) {
  const html = fs.readFileSync(homeViewPath, 'utf8');
  res.send(html);
}

function getResetPassword(req, res) {
  const html = fs.readFileSync(resetPasswordViewPath, 'utf8');
  res.send(html);
}

function getAbout(req, res) {
  res.type('text/plain').send('This is my first app');
}

module.exports = { getHome, getResetPassword, getAbout };
