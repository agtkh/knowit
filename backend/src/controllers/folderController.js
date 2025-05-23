const pool = require('../database');

// 自身がオーナーのフォルダ一覧を取得
const getAllFolders = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(`
      SELECT
        f.id,
        f.folder_name,
        COUNT(q.id) AS question_count
      FROM folders f
      LEFT JOIN questions q ON f.id = q.folder_id
      WHERE f.owner_user_id = $1
      GROUP BY f.id, f.folder_name
      ORDER BY f.id
    `, [userId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('自身がオーナーのフォルダ一覧の取得に失敗しました (問題数を含む):', error);
    res.status(500).json({ message: 'フォルダ一覧の取得に失敗しました。' });
  }
};



// 自身がオーナーの特定のIDのフォルダを取得
const getFolderById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ message: '無効なフォルダIDです。' });
  }
  try {
    const result = await pool.query('SELECT id, folder_name FROM folders WHERE id = $1 AND owner_user_id = $2', [id, userId]); // 修正
    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).json({ message: '指定されたIDのフォルダは見つかりませんでした。' });
    }
  } catch (error) {
    console.error('自身がオーナーのフォルダ詳細の取得に失敗しました:', error);
    res.status(500).json({ message: 'フォルダ詳細の取得に失敗しました。' });
  }
};

// フォルダとその中の質問をコピー
const copyFolder = async (req, res) => {
  const { folderId } = req.params;
  const { newFolderName } = req.body;
  const userId = req.user.id;

  if (!folderId || isNaN(parseInt(folderId))) {
    return res.status(400).json({ message: '無効なフォルダIDです。' });
  }
  if (!newFolderName || !newFolderName.trim()) {
    return res.status(400).json({ message: '新しいフォルダ名を指定してください。' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // コピー元のフォルダが存在し、オーナーが自分であることを確認
    const originalFolderResult = await client.query(
      'SELECT folder_name FROM folders WHERE id = $1 AND owner_user_id = $2',
      [folderId, userId]
    );
    if (originalFolderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'コピー元のフォルダが見つかりません。' });
    }
    const originalFolderName = originalFolderResult.rows[0].folder_name;

    // 新しいフォルダを作成
    const newFolderResult = await client.query(
      'INSERT INTO folders (folder_name, owner_user_id) VALUES ($1, $2) RETURNING id',
      [newFolderName, userId]
    );
    const newFolderId = newFolderResult.rows[0].id;

    // コピー元のフォルダの質問を取得
    const questionsToCopyResult = await client.query(
      'SELECT question_text, answer, explanation FROM questions WHERE folder_id = $1',
      [folderId]
    );
    const questionsToCopy = questionsToCopyResult.rows;

    // 新しいフォルダに質問を挿入
    for (const question of questionsToCopy) {
      await client.query(
        'INSERT INTO questions (question_text, answer, explanation, folder_id) VALUES ($1, $2, $3, $4)',
        [question.question_text, question.answer, question.explanation, newFolderId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: `フォルダ "${originalFolderName}" を "${newFolderName}" としてコピーしました。`, newFolderId });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('フォルダのコピーに失敗しました:', error);
    res.status(500).json({ message: 'フォルダのコピーに失敗しました。' });
  } finally {
    client.release();
  }
};

// 自身がオーナーの特定のフォルダの質問一覧を取得
const getQuestionsInFolder = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ message: '無効なフォルダIDです。' });
  }
  try {
    const folderCheckResult = await pool.query('SELECT id FROM folders WHERE id = $1 AND owner_user_id = $2', [id, userId]);
    if (folderCheckResult.rows.length === 0) {
      return res.status(404).json({ message: '指定されたIDのフォルダは見つかりませんでした。' });
    }
    const result = await pool.query(`
      SELECT
        id,
        question_text,
        answer,
        explanation,
        folder_id,
        correct_count,
        incorrect_count,
        CASE WHEN correct_count + incorrect_count = 0 THEN 0.0 ELSE (100.0 * correct_count / (correct_count + incorrect_count)) END AS correct_rate,
        last_answered_at
      FROM questions
      WHERE folder_id = $1
    `, [id]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('自身がオーナーのフォルダ内の質問一覧の取得に失敗しました:', error);
    res.status(500).json({ message: 'フォルダ内の質問一覧の取得に失敗しました。' });
  }
};
// 特定のフォルダから質問を削除 (オーナー確認は不要。質問はフォルダに紐づく)
const removeQuestionFromFolder = async (req, res) => {
  const { folderId, questionId } = req.params;
  const userId = req.user.id;
  if (!folderId || isNaN(parseInt(folderId)) || !questionId || isNaN(parseInt(questionId))) {
    return res.status(400).json({ message: '無効なフォルダIDまたは質問IDです。' });
  }
  try {
    const folderCheckResult = await pool.query('SELECT id FROM folders WHERE id = $1 AND owner_user_id = $2', [folderId, userId]); // 修正
    if (folderCheckResult.rows.length === 0) {
      return res.status(404).json({ message: '指定されたIDのフォルダは見つかりませんでした。' });
    }
    const result = await pool.query('UPDATE questions SET folder_id = NULL WHERE id = $1 AND folder_id = $2', [questionId, folderId]);
    if (result.rowCount > 0) {
      res.status(200).json({ message: '質問をフォルダから削除しました。' });
    } else {
      res.status(404).json({ message: '指定されたフォルダまたは質問が見つかりませんでした。' });
    }
  } catch (error) {
    console.error('フォルダからの質問の削除に失敗しました:', error);
    res.status(500).json({ message: 'フォルダからの質問の削除に失敗しました。' });
  }
};

