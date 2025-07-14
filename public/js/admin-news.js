// public/js/admin-news.js

document.addEventListener('DOMContentLoaded', function() {
  const statusFilter = document.getElementById('admin-news-status-filter');
  const categoryFilter = document.getElementById('admin-news-category-filter');
  const searchInput = document.getElementById('admin-news-search-input');
  const searchBtn = document.getElementById('admin-news-search-btn');
  const tbody = document.getElementById('admin-news-tbody');

  // Fetch and update scheduled stat card
  async function updateScheduledStat() {
    try {
      const res = await fetch('/admin/news/scheduled-count');
      const data = await res.json();
      if (data.success) {
        const el = document.getElementById('scheduled-stat');
        if (el) el.textContent = data.scheduled_count;
      }
    } catch (err) {}
  }

  // Countdown timer logic
  function startCountdown(publishTime, elementId) {
    const countdownElement = document.getElementById(elementId);
    if (!countdownElement) return;
    function update() {
      const now = new Date().getTime();
      const publishDate = new Date(publishTime).getTime();
      const distance = publishDate - now;
      if (distance < 0) {
        countdownElement.innerHTML = 'Publishing...';
        return;
      }
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      countdownElement.innerHTML = `${days}d ${hours}h ${minutes}m`;
    }
    update();
    setInterval(update, 60000);
  }

  // Enhance fetchAndRenderAdminNews to handle scheduled badge and countdown
  async function fetchAndRenderAdminNews() {
    if (!tbody) return;
    const status = statusFilter ? statusFilter.value : '';
    const category = categoryFilter ? categoryFilter.value : '';
    const search = searchInput ? searchInput.value.trim() : '';
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-secondary">Loading...</td></tr>';
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (category) params.append('category', category);
      if (search) params.append('search', search);
      const res = await fetch(`/admin/news/api/list?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch news');
      const { success, news } = await res.json();
      if (!success) throw new Error('Failed to fetch news');
      if (!news.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No news found.</td></tr>';
        return;
      }
      tbody.innerHTML = news.map(article => {
        let statusHtml = '';
        if (article.status === 'draft' && article.published_at && new Date(article.published_at) > new Date()) {
          statusHtml = `<span class="status-badge scheduled">Scheduled</span> <span class="countdown-timer" id="countdown-${article.news_id}"></span>`;
        } else if (article.status === 'draft') {
          statusHtml = '<span class="badge bg-secondary">Draft</span>';
        } else if (article.status === 'published') {
          statusHtml = '<span class="badge bg-success">Published</span>';
        } else {
          statusHtml = '<span class="badge bg-warning">Archived</span>';
        }
        return `
        <tr>
          <td>${article.title}</td>
          <td>${article.category || ''}</td>
          <td>${statusHtml}</td>
          <td>${article.author_name}</td>
          <td>${article.published_at ? new Date(article.published_at).toLocaleString() : '-'}</td>
          <td class="table-actions">
            <a href="/admin/news/${article.news_id}/edit" class="btn btn-sm btn-primary"><i class="bi bi-pencil"></i></a>
            <form action="/admin/news/${article.news_id}?_method=DELETE" method="POST" style="display:inline;">
              <button type="submit" class="btn btn-sm btn-danger" onclick="return confirm('Delete this news?')"><i class="bi bi-trash"></i></button>
            </form>
            ${article.status === 'published' ? `
              <form action="/admin/news/${article.news_id}/unpublish" method="POST" style="display:inline;">
                <button type="submit" class="btn btn-sm btn-warning"><i class="bi bi-eye-slash"></i></button>
              </form>
            ` : `
              <form action="/admin/news/${article.news_id}/publish" method="POST" style="display:inline;">
                <button type="submit" class="btn btn-sm btn-success"><i class="bi bi-eye"></i></button>
              </form>
            `}
          </td>
        </tr>
        `;
      }).join('');
      // Start countdowns for scheduled articles
      news.forEach(article => {
        if (article.status === 'draft' && article.published_at && new Date(article.published_at) > new Date()) {
          startCountdown(article.published_at, `countdown-${article.news_id}`);
        }
      });
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-danger text-center">Failed to load news.</td></tr>';
    }
    updateScheduledStat();
  }

  if (statusFilter && categoryFilter && searchInput && searchBtn && tbody) {
    statusFilter.addEventListener('change', fetchAndRenderAdminNews);
    categoryFilter.addEventListener('change', fetchAndRenderAdminNews);
    searchBtn.addEventListener('click', fetchAndRenderAdminNews);
    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        fetchAndRenderAdminNews();
      }
    });
  }

  // Initial load
  fetchAndRenderAdminNews();
  updateScheduledStat();
  // Poll for status changes every minute
  setInterval(() => {
    fetchAndRenderAdminNews();
    updateScheduledStat();
  }, 60000);
}); 