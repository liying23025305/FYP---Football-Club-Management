// models/matches.js
const { getConnection } = require('./db');

// Get all matches with optional filters (season, status, competition, search)
exports.getAllMatches = async (filters) => {
  let sql = 'SELECT * FROM matches WHERE 1=1';
  const params = [];
  if (filters.season) {
    sql += ' AND season = ?';
    params.push(filters.season);
  }
  if (filters.status) {
    sql += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters.competition) {
    sql += ' AND competition = ?';
    params.push(filters.competition);
  }
  if (filters.search) {
    sql += ' AND (home_team LIKE ? OR away_team LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  sql += ' ORDER BY match_date DESC';
  const db = getConnection();
  const [rows] = await db.query(sql, params);
  return rows;
};

// Get a single match by ID
exports.getMatchById = async (id) => {
  const db = getConnection();
  const [rows] = await db.query('SELECT * FROM matches WHERE match_id = ?', [id]);
  return rows[0];
};

// Create a new match
exports.createMatch = async (data) => {
  const db = getConnection();
  const sql = `INSERT INTO matches (home_team, away_team, home_score, away_score, season, competition, match_date, venue, status, result, match_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [
    data.home_team,
    data.away_team,
    data.home_score || 0,
    data.away_score || 0,
    data.season,
    data.competition || 'Friendly',
    data.match_date,
    data.venue || null,
    data.status || 'scheduled',
    data.result || null,
    data.match_notes || null
  ];
  const [result] = await db.query(sql, params);
  return result;
};

// Update an existing match
exports.updateMatch = async (id, data) => {
  const db = getConnection();
  const sql = `UPDATE matches SET home_team=?, away_team=?, home_score=?, away_score=?, season=?, competition=?, match_date=?, venue=?, status=?, result=?, match_notes=? WHERE match_id=?`;
  const params = [
    data.home_team,
    data.away_team,
    data.home_score,
    data.away_score,
    data.season,
    data.competition,
    data.match_date,
    data.venue,
    data.status,
    data.result,
    data.match_notes,
    id
  ];
  const [result] = await db.query(sql, params);
  return result;
};

// Delete a match from the database
exports.deleteMatch = async (id) => {
  const db = getConnection();
  const [result] = await db.query('DELETE FROM matches WHERE match_id = ?', [id]);
  return result;
};

// Get all available seasons (distinct)
exports.getSeasons = async () => {
  const db = getConnection();
  const [rows] = await db.query('SELECT DISTINCT season FROM matches WHERE season IS NOT NULL ORDER BY season DESC');
  return rows;
};

// Get match statistics (total, win, loss, draw)
exports.getMatchStats = async () => {
  const db = getConnection();
  const [rows] = await db.query(`
    SELECT
      COUNT(*) as total,
      SUM(result = 'win') as win,
      SUM(result = 'loss') as loss,
      SUM(result = 'draw') as draw
    FROM matches
  `);
  return rows[0];
};

// PATCH: Update only match notes
exports.patchMatchNotes = async (id, match_notes) => {
  const db = getConnection();
  const sql = 'UPDATE matches SET match_notes=? WHERE match_id=?';
  const [result] = await db.query(sql, [match_notes, id]);
  return result;
}; 