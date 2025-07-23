// Bookmark toggle logic for news and bookmarked news pages

document.addEventListener('DOMContentLoaded', function () {
  // Event delegation for all bookmark buttons
  document.body.addEventListener('click', async function (e) {
    const btn = e.target.closest('.bookmark-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    await toggleBookmark(btn);
  });
});

async function toggleBookmark(button) {
  if (!button) return;
  const newsId = button.getAttribute('data-news-id');
  const icon = button.querySelector('.bookmark-icon');
  if (!newsId || !icon) return;
  const isBookmarked = icon.classList.contains('bookmarked') || icon.classList.contains('bi-bookmark-fill');
  button.disabled = true;
  try {
    if (isBookmarked) {
      // Remove bookmark
      const res = await fetch(`/api/bookmarks/${newsId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        icon.classList.remove('bookmarked', 'bi-bookmark-fill');
        icon.classList.add('bi-bookmark');
        showBookmarkToast('Bookmark removed');
        // If on bookmarked news page, remove the card
        if (window.location.pathname === '/bookmarked-news') {
          const card = button.closest('.col-md-3');
          if (card) card.remove();
          // Show empty state if no more bookmarks
          const list = document.getElementById('bookmarked-news-list');
          if (list && list.children.length === 0) {
            list.innerHTML = '<div class="col-12 text-center text-muted py-5"><h4>No bookmarked articles yet.</h4></div>';
          }
        }
      } else {
        showBookmarkToast(data.error || 'Failed to remove bookmark', true);
      }
    } else {
      // Add bookmark
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ news_id: newsId }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        icon.classList.add('bookmarked', 'bi-bookmark-fill');
        icon.classList.remove('bi-bookmark');
        showBookmarkToast('Bookmarked successfully');
      } else {
        showBookmarkToast(data.error || 'Failed to bookmark', true);
      }
    }
  } catch (err) {
    showBookmarkToast('Network error', true);
  } finally {
    button.disabled = false;
  }
}

function showBookmarkToast(message, isError = false) {
  let toast = document.getElementById('bookmark-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'bookmark-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = 'bookmark-success-message' + (isError ? ' error' : '');
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}
