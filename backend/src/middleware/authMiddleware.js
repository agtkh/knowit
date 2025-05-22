// src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const pool = require('../database'); // データベース接続

const authMiddleware = async (req, res, next) => {
  // ヘッダーから認証トークンを取得
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '認証されていません (トークンが存在しません)。' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // トークンを検証
    const decoded = jwt.verify(token, "30f0a5d2e18db2004bd99edd9bd64ea4");

    // トークンに含まれるユーザーIDを取得
    const userId = decoded.userId;

    // ユーザーIDが存在するか確認 (必要に応じて)
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: '認証されていません (ユーザーが見つかりません)。' });
    }

    // リクエストオブジェクトにユーザー情報を格納
    req.user = { id: userId };

    // 次のミドルウェアまたはコントローラーへ
    next();

  } catch (error) {
    console.error('認証エラー:', error);
    return res.status(401).json({ message: '認証されていません (トークンが無効です)。' });
  }
};

module.exports = authMiddleware;