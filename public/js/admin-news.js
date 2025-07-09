// public/js/admin-news.js

document.addEventListener('DOMContentLoaded', function() {
  const statusFilter = document.getElementById('admin-news-status-filter');
  const categoryFilter = document.getElementById('admin-news-category-filter');
  const searchInput = document.getElementById('admin-news-search-input');
  const searchBtn = document.getElementById('admin-news-search-btn');
  const tbody = document.getElementById('admin-news-tbody');

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
      tbody.innerHTML = news.map(article => `
        <tr>
          <td>${article.title}</td>
          <td>${article.category || ''}</td>
          <td><span class="badge bg-${article.status === 'published' ? 'success' : (article.status === 'draft' ? 'secondary' : 'warning')}">${article.status}</span></td>
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
      `).join('');
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-danger text-center">Failed to load news.</td></tr>';
    }
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
}); 