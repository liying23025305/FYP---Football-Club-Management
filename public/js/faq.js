// public/js/faq.js
// Handles FAQ interactivity for both public and admin pages

document.addEventListener('DOMContentLoaded', function () {
  // =========================
  // CATEGORY SUPPORT
  // =========================
  // You can fetch categories from backend or hardcode them here
  const FAQ_CATEGORIES = [
    'General',
    'Membership',
    'Store',
    'Events',
    'Tickets',
    'Technical',
    'Other'
  ];

  // Populate category dropdowns (public page)
  function populateCategoryDropdowns() {
    const filter = document.getElementById('faq-category-filter');
    const ask = document.getElementById('faq-question-category');
    if (filter) {
      filter.innerHTML = '<option value="">All Categories</option>' + FAQ_CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }
    if (ask) {
      ask.innerHTML = '<option value="">Select a category</option>' + FAQ_CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }
  }

  // Populate category dropdowns (admin page)
  function populateAdminCategoryDropdowns() {
    const filter = document.getElementById('faq-category-filter-admin');
    const modal = document.getElementById('modal-faq-category');
    if (filter) {
      filter.innerHTML = '<option value="">All Categories</option>' + FAQ_CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }
    if (modal) {
      modal.innerHTML = '<option value="">Select a category</option>' + FAQ_CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }
  }

  // =========================
  // PUBLIC FAQ PAGE
  // =========================
  const faqList = document.getElementById('faq-list');
  const faqSearchForm = document.getElementById('faq-search-form');
  const faqSearchInput = document.getElementById('faq-search');
  const faqCategoryFilter = document.getElementById('faq-category-filter');
  const faqQuestionForm = document.getElementById('faq-question-form');
  const faqFormMessage = document.getElementById('faq-form-message');
  const faqQuestionCategory = document.getElementById('faq-question-category');

  // Fetch and render published FAQs (with category filter)
  async function loadFaqs(search = '', category = '') {
    try {
      let url = '/api/faqs';
      if (category) url += `?category=${encodeURIComponent(category)}`;
      const res = await fetch(url);
      console.log('FAQ fetch status:', res.status);
      const text = await res.text();
      console.log('FAQ fetch response:', text);
      let faqs = JSON.parse(text);
      if (search) {
        faqs = faqs.filter(faq => faq.question.toLowerCase().includes(search.toLowerCase()) || (faq.answer && faq.answer.toLowerCase().includes(search.toLowerCase())));
      }
      renderFaqs(faqs);
    } catch (err) {
      console.error('FAQ fetch error:', err);
      faqList.innerHTML = '<div class="alert alert-danger">Failed to load FAQs.</div>';
    }
  }

  // Render FAQ list (with category badge)
  function renderFaqs(faqs) {
    if (!faqs.length) {
      faqList.innerHTML = '<div class="alert alert-info">No FAQs found.</div>';
      return;
    }
    faqList.innerHTML = faqs.map(faq => `
      <div class="card mb-3">
        <div class="card-header fw-bold">
          Q: ${faq.question}
          ${faq.category ? `<span class="badge bg-secondary ms-2">${faq.category}</span>` : ''}
        </div>
        <div class="card-body"><span class="text-success">A:</span> ${faq.answer || '<em>Not answered yet.</em>'}</div>
      </div>
    `).join('');
  }

  // Search and category filter handler
  if (faqSearchForm) {
    faqSearchForm.addEventListener('submit', function (e) {
      e.preventDefault();
      loadFaqs(faqSearchInput.value.trim(), faqCategoryFilter.value);
    });
    if (faqCategoryFilter) {
      faqCategoryFilter.addEventListener('change', function () {
        loadFaqs(faqSearchInput.value.trim(), this.value);
      });
    }
    // Initial load
    populateCategoryDropdowns();
    loadFaqs();
  }

  // Submit question form handler (with category)
  if (faqQuestionForm) {
    faqQuestionForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const question = document.getElementById('faq-question').value.trim();
      const category = faqQuestionCategory ? faqQuestionCategory.value : '';
      if (!question) {
        faqFormMessage.textContent = 'Please enter your question.';
        faqFormMessage.className = 'text-danger';
        return;
      }
      try {
        const res = await fetch('/api/faqs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, category })
        });
        const data = await res.json();
        if (data.success) {
          faqFormMessage.textContent = 'Your question has been submitted!';
          faqFormMessage.className = 'text-success';
          faqQuestionForm.reset();
        } else {
          faqFormMessage.textContent = data.error || 'Submission failed.';
          faqFormMessage.className = 'text-danger';
        }
      } catch (err) {
        faqFormMessage.textContent = 'Submission failed.';
        faqFormMessage.className = 'text-danger';
      }
    });
  }

  // =========================
  // ADMIN FAQ DASHBOARD
  // =========================
  const adminTable = document.getElementById('faq-admin-table');
  const adminMessage = document.getElementById('faq-admin-message');
  const statusFilter = document.getElementById('faq-status-filter');
  const adminCategoryFilter = document.getElementById('faq-category-filter-admin');
  const addFaqBtn = document.getElementById('add-faq-btn');
  const faqModal = document.getElementById('faq-modal');
  const faqModalForm = document.getElementById('faq-modal-form');
  const modalFaqCategory = document.getElementById('modal-faq-category');
  const modalFaqPublish = document.getElementById('modal-faq-publish');
  let editingFaqId = null;
  let allFaqs = [];

  // Fetch all FAQs for admin (with category filter)
  async function loadAdminFaqs(filterStatus = '', filterCategory = '') {
    try {
      let url = '/api/admin/faqs';
      const params = [];
      if (filterCategory) params.push(`category=${encodeURIComponent(filterCategory)}`);
      if (params.length) url += '?' + params.join('&');
      const res = await fetch(url);
      allFaqs = await res.json();
      let faqs = allFaqs;
      if (filterStatus) {
        faqs = faqs.filter(faq => faq.status === filterStatus);
      }
      renderAdminFaqs(faqs);
    } catch (err) {
      adminTable.querySelector('tbody').innerHTML = '<tr><td colspan="6" class="text-danger">Failed to load FAQs.</td></tr>';
    }
  }

  // Render admin FAQ table (with category & publish status columns)
  function renderAdminFaqs(faqs) {
    const tbody = adminTable.querySelector('tbody');
    if (!faqs.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">No FAQs found.</td></tr>';
      return;
    }
    tbody.innerHTML = faqs.map(faq => `
      <tr data-id="${faq.faq_id}">
        <td><input type="number" class="form-control form-control-sm faq-order-input" value="${faq.display_order || 0}" min="0"></td>
        <td>${faq.question}</td>
        <td>${faq.answer || ''}</td>
        <td>${faq.category ? `<span class="badge bg-secondary">${faq.category}</span>` : ''}</td>
        <td><span class="badge bg-${faq.status === 'answered' ? 'success' : faq.status === 'pending' ? 'warning' : 'secondary'}">${faq.status}</span></td>
        <td>
          <span class="badge bg-${faq.is_published === 'yes' ? 'success' : 'secondary'}">${faq.is_published === 'yes' ? 'Published' : 'Unpublished'}</span>
          <button class="btn btn-sm btn-outline-${faq.is_published === 'yes' ? 'secondary' : 'success'} ms-2 toggle-publish-btn">${faq.is_published === 'yes' ? 'Unpublish' : 'Publish'}</button>
        </td>
        <td>
          <button class="btn btn-sm btn-primary edit-faq-btn">Edit</button>
          <button class="btn btn-sm btn-danger delete-faq-btn">${faq.status === 'archived' ? 'Delete' : 'Archive'}</button>
        </td>
      </tr>
    `).join('');
  }

  // Status and category filter handler
  if (statusFilter && adminCategoryFilter) {
    statusFilter.addEventListener('change', function () {
      loadAdminFaqs(this.value, adminCategoryFilter.value);
    });
    adminCategoryFilter.addEventListener('change', function () {
      loadAdminFaqs(statusFilter.value, this.value);
    });
    // Initial load
    populateAdminCategoryDropdowns();
    loadAdminFaqs();
  }

  // Add FAQ button handler
  if (addFaqBtn) {
    addFaqBtn.addEventListener('click', function () {
      editingFaqId = null;
      openFaqModal();
    });
  }

  // Open modal for add/edit (with category and publish status)
  function openFaqModal(faq = {}) {
    document.getElementById('modal-faq-question').value = faq.question || '';
    document.getElementById('modal-faq-answer').value = faq.answer || '';
    document.getElementById('modal-faq-status').value = faq.status || 'pending';
    document.getElementById('modal-faq-order').value = faq.display_order || 0;
    if (modalFaqCategory) modalFaqCategory.value = faq.category || '';
    if (modalFaqPublish) modalFaqPublish.value = faq.is_published || 'no';
    if (window.bootstrap) {
      const modal = new bootstrap.Modal(faqModal);
      modal.show();
    } else {
      $(faqModal).modal('show'); // fallback for jQuery
    }
  }

  // Edit FAQ button handler and publish toggle
  if (adminTable) {
    adminTable.addEventListener('click', function (e) {
      if (e.target.classList.contains('edit-faq-btn')) {
        const tr = e.target.closest('tr');
        const faqId = tr.getAttribute('data-id');
        const faq = allFaqs.find(f => f.faq_id == faqId);
        editingFaqId = faqId;
        openFaqModal(faq);
      } else if (e.target.classList.contains('delete-faq-btn')) {
        const tr = e.target.closest('tr');
        const faqId = tr.getAttribute('data-id');
        if (confirm('Are you sure you want to archive/delete this FAQ?')) {
          deleteFaq(faqId);
        }
      } else if (e.target.classList.contains('toggle-publish-btn')) {
        const tr = e.target.closest('tr');
        const faqId = tr.getAttribute('data-id');
        const faq = allFaqs.find(f => f.faq_id == faqId);
        if (!faq) return;
        // Toggle publish status
        const newPublish = faq.is_published === 'yes' ? 'no' : 'yes';
        updateFaqPublish(faqId, newPublish, faq);
      }
      // Inline order update
      adminTable.addEventListener('change', function (e) {
        if (e.target.classList.contains('faq-order-input')) {
          const tr = e.target.closest('tr');
          const faqId = tr.getAttribute('data-id');
          const newOrder = e.target.value;
          updateFaqOrder(faqId, newOrder);
        }
      });
    });
  }

  // Modal form submit handler (add/edit FAQ, with category and publish status)
  if (faqModalForm) {
    faqModalForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const question = document.getElementById('modal-faq-question').value.trim();
      const answer = document.getElementById('modal-faq-answer').value.trim();
      const status = document.getElementById('modal-faq-status').value;
      const display_order = parseInt(document.getElementById('modal-faq-order').value, 10) || 0;
      const category = modalFaqCategory ? modalFaqCategory.value : '';
      const is_published = modalFaqPublish ? modalFaqPublish.value : 'no';
      if (!question) {
        showAdminMessage('Question is required.', 'danger');
        return;
      }
      try {
        let res, data;
        if (editingFaqId) {
          res = await fetch(`/api/admin/faqs/${editingFaqId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, answer, status, display_order, category, is_published })
          });
        } else {
          // Might need to provide users_user_id (admin's user id)
          res = await fetch('/api/admin/faqs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, answer, status, display_order, users_user_id: 1, category, is_published }) // TODO: Replace with actual admin user id
          });
        }
        data = await res.json();
        if (data.success) {
          showAdminMessage('FAQ saved successfully.', 'success');
          if (window.bootstrap) bootstrap.Modal.getInstance(faqModal).hide();
          else $(faqModal).modal('hide');
          loadAdminFaqs(statusFilter.value, adminCategoryFilter.value);
        } else {
          showAdminMessage(data.error || 'Save failed.', 'danger');
        }
      } catch (err) {
        showAdminMessage('Save failed.', 'danger');
      }
    });
  }

  // Delete/archive FAQ
  async function deleteFaq(faqId) {
    try {
      const res = await fetch(`/api/admin/faqs/${faqId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showAdminMessage('FAQ archived/deleted.', 'success');
        loadAdminFaqs(statusFilter.value, adminCategoryFilter.value);
      } else {
        showAdminMessage(data.error || 'Delete failed.', 'danger');
      }
    } catch (err) {
      showAdminMessage('Delete failed.', 'danger');
    }
  }

  // Update FAQ display order
  async function updateFaqOrder(faqId, display_order) {
    const faq = allFaqs.find(f => f.faq_id == faqId);
    if (!faq) return;
    try {
      const res = await fetch(`/api/admin/faqs/${faqId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: faq.question,
          answer: faq.answer,
          status: faq.status,
          display_order: parseInt(display_order, 10) || 0
        })
      });
      const data = await res.json();
      if (data.success) {
        showAdminMessage('Order updated.', 'success');
        loadAdminFaqs(statusFilter.value, adminCategoryFilter.value);
      } else {
        showAdminMessage(data.error || 'Order update failed.', 'danger');
      }
    } catch (err) {
      showAdminMessage('Order update failed.', 'danger');
    }
  }

  // Update FAQ publish status (quick toggle)
  async function updateFaqPublish(faqId, is_published, faq) {
    try {
      const res = await fetch(`/api/admin/faqs/${faqId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: faq.question,
          answer: faq.answer,
          status: faq.status,
          display_order: faq.display_order,
          category: faq.category,
          is_published
        })
      });
      const data = await res.json();
      if (data.success) {
        showAdminMessage('Publish status updated.', 'success');
        loadAdminFaqs(statusFilter.value, adminCategoryFilter.value);
      } else {
        showAdminMessage(data.error || 'Publish update failed.', 'danger');
      }
    } catch (err) {
      showAdminMessage('Publish update failed.', 'danger');
    }
  }

  // Show admin message
  function showAdminMessage(msg, type) {
    adminMessage.textContent = msg;
    adminMessage.className = `alert alert-${type}`;
    setTimeout(() => {
      adminMessage.textContent = '';
      adminMessage.className = '';
    }, 3000);
  }
}); 