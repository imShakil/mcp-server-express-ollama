const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { initDB } = require('./db');
const todosRouter = require('./routes/todos');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/todos', todosRouter);

const start = async () => {
  await initDB();
  app.listen(process.env.PORT, () => {
    console.log(`🚀 Server running on port ${process.env.PORT}`);
  });
};

start();