// 新しいフォルダを作成 (オーナーIDを設定)
const createFolder = async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'フォルダ名を指定してください。' });
  }
  try {
    const result = await pool.query('INSERT INTO folders (folder_name, owner_user_id) VALUES ($1, $2) RETURNING id, folder_name, owner_user_id', [name, userId]); // 修正
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('フォルダの作成に失敗しました:', error);
    res.status(500).json({ message: 'フォルダの作成に失敗しました。' });
  }
};

// 自身がオーナーの特定のフォルダを更新 (名前の変更)
const updateFolder = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const userId = req.user.id;
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ message: '無効なフォルダIDです。' });
  }
  if (!name || !name.trim()) {
    return res.status(400).json({ message: '新しいフォルダ名を指定してください。' });
  }
  try {
    const result = await pool.query('UPDATE folders SET folder_name = $1 WHERE id = $2 AND owner_user_id = $3 RETURNING id, folder_name', [name, id, userId]); // 修正
    if (result.rowCount > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).json({ message: '指定されたIDのフォルダは見つかりませんでした。' });
    }
  } catch (error) {
    console.error('自身がオーナーのフォルダの更新に失敗しました:', error);
    res.status(500).json({ message: 'フォルダの更新に失敗しました。' });
  }
};

// 自身がオーナーの特定のフォルダを削除し、関連する質問も削除
const deleteFolder = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ message: '無効なフォルダIDです。' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // オーナー確認
    const folderCheckResult = await client.query('SELECT id FROM folders WHERE id = $1 AND owner_user_id = $2', [id, userId]); // 修正
    if (folderCheckResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: '指定されたIDのフォルダは見つかりませんでした。' });
    }
    // 関連する質問を削除
    await client.query('DELETE FROM questions WHERE folder_id = $1', [id]);
    // フォルダを削除
    const result = await client.query('DELETE FROM folders WHERE id = $1 AND owner_user_id = $2', [id, userId]); // 修正
    await client.query('COMMIT');
    if (result.rowCount > 0) {
      res.status(200).json({ message: 'フォルダとそれに関連する質問を削除しました。' });
    } else {
      res.status(404).json({ message: '指定されたIDのフォルダは見つかりませんでした。' });
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('自身がオーナーのフォルダと関連する質問の削除に失敗しました:', error);
    res.status(500).json({ message: 'フォルダと関連する質問の削除に失敗しました。' });
  } finally {
    client.release();
  }
};

