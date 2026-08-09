/**
 * Hostel Laundry Management System
 * Core Application Logic - Fast Direct Typing & Keyboard Navigation
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const studentTableBody = document.getElementById('student-table-body');
  const currentDateEl = document.getElementById('current-date');
  const toastContainer = document.getElementById('toast-container');
  const sendAllBtn = document.getElementById('send-all-btn');
  const sendAllStatusEl = document.getElementById('send-all-status');
  const loginModal = document.getElementById('login-modal');
  const loginForm = document.getElementById('login-form');
  const passcodeInput = document.getElementById('passcode-input');
  const quickLockBtn = document.getElementById('quick-lock-btn');

  // Total Row Elements
  const sumPantEl = document.getElementById('sum-pant');
  const sumShirtEl = document.getElementById('sum-shirt');
  const sumTshirtEl = document.getElementById('sum-tshirt');
  const sumTrackEl = document.getElementById('sum-track');
  const sumTowelEl = document.getElementById('sum-towel');
  const sumGrandTotalEl = document.getElementById('sum-grand-total');

  // Exactly 5 students
  const students = ['Ronit', 'Raj', 'Harsh', 'Preet', 'Meet'];
  const CORRECT_PASSCODE = '1234';

  // Display Current Date
  const today = new Date();
  const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
  currentDateEl.textContent = today.toLocaleDateString('en-US', options);

  // Passcode / Login Authentication Logic
  function checkAuth() {
    const isLoggedIn = sessionStorage.getItem('hostel_laundry_logged_in') === 'true';
    if (isLoggedIn) {
      loginModal.classList.add('hidden');
      focusFirstInput();
    } else {
      loginModal.classList.remove('hidden');
      setTimeout(() => passcodeInput.focus(), 100);
    }
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const entered = passcodeInput.value.trim();
      if (entered === CORRECT_PASSCODE || entered === '') {
        sessionStorage.setItem('hostel_laundry_logged_in', 'true');
        loginModal.classList.add('hidden');
        showToast('Login Successful! 🔑', 'You can now type numbers directly into the table.', 'success');
        focusFirstInput();
      } else {
        showToast('Incorrect Passcode', 'Please try again (Default: 1234).', 'warning');
        passcodeInput.select();
      }
    });
  }

  if (quickLockBtn) {
    quickLockBtn.addEventListener('click', () => {
      sessionStorage.removeItem('hostel_laundry_logged_in');
      loginModal.classList.remove('hidden');
      passcodeInput.value = '';
      passcodeInput.focus();
      showToast('Locked 🔒', 'Access locked.', 'info');
    });
  }

  // Auto-focus on the first item input field for instant typing
  function focusFirstInput() {
    setTimeout(() => {
      const firstQtyInput = studentTableBody.querySelector('.qty-input');
      if (firstQtyInput) {
        firstQtyInput.focus();
        firstQtyInput.select();
      }
    }, 150);
  }

  // Initialize Default Table
  function initTable() {
    studentTableBody.innerHTML = '';
    students.forEach((name, index) => {
      addStudentRow(name, index);
    });

    calculateGrandTotals();
    checkAuth();
  }

  /**
   * Add a student row to the table
   * @param {string} studentName 
   * @param {number} index 
   */
  function addStudentRow(studentName, index) {
    const rowId = `row-${index}`;
    const tr = document.createElement('tr');
    tr.id = rowId;
    tr.dataset.rowIndex = index;

    tr.innerHTML = `
      <td class="col-name">
        <input type="text" class="name-input" value="${studentName}" placeholder="Enter Name" data-field="name">
      </td>
      <td class="col-item">
        <input type="number" min="0" class="qty-input" value="" placeholder="0" data-field="pant" data-col="0">
      </td>
      <td class="col-item">
        <input type="number" min="0" class="qty-input" value="" placeholder="0" data-field="shirt" data-col="1">
      </td>
      <td class="col-item">
        <input type="number" min="0" class="qty-input" value="" placeholder="0" data-field="tshirt" data-col="2">
      </td>
      <td class="col-item">
        <input type="number" min="0" class="qty-input" value="" placeholder="0" data-field="track" data-col="3">
      </td>
      <td class="col-item">
        <input type="number" min="0" class="qty-input" value="" placeholder="0" data-field="towel" data-col="4">
      </td>
      <td class="col-total">
        <span class="total-badge" id="total-${rowId}">0</span>
      </td>
    `;

    studentTableBody.appendChild(tr);

    // Input Events & Keyboard Navigation
    const qtyInputs = tr.querySelectorAll('.qty-input');
    qtyInputs.forEach(input => {
      input.addEventListener('input', () => {
        calculateRowTotal(rowId);
        calculateGrandTotals();
      });

      input.addEventListener('focus', function() {
        this.select();
      });

      // Keyboard Arrow & Enter Navigation
      input.addEventListener('keydown', (e) => {
        handleKeyboardNav(e, index, parseInt(input.dataset.col));
      });
    });

    const nameInput = tr.querySelector('.name-input');
    nameInput.addEventListener('input', () => {
      calculateGrandTotals();
    });

    calculateRowTotal(rowId);
  }

  /**
   * Smooth Keyboard Navigation between inputs using Enter / Arrow keys
   */
  function handleKeyboardNav(e, rowIndex, colIndex) {
    let nextRow = rowIndex;
    let nextCol = colIndex;

    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextRow = (rowIndex + 1) % students.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextRow = (rowIndex - 1 + students.length) % students.length;
    } else if (e.key === 'ArrowRight' && e.target.selectionStart === e.target.value.length) {
      if (colIndex < 4) {
        e.preventDefault();
        nextCol = colIndex + 1;
      }
    } else if (e.key === 'ArrowLeft' && e.target.selectionStart === 0) {
      if (colIndex > 0) {
        e.preventDefault();
        nextCol = colIndex - 1;
      }
    } else {
      return;
    }

    const targetRow = studentTableBody.querySelector(`tr[data-row-index="${nextRow}"]`);
    if (targetRow) {
      const targetInput = targetRow.querySelector(`input[data-col="${nextCol}"]`);
      if (targetInput) {
        targetInput.focus();
        targetInput.select();
      }
    }
  }

  /**
   * Calculate Total for a single row
   * @param {string} rowId 
   * @returns {number}
   */
  function calculateRowTotal(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return 0;

    const pant = parseInt(row.querySelector('[data-field="pant"]').value) || 0;
    const shirt = parseInt(row.querySelector('[data-field="shirt"]').value) || 0;
    const tshirt = parseInt(row.querySelector('[data-field="tshirt"]').value) || 0;
    const track = parseInt(row.querySelector('[data-field="track"]').value) || 0;
    const towel = parseInt(row.querySelector('[data-field="towel"]').value) || 0;

    const total = pant + shirt + tshirt + track + towel;
    const totalEl = document.getElementById(`total-${rowId}`);

    if (totalEl) {
      totalEl.textContent = total;
      if (total > 0) {
        totalEl.classList.add('has-value');
      } else {
        totalEl.classList.remove('has-value');
      }
    }

    return total;
  }

  /**
   * Calculate Column Totals & Grand Total
   */
  function calculateGrandTotals() {
    let totalPant = 0;
    let totalShirt = 0;
    let totalTshirt = 0;
    let totalTrack = 0;
    let totalTowel = 0;
    let grandTotal = 0;

    const rows = studentTableBody.querySelectorAll('tr');
    rows.forEach(row => {
      const pant = parseInt(row.querySelector('[data-field="pant"]')?.value) || 0;
      const shirt = parseInt(row.querySelector('[data-field="shirt"]')?.value) || 0;
      const tshirt = parseInt(row.querySelector('[data-field="tshirt"]')?.value) || 0;
      const track = parseInt(row.querySelector('[data-field="track"]')?.value) || 0;
      const towel = parseInt(row.querySelector('[data-field="towel"]')?.value) || 0;

      const rowTotal = pant + shirt + tshirt + track + towel;

      totalPant += pant;
      totalShirt += shirt;
      totalTshirt += tshirt;
      totalTrack += track;
      totalTowel += towel;
      grandTotal += rowTotal;
    });

    sumPantEl.textContent = totalPant;
    sumShirtEl.textContent = totalShirt;
    sumTshirtEl.textContent = totalTshirt;
    sumTrackEl.textContent = totalTrack;
    sumTowelEl.textContent = totalTowel;
    sumGrandTotalEl.textContent = grandTotal;

    return grandTotal;
  }

  /**
   * Single Submit All Laundry Function - Opens https://share.google/3umX153OFCJdNUwMw
   */
  function handleSendAll() {
    const grandTotal = calculateGrandTotals();

    if (grandTotal === 0) {
      showToast('Validation Warning', 'Please enter laundry items for at least one student.', 'warning');
      return;
    }

    const timestamp = new Date();
    const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Show Success Toast Message
    showToast('Sent Successfully! 🚀', `Laundry recorded! Opening Google Share link...`, 'success');

    // Display Status Message Below Button
    if (sendAllStatusEl) {
      sendAllStatusEl.innerHTML = `<span class="sent-status-badge">✓ Submitted All Laundry at ${timeStr} (${grandTotal} items)</span>`;
    }

    // Open https://share.google/3umX153OFCJdNUwMw directly
    window.open('https://share.google/3umX153OFCJdNUwMw', '_blank');
  }

  /**
   * Toast notification display helper
   */
  function showToast(title, message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    toast.innerHTML = `
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.remove();
    });

    toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }
    }, 4000);
  }

  // Attach event listener to main SEND ALL button
  if (sendAllBtn) {
    sendAllBtn.addEventListener('click', handleSendAll);
  }

  // Initialize Table
  initTable();
});
