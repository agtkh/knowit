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
      // DBにユーザーが存在しない場合は、トークンが無効であると見なす
      return res.status(401).json({ message: '認証されていません (ユーザーが見つかりません)。' });
    }

    // リクエストオブジェクトにユーザー情報を格納
    req.user = { id: userId };

    // 次のミドルウェアまたはコントローラーへ
    next();

  } catch (error) {
    // トークンの有効期限切れの場合
    if (error.name === 'TokenExpiredError') {
      // サーバーの異常ではないため、通常のログとして出力
      console.log(`トークン有効期限切れ: ${error.message} - IP: ${req.ip}`);
      return res.status(401).json({ 
        message: '認証トークンの有効期限が切れました。再度ログインしてください。',
        code: 'TOKEN_EXPIRED' // フロントエンドで処理を分けるためのコード（任意）
      });
    }

    // その他のJWT関連のエラー（署名が不正など）
    if (error.name === 'JsonWebTokenError') {
      // サーバーの異常ではないため、通常のログとして出力
      console.log(`無効なトークンでのアクセス: ${error.message} - IP: ${req.ip}`);
      return res.status(401).json({ message: '認証トークンが不正です。' });
    }

    // 上記以外の予期せぬサーバーエラー
    console.error('認証処理中に予期せぬエラーが発生しました:', error);
    return res.status(500).json({ message: '認証処理中にサーバーエラーが発生しました。' });
  }
};

module.exports = authMiddleware;