// backend/src/controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || '30f0a5d2e18db2004bd99edd9bd64ea4'; // 環境変数またはデフォルトの秘密鍵

const registerUser = async (req, res) => {
  const { username, password } = req.body; // name の取得を削除

  if (!username || !password) {
    return res.status(400).json({ message: 'ユーザー名とパスワードは必須です。' });
  }

  try {
    const existingUserResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (existingUserResult.rows.length > 0) {
      return res.status(409).json({ message: 'そのユーザー名は既に登録されています。' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUserResult = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username', // name の挿入を削除
      [username, hashedPassword]
    );

    res.status(201).json({ message: 'ユーザー登録が完了しました。', user: newUserResult.rows[0] });
  } catch (error) {
    console.error('ユーザー登録エラー:', error);
    res.status(500).json({ message: 'ユーザー登録に失敗しました。サーバーエラーが発生しました。' });
  }
};

const loginUser = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'ユーザー名とパスワードは必須です。' });
  }

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({ message: '認証に失敗しました。ユーザー名またはパスワードが間違っています。' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: '認証に失敗しました。ユーザー名またはパスワードが間違っています。' });
    }

    // 最終ログイン日時を更新
    await pool.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ message: 'ログインに成功しました。', token });
  } catch (error) {
    console.error('ログインエラー:', error);
    res.status(500).json({ message: 'ログインに失敗しました。サーバーエラーが発生しました。' });
  }
};

module.exports = { registerUser, loginUser };