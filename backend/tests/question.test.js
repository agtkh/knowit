const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/database');

describe('Question API (Protected)', () => {
    let primaryUser, otherUser;

    // 全てのテストの前に、2人のユーザーとそれぞれのフォルダを作成
    beforeAll(async () => {
        // ユーザー1
        const res1 = await request(app).post('/api/auth/register').send({ username: 'question_primary', password: 'password' });
        const token1 = (await request(app).post('/api/auth/login').send({ username: 'question_primary', password: 'password' })).body.token;
        const folderRes1 = await request(app).post('/api/folders').set('Authorization', `Bearer ${token1}`).send({ name: '自分の質問フォルダ' });
        primaryUser = { id: res1.body.user.id, token: token1, folderId: folderRes1.body.id };

        // ユーザー2
        const res2 = await request(app).post('/api/auth/register').send({ username: 'question_other', password: 'password' });
        const token2 = (await request(app).post('/api/auth/login').send({ username: 'question_other', password: 'password' })).body.token;
        const folderRes2 = await request(app).post('/api/folders').set('Authorization', `Bearer ${token2}`).send({ name: '他人の質問フォルダ' });
        otherUser = { id: res2.body.user.id, token: token2, folderId: folderRes2.body.id };
    });

    afterAll(async () => {
        await pool.query('DELETE FROM users WHERE id = $1 OR id = $2', [primaryUser.id, otherUser.id]);
        await pool.end();
    });

    describe('DELETE /api/questions/:questionId', () => {
        let questionId;

        beforeEach(async () => {
            const res = await pool.query(
                'INSERT INTO questions (folder_id, question_text, answer) VALUES ($1, $2, $3) RETURNING id',
                [primaryUser.folderId, '削除される質問', '答え']
            );
            questionId = res.rows[0].id;
        });

        it('正常に質問を削除できること', async () => {
            const response = await request(app)
                .delete(`/api/questions/${questionId}`)
                .set('Authorization', `Bearer ${primaryUser.token}`);

            expect(response.statusCode).toBe(200);
        });

        it('他人のフォルダに属する質問は削除できないこと', async () => {
            // 他人が自分のフォルダに質問を作成
            const otherQuestionRes = await pool.query(
                'INSERT INTO questions (folder_id, question_text, answer) VALUES ($1, $2, $3) RETURNING id',
                [otherUser.folderId, '他人の質問', '他人の答え']
            );
            const otherQuestionId = otherQuestionRes.rows[0].id;

            // 自分のトークンで他人の質問を削除しようとする
            const response = await request(app)
                .delete(`/api/questions/${otherQuestionId}`)
                .set('Authorization', `Bearer ${primaryUser.token}`);

            // 権限がないので404が返る
            expect(response.statusCode).toBe(404);

            // 他人の質問が削除されていないことを確認
            const dbCheck = await pool.query('SELECT * FROM questions WHERE id = $1', [otherQuestionId]);
            expect(dbCheck.rowCount).toBe(1);
        });
    });

    // 複数質問の一括削除テスト
    describe('POST /api/questions/delete-multiple', () => {
        let questionIds;

        // 各テストの前に、複数の質問を作成しておく
        beforeEach(async () => {
            const q1 = await pool.query('INSERT INTO questions (folder_id, question_text, answer) VALUES ($1, $2, $3) RETURNING id', [primaryUser.folderId, '一括削除用 質問1', '答え1']);
            const q2 = await pool.query('INSERT INTO questions (folder_id, question_text, answer) VALUES ($1, $2, $3) RETURNING id', [primaryUser.folderId, '一括削除用 質問2', '答え2']);
            const q3 = await pool.query('INSERT INTO questions (folder_id, question_text, answer) VALUES ($1, $2, $3) RETURNING id', [primaryUser.folderId, '一括削除用 質問3', '答え3']);
            questionIds = [q1.rows[0].id, q2.rows[0].id, q3.rows[0].id];
        });

        it('質問IDの配列を渡して、複数の質問を正常に一括削除できること', async () => {
            const idsToDelete = [questionIds[0], questionIds[2]]; // 質問1と3を削除

            const response = await request(app)
                .post(`/api/questions/delete-multiple`) // ★ エンドポイントを変更
                .set('Authorization', `Bearer ${primaryUser.token}`)
                .send({ question_ids: idsToDelete });

            expect(response.statusCode).toBe(200);
            expect(response.body.message).toContain('2 件の質問が削除されました');

            // DBをチェック
            const remaining = await pool.query('SELECT * FROM questions WHERE id = ANY($1::int[])', [questionIds]);
            expect(remaining.rowCount).toBe(1);
            expect(remaining.rows[0].id).toBe(questionIds[1]);
        });

        it('他人の質問は一括削除できないこと', async () => {
            // 他人が質問を作成
            const otherQ = await pool.query('INSERT INTO questions (folder_id, question_text, answer) VALUES ($1, $2, $3) RETURNING id', [otherUser.folderId, '他人の一括削除用質問', '答え']);
            const otherQuestionId = otherQ.rows[0].id;

            // 自分のトークンで、自分の質問IDと他人の質問IDを混ぜて削除しようとする
            const idsToDelete = [questionIds[0], otherQuestionId];
            const response = await request(app)
                .post('/api/questions/delete-multiple')
                .set('Authorization', `Bearer ${primaryUser.token}`)
                .send({ question_ids: idsToDelete });

            // 自分の質問1件だけが削除され、他人の質問は無視される
            expect(response.statusCode).toBe(200);
            expect(response.body.message).toContain('1 件の質問が削除されました');

            // 他人の質問が残っていることを確認
            const otherCheck = await pool.query('SELECT * FROM questions WHERE id = $1', [otherQuestionId]);
            expect(otherCheck.rowCount).toBe(1);
        });
    });

    // 複数質問の移動テスト
    describe('POST /api/questions/move-multiple', () => {
        let sourceFolderId, targetFolderId, qIds;

        beforeEach(async () => {
            // 移動元と移動先のフォルダを作成
            const sourceF = await request(app).post('/api/folders').set('Authorization', `Bearer ${primaryUser.token}`).send({ name: '移動元フォルダ' });
            const targetF = await request(app).post('/api/folders').set('Authorization', `Bearer ${primaryUser.token}`).send({ name: '移動先フォルダ' });
            sourceFolderId = sourceF.body.id;
            targetFolderId = targetF.body.id;

            // 移動元のフォルダに質問を作成
            const q1 = await pool.query('INSERT INTO questions (folder_id, question_text, answer) VALUES ($1, $2, $3) RETURNING id', [sourceFolderId, '移動する質問1', '答え1']);
            const q2 = await pool.query('INSERT INTO questions (folder_id, question_text, answer) VALUES ($1, $2, $3) RETURNING id', [sourceFolderId, '移動する質問2', '答え2']);
            qIds = [q1.rows[0].id, q2.rows[0].id];
        });

        it('複数の質問を別のフォルダに正常に移動できること', async () => {
            const response = await request(app)
                .post('/api/questions/move-multiple')
                .set('Authorization', `Bearer ${primaryUser.token}`)
                .send({
                    question_ids: qIds,
                    source_folder_id: sourceFolderId,
                    target_folder_id: targetFolderId,
                });
            
            expect(response.statusCode).toBe(200);
            expect(response.body.message).toContain('2 件の質問を移動しました');

            // DBをチェック
            const movedQuestions = await pool.query('SELECT folder_id FROM questions WHERE id = ANY($1::int[])', [qIds]);
            movedQuestions.rows.forEach(q => {
                expect(q.folder_id).toBe(targetFolderId);
            });
        });
    });

    // 複数質問のコピーテスト
    describe('POST /api/questions/copy-multiple', () => {
        let sourceFolderId, targetFolderId, qIds;

        beforeEach(async () => {
            const sourceF = await request(app).post('/api/folders').set('Authorization', `Bearer ${primaryUser.token}`).send({ name: 'コピー元フォルダ' });
            const targetF = await request(app).post('/api/folders').set('Authorization', `Bearer ${primaryUser.token}`).send({ name: 'コピー先フォルダ' });
            sourceFolderId = sourceF.body.id;
            targetFolderId = targetF.body.id;

            const q1 = await pool.query('INSERT INTO questions (folder_id, question_text, answer) VALUES ($1, $2, $3) RETURNING id', [sourceFolderId, 'コピーする質問1', '答え1']);
            qIds = [q1.rows[0].id];
        });

        it('複数の質問を別のフォルダに正常にコピーできること', async () => {
            const response = await request(app)
                .post('/api/questions/copy-multiple')
                .set('Authorization', `Bearer ${primaryUser.token}`)
                .send({
                    question_ids: qIds,
                    target_folder_id: targetFolderId,
                });
            
            expect(response.statusCode).toBe(201);
            expect(response.body.message).toContain('1 件の質問をコピーしました');

            // DBをチェック
            const sourceCount = await pool.query('SELECT COUNT(*) FROM questions WHERE folder_id = $1', [sourceFolderId]);
            const targetCount = await pool.query('SELECT COUNT(*) FROM questions WHERE folder_id = $1', [targetFolderId]);
            expect(parseInt(sourceCount.rows[0].count, 10)).toBe(1); // 元の質問は残っている
            expect(parseInt(targetCount.rows[0].count, 10)).toBe(1); // 新しい質問がコピーされている
        });
    });
});