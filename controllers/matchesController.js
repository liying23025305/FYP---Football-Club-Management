// controllers/matchesController.js
const Matches = require('../models/matches');

// Helper: Calculate result based on scores
function calculateResult(home_score, away_score) {
  if (home_score > away_score) return 'win';
  if (home_score < away_score) return 'loss';
  return 'draw';
}

// Get all matches (with filters)
exports.getAllMatches = async (req, res) => {
  try {
    const filters = {
      season: req.query.season,
      status: req.query.status,
      competition: req.query.competition,
      search: req.query.search
    };
    let matches = await Matches.getAllMatches(filters);
    // Role-based filtering
    if (!req.session.user || req.session.user.role !== 'admin') {
      matches = matches.filter(m => ['scheduled', 'live', 'completed'].includes(m.status));
    }
    res.json(matches);
  } catch (err) {
    console.error('GetAllMatches DB error:', err.message, err.stack);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
};

// Get a single match by ID
exports.getMatchById = async (req, res) => {
  try {
    const match = await Matches.getMatchById(req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    res.json(match);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

// Create a new match (admin only)
exports.createMatch = async (req, res) => {
  try {
    const data = req.body;
    // Basic validation
    if (!data.home_team || !data.away_team || !data.match_date || !data.season) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    data.status = data.status || 'scheduled';
    if (data.status === 'completed') {
      data.result = calculateResult(Number(data.home_score || 0), Number(data.away_score || 0));
    } else {
      data.result = null;
    }
    const result = await Matches.createMatch(data);
    res.json({ success: true, match_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

// Update a match (admin only)
exports.updateMatch = async (req, res) => {
  try {
    const data = req.body;
    // Basic validation
    if (!data.home_team || !data.away_team || !data.match_date || !data.season) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (data.status === 'completed') {
      data.result = calculateResult(Number(data.home_score || 0), Number(data.away_score || 0));
    } else {
      data.result = null;
    }
    await Matches.updateMatch(req.params.id, data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

// Delete a match (admin only, hard delete)
exports.deleteMatch = async (req, res) => {
  try {
    await Matches.deleteMatch(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

// Get available seasons
exports.getSeasons = async (req, res) => {
  try {
    const seasons = await Matches.getSeasons();
    res.json(seasons.map(s => s.season));
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

// Get match statistics for admin dashboard
exports.getMatchStats = async (req, res) => {
  try {
    const stats = await Matches.getMatchStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

// PATCH: Update only match notes
exports.patchMatchNotes = async (req, res) => {
  try {
    const { match_notes } = req.body;
    if (typeof match_notes === 'undefined') {
      return res.status(400).json({ error: 'Missing match_notes' });
    }
    await Matches.patchMatchNotes(req.params.id, match_notes);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
}; 