// 自身がオーナーの特定のフォルダに質問を追加
const addQuestionToFolder = async (req, res) => {
  const { id: folderId } = req.params;
  const { question_text, answer, explanation, folder_id } = req.body;
  const userId = req.user.id;

  if (!folderId || isNaN(parseInt(folderId))) {
    return res.status(400).json({ message: '無効なフォルダIDです。' });
  }
  if (!question_text || !question_text.trim() || !answer || !answer.trim()) {
    return res.status(400).json({ message: '質問と回答は必須です。' });
  }
  if (parseInt(folderId) !== parseInt(folder_id)) {
    return res.status(400).json({ message: 'リクエストのフォルダIDが不正です。' });
  }

  try {
    const folderCheckResult = await pool.query('SELECT id FROM folders WHERE id = $1 AND owner_user_id = $2', [folderId, userId]);
    if (folderCheckResult.rows.length === 0) {
      return res.status(404).json({ message: '指定されたIDのフォルダは見つかりませんでした。' });
    }
    const result = await pool.query(
      'INSERT INTO questions (question_text, answer, explanation, folder_id, correct_count, incorrect_count, last_answered_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, question_text, answer, explanation, folder_id, correct_count, incorrect_count, last_answered_at',
      [question_text, answer, explanation, folder_id, 0, 0, null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('自身がオーナーのフォルダへの質問の追加に失敗しました:', error);
    res.status(500).json({ message: '質問の追加に失敗しました。' });
  }
};

const processAnswer = async (req, res) => {
  const { questionId, isCorrect } = req.body; // 例: リクエストボディに questionId と正誤情報を含む
  if (!questionId || isNaN(parseInt(questionId)) || typeof isCorrect !== 'boolean') {
    return res.status(400).json({ message: '無効なリクエストです。' });
  }

  try {
    let updateQuery = '';
    const params = [questionId, new Date()]; // 最終回答日時を現在時刻で更新

    if (isCorrect) {
      updateQuery = 'UPDATE questions SET correct_count = correct_count + 1, last_answered_at = $2 WHERE id = $1';
    } else {
      updateQuery = 'UPDATE questions SET incorrect_count = incorrect_count + 1, last_answered_at = $2 WHERE id = $1';
    }

    const result = await pool.query(updateQuery, params);

    if (result.rowCount > 0) {
      res.status(200).json({ message: '回答結果を更新しました。' });
    } else {
      res.status(404).json({ message: '指定された質問は見つかりませんでした。' });
    }
  } catch (error) {
    console.error('回答結果の処理に失敗しました:', error);
    res.status(500).json({ message: '回答結果の処理に失敗しました。' });
  }
};

// 質問を別のフォルダに移動 (オーナー確認は移動先のみ)
const moveQuestionToFolder = async (req, res) => {
  const { folderId, questionId } = req.params;
  const { target_folder_id } = req.body;
  const userId = req.user.id;

  if (!folderId || isNaN(parseInt(folderId)) || !questionId || isNaN(parseInt(questionId)) || !target_folder_id || isNaN(parseInt(target_folder_id))) {
    return res.status(400).json({ message: '無効なパラメータです。' });
  }

  if (parseInt(folderId) === parseInt(target_folder_id)) {
    return res.status(400).json({ message: '移動先のフォルダが現在のフォルダと同じです。' });
  }

  try {
    // 移動先のフォルダのオーナーを確認
    const targetFolderOwnerResult = await pool.query('SELECT owner_user_id FROM folders WHERE id = $1', [target_folder_id]); // 修正
    if (targetFolderOwnerResult.rows.length === 0) {
      return res.status(404).json({ message: '移動先のフォルダが見つかりません。' });
    }
    if (parseInt(targetFolderOwnerResult.rows[0].owner_user_id) !== userId) { // 修正
      return res.status(403).json({ message: '移動先のフォルダへのアクセス権がありません。' });
    }

    // 現在のフォルダに質問が存在することを確認 (オーナーである必要はない)
    const questionInCurrentFolderResult = await pool.query('SELECT id FROM questions WHERE id = $1 AND folder_id = $2', [questionId, folderId]);
    if (questionInCurrentFolderResult.rows.length === 0) {
      return res.status(404).json({ message: '指定された質問は現在のフォルダに存在しません。' });
    }

    const result = await pool.query(
      'UPDATE questions SET folder_id = $1 WHERE id = $2 AND folder_id = $3 RETURNING id, question_text, answer, explanation, folder_id',
      [target_folder_id, questionId, folderId]
    );

    if (result.rowCount > 0) {
      res.status(200).json({ message: '質問を別のフォルダに移動しました。', question: result.rows[0] });
    } else {
      res.status(404).json({ message: '指定された質問は見つからないか、現在のフォルダに存在しません。' });
    }
  } catch (error) {
    console.error('質問の移動に失敗しました:', error);
    res.status(500).json({ message: '質問の移動に失敗しました。' });
  }
};

// 質問を別のフォルダにコピー (オーナー確認はコピー先のみ)
const copyQuestionToFolder = async (req, res) => {
  const { targetFolderId } = req.params;
  const { question_id } = req.body;
  const userId = req.user.id;

  if (!targetFolderId || isNaN(parseInt(targetFolderId)) || !question_id || isNaN(parseInt(question_id))) {
    return res.status(400).json({ message: '無効なパラメータです。' });
  }

  try {
    // コピー先のフォルダのオーナーを確認
    const targetFolderOwnerResult = await pool.query('SELECT owner_user_id FROM folders WHERE id = $1', [targetFolderId]); // 修正
    if (targetFolderOwnerResult.rows.length === 0) {
      return res.status(404).json({ message: 'コピー先のフォルダが見つかりません。' });
    }
    if (parseInt(targetFolderOwnerResult.rows[0].owner_user_id) !== userId) { // 修正
      return res.status(403).json({ message: 'コピー先のフォルダへのアクセス権がありません。' });
    }

    // コピー元の質問を取得 (存在すれば良い。オーナー確認は不要)
    const originalQuestionResult = await pool.query('SELECT question_text, answer, explanation FROM questions WHERE id = $1', [question_id]);
    if (originalQuestionResult.rows.length === 0) {
      return res.status(404).json({ message: '指定された質問は見つかりませんでした。' });
    }
    const { question_text, answer, explanation } = originalQuestionResult.rows[0];

    // コピー先のフォルダに新しい質問を作成
    const insertResult = await pool.query(
      'INSERT INTO questions (question_text, answer, explanation, folder_id) VALUES ($1, $2, $3, $4) RETURNING id, question_text, answer, explanation, folder_id',
      [question_text, answer, explanation, targetFolderId]
    );

    res.status(201).json({ message: '質問を別のフォルダにコピーしました。', question: insertResult.rows[0] });
  } catch (error) {
    console.error('質問のコピーに失敗しました:', error);
    res.status(500).json({ message: '質問のコピーに失敗しました。' });
  }
};

// 特定のIDの質問を取得
const getQuestionById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id; // 認証されたユーザーのID

  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ message: '無効な質問IDです。' });
  }

  try {
    const result = await pool.query(`
      SELECT
        id,
        question_text,
        answer,
        explanation,
        folder_id,
        correct_count,
        incorrect_count,
        last_answered_at
      FROM questions
      WHERE id = $1
      -- 必要であれば、質問が属するフォルダのオーナーが自分であるかを確認する処理を追加
    `, [id]);

    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).json({ message: '指定された質問は見つかりませんでした。' });
    }
  } catch (error) {
    console.error('質問詳細の取得に失敗しました:', error);
    res.status(500).json({ message: '質問詳細の取得に失敗しました。' });
  }
};

