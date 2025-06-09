const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/database');

describe('Folder API (Protected)', () => {
  let primaryUser, otherUser; // ★ ユーザーを2人分用意

  // 全てのテストの前に、2人のユーザーを作成してログインしておく
  beforeAll(async () => {
    // ユーザー1 (主たるテスト対象)
    const res1 = await request(app).post('/api/auth/register').send({ username: 'primary_user', password: 'password' });
    const token1 = (await request(app).post('/api/auth/login').send({ username: 'primary_user', password: 'password' })).body.token;
    const folderRes1 = await request(app).post('/api/folders').set('Authorization', `Bearer ${token1}`).send({ name: '自分のフォルダ' });
    primaryUser = { id: res1.body.user.id, token: token1, folderId: folderRes1.body.id };

    // ユーザー2 (他人)
    const res2 = await request(app).post('/api/auth/register').send({ username: 'other_user', password: 'password' });
    const token2 = (await request(app).post('/api/auth/login').send({ username: 'other_user', password: 'password' })).body.token;
    otherUser = { id: res2.body.user.id, token: token2 };
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE id = $1 OR id = $2', [primaryUser.id, otherUser.id]);
    await pool.end();
  });
  
  describe('DELETE /api/folders/:id', () => {
    let tempFolderId;
    beforeEach(async () => {
        const folderResponse = await request(app)
            .post('/api/folders')
            .set('Authorization', `Bearer ${primaryUser.token}`)
            .send({ name: '一時的な削除用フォルダ' });
        tempFolderId = folderResponse.body.id;
    });

    it('フォルダを正常に削除できること', async () => {
      const response = await request(app)
        .delete(`/api/folders/${tempFolderId}`)
        .set('Authorization', `Bearer ${primaryUser.token}`);
      
      expect(response.statusCode).toBe(200);
    });

    // ===== このテストケースを追加 =====
    it('他人のフォルダは削除できないこと', async () => {
      // 他人がフォルダを作成
      const otherFolderRes = await request(app)
        .post('/api/folders')
        .set('Authorization', `Bearer ${otherUser.token}`)
        .send({ name: '他人のフォルダ' });
      const otherFolderId = otherFolderRes.body.id;

      // 自分のトークンで他人のフォルダを削除しようとする
      const response = await request(app)
        .delete(`/api/folders/${otherFolderId}`)
        .set('Authorization', `Bearer ${primaryUser.token}`);

      // 存在しない、または権限がないので404が返る
      expect(response.statusCode).toBe(404);

      // 他人のフォルダが削除されていないことを確認
      const dbCheck = await pool.query('SELECT * FROM folders WHERE id = $1', [otherFolderId]);
      expect(dbCheck.rowCount).toBe(1);
    });
  });
});