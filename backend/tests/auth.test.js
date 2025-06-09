const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/database');

describe('Auth API', () => {

  // 各テストの前に、users テーブルをクリーンな状態にする
  beforeEach(async () => {
    await pool.query('DELETE FROM users');
  });

  // 全てのテストが終了した後に、データベース接続を閉じる
  afterAll(async () => {
    pool.query('DELETE FROM users'); // テスト後にテーブルをクリーンアップ
    await pool.end();
  });

  // ユーザー登録APIのテスト
  describe('POST /api/auth/register', () => {
    // (ここは前回のコードと同じなので省略)
    it('新しいユーザーを正常に登録できること', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123',
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.message).toBe('ユーザー登録が完了しました。');
      expect(response.body.user.username).toBe('testuser');
    });

    it('既に存在するユーザー名は登録できないこと (409 Conflict)', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123',
        });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123',
        });
      
      expect(response.statusCode).toBe(409);
      expect(response.body.message).toBe('そのユーザー名は既に登録されています。');
    });

    it('パスワードが未入力の場合にエラーを返すこと (400 Bad Request)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'anotheruser',
        });
        
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe('ユーザー名とパスワードは必須です。');
    });

    it('ユーザー名が未入力の場合にエラーを返すこと (400 Bad Request)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          password: 'password123',
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe('ユーザー名とパスワードは必須です。');
    });

    it('ユーザー名が空文字列の場合にエラーを返すこと (400 Bad Request)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: '',
          password: 'password123',
        });
        
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe('ユーザー名とパスワードは必須です。');
    });

    it('パスワードが空文字列の場合にエラーを返すこと (400 Bad Request)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: '',
        });
        
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe('ユーザー名とパスワードは必須です。');
    });
  });

  // ===== ここからログインAPIのテストを追加 =====
  describe('POST /api/auth/login', () => {
    
    // ログインテストの前に、テスト用のユーザーを登録しておく
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123',
        });
    });

    it('正しいユーザー名とパスワードで正常にログインできること', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123',
        });

      // ステータスコードが 200 であることを確認
      expect(response.statusCode).toBe(200);
      // レスポンスに token プロパティが存在することを確認
      expect(response.body).toHaveProperty('token');
      // token が文字列であることを確認
      expect(typeof response.body.token).toBe('string');
    });

    it('間違ったパスワードではログインできないこと (401 Unauthorized)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword',
        });
      
      // ステータスコードが 401 であることを確認
      expect(response.statusCode).toBe(401);
      // エラーメッセージが正しいことを確認
      expect(response.body.message).toContain('認証に失敗しました');
    });

    it('存在しないユーザー名ではログインできないこと (401 Unauthorized)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistentuser',
          password: 'password123',
        });
      
      // ステータスコードが 401 であることを確認
      expect(response.statusCode).toBe(401);
      // エラーメッセージが正しいことを確認
      expect(response.body.message).toContain('認証に失敗しました');
    });

    it('ユーザー名が未入力の場合にエラーを返すこと (400 Bad Request)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'password123',
        });
      
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe('ユーザー名とパスワードは必須です。');
    });
  });
});