// 特定のIDの質問を更新
const updateQuestion = async (req, res) => {
  const { id } = req.params;
  const { question_text, answer, explanation, folder_id } = req.body;
  const userId = req.user.id; // 認証されたユーザーのID

  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ message: '無効な質問IDです。' });
  }
  if (!question_text || !question_text.trim() || !answer || !answer.trim()) {
    return res.status(400).json({ message: '質問と回答は必須です。' });
  }

  try {
    // 必要であれば、質問が属するフォルダのオーナーが自分であるかを確認する処理を追加
    const updateResult = await pool.query(
      `
      UPDATE questions
      SET question_text = $1, answer = $2, explanation = $3, folder_id = $4
      WHERE id = $5
      -- 必要であれば、更新件数が0件の場合にエラーを返すなどの処理を追加
      `,
      [question_text, answer, explanation, folder_id, id]
    );

    if (updateResult.rowCount > 0) {
      res.status(200).json({ message: '質問を更新しました。' });
    } else {
      res.status(404).json({ message: '指定された質問は見つかりませんでした。' });
    }
  } catch (error) {
    console.error('質問の更新に失敗しました:', error);
    res.status(500).json({ message: '質問の更新に失敗しました。' });
  }
};

// 特定のフォルダに含まれる質問の数を取得
const getQuestionCount = async (req, res) => {
  const { folderId } = req.params;
  const userId = req.user.id; // 認証されたユーザーのID

  if (!folderId || isNaN(parseInt(folderId))) {
    return res.status(400).json({ message: '無効なフォルダIDです。' });
  }

  try {
    const folderCheckResult = await pool.query('SELECT id FROM folders WHERE id = $1 AND owner_user_id = $2', [folderId, userId]);
    if (folderCheckResult.rows.length === 0) {
      return res.status(404).json({ message: '指定されたIDのフォルダは見つかりませんでした。' });
    }

    const result = await pool.query('SELECT COUNT(*) FROM questions WHERE folder_id = $1', [folderId]);
    res.status(200).json({ count: parseInt(result.rows[0].count, 10) });
  } catch (error) {
    console.error('フォルダ内の質問数の取得に失敗しました:', error);
    res.status(500).json({ message: 'フォルダ内の質問数の取得に失敗しました。' });
  }
};

