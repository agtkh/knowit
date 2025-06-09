// backend/src/server.js
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const folderRoutes = require('./routes/folderRoutes');
const questionRoutes = require('./routes/questionRoutes');
const geminiRoutes = require('./routes/geminiRoutes');

const app = express();
const port = process.env.KNOWIT_PORT || 3001;

// CORSミドルウェアを適用 (必要に応じて設定)
app.use(cors());

// JSON形式のRequestBodyを解析するミドルウェアを適用
app.use(express.json());

// APIのルーティング
app.use('/api/auth', authRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/gemini', geminiRoutes);


if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

module.exports = app;
