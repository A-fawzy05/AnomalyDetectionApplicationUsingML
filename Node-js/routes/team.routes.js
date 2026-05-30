const express = require('express');
const TeamController = require('../controllers/team.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.post('/create', TeamController.create);
router.post('/join', TeamController.join);
router.get('/my-teams', TeamController.getMyTeams);
router.delete('/:id', TeamController.deleteTeam);
router.post('/:id/subteams', TeamController.createSubteam);
router.delete('/:id/subteams/:subId', TeamController.deleteSubteam);
router.patch('/:id/subteams/:subId/data', TeamController.updateSubteamData);
router.get('/:id/subteams/:subId', TeamController.getSubteam);
router.get('/:id/admin-telegram', TeamController.getAdminTelegram);
router.post('/:id/send-telegram-report', TeamController.sendTelegramReport);

module.exports = router;