const getPlayQuestions = async (req, res) => {
  const { folderId } = req.params;
  const { limit } = req.query;
  const userId = req.user.id; // 認証されたユーザーのID
  const questionLimit = parseInt(limit, 10) || 10; // デフォルトは10問

  if (!folderId || isNaN(parseInt(folderId))) {
    return res.status(400).json({ message: '無効なフォルダIDです。' });
  }

  try {
    const folderCheckResult = await pool.query('SELECT id FROM folders WHERE id = $1 AND owner_user_id = $2', [folderId, userId]);
    if (folderCheckResult.rows.length === 0) {
      return res.status(404).json({ message: '指定されたIDのフォルダは見つかりませんでした。' });
    }

    const result = await pool.query(
      `
      SELECT id, question_text, answer
      FROM questions
      WHERE folder_id = $1
      ORDER BY RANDOM()
      LIMIT $2
      `,
      [folderId, questionLimit]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Play 問題の取得に失敗しました:', error);
    res.status(500).json({ message: 'Play 問題の取得に失敗しました。' });
  }
};


// CSV から質問をインポート
const importQuestionsFromCsv = async (req, res) => {
  const { id: folderId } = req.params;
  const { questions } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(questions) || questions.some(q => !q.question_text || !q.answer)) {
    return res.status(400).json({ message: 'インポートする質問データの形式が正しくありません。' });
  }

  try {
    // フォルダのオーナー確認 (インポート先)
    const folderCheckResult = await pool.query('SELECT id FROM folders WHERE id = $1 AND owner_user_id = $2', [folderId, userId]);
    if (folderCheckResult.rows.length === 0) {
      return res.status(404).json({ message: '指定されたフォルダは見つかりませんでした。' });
    }

    for (const question of questions) {
      await pool.query(
        'INSERT INTO questions (question_text, answer, explanation, folder_id) VALUES ($1, $2, $3, $4)',
        [question.question_text, question.answer, question.explanation, folderId]
      );
    }

    res.status(201).json({ message: `CSV ファイルから ${questions.length} 件の質問をインポートしました。` });
  } catch (error) {
    console.error('CSV インポートに失敗しました:', error);
    res.status(500).json({ message: 'CSV インポートに失敗しました。' });
  }
};

module.exports = {
  getAllFolders,
  getFolderById,
  getQuestionsInFolder,
  removeQuestionFromFolder,
  createFolder,
  updateFolder,
  deleteFolder,
  addQuestionToFolder,
  moveQuestionToFolder,
  copyQuestionToFolder,
  copyFolder,
  processAnswer,
  getQuestionById,
  updateQuestion,
  getQuestionCount,
  getPlayQuestions,
  importQuestionsFromCsv,
};