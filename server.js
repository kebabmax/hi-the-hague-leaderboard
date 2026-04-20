const fs = require('fs');
const express = require('express');
const app = express();
const ADMIN_PASSWORD = 'DaftPunk123!';   // change this

// ---------- tiny "database" helpers ----------
function readData() {
  return JSON.parse(fs.readFileSync('data.json', 'utf8'));
}
function writeData(data) {
  fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
}
function log(data, message) {
  if (!data.logs) data.logs = [];
  data.logs.push({
    when: new Date().toISOString(),
    what: message
  });
}

// ---------- auth ----------
function adminAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    const [user, pass] = Buffer.from(encoded, 'base64').toString().split(':');
    if (user === 'admin' && pass === ADMIN_PASSWORD) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="Admin"');
  res.status(401).send('Authentication required');
}

app.use(express.json());
app.use((req, res, next) => {
  if (req.path === '/admin.html' || req.path === '/admin') {
    return adminAuth(req, res, next);
  }
  next();
});
app.use(express.static('public'));

// ---------- routes ----------
app.get('/api/teams', (req, res) => {
  const data = readData();
  const sorted = [...data.teams].sort((a, b) => b.points - a.points);
  res.json(sorted);
});

app.post('/api/teams', adminAuth, (req, res) => {
  const data = readData();
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name required' });

  const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
  const team = { id, name, points: 0 };
  data.teams.push(team);
  log(data, `${team.name} was added`);
  writeData(data);
  res.json(team);
});

app.post('/api/teams/:id/points', adminAuth, (req, res) => {
  const data = readData();
  const team = data.teams.find(t => t.id === req.params.id);
  if (!team) return res.status(404).json({ error: 'team not found' });

  const amount = parseInt(req.body.amount, 10);
  if (isNaN(amount)) return res.status(400).json({ error: 'amount must be a number' });

  team.points += amount;
  const sign = amount >= 0 ? '+' : '';
  log(data, `${team.name} got ${sign}${amount} points`);
  writeData(data);
  res.json(team);
});

app.delete('/api/teams/:id', adminAuth, (req, res) => {
  const data = readData();
  const removed = data.teams.find(t => t.id === req.params.id);
  if (!removed) return res.status(404).json({ error: 'team not found' });

  data.teams = data.teams.filter(t => t.id !== req.params.id);
  log(data, `${removed.name} was removed`);
  writeData(data);
  res.json({ ok: true });
});

app.get('/api/logs', (req, res) => {
  const data = readData();
  const logs = (data.logs || []).slice().reverse();
  res.json(logs);
});

// ---------- start ----------
app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});