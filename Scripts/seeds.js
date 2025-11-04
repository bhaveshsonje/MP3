require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/userModel');
const Task = require('../models/taskModel');

(async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/api-piper';
    await mongoose.connect(uri);
    console.log('Connected for seeding');

    
    await User.deleteMany({});
    await Task.deleteMany({});
    console.log('🧹 Collections cleared');

   
    const users = Array.from({ length: 25 }, (_, i) => ({
      name: `User ${i + 1}`,
      email: `user${i + 1}@test.com`,
      pendingTasks: [],
    }));
    const createdUsers = await User.insertMany(users);
    console.log(`👤 inserted users: ${createdUsers.length}`);

    
    const futureDate = (days) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d;
    };

   
    const tasks = [];
    const buckets = new Map(); 

    for (let i = 0; i < 120; i++) {
      const shouldAssign = Math.random() < 0.6;
      let assignedUser = '';
      let assignedUserName = 'unassigned';

      if (shouldAssign) {
        const u = createdUsers[Math.floor(Math.random() * createdUsers.length)];
        assignedUser = String(u._id);
        assignedUserName = u.name;
      }

      tasks.push({
        name: `Task ${i + 1}`,
        description: `Auto-generated task #${i + 1}`,
        deadline: futureDate(7 + Math.floor(Math.random() * 50)),
        completed: false,
        assignedUser,
        assignedUserName,
      });
    }

    const createdTasks = await Task.insertMany(tasks);
    console.log(`📝 inserted tasks: ${createdTasks.length}`);

    
    for (const t of createdTasks) {
      if (t.assignedUser) {
        const key = String(t.assignedUser);
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(t._id);
      }
    }

    const bulk = [];
    for (const [userId, taskIds] of buckets.entries()) {
      bulk.push({
        updateOne: {
          filter: { _id: userId },
          update: { $set: { pendingTasks: taskIds } },
        },
      });
    }
    if (bulk.length) {
      await User.bulkWrite(bulk);
      console.log(`🔁 synced pendingTasks for ${bulk.length} users`);
    }

    console.log('🌱 Seeding complete');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
})();
