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
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`);
      }
      const { success, data, error } = await res.json();
      if (!success) {
        throw new Error(error || 'Unknown error');
      }
      let faqs = data;
      if (search) {
        faqs = faqs.filter(faq => faq.question.toLowerCase().includes(search.toLowerCase()) || (faq.answer && faq.answer.toLowerCase().includes(search.toLowerCase())));
      }
      renderFaqs(faqs);
    } catch (err) {
      console.error('FAQ fetch error:', err);
      faqList.innerHTML = `<div class="alert alert-danger">Failed to load FAQs.<br>${err && err.message ? err.message : ''}</div>`;
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
          body: JSON.stringify({ question, category }),
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
          faqFormMessage.textContent = data.message || 'Your question has been submitted!';
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
  const modalFaqQuestion = document.getElementById('modal-faq-question');
  const modalFaqAnswer = document.getElementById('modal-faq-answer');
  const modalFaqCategory = document.getElementById('modal-faq-category');
  const modalFaqStatus = document.getElementById('modal-faq-status');
  const modalFaqPublish = document.getElementById('modal-faq-publish');
  const modalFaqOrder = document.getElementById('modal-faq-order');
  let editingFaqId = null;
  let allFaqs = [];

  // Helper: Show admin message (persistent, green for success)
  function showAdminMessage(msg, type = 'success') {
    adminMessage.innerHTML = `<div class="alert alert-${type === 'success' ? 'success' : type} mb-3" style="font-weight:500;">${msg}</div>`;
    if (type === 'success') {
      setTimeout(() => { adminMessage.innerHTML = ''; }, 4000);
    }
  }

  // Fetch all FAQs for admin (with status/category filter)
  async function loadAdminFaqs(filterStatus = '', filterCategory = '') {
    try {
      adminTable.querySelector('tbody').innerHTML = '<tr><td colspan="7" class="text-center text-secondary">Loading...</td></tr>';
      let url = '/api/admin/faqs';
      const params = [];
      if (filterCategory) params.push(`category=${encodeURIComponent(filterCategory)}`);
      if (params.length) url += '?' + params.join('&');
      const res = await fetch(url, { credentials: 'include' });
      const { success, data } = await res.json();
      if (!success) throw new Error('Failed to fetch FAQs');
      allFaqs = data;
      let faqs = allFaqs;
      if (filterStatus) {
        faqs = faqs.filter(faq => faq.status === filterStatus);
      }
      renderAdminFaqs(faqs);
    } catch (err) {
      adminTable.querySelector('tbody').innerHTML = '<tr><td colspan="7" class="text-danger">Failed to load FAQs.</td></tr>';
    }
  }

  // Update FAQ statistics cards
  function updateFaqStats() {
    const total = allFaqs.length;
    const answered = allFaqs.filter(f => f.status === 'answered').length;
    const pending = allFaqs.filter(f => f.status === 'pending').length;
    const archived = allFaqs.filter(f => f.status === 'archived').length;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('faq-stat-total', total);
    set('faq-stat-answered', answered);
    set('faq-stat-pending', pending);
    set('faq-stat-archived', archived);
  }

  // Render admin FAQ table
  function renderAdminFaqs(faqs) {
    const tbody = adminTable.querySelector('tbody');
    if (!faqs.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">No FAQs found.</td></tr>';
      updateFaqStats();
      return;
    }
    tbody.innerHTML = faqs.map(faq => `
      <tr data-id="${faq.faq_id}">
        <td><input type="number" class="form-control form-control-sm faq-order-input" value="${faq.display_order || 0}" min="0"></td>
        <td>${faq.question}</td>
        <td>${faq.answer || ''}</td>
        <td>${faq.category ? `<span class="badge badge-purple">${faq.category}</span>` : ''}</td>
        <td><span class="badge bg-${faq.status === 'answered' ? 'success' : faq.status === 'pending' ? 'warning' : 'secondary'}">${faq.status}</span></td>
        <td>
          <span class="badge bg-${faq.is_published === 'yes' ? 'success' : 'secondary'}">${faq.is_published === 'yes' ? 'Published' : 'Unpublished'}</span>
        </td>
        <td>
          <button class="btn btn-sm btn-primary edit-faq-btn">Edit</button>
          <button class="btn btn-sm btn-danger delete-faq-btn">Delete</button>
        </td>
      </tr>
    `).join('');
    attachAdminTableListeners();
    updateFaqStats();
  }

  // Attach event listeners to admin table actions
  function attachAdminTableListeners() {
    const tbody = adminTable.querySelector('tbody');
    // Edit
    tbody.querySelectorAll('.edit-faq-btn').forEach(btn => {
      btn.onclick = function () {
        const tr = btn.closest('tr');
        const faqId = tr.getAttribute('data-id');
        const faq = allFaqs.find(f => f.faq_id == faqId);
        openFaqModal(faq);
      };
    });
    // Delete
    tbody.querySelectorAll('.delete-faq-btn').forEach(btn => {
      btn.onclick = async function () {
        const tr = btn.closest('tr');
        const faqId = tr.getAttribute('data-id');
        if (!confirm('Delete this FAQ permanently?')) return;
        await deleteFaq(faqId);
      };
    });
    // Order change
    tbody.querySelectorAll('.faq-order-input').forEach(input => {
      input.onchange = async function () {
        const tr = input.closest('tr');
        const faqId = tr.getAttribute('data-id');
        const newOrder = parseInt(input.value, 10) || 0;
        await updateFaq(faqId, { display_order: newOrder });
        loadAdminFaqs(statusFilter.value, adminCategoryFilter.value);
      };
    });
  }

  // Open modal for add/edit FAQ
  function openFaqModal(faq = {}) {
    editingFaqId = faq.faq_id || null;
    faqModalForm.reset();
    modalFaqQuestion.value = faq.question || '';
    modalFaqAnswer.value = faq.answer || '';
    modalFaqCategory.value = faq.category || '';
    modalFaqStatus.value = faq.status || 'pending';
    modalFaqPublish.value = faq.is_published || 'no';
    modalFaqOrder.value = faq.display_order || 0;
    const modal = new bootstrap.Modal(faqModal);
    modal.show();
  }

  // Add custom purple badge style
  if (!document.getElementById('faq-purple-badge-style')) {
    const style = document.createElement('style');
    style.id = 'faq-purple-badge-style';
    style.innerHTML = `.badge-purple { background-color: #a259e6 !important; color: #fff !important; }`;
    document.head.appendChild(style);
  }

  // Global variable to store pending success message for add/edit
  let pendingAdminSuccessMsg = null;

  // Handle add/edit FAQ form submit
  if (faqModalForm) {
    faqModalForm.onsubmit = async function (e) {
      e.preventDefault();
      const question = modalFaqQuestion.value.trim();
      const answer = modalFaqAnswer.value.trim();
      const category = modalFaqCategory.value;
      const status = modalFaqStatus.value;
      const is_published = modalFaqPublish.value;
      const display_order = parseInt(modalFaqOrder.value, 10) || 0;
      if (!question) {
        showAdminMessage('Question is required.', 'danger');
        return;
      }
      // Confirmation dialog before saving
      let actionType = editingFaqId ? 'edit' : 'add';
      let confirmMsg = actionType === 'edit' ? 'Save changes to this FAQ?' : 'Add this new FAQ?';
      if (!window.confirm(confirmMsg)) return;
      const payload = { question, answer, category, status, is_published, display_order, users_user_id: 1 };
      let successMsg = '';
      try {
        if (editingFaqId) {
          await updateFaq(editingFaqId, payload);
          successMsg = 'Edit is successful!';
        } else {
          await createFaq(payload);
          successMsg = 'Your question has been submitted successfully!';
        }
        // Store the message globally and show after modal is hidden
        pendingAdminSuccessMsg = successMsg;
        const modalInstance = bootstrap.Modal.getInstance(faqModal);
        modalInstance.hide();
      } catch (err) {
        showAdminMessage('Failed to save FAQ.', 'danger');
      }
    };
  }

  // Always show pending success message after modal is hidden
  if (faqModal) {
    faqModal.addEventListener('hidden.bs.modal', function () {
      if (pendingAdminSuccessMsg) {
        showAdminMessage(pendingAdminSuccessMsg, 'success');
        loadAdminFaqs(statusFilter.value, adminCategoryFilter.value);
        pendingAdminSuccessMsg = null;
      }
    });
  }

  // Create FAQ (admin)
  async function createFaq(payload) {
    const res = await fetch('/api/admin/faqs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Create failed');
    return data;
  }

  // Update FAQ (admin)
  async function updateFaq(faqId, payload) {
    const res = await fetch(`/api/admin/faqs/${faqId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Update failed');
    return data;
  }

  // Delete FAQ (admin)
  async function deleteFaq(faqId) {
    const res = await fetch(`/api/admin/faqs/${faqId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Delete failed');
    loadAdminFaqs(statusFilter.value, adminCategoryFilter.value);
    showAdminMessage('FAQ deleted successfully!', 'success');
  }

  // Add FAQ button
  if (addFaqBtn) {
    addFaqBtn.onclick = function () {
      openFaqModal();
    };
  }

  // Status/category filter
  if (statusFilter) {
    statusFilter.onchange = function () {
      loadAdminFaqs(statusFilter.value, adminCategoryFilter.value);
    };
  }
  if (adminCategoryFilter) {
    adminCategoryFilter.onchange = function () {
      loadAdminFaqs(statusFilter.value, adminCategoryFilter.value);
    };
  }

  // Populate admin category dropdowns and load FAQs on page load
  if (adminTable) {
    populateAdminCategoryDropdowns();
    loadAdminFaqs();
  }
}); 