const express = require('express');
const OrganizationController = require('../controllers/organization.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/create', OrganizationController.create);
router.post('/join', OrganizationController.join);
router.get('/my-orgs', OrganizationController.getMyOrgs);
router.patch('/:id/run', OrganizationController.updateRunId);
router.delete('/:id', OrganizationController.deleteOrg);

module.exports = router;
