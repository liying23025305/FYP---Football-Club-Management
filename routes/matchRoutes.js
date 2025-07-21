// routes/matchRoutes.js
const express = require('express');
const router = express.Router();
const matchesController = require('../controllers/matchesController');
const { isAdmin } = require('../models/auth'); // Use existing admin middleware

// Correct order:
router.get('/api/matches/seasons', matchesController.getSeasons);
router.get('/api/matches/stats', matchesController.getMatchStats);
router.get('/api/matches', matchesController.getAllMatches);
router.get('/api/matches/:id', matchesController.getMatchById);

// POST /api/matches - Create new match (admin only)
router.post('/api/matches', isAdmin, matchesController.createMatch);

// PUT /api/matches/:id - Update match (admin only)
router.put('/api/matches/:id', isAdmin, matchesController.updateMatch);

// DELETE /api/matches/:id - Soft delete match (admin only)
router.delete('/api/matches/:id', isAdmin, matchesController.deleteMatch);

module.exports = router;