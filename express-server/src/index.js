const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { initDB } = require('./db');
const { connectMCP } = require('./services/mcp.client');
const todosRouter = require('./routes/todos');
const authRouter = require('./routes/auth');
const chatRouter = require('./routes/chat.route');
const employeesRouter = require('./routes/employees.route');
const attendanceRouter = require('./routes/attendance.route');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/todos', todosRouter);
app.use('/auth', authRouter);
app.use('/chat', chatRouter);
app.use('/employees', employeesRouter);
app.use('/attendance', attendanceRouter);

const start = async () => {
  await initDB();
  await connectMCP();  // ← এটা যোগ করো
  app.listen(process.env.PORT, () => {
    console.log(`🚀 Server running on port ${process.env.PORT}`);
  });
};

start();