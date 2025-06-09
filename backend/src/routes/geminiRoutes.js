// backend/src/routes/geminiRoutes.js
const express = require('express');
const router = express.Router();
const geminiController = require('../controllers/geminiController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware); // 全てのルートに認証ミドルウェアを適用

// 全てのルートで認証ミドルウェアを適用
router.use(authMiddleware);
router.post("/generate-question", geminiController.getQuestionTextAndExplanationFromAnswer);

module.exports = router;