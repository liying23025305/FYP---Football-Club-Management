// Bookmark toggle logic for news and bookmarked news pages

document.addEventListener('DOMContentLoaded', function () {
  // Event delegation for all bookmark buttons
  document.body.addEventListener('click', async function (e) {
    // Only respond to left mouse button
    if (e.button !== 0) return;
    const btn = e.target.closest('.bookmark-btn');
    if (!btn) return;
    console.log('Bookmark button clicked:', btn);
    e.preventDefault();
    e.stopPropagation();
    await toggleBookmark(btn);
  });
});

async function toggleBookmark(button) {
  if (!button) return;
  const newsId = button.getAttribute('data-news-id');
  // Find the icon inside the button, even if the click was on the icon
  let icon = button.querySelector('.bookmark-icon');
  if (!icon && button.classList.contains('bookmark-icon')) {
    icon = button;
  }
  if (!newsId || !icon) {
    console.log('Missing newsId or icon', { newsId, icon });
    return;
  }
  console.log('Toggling bookmark for newsId:', newsId);
  const isBookmarked = icon.classList.contains('bookmarked') || icon.classList.contains('bi-bookmark-fill');
  button.disabled = true;
  try {
    if (isBookmarked) {
      // Remove bookmark
      const res = await fetch(`/api/bookmarks/${newsId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
      if (res.status === 401) {
        showBookmarkToast('Please log in to bookmark news.', true);
        setTimeout(() => { window.location.href = '/login'; }, 1500);
        return;
      }
      const data = await res.json();
      console.log('Remove bookmark response:', data);
      if (data.success) {
        icon.classList.remove('bookmarked', 'bi-bookmark-fill');
        icon.classList.add('bi-bookmark');
        showBookmarkToast('Bookmark removed');
        // If on bookmarked news page, remove the card
        if (window.location.pathname === '/news/bookmarked-news') {
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
      if (res.status === 401) {
        showBookmarkToast('Please log in to bookmark news.', true);
        setTimeout(() => { window.location.href = '/login'; }, 1500);
        return;
      }
      if (res.status === 409) {
        // Already bookmarked, so toggle to unbookmark
        const delRes = await fetch(`/api/bookmarks/${newsId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
        const delData = await delRes.json();
        if (delData.success) {
          icon.classList.remove('bookmarked', 'bi-bookmark-fill');
          icon.classList.add('bi-bookmark');
          showBookmarkToast('Bookmark removed');
          if (window.location.pathname === '/news/bookmarked-news') {
            const card = button.closest('.col-md-3');
            if (card) card.remove();
            const list = document.getElementById('bookmarked-news-list');
            if (list && list.children.length === 0) {
              list.innerHTML = '<div class="col-12 text-center text-muted py-5"><h4>No bookmarked articles yet.</h4></div>';
            }
          }
        } else {
          showBookmarkToast(delData.error || 'Failed to remove bookmark', true);
        }
        return;
      }
      const data = await res.json();
      console.log('Add bookmark response:', data);
      if (data.success) {
        icon.classList.add('bookmarked', 'bi-bookmark-fill');
        icon.classList.remove('bi-bookmark');
        showBookmarkToast('Bookmarked successfully');
      } else {
        showBookmarkToast(data.error || 'Failed to bookmark', true);
      }
    }
  } catch (err) {
    console.error('Bookmark network error:', err);
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
