// public/js/admin-matches.js
// Admin matches management: fetch, filter, search, CRUD, validation, messages

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const seasonSelect = document.getElementById('adminSeasonSelect');
  const statusSelect = document.getElementById('adminStatusSelect');
  const competitionInput = document.getElementById('adminCompetitionInput');
  const teamSearch = document.getElementById('adminTeamSearch');
  const filterBtn = document.getElementById('adminFilterBtn');
  const tableBody = document.getElementById('adminMatchesTableBody');
  const msgDiv = document.getElementById('adminMatchesMsg');

  // For create/edit forms
  const createForm = document.getElementById('createMatchForm');
  const editForm = document.getElementById('editMatchForm');

  // Status color mapping
  const statusColors = {
    scheduled: 'status-blue',
    live: 'status-green',
    completed: 'status-purple',
    postponed: 'status-orange',
    cancelled: 'status-red'
  };

  // Load seasons for filter dropdown
  if (seasonSelect) {
    fetch('/api/matches/seasons')
      .then(res => res.json())
      .then(seasons => {
        seasonSelect.innerHTML = '<option value="">All</option>';
        seasons.forEach(season => {
          const opt = document.createElement('option');
          opt.value = season;
          opt.textContent = season;
          seasonSelect.appendChild(opt);
        });
      });
  }

  // Fetch and render match statistics for dashboard
  function loadMatchStats() {
    fetch('/api/matches/stats')
      .then(res => res.json())
      .then(stats => {
        document.getElementById('match-stat-total').textContent = stats.total ?? '-';
        document.getElementById('match-stat-win').textContent = stats.win ?? '-';
        document.getElementById('match-stat-loss').textContent = stats.loss ?? '-';
        document.getElementById('match-stat-draw').textContent = stats.draw ?? '-';
      })
      .catch(() => {
        document.getElementById('match-stat-total').textContent = '-';
        document.getElementById('match-stat-win').textContent = '-';
        document.getElementById('match-stat-loss').textContent = '-';
        document.getElementById('match-stat-draw').textContent = '-';
      });
  }

  // Fetch and render matches for admin table
  function loadAdminMatches() {
    let url = '/api/matches?';
    if (seasonSelect && seasonSelect.value) url += `season=${encodeURIComponent(seasonSelect.value)}&`;
    if (statusSelect && statusSelect.value) url += `status=${encodeURIComponent(statusSelect.value)}&`;
    if (teamSearch && teamSearch.value) url += `search=${encodeURIComponent(teamSearch.value)}&`;
    fetch(url)
      .then(res => res.json())
      .then(matches => {
        tableBody.innerHTML = '';
        if (!Array.isArray(matches) || matches.length === 0) {
          tableBody.innerHTML = '<tr><td colspan="7">No matches found.</td></tr>';
          return;
        }
        matches.forEach(match => {
          tableBody.appendChild(renderAdminRow(match));
        });
      })
      .catch(() => {
        tableBody.innerHTML = '<tr><td colspan="7">Failed to load matches.</td></tr>';
      });
  }

  // Render a row for the admin table
  function renderAdminRow(match) {
    const tr = document.createElement('tr');
    tr.setAttribute('data-match-id', match.match_id); // Store match_id for modal
    // Date formatting
    const dateObj = new Date(match.match_date);
    const dateStr = dateObj.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
    }).replace(',', '');
    // Status color
    const statusClass = statusColors[match.status] || 'status-gray';
    // Result display
    let resultDisplay = '-';
    if (match.status === 'completed') {
      if (match.result === 'win') resultDisplay = '<span class="badge bg-success">Win</span>';
      else if (match.result === 'loss') resultDisplay = '<span class="badge bg-danger">Loss</span>';
      else if (match.result === 'draw') resultDisplay = '<span class="badge bg-secondary">Draw</span>';
      else resultDisplay = '-';
    }
    tr.innerHTML = `
      <td>${dateStr}</td>
      <td>${match.home_team}</td>
      <td>${match.away_team}</td>
      <td>${match.home_score} - ${match.away_score}</td>
      <td>${resultDisplay}</td>
      <td>${match.competition || ''}</td>
      <td><span class="badge ${statusClass}" style="font-size:1em; padding:0.5em 1em; border-radius:1em;">${match.status.charAt(0).toUpperCase() + match.status.slice(1)}</span></td>
      <td>
        <button class="btn btn-sm btn-primary btn-edit me-2" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-danger btn-delete" title="Delete"><i class="bi bi-trash"></i></button>
      </td>
    `;
    // Edit button event
    tr.querySelector('.btn-edit').addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = `/admin/matches-edit?id=${match.match_id}`;
    });
    // Delete button event
    tr.querySelector('.btn-delete').addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Are you sure you want to delete this match?')) {
        deleteMatch(match.match_id);
      }
    });
    return tr;
  }

  // Filter button event
  if (filterBtn) {
    filterBtn.addEventListener('click', loadAdminMatches);
    // Also reload on dropdown/input change
    [seasonSelect, statusSelect, competitionInput, teamSearch].forEach(el => {
      if (el) el.addEventListener('change', loadAdminMatches);
    });
  }

  // Initial load
  if (tableBody) {
    loadAdminMatches();
    loadMatchStats();
  }

  // Show success/error message (dashboard-wide)
  function showDashboardMsg(msg, success) {
    const alertDiv = document.getElementById('adminMatchesAlert');
    if (alertDiv) {
      alertDiv.innerHTML = `<div class="alert alert-${success ? 'success' : 'danger'} alert-dismissible fade show" role="alert">
        ${msg}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>`;
      setTimeout(() => { alertDiv.innerHTML = ''; }, 2500);
    }
  }

  // Create match form submit
  if (createForm) {
    createForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(createForm));
      // Basic validation
      if (!data.home_team || !data.away_team || !data.match_date || !data.season) {
        showMsg('createMatchMsg', 'Please fill in all required fields.', false);
        return;
      }
      fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(res => res.json())
        .then(result => {
          if (result.success) {
            showMsg('createMatchMsg', 'Match created successfully!', true);
            showDashboardMsg('Match record added successfully!', true);
            setTimeout(() => { window.location.href = '/admin/matches'; }, 1200);
          } else {
            showMsg('createMatchMsg', result.error || 'Failed to create match.', false);
            showDashboardMsg(result.error || 'Failed to create match.', false);
          }
        })
        .catch(() => {
          showMsg('createMatchMsg', 'Failed to create match.', false);
          showDashboardMsg('Failed to create match.', false);
        });
    });
  }

  // Edit match form: load data and submit
  if (editForm) {
    // Load match data from query param
    const urlParams = new URLSearchParams(window.location.search);
    const matchId = urlParams.get('id');
    if (matchId) {
      fetch(`/api/matches/${matchId}`)
        .then(res => res.json())
        .then(match => {
          editForm.match_id.value = match.match_id;
          editForm.home_team.value = match.home_team;
          editForm.away_team.value = match.away_team;
          editForm.match_date.value = match.match_date.slice(0, 16);
          editForm.venue.value = match.venue || '';
          editForm.competition.value = match.competition || '';
          editForm.season.value = match.season;
          editForm.home_score.value = match.home_score;
          editForm.away_score.value = match.away_score;
          editForm.status.value = match.status;
          editForm.match_notes.value = match.match_notes || '';
        });
    }
    // Submit edit
    editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(editForm));
      // Basic validation
      if (!data.home_team || !data.away_team || !data.match_date || !data.season) {
        showMsg('editMatchMsg', 'Please fill in all required fields.', false);
        return;
      }
      fetch(`/api/matches/${editForm.match_id.value}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(res => res.json())
        .then(result => {
          if (result.success) {
            showMsg('editMatchMsg', 'Match updated successfully!', true);
            showDashboardMsg('Match updated successfully!', true);
            setTimeout(() => { window.location.href = '/admin/matches'; }, 1200);
          } else {
            showMsg('editMatchMsg', result.error || 'Failed to update match.', false);
            showDashboardMsg(result.error || 'Failed to update match.', false);
          }
        })
        .catch(() => {
          showMsg('editMatchMsg', 'Failed to update match.', false);
          showDashboardMsg('Failed to update match.', false);
        });
    });
  }

  // After CRUD actions, reload stats as well
  function reloadDashboard() {
    loadAdminMatches();
    loadMatchStats();
  }

  // Delete match
  function deleteMatch(id) {
    // Disable all delete buttons while deleting
    document.querySelectorAll('.btn-delete').forEach(btn => btn.disabled = true);
    fetch(`/api/matches/${id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(result => {
        console.log('Delete API response:', result);
        if (result.success) {
          showMsg('adminMatchesMsg', 'Match deleted.', true);
          reloadDashboard();
        } else {
          showMsg('adminMatchesMsg', result.error || 'Failed to delete match.', false);
          alert(result.error || 'Failed to delete match.');
        }
      })
      .catch((err) => {
        showMsg('adminMatchesMsg', 'Failed to delete match.', false);
        alert('Failed to delete match.');
        console.error('Delete error:', err);
      })
      .finally(() => {
        // Re-enable delete buttons
        document.querySelectorAll('.btn-delete').forEach(btn => btn.disabled = false);
      });
  }

  // Show success/error message
  function showMsg(id, msg, success) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = msg;
      el.style.color = success ? 'green' : 'red';
      el.style.marginTop = '0.7rem';
      setTimeout(() => { el.textContent = ''; }, 2000);
    }
  }

  // Add modal HTML to the page
  const matchDetailModal = document.createElement('div');
  matchDetailModal.innerHTML = `
  <div class="modal fade" id="matchDetailModal" tabindex="-1" aria-labelledby="matchDetailModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="matchDetailModalLabel">Match Details</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div id="matchDetailContent">
            <!-- Details will be loaded here -->
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" id="saveMatchNotesBtn">Save Notes</button>
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  </div>
  `;
  document.body.appendChild(matchDetailModal);

  // Helper to format date
  function formatDateTime(dt) {
    const dateObj = new Date(dt);
    return dateObj.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  }

  // Show match details in modal
  function showMatchDetailModal(matchId) {
    fetch(`/api/matches/${matchId}`)
      .then(res => res.json())
      .then(match => {
        const statusClass = statusColors[match.status] || 'status-gray';
        const resultBadge = match.result === 'win' ? '<span class="badge bg-success">Win</span>' :
          match.result === 'loss' ? '<span class="badge bg-danger">Loss</span>' :
          match.result === 'draw' ? '<span class="badge bg-secondary">Draw</span>' : '-';
        document.getElementById('matchDetailContent').innerHTML = `
          <div class="row mb-2"><div class="col-6"><b>Home Team:</b> ${match.home_team}</div><div class="col-6"><b>Away Team:</b> ${match.away_team}</div></div>
          <div class="row mb-2"><div class="col-6"><b>Score:</b> ${match.home_score} - ${match.away_score}</div><div class="col-6"><b>Season:</b> ${match.season}</div></div>
          <div class="row mb-2"><div class="col-6"><b>Competition:</b> ${match.competition || '-'}</div><div class="col-6"><b>Date & Time:</b> ${formatDateTime(match.match_date)}</div></div>
          <div class="row mb-2"><div class="col-6"><b>Venue:</b> ${match.venue || '-'}</div><div class="col-6"><b>Status:</b> <span class="badge ${statusClass}">${match.status.charAt(0).toUpperCase() + match.status.slice(1)}</span></div></div>
          <div class="row mb-2"><div class="col-6"><b>Result:</b> ${resultBadge}</div></div>
          <div class="mb-2"><b>Match Notes:</b></div>
          <textarea id="matchNotesEditor">${match.match_notes || ''}</textarea>
        `;
        // Initialize TinyMCE
        if (window.tinymce) tinymce.remove('#matchNotesEditor');
        tinymce.init({
          selector: '#matchNotesEditor',
          plugins: 'link lists',
          toolbar: 'undo redo | bold italic underline | bullist numlist | link',
          menubar: false,
          height: 200
        });
        // Save button event
        document.getElementById('saveMatchNotesBtn').onclick = function() {
          const notes = tinymce.get('matchNotesEditor').getContent();
          fetch(`/api/matches/${matchId}/notes`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ match_notes: notes })
          })
            .then(res => res.json())
            .then(result => {
              if (result.success) {
                showDashboardMsg('Match notes updated!', true);
                var modal = bootstrap.Modal.getInstance(document.getElementById('matchDetailModal'));
                if (modal) modal.hide();
              } else {
                showDashboardMsg(result.error || 'Failed to update notes.', false);
              }
            })
            .catch(() => showDashboardMsg('Failed to update notes.', false));
        };
        // Show modal
        var modal = new bootstrap.Modal(document.getElementById('matchDetailModal'));
        modal.show();
      });
  }

  // Add click event to table rows (excluding actions)
  tableBody.addEventListener('click', function(e) {
    const tr = e.target.closest('tr');
    if (!tr) return;
    // Prevent if clicking on an action button
    if (e.target.closest('.btn-edit') || e.target.closest('.btn-delete')) return;
    // Get match id from data attribute
    const matchId = tr.getAttribute('data-match-id');
    if (matchId) showMatchDetailModal(matchId);
  });
}); 