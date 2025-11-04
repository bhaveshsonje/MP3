
const express = require('express');
const router = express.Router();
const Task = require('../models/taskModel');
const User = require('../models/userModel');


const parse = (s, fb) => {
  if (s === undefined) return fb;
  try { return JSON.parse(s); } catch { return fb; }
};


async function addPending(task) {
  if (!task || !task.assignedUser || task.completed) return;
  const taskId = String(task._id);
  await User.updateOne(
    { _id: task.assignedUser, pendingTasks: { $ne: taskId } },
    { $push: { pendingTasks: taskId } }
  );
}


async function removePending(userId, taskId) {
  if (!userId || !taskId) return;
  await User.updateOne(
    { _id: userId },
    { $pull: { pendingTasks: String(taskId) } }
  );
}


router.post('/', async (req, res) => {
  try {
    const {
      name, description = '',
      deadline, completed = false,
      assignedUser = '', assignedUserName = 'unassigned'
    } = req.body || {};

    if (!name || !deadline) {
      return res.status(400).json({ message: 'Bad Request', data: 'name and deadline are required' });
    }

    
    let finalAssignedUser = assignedUser;
    let finalAssignedUserName = assignedUserName;
    if (assignedUser) {
      const u = await User.findById(assignedUser);
      if (!u) return res.status(400).json({ message: 'Bad Request', data: 'assignedUser not found' });
      if (!assignedUserName || assignedUserName === 'unassigned') finalAssignedUserName = u.name;
      finalAssignedUser = String(u._id);
    }

    const task = await Task.create({
      name, description, deadline, completed,
      assignedUser: finalAssignedUser,
      assignedUserName: finalAssignedUserName
    });

    await addPending(task);

    res.status(201).json({ message: 'Task created', data: task });
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
      const c = await Task.countDocuments(where);
      return res.json({ message: 'OK', data: c });
    }

    let q = Task.find(where);
    if (sort)   q = q.sort(sort);
    if (select) q = q.select(select);
    if (skip)   q = q.skip(skip);
    if (limit)  q = q.limit(limit);

    const tasks = await q.exec();
    res.json({ message: 'OK', data: tasks });
  } catch (err) {
    res.status(500).json({ message: 'Server Error', data: err.message });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const select = parse(req.query.select, undefined);
    const task = await Task.findById(req.params.id).select(select || {});
    if (!task) return res.status(404).json({ message: 'Not Found', data: null });
    res.json({ message: 'OK', data: task });
  } catch (err) {
    res.status(400).json({ message: 'Bad Request', data: err.message });
  }
});


router.put('/:id', async (req, res) => {
  try {
    const { name, description = '', deadline, completed = false,
            assignedUser = '', assignedUserName = 'unassigned' } = req.body || {};

    if (!name || !deadline) {
      return res.status(400).json({ message: 'Bad Request', data: 'name and deadline are required' });
    }

    const existing = await Task.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Not Found', data: null });

    
    let nextAssignedUser = assignedUser;
    let nextAssignedUserName = assignedUserName;
    if (assignedUser) {
      const u = await User.findById(assignedUser);
      if (!u) return res.status(400).json({ message: 'Bad Request', data: 'assignedUser not found' });
      if (!assignedUserName || assignedUserName === 'unassigned') nextAssignedUserName = u.name;
      nextAssignedUser = String(u._id);
    }

    
    const updated = await Task.findByIdAndUpdate(
      req.params.id,
      {
        name, description, deadline, completed,
        assignedUser: nextAssignedUser,
        assignedUserName: nextAssignedUserName,
        dateCreated: existing.dateCreated 
      },
      { new: true, runValidators: true, overwrite: true }
    );

    
    const oldUser = existing.assignedUser;
    const newUser = updated.assignedUser;
    const tId = String(updated._id);

   
    if (oldUser && (oldUser !== newUser || updated.completed)) {
      await removePending(oldUser, tId);
    }
    
    if (newUser && !updated.completed) {
      await addPending(updated);
    }

    res.json({ message: 'OK', data: updated });
  } catch (err) {
    res.status(400).json({ message: 'Bad Request', data: err.message });
  }
});


router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Not Found', data: null });

    if (task.assignedUser) {
      await removePending(task.assignedUser, String(task._id));
    }
    res.status(204).json({ message: 'No Content', data: null });
  } catch (err) {
    res.status(400).json({ message: 'Bad Request', data: err.message });
  }
});

module.exports = router;
