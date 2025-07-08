// Bookmark/unbookmark button handler
function updateBookmarkBtn(btn, bookmarked) {
  btn.setAttribute('data-bookmarked', bookmarked ? 'true' : '');
  btn.querySelector('i').className = 'bi ' + (bookmarked ? 'bi-bookmark-fill' : 'bi-bookmark');
}

document.addEventListener('DOMContentLoaded', function() {
  // Handle bookmark button click
  document.body.addEventListener('click', async function(e) {
    if (e.target.closest('.bookmark-btn')) {
      const btn = e.target.closest('.bookmark-btn');
      const newsId = btn.getAttribute('data-id');
      const isBookmarked = btn.getAttribute('data-bookmarked') === 'true';
      try {
        if (!isBookmarked) {
          // Add bookmark
          const res = await fetch('/news/bookmark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ news_id: newsId })
          });
          if (res.ok) {
            updateBookmarkBtn(btn, true);
            loadMyBookmarks();
          }
        } else {
          // Remove bookmark
          const res = await fetch(`/news/bookmark/${newsId}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            updateBookmarkBtn(btn, false);
            loadMyBookmarks();
          }
        }
      } catch (err) {
        alert('Bookmark action failed. Please try again.');
      }
    }
  });

  // Load bookmarks if section exists
  if (document.getElementById('my-bookmarks')) {
    loadMyBookmarks();
  }
});

async function loadMyBookmarks() {
  const container = document.getElementById('my-bookmarks');
  const loading = document.getElementById('bookmarks-loading');
  if (!container) return;
  loading.style.display = 'block';
  container.innerHTML = '';
  try {
    const res = await fetch('/news/user/bookmarks');
    if (!res.ok) throw new Error('Failed to load bookmarks');
    const data = await res.json();
    if (data.bookmarks.length === 0) {
      container.innerHTML = '<div class="text-muted">No bookmarks yet.</div>';
    } else {
      data.bookmarks.forEach(article => {
        const card = document.createElement('div');
        card.className = 'col-md-3 mb-3';
        card.innerHTML = `
          <div class="card h-100">
            <a href="/news/${article.news_id}" style="text-decoration: none; color: inherit;">
              <div style="background:#eee; height:120px; border-radius:8px 8px 0 0; overflow:hidden;">
                <img src="${article.featured_image}" alt="Image" style="width: 100%; height: 100%; object-fit: cover;">
              </div>
              <div class="card-body">
                <h6 class="card-title">${article.title}</h6>
                <div class="text-muted" style="font-size:0.9rem;">
                  ${article.category} • ${article.author_name} • ${article.published_at ? new Date(article.published_at).toLocaleString() : ''}
                </div>
              </div>
            </a>
            <button class="btn btn-sm btn-outline-warning bookmark-btn m-2" data-id="${article.news_id}" data-bookmarked="true">
              <i class="bi bi-bookmark-fill"></i> Remove Bookmark
            </button>
          </div>
        `;
        container.appendChild(card);
      });
    }
  } catch (err) {
    container.innerHTML = '<div class="text-danger">Failed to load bookmarks.</div>';
  } finally {
    loading.style.display = 'none';
  }
} 