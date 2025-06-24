require('dotenv').config();
const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')


mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  log: [{
    description: String,
    duration: Number,
    date: { type: Date, default: Date.now }
  }]
})

app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


app.post('/api/users', (req, res) => {
  const username = req.body.username;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const newUser = new mongoose.model('User', userSchema)({ username });
  newUser.save((err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Error saving user' });
    }
    res.json({ username: user.username, _id: user._id });
  });
})
app.post('/api/users/:id/exercises', (req, res) => {
  const userId = req.params.id;
  const { description, duration, date } = req.body;

  if (!description || !duration) {
    return res.status(400).json({ error: 'Description and duration are required' });
  }

  const exerciseDate = date ? new Date(date) : new Date();

  mongoose.model('User', userSchema).findById(userId, (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.log.push({
      description,
      duration: Number(duration),
      date: exerciseDate
    });
    user.count += 1;

    user.save((err, updatedUser) => {
      if (err) {
        return res.status(500).json({ error: 'Error saving exercise' });
      }
      res.json({
        username: updatedUser.username,
        _id: updatedUser._id,
        description,
        duration: Number(duration),
        date: exerciseDate.toDateString()
      });
    });
  });
})

app.get('/api/users', (req, res) => {
  mongoose.model('User', userSchema).find({}, 'username _id', (err, users) => {
    if (err) return res.status(500).json({ error: 'Error fetching users' });
    res.json(users);
  });
});


app.get('/api/users/:id/logs', (req, res) => {
  const { from, to, limit } = req.query;
  mongoose.model('User', userSchema).findById(req.params.id, (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });

    let log = user.log.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }));

    if (from) {
      const fromDate = new Date(from);
      log = log.filter(e => new Date(e.date) >= fromDate);
    }

    if (to) {
      const toDate = new Date(to);
      log = log.filter(e => new Date(e.date) <= toDate);
    }

    if (limit) {
      log = log.slice(0, Number(limit));
    }

    res.json({
      username: user.username,
      _id: user._id,
      count: log.length,
      log
    });
  });
});

const listener = app.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
