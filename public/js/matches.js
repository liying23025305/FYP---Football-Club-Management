// public/js/matches.js
// Fetch and render matches for the selected season

document.addEventListener('DOMContentLoaded', () => {
  const seasonSelect = document.getElementById('seasonSelect');
  const matchesList = document.getElementById('matchesList');
  const categorySelect = document.getElementById('categorySelect');
  const searchInput = document.getElementById('matchesSearchInput');
  const searchForm = document.getElementById('matches-search-form');

  let allMatches = [];
  let allCompetitions = [];

  // Status color mapping
  const statusColors = {
    scheduled: 'status-blue',
    live: 'status-green',
    completed: 'status-purple',
    postponed: 'status-orange',
    cancelled: 'status-red'
  };

  // Fetch seasons and populate dropdown
  fetch('/api/matches/seasons')
    .then(res => res.json())
    .then(seasons => {
      seasonSelect.innerHTML = '';
      seasons.forEach(season => {
        const opt = document.createElement('option');
        opt.value = season;
        opt.textContent = season;
        seasonSelect.appendChild(opt);
      });
      if (seasons.length > 0) {
        seasonSelect.value = seasons[0];
        loadMatches(seasons[0]);
      }
    })
    .catch(() => {
      matchesList.innerHTML = '<div class="error">Failed to load seasons.</div>';
    });

  // On season change, reload matches
  seasonSelect.addEventListener('change', () => {
    loadMatches(seasonSelect.value);
  });

  // On search form submit, filter matches
  searchForm.addEventListener('submit', function(e) {
    e.preventDefault();
    renderFilteredMatches();
  });

  // Fetch and render matches for a season
  function loadMatches(season) {
    matchesList.innerHTML = '<div>Loading...</div>';
    fetch(`/api/matches?season=${encodeURIComponent(season)}`)
      .then(res => res.json())
      .then(matches => {
        if (!Array.isArray(matches) || matches.length === 0) {
          matchesList.innerHTML = '<div class="no-matches">No matches found for this season.</div>';
          allMatches = [];
          categorySelect.innerHTML = '<option value="">All Competitions</option>';
          return;
        }
        // Sort by date (newest first)
        matches.sort((a, b) => new Date(b.match_date) - new Date(a.match_date));
        allMatches = matches;
        // Populate competitions dropdown
        const competitions = Array.from(new Set(matches.map(m => m.competition).filter(Boolean)));
        allCompetitions = competitions;
        categorySelect.innerHTML = '<option value="">All Competitions</option>';
        competitions.forEach(cat => {
          const opt = document.createElement('option');
          opt.value = cat;
          opt.textContent = cat;
          categorySelect.appendChild(opt);
        });
        renderFilteredMatches();
      })
      .catch(() => {
        matchesList.innerHTML = '<div class="error">Failed to load matches.</div>';
        allMatches = [];
        categorySelect.innerHTML = '<option value="">All Competitions</option>';
      });
  }

  // Render matches based on filters
  function renderFilteredMatches() {
    const selectedCategory = categorySelect.value;
    const searchTerm = searchInput.value.trim().toLowerCase();
    let filtered = allMatches;
    if (selectedCategory) {
      filtered = filtered.filter(m => m.competition === selectedCategory);
    }
    if (searchTerm) {
      filtered = filtered.filter(m =>
        m.home_team.toLowerCase().includes(searchTerm) ||
        m.away_team.toLowerCase().includes(searchTerm)
      );
    }
    if (!filtered.length) {
      matchesList.innerHTML = '<div class="no-matches">No matches found for the selected filters.</div>';
      return;
    }
    matchesList.innerHTML = '';
    filtered.forEach(match => {
      matchesList.appendChild(renderMatchCard(match));
    });
  }

  // Render a single match card
  function renderMatchCard(match) {
    const card = document.createElement('div');
    card.className = 'match-card';
    card.setAttribute('data-match-id', match.match_id); // Store match_id for modal
    // Status color
    const statusClass = statusColors[match.status] || 'status-gray';
    // Date formatting
    const dateObj = new Date(match.match_date);
    const dateStr = dateObj.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
    }).replace(',', '');
    // Score display
    const score = match.status === 'completed' || match.status === 'live'
      ? `<span class="score">${match.home_team} <b>${match.home_score}</b> - <b>${match.away_score}</b> ${match.away_team}</span>`
      : `<span class="score">${match.home_team} vs ${match.away_team}</span>`;
    // Result badge for completed matches
    let resultBadge = '';
    if (match.status === 'completed') {
      if (match.result === 'win') resultBadge = '<span class="badge bg-success" style="margin-top:6px; font-size:0.95em; padding:0.35em 0.9em; border-radius:1em; display:inline-block;">Win</span>';
      else if (match.result === 'loss') resultBadge = '<span class="badge bg-danger" style="margin-top:6px; font-size:0.95em; padding:0.35em 0.9em; border-radius:1em; display:inline-block;">Loss</span>';
      else if (match.result === 'draw') resultBadge = '<span class="badge bg-secondary" style="margin-top:6px; font-size:0.95em; padding:0.35em 0.9em; border-radius:1em; display:inline-block;">Draw</span>';
    }
    card.innerHTML = `
      <div class="match-date">${dateStr}</div>
      <div class="match-info">
        ${score}
        ${resultBadge ? `<div style="display:flex;justify-content:center;align-items:center;margin-top:4px;">${resultBadge}</div>` : ''}
        <span class="competition">${match.competition || ''}</span>
      </div>
      <div class="match-status ${statusClass}">${match.status.charAt(0).toUpperCase() + match.status.slice(1)}</div>
    `;
    return card;
  }

  // --- Modal for match details ---
  // Inject modal HTML if not present
  if (!document.getElementById('userMatchDetailModal')) {
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = `
    <div class="modal fade" id="userMatchDetailModal" tabindex="-1" aria-labelledby="userMatchDetailModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="userMatchDetailModalLabel">Match Details</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div id="userMatchDetailContent">
              <!-- Details will be loaded here -->
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>
    `;
    document.body.appendChild(modalDiv);
  }

  // Helper to format date
  function formatDateTime(dt) {
    const dateObj = new Date(dt);
    return dateObj.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  }

  // Show match details in modal
  function showUserMatchDetailModal(matchId) {
    fetch(`/api/matches/${matchId}`)
      .then(res => res.json())
      .then(match => {
        const statusClass = statusColors[match.status] || 'status-gray';
        const resultBadge = match.result === 'win' ? '<span class="badge bg-success">Win</span>' :
          match.result === 'loss' ? '<span class="badge bg-danger">Loss</span>' :
          match.result === 'draw' ? '<span class="badge bg-secondary">Draw</span>' : '-';
        document.getElementById('userMatchDetailContent').innerHTML = `
          <div class="row mb-2"><div class="col-6"><b>Home Team:</b> ${match.home_team}</div><div class="col-6"><b>Away Team:</b> ${match.away_team}</div></div>
          <div class="row mb-2"><div class="col-6"><b>Score:</b> ${match.home_score} - ${match.away_score}</div><div class="col-6"><b>Season:</b> ${match.season}</div></div>
          <div class="row mb-2"><div class="col-6"><b>Competition:</b> ${match.competition || '-'}</div><div class="col-6"><b>Date & Time:</b> ${formatDateTime(match.match_date)}</div></div>
          <div class="row mb-2"><div class="col-6"><b>Venue:</b> ${match.venue || '-'}</div><div class="col-6"><b>Status:</b> <span class="badge ${statusClass}">${match.status.charAt(0).toUpperCase() + match.status.slice(1)}</span></div></div>
          <div class="row mb-2"><div class="col-6"><b>Result:</b> ${resultBadge}</div></div>
          <div class="mb-2"><b>Match Notes:</b></div>
          <div>${match.match_notes ? match.match_notes : '<i>No notes.</i>'}</div>
        `;
        // Show modal
        var modal = new bootstrap.Modal(document.getElementById('userMatchDetailModal'));
        modal.show();
      });
  }

  // Add click handler to match cards after rendering
  function addMatchCardClickHandlers() {
    document.querySelectorAll('.match-card').forEach(card => {
      card.addEventListener('click', function(e) {
        const matchId = this.getAttribute('data-match-id');
        if (matchId) {
          showUserMatchDetailModal(matchId);
        }
      });
    });
  }

  // Patch renderFilteredMatches to add click handlers after rendering
  const origRenderFilteredMatches = renderFilteredMatches;
  renderFilteredMatches = function() {
    origRenderFilteredMatches.apply(this, arguments);
    addMatchCardClickHandlers();
  };
}); 