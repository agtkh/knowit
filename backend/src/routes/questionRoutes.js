// backend/src/routes/questionRoutes.js
const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware); // 全てのルートに認証ミドルウェアを適用

// 全てのルートで認証ミドルウェアを適用
router.use(authMiddleware);

// 特定のIDの質問を取得
router.get('/:id', questionController.getQuestionById);

// 特定のIDの質問を更新
router.put('/:id', questionController.updateQuestion);

// 特定のIDの質問を削除
router.delete('/:id', questionController.deleteQuestion);

// 回答結果を処理
router.post('/answer', questionController.processAnswer);

// 複数質問の一括削除
router.post('/delete-multiple', questionController.deleteMultipleQuestions);

// 複数質問の移動
router.post('/move-multiple', questionController.moveMultipleQuestions);

// 複数質問のコピー
router.post('/copy-multiple', questionController.copyMultipleQuestions);

module.exports = router;