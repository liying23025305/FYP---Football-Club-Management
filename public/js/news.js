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

  // ========== AJAX News Filtering ===========
  const newsCategoryFilter = document.getElementById('news-category-filter');
  const newsSearchInput = document.getElementById('news-search-input');
  const newsSearchBtn = document.getElementById('news-search-btn');
  const newsList = document.getElementById('news-list');
  const featuredContainer = document.getElementById('featured-news-container');

  function renderFeatured(article, user, bookmarks) {
    if (!featuredContainer) return;
    if (!article) {
      featuredContainer.innerHTML = '';
      return;
    }
    featuredContainer.innerHTML = `
      <a href="/news/${article.news_id}" style="text-decoration: none; color: inherit;">
        <div class="row mb-4">
          <div class="col-md-7">
            <div style="background:#eee; border-radius:12px; min-height:260px; width:100%; display:flex; align-items:center; justify-content:center; overflow:hidden;">
              <img src="${article.featured_image}" alt="Image" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
          </div>
          <div class="col-md-5 d-flex align-items-center">
            <div class="card w-100 p-3" style="min-height: 260px;">
              <h5 class="fw-bold">${article.title}</h5>
              <p class="mb-2">${article.summary ? article.summary.substring(0, 500) : ''}</p>
              <div class="text-muted" style="font-size:0.95rem;">
                ${article.category} • ${article.author_name} • ${article.published_at ? new Date(article.published_at).toLocaleString() : ''}
              </div>
              ${user ? `<button class="btn btn-sm btn-outline-warning mt-2 bookmark-btn" data-id="${article.news_id}" ${bookmarks && bookmarks.includes(article.news_id) ? 'data-bookmarked=\"true\"' : ''}>
                <i class="bi ${bookmarks && bookmarks.includes(article.news_id) ? 'bi-bookmark-fill' : 'bi-bookmark'}"></i> Bookmark
              </button>` : ''}
            </div>
          </div>
        </div>
      </a>
    `;
  }

  async function fetchAndRenderNews() {
    if (!newsList) return;
    const category = newsCategoryFilter ? newsCategoryFilter.value : '';
    const search = newsSearchInput ? newsSearchInput.value.trim() : '';
    newsList.innerHTML = '<div class="text-center text-secondary py-4">Loading...</div>';
    try {
      const params = new URLSearchParams();
      if (category && category !== 'All') params.append('category', category);
      if (search) params.append('search', search);
      const res = await fetch(`/news/api/news?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch news');
      const { success, articles, bookmarks, user } = await res.json();
      if (!success) throw new Error('Failed to fetch news');
      if (!articles.length) {
        newsList.innerHTML = '<div class="text-center text-muted py-4">No news found.</div>';
        renderFeatured(null);
        return;
      }
      // First article is featured
      renderFeatured(articles[0], user, bookmarks);
      // Render the rest as news cards
      const rest = articles.slice(1);
      if (!rest.length) {
        newsList.innerHTML = '<div class="text-center text-muted py-4">No more news.</div>';
      } else {
        newsList.innerHTML = rest.map(article => `
          <div class=\"col-md-3 mb-3\">
            <div class=\"card h-100\">
              <a href=\"/news/${article.news_id}\" style=\"text-decoration: none; color: inherit;\">
                <div style=\"background:#eee; height:120px; border-radius:8px 8px 0 0; overflow:hidden;\">
                  <img src=\"${article.featured_image}\" alt=\"Image\" style=\"width: 100%; height: 100%; object-fit: cover;\">
                </div>
                <div class=\"card-body\">
                  <h6 class=\"card-title\">${article.title}</h6>
                  <div class=\"text-muted\" style=\"font-size:0.9rem;\">
                    ${article.category} • ${article.author_name} • ${article.published_at ? new Date(article.published_at).toLocaleString() : ''}
                  </div>
                </div>
              </a>
              ${user ? `<button class=\"btn btn-sm btn-outline-warning bookmark-btn m-2\" data-id=\"${article.news_id}\" ${bookmarks && bookmarks.includes(article.news_id) ? 'data-bookmarked=\"true\"' : ''}>
                <i class=\"bi ${bookmarks && bookmarks.includes(article.news_id) ? 'bi-bookmark-fill' : 'bi-bookmark'}\"></i> Bookmark
              </button>` : ''}
            </div>
          </div>
        `).join('');
      }
    } catch (err) {
      newsList.innerHTML = '<div class="text-danger text-center py-4">Failed to load news.</div>';
      if (window.console) console.error('AJAX News Error:', err);
      renderFeatured(null);
    }
  }

  if (newsCategoryFilter && newsSearchInput && newsSearchBtn && newsList) {
    newsCategoryFilter.addEventListener('change', fetchAndRenderNews);
    newsSearchBtn.addEventListener('click', fetchAndRenderNews);
    newsSearchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        fetchAndRenderNews();
      }
    });
  }

  // Optionally, load news on page load (if you want to override SSR)
  // fetchAndRenderNews();

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