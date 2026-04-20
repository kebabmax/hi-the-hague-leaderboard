const fs = require('fs');
const express = require('express');
const app = express();

const ADMIN_PASSWORD = 'DaftPunk123!';   // change this

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

app.get('/api/teams', (req, res) => {
  const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
  res.json(data.teams);
});

app.post('/api/teams/:id/points', adminAuth, (req, res) => {
  const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
  const team = data.teams.find(t => t.id === req.params.id);
  if (!team) return res.status(404).json({ error: 'team not found' });

  team.points += parseInt(req.body.amount, 10);
  fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
  res.json(team);
});

app.post('/api/teams', adminAuth, (req, res) => {
  const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name required' });

  const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
  const team = { id, name, points: 0 };
  data.teams.push(team);
  fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
  res.json(team);
});

app.delete('/api/teams/:id', adminAuth, (req, res) => {
  const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
  const before = data.teams.length;
  data.teams = data.teams.filter(t => t.id !== req.params.id);
  if (data.teams.length === before) return res.status(404).json({ error: 'team not found' });
  fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
  res.json({ ok: true });
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});