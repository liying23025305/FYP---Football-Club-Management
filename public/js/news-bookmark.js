// Bookmark/unbookmark button handler
function updateBookmarkBtn(btn, bookmarked) {
  btn.setAttribute('data-bookmarked', bookmarked ? 'true' : '');
  const icon = btn.querySelector('i');
  if (icon) {
    icon.classList.remove('bi-bookmark', 'bi-bookmark-fill');
    icon.classList.add(bookmarked ? 'bi-bookmark-fill' : 'bi-bookmark');
    icon.classList.toggle('bookmarked', bookmarked);
  }
}

function showBookmarkToast(message) {
  let toast = document.getElementById('bookmark-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'bookmark-toast';
    toast.className = 'bookmark-success-message';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

document.addEventListener('DOMContentLoaded', function() {
  // Handle bookmark button click
  document.body.addEventListener('click', async function(e) {
    if (e.target.closest('.bookmark-btn')) {
      e.preventDefault(); // Prevent navigation or form submission
      const btn = e.target.closest('.bookmark-btn');
      const newsId = btn.getAttribute('data-id');
      const isBookmarked = btn.getAttribute('data-bookmarked') === 'true';
      btn.disabled = true;
      // Optimistic UI update
      updateBookmarkBtn(btn, !isBookmarked);
      showBookmarkToast(isBookmarked ? 'Bookmark removed' : 'Bookmarked successfully');
      try {
        if (!isBookmarked) {
          // Add bookmark
          const res = await fetch('/news/bookmark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ news_id: newsId }),
            credentials: 'same-origin'
          });
          if (res.status === 401 || res.redirected) {
            window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
            return;
          }
          if (!res.ok) throw new Error();
          if (typeof loadMyBookmarks === 'function') loadMyBookmarks();
        } else {
          // Remove bookmark
          const res = await fetch(`/news/bookmark/${newsId}`, {
            method: 'DELETE',
            credentials: 'same-origin'
          });
          if (res.status === 401 || res.redirected) {
            window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
            return;
          }
          if (!res.ok) throw new Error();
          if (typeof loadMyBookmarks === 'function') loadMyBookmarks();
          // If on bookmarks page, remove card
          if (window.location.pathname === '/news/bookmarks') {
            const card = btn.closest('.col-md-3');
            if (card) card.remove();
            // If no more bookmarks, show empty message
            const list = document.getElementById('bookmarked-news-list');
            if (list && list.children.length === 0) {
              list.innerHTML = '<div class="col-12 text-center text-muted py-5"><i class="bi bi-bookmark" style="font-size:3em;"></i><div class="mt-3">No bookmarked articles yet.</div></div>';
            }
          }
        }
      } catch (err) {
        // Revert optimistic UI on error
        updateBookmarkBtn(btn, isBookmarked);
        showBookmarkToast('Bookmark action failed. Please try again.');
      } finally {
        btn.disabled = false;
      }
    }
  });
}); 