const pool = require('../database');

// 特定のIDの質問を取得
const getQuestionById = async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ message: '無効な質問IDです。' });
  }
  try {
    const result = await pool.query(
      'SELECT * FROM questions WHERE id = $1',
      [id]
    );
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
  const { question_text, answer, explanation } = req.body;
  const userId = req.user.id;

  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ message: '無効な質問IDです。' });
  }
  if (!question_text || !question_text.trim() || !answer || !answer.trim()) {
    return res.status(400).json({ message: '質問と回答は必須です。' });
  }

  try {
    // 質問が属するフォルダのオーナーであるかを確認
    const checkResult = await pool.query(
      'SELECT f.owner_user_id FROM questions q JOIN folders f ON q.folder_id = f.id WHERE q.id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: '指定された質問は見つかりませんでした。' });
    }
    if (checkResult.rows[0].owner_user_id !== userId) {
      return res.status(403).json({ message: 'この操作を行う権限がありません。' });
    }

    const updateResult = await pool.query(
      'UPDATE questions SET question_text = $1, answer = $2, explanation = $3 WHERE id = $4 RETURNING *',
      [question_text, answer, explanation, id]
    );
    res.status(200).json(updateResult.rows[0]);
  } catch (error) {
    console.error('質問の更新に失敗しました:', error);
    res.status(500).json({ message: '質問の更新に失敗しました。' });
  }
};

// 特定のIDの質問を削除
const deleteQuestion = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ message: '無効な質問IDです。' });
  }
  try {
    // 質問が属するフォルダのオーナーであるかを確認してから削除
    const deleteResult = await pool.query(
      `DELETE FROM questions
       WHERE id = $1 AND folder_id IN (SELECT id FROM folders WHERE owner_user_id = $2)
       RETURNING id`,
      [id, userId]
    );

    if (deleteResult.rowCount > 0) {
      res.status(200).json({ message: '質問を削除しました。' });
    } else {
      res.status(404).json({ message: '指定された質問が見つからないか、削除する権限がありません。' });
    }
  } catch (error) {
    console.error('質問の削除に失敗しました:', error);
    res.status(500).json({ message: '質問の削除に失敗しました。' });
  }
};


// 回答結果を処理
const processAnswer = async (req, res) => {
    const { questionId, isCorrect } = req.body;
    if (!questionId || isNaN(parseInt(questionId)) || typeof isCorrect !== 'boolean') {
      return res.status(400).json({ message: '無効なリクエストです。' });
    }
  
    try {
      const updateQuery = isCorrect
        ? 'UPDATE questions SET correct_count = correct_count + 1, last_answered_at = NOW() WHERE id = $1'
        : 'UPDATE questions SET incorrect_count = incorrect_count + 1, last_answered_at = NOW() WHERE id = $1';
  
      const result = await pool.query(updateQuery, [questionId]);
  
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

// 複数の質問を一括で削除
const deleteMultipleQuestions = async (req, res) => {
  const { question_ids } = req.body;
  const userId = req.user.id;

  if (!question_ids || !Array.isArray(question_ids) || question_ids.length === 0) {
    return res.status(400).json({ message: '質問IDが正しく指定されていません。' });
  }

  try {
    // 削除対象のすべての質問が、自分の所有するフォルダに属していることを確認してから削除
    const deleteResult = await pool.query(
      `DELETE FROM questions
       WHERE id = ANY($1::int[]) AND folder_id IN (SELECT id FROM folders WHERE owner_user_id = $2)`,
      [question_ids, userId]
    );

    if (deleteResult.rowCount > 0) {
        res.status(200).json({ message: `${deleteResult.rowCount} 件の質問が削除されました。` });
    } else {
        res.status(404).json({ message: '削除対象の質問が見つからないか、権限がありません。' });
    }

  } catch (error) {
    console.error('複数質問の削除に失敗しました:', error);
    res.status(500).json({ message: '質問の削除中にエラーが発生しました。' });
  }
};

/**
 * 複数質問の移動
 */
const moveMultipleQuestions = async (req, res) => {
  const { question_ids, target_folder_id, source_folder_id } = req.body;
  const userId = req.user.id;

  if (!question_ids || !Array.isArray(question_ids) || question_ids.length === 0 || !target_folder_id || !source_folder_id) {
    return res.status(400).json({ message: '必要なパラメータが不足しています。' });
  }
  if (target_folder_id === source_folder_id) {
    return res.status(400).json({ message: '同じフォルダへの移動はできません。' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // 移動元と移動先のフォルダ所有権を両方確認
    const folderCheck = await client.query(
      'SELECT id FROM folders WHERE id = ANY($1::int[]) AND owner_user_id = $2',
      [[source_folder_id, target_folder_id], userId]
    );
    if (folderCheck.rowCount !== 2) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'フォルダが見つからないか、アクセス権がありません。' });
    }

    // 移動元フォルダに属する質問を確認
    const questionCheck = await client.query(
      `SELECT id FROM questions WHERE id = ANY($1::int[]) AND folder_id = $2`,
      [question_ids, source_folder_id]
    );
    if (questionCheck.rowCount !== question_ids.length) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: '一部の移動対象質問が見つからないか、権限がありません。' });
    }

    const updateResult = await client.query(
      `UPDATE questions SET folder_id = $1 WHERE id = ANY($2::int[]) AND folder_id = $3`,
      [target_folder_id, question_ids, source_folder_id]
    );

    await client.query('COMMIT');
    res.status(200).json({ message: `${updateResult.rowCount} 件の質問を移動しました。` });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('複数質問の移動に失敗しました:', error);
    res.status(500).json({ message: '質問の移動中にエラーが発生しました。' });
  } finally {
    client.release();
  }
};
/**
 * 複数質問のコピー
 */
const copyMultipleQuestions = async (req, res) => {
  const { question_ids, target_folder_id } = req.body;
  const userId = req.user.id;

  if (!question_ids || !Array.isArray(question_ids) || question_ids.length === 0 || !target_folder_id) {
    return res.status(400).json({ message: '必要なパラメータが不足しています。' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // コピー先フォルダの所有権を確認
    const targetFolderResult = await client.query('SELECT id FROM folders WHERE id = $1 AND owner_user_id = $2', [target_folder_id, userId]);
    if (targetFolderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'コピー先フォルダが見つからないか、アクセス権がありません。' });
    }

    // コピー元の質問データを取得（これも自分の所有物か確認）
    const originalQuestionsResult = await client.query(
      `SELECT q.question_text, q.answer, q.explanation FROM questions q
       JOIN folders f ON q.folder_id = f.id
       WHERE q.id = ANY($1::int[]) AND f.owner_user_id = $2`,
      [question_ids, userId]
    );

    if (originalQuestionsResult.rows.length !== question_ids.length) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: '一部のコピー対象質問が見つからないか、権限がありません。' });
    }

    let copiedCount = 0;
    for (const q of originalQuestionsResult.rows) {
      await client.query(
        'INSERT INTO questions (question_text, answer, explanation, folder_id) VALUES ($1, $2, $3, $4)',
        [q.question_text, q.answer, q.explanation, target_folder_id]
      );
      copiedCount++;
    }

    await client.query('COMMIT');
    res.status(201).json({ message: `${copiedCount} 件の質問をコピーしました。` });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('複数質問のコピーに失敗しました:', error);
    res.status(500).json({ message: '質問のコピー中にエラーが発生しました。' });
  } finally {
    client.release();
  }
};

module.exports = {
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  deleteMultipleQuestions,
  processAnswer,
  moveMultipleQuestions,
  copyMultipleQuestions
};