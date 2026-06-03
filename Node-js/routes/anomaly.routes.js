/**
 * Anomaly routes — gateway → FastAPI anomaly service.
 *
 * Every route requires a valid JWT (`authenticate`). Authorization
 * (team membership + role) is delegated to the FastAPI service, which receives
 * the caller's claims as signed headers and is the single source of truth for
 * the policy. The gateway only proves *who* the caller is; FastAPI decides
 * *what* they may do.
 */
const express = require('express');
const multer = require('multer');

const { authenticate } = require('../middleware/auth.middleware');
const AnomalyController = require('../controllers/anomaly.controller');

const router = express.Router();

// Buffer the upload in memory so we can re-stream it to FastAPI. 200 MB matches
// the anomaly service's own MAX_UPLOAD_SIZE_MB so the contract is consistent.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }
});

router.post('/analyze', authenticate, upload.single('file'), AnomalyController.analyze);
router.post('/runs/:runId/report', authenticate, AnomalyController.generateReport);
router.get('/runs', authenticate, AnomalyController.listRuns);
router.get('/cases', authenticate, AnomalyController.listCases);

module.exports = router;
