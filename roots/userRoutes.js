
const express = require('express');
const router = express.Router();
const User = require('../models/userModel');


const parse = (s, fb) => {
  if (s === undefined) return fb;
  try { return JSON.parse(s); } catch { return fb; }
};


router.post('/', async (req, res) => {
  try {
    const { name, email, pendingTasks = [] } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: 'Bad Request', data: 'name and email are required' });
    }
    const user = await User.create({ name, email, pendingTasks });
    res.status(201).json({ message: 'User created', data: user });
  } catch (err) {
    res.status(400).json({ message: 'Bad Request', data: err.message });
  }
});


router.get('/', async (req, res) => {
  try {
    const where  = parse(req.query.where,  {});
    const sort   = parse(req.query.sort,   undefined);
    const select = parse(req.query.select, undefined);
    const skip   = req.query.skip  ? Number(req.query.skip)  : undefined;
    const limit  = req.query.limit ? Number(req.query.limit) : undefined;
    const count  = req.query.count === 'true';

    if (count) {
      const c = await User.countDocuments(where);
      return res.json({ message: 'OK', data: c });
    }

    let q = User.find(where);
    if (sort)   q = q.sort(sort);
    if (select) q = q.select(select);
    if (skip)   q = q.skip(skip);
    if (limit)  q = q.limit(limit);

    const users = await q.exec();
    res.json({ message: 'OK', data: users });
  } catch (err) {
    res.status(500).json({ message: 'Server Error', data: err.message });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const select = parse(req.query.select, undefined);
    const user = await User.findById(req.params.id).select(select || {});
    if (!user) return res.status(404).json({ message: 'Not Found', data: null });
    res.json({ message: 'OK', data: user });
  } catch (err) {
    res.status(400).json({ message: 'Bad Request', data: err.message });
  }
});


router.put('/:id', async (req, res) => {
    try {
      const { name, email, pendingTasks = [] } = req.body || {};
      if (!name || !email) {
        return res.status(400).json({ message: 'Bad Request', data: 'name and email are required' });
      }
  
      
      const prev = await User.findById(req.params.id);
      if (!prev) return res.status(404).json({ message: 'Not Found', data: null });
  
      
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { name, email, pendingTasks, dateCreated: prev.dateCreated },
        { new: true, runValidators: true, overwrite: true }
      );
  
      
      const Task = require('../models/taskModel');
      const userId = String(user._id);
      const want = new Set(pendingTasks.map(String)); 
  
      
      await Task.updateMany(
        { assignedUser: userId, _id: { $nin: Array.from(want) } },
        { $set: { assignedUser: '', assignedUserName: 'unassigned' } }
      );
  
      
      await Task.updateMany(
        { _id: { $in: Array.from(want) } },
        { $set: { assignedUser: userId, assignedUserName: user.name, completed: false } }
      );
  
      res.json({ message: 'OK', data: user });
    } catch (err) {
      res.status(400).json({ message: 'Bad Request', data: err.message });
    }
  });
  


  router.delete('/:id', async (req, res) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) return res.status(404).json({ message: 'Not Found', data: null });
  
      
      const Task = require('../models/taskModel');
      await Task.updateMany(
        { assignedUser: String(user._id) },
        { $set: { assignedUser: '', assignedUserName: 'unassigned' } }
      );
  
      res.status(204).json({ message: 'No Content', data: null });
    } catch (err) {
      res.status(400).json({ message: 'Bad Request', data: err.message });
    }
  });
  
  module.exports = router;