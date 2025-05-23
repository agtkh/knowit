// backend/src/routes/folderRoutes.js
const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController');
const authMiddleware = require('../middleware/authMiddleware');


router.use(authMiddleware); // 全てのルートに認証ミドルウェアを適用

router.get('/', folderController.getAllFolders);
router.post('/', folderController.createFolder);
router.get('/:id', folderController.getFolderById);
router.put('/:id', folderController.updateFolder);
router.get('/:id/questions', folderController.getQuestionsInFolder);
router.post('/:id/questions', folderController.addQuestionToFolder);
router.delete('/:folderId/questions/:questionId', folderController.removeQuestionFromFolder);
router.delete('/:id', folderController.deleteFolder);
router.put('/:folderId/questions/:questionId/move', folderController.moveQuestionToFolder);
router.post('/:targetFolderId/questions/copy', folderController.copyQuestionToFolder);
router.post('/:folderId/copy', folderController.copyFolder);
router.get('/:folderId/questions/count', folderController.getQuestionCount);
router.get('/play/:folderId', folderController.getPlayQuestions);
router.post('/:id/import-csv', folderController.importQuestionsFromCsv);

router.post('/:folderId/questions/delete-multiple', folderController.deleteMultipleQuestions);
router.put('/:folderId/questions/move-multiple', folderController.moveMultipleQuestions);
router.post('/:targetFolderId/questions/copy-multiple', folderController.copyMultipleQuestions);


module.exports = router;