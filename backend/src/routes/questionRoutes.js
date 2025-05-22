// backend/src/routes/questionRoutes.js
const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware); // 全てのルートに認証ミドルウェアを適用

router.post('/answer', folderController.processAnswer);
router.get('/:id', folderController.getQuestionById);
router.put('/:id', folderController.updateQuestion);

module.exports = router;