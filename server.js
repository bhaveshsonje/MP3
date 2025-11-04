const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const userRoutes = require('./roots/userRoutes');
const taskRoutes = require('./roots/taskRoutes');

dotenv.config();

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to APIed Piper!' });
});

app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);


mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/api-piper')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
