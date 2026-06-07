
const express = require('express');
const multer = require('multer');

const { authenticate } = require('../middleware/auth.middleware');
const AnomalyController = require('../controllers/anomaly.controller');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }
});

router.post('/analyze', authenticate, upload.single('file'), AnomalyController.analyze);
router.post('/runs/:runId/report', authenticate, AnomalyController.generateReport);
router.get('/runs', authenticate, AnomalyController.listRuns);
router.get('/cases', authenticate, AnomalyController.listCases);

module.exports = router;
