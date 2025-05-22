const express = require('express');
const cors = require('cors');
const path = require('path'); // path モジュールをインポート
const authRoutes = require('./routes/authRoutes');
const folderRoutes = require('./routes/folderRoutes');
const questionRoutes = require('./routes/questionRoutes');

const app = express();
const port = process.env.PORT || 3001;

// CORSミドルウェアを適用 (必要に応じて設定)
app.use(cors());

// JSON形式のRequestBodyを解析するミドルウェアを適用
app.use(express.json());

// APIのルーティング
app.use('/api/auth', authRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/questions', questionRoutes);

// // 静的ファイルの提供 (フロントエンドのビルド結果)
// const frontendBuildPath = path.join(__dirname, '../../frontend/dist'); // フロントエンドのビルドディレクトリ
// app.use(express.static(frontendBuildPath));

// // すべてのクライアントサイドルーティングに対するフォールバック
// app.get('*', (req, res) => {
//   res.sendFile(path.join(frontendBuildPath, 'index.html'));
// });

// サーバーを起動
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});