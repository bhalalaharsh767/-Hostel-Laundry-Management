/**
 * Hostel Laundry Management System
 * Premium Dark Glassmorphism Design System
 * Touch Steppers, Real-time Multi-Device Sync & Per-Row Save
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const studentTableBody = document.getElementById('student-table-body');
  const currentDateEl = document.getElementById('current-date');
  const toastContainer = document.getElementById('toast-container');
  const sendAllBtn = document.getElementById('send-all-btn');
  const sendAllStatusEl = document.getElementById('send-all-status');
  const resetBtn = document.getElementById('reset-btn');

  // Total Row Elements
  const sumPantEl = document.getElementById('sum-pant');
  const sumShirtEl = document.getElementById('sum-shirt');
  const sumTshirtEl = document.getElementById('sum-tshirt');
  const sumTrackEl = document.getElementById('sum-track');
  const sumTowelEl = document.getElementById('sum-towel');
  const sumGrandTotalEl = document.getElementById('sum-grand-total');

  // Exactly 5 students
  const students = ['Ronit', 'Raj', 'Harsh', 'Preet', 'Meet'];

  // Track active focus and dirty rows (rows with unsaved user edits)
  let activeInputElement = null;
  const dirtyRows = new Set();

  // Display Current Date
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
  currentDateEl.textContent = today.toLocaleDateString('en-US', options);

  // Auto Reset Local Fallback if Date Changed
  function checkLocalDateReset() {
    const savedDate = localStorage.getItem('shared_laundry_date');
    if (savedDate !== todayStr) {
      localStorage.removeItem('shared_laundry_data');
      localStorage.setItem('shared_laundry_date', todayStr);
    }
  }

  // Initialize Default Table
  function initTable() {
    checkLocalDateReset();
    studentTableBody.innerHTML = '';
    students.forEach((name, index) => {
      addStudentRow(name, index);
    });

    calculateGrandTotals();
    fetchSharedData();

    // Start Real-Time Live Sync Polling (Every 4 seconds)
    setInterval(fetchSharedData, 4000);
  }

  /**
   * Add a student row to the table with Touch Steppers (- / +)
   * @param {string} studentName 
   * @param {number} index 
   */
  function addStudentRow(studentName, index) {
    const rowId = `row-${index}`;
    const tr = document.createElement('tr');
    tr.id = rowId;
    tr.dataset.studentName = studentName;
    tr.dataset.rowIndex = index;

    const initialLetter = studentName.charAt(0).toUpperCase();

    tr.innerHTML = `
      <td class="col-name">
        <div class="name-badge-cell">
          <div class="student-avatar">${initialLetter}</div>
          <span class="student-name-text">${studentName}</span>
          <input type="hidden" class="name-input" value="${studentName}" data-field="name">
        </div>
      </td>
      <td class="col-item">${createStepperHtml('pant', 0)}</td>
      <td class="col-item">${createStepperHtml('shirt', 1)}</td>
      <td class="col-item">${createStepperHtml('tshirt', 2)}</td>
      <td class="col-item">${createStepperHtml('track', 3)}</td>
      <td class="col-item">${createStepperHtml('towel', 4)}</td>
      <td class="col-total">
        <span class="total-badge" id="total-${rowId}">0</span>
      </td>
      <td class="col-save">
        <button type="button" class="btn-save-row" data-student="${studentName}" data-row-id="${rowId}">💾 Save</button>
        <div class="save-status-box" id="save-status-${rowId}"></div>
      </td>
    `;

    studentTableBody.appendChild(tr);

    // Input Events & Phone Touch Steppers
    const qtyInputs = tr.querySelectorAll('.qty-input');
    qtyInputs.forEach(input => {
      input.addEventListener('input', () => {
        dirtyRows.add(rowId);
        calculateRowTotal(rowId);
        calculateGrandTotals();
      });

      input.addEventListener('focus', function() {
        activeInputElement = this;
        dirtyRows.add(rowId);
        this.select();
      });

      input.addEventListener('blur', function() {
        if (activeInputElement === this) {
          activeInputElement = null;
        }
      });

      input.addEventListener('touchstart', function() {
        activeInputElement = this;
        dirtyRows.add(rowId);
        setTimeout(() => this.select(), 50);
      });

      input.addEventListener('keydown', (e) => {
        handleKeyboardNav(e, index, parseInt(input.dataset.col));
      });
    });

    // Attach Stepper Buttons (- and +) Click Listeners
    tr.querySelectorAll('.btn-step').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const action = btn.dataset.action;
        const targetField = btn.dataset.targetField;
        const targetInput = tr.querySelector(`[data-field="${targetField}"]`);

        if (targetInput) {
          let currentVal = parseInt(targetInput.value) || 0;
          if (action === 'plus') {
            currentVal += 1;
          } else if (action === 'minus') {
            currentVal = Math.max(0, currentVal - 1);
          }
          targetInput.value = currentVal > 0 ? currentVal : '';
          dirtyRows.add(rowId);
          calculateRowTotal(rowId);
          calculateGrandTotals();
        }
      });
    });

    // Save Row Button Event Listener
    const saveRowBtn = tr.querySelector('.btn-save-row');
    saveRowBtn.addEventListener('click', () => {
      saveStudentRow(studentName, rowId);
    });

    calculateRowTotal(rowId);
  }

  /**
   * Create HTML for Stepper (- Input +)
   */
  function createStepperHtml(field, colIdx) {
    return `
      <div class="stepper-container">
        <button type="button" class="btn-step step-minus" data-action="minus" data-target-field="${field}">-</button>
        <input type="number" inputmode="numeric" pattern="[0-9]*" min="0" class="qty-input" value="" placeholder="0" data-field="${field}" data-col="${colIdx}">
        <button type="button" class="btn-step step-plus" data-action="plus" data-target-field="${field}">+</button>
      </div>
    `;
  }

  /**
   * Save an individual student row to the server & local storage
   */
  async function saveStudentRow(studentName, rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;

    const pant = parseInt(row.querySelector('[data-field="pant"]')?.value) || 0;
    const shirt = parseInt(row.querySelector('[data-field="shirt"]')?.value) || 0;
    const tshirt = parseInt(row.querySelector('[data-field="tshirt"]')?.value) || 0;
    const track = parseInt(row.querySelector('[data-field="track"]')?.value) || 0;
    const towel = parseInt(row.querySelector('[data-field="towel"]')?.value) || 0;
    const rowTotal = pant + shirt + tshirt + track + towel;

    const timestamp = new Date();
    const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const payload = {
      name: studentName,
      pant,
      shirt,
      tshirt,
      track,
      towel,
      savedAt: timeStr
    };

    dirtyRows.delete(rowId);

    const statusBox = document.getElementById(`save-status-${rowId}`);
    if (statusBox) {
      statusBox.innerHTML = `<span class="saved-badge">✓ Saved (${rowTotal})</span>`;
    }

    showToast('Saved Successfully! 💾', `${studentName}'s laundry row saved (${rowTotal} items).`, 'success');

    // Save to server backend
    try {
      await fetch('/api/laundry/save-row', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      const localData = JSON.parse(localStorage.getItem('shared_laundry_data') || '{}');
      localData[studentName] = payload;
      localStorage.setItem('shared_laundry_data', JSON.stringify(localData));
      localStorage.setItem('shared_laundry_date', todayStr);
    }
  }

  /**
   * Fetch Shared Laundry Data from Server for Real-Time Multi-Device Sync
   */
  async function fetchSharedData() {
    try {
      const res = await fetch('/api/laundry');
      if (!res.ok) throw new Error('API offline');
      const data = await res.json();
      applySharedData(data);
    } catch (err) {
      const localData = JSON.parse(localStorage.getItem('shared_laundry_data') || '{}');
      applySharedData({ students: localData });
    }
  }

  /**
   * Apply shared data to table rows safely without disrupting typing
   */
  function applySharedData(data) {
    if (!data) return;

    const studentMap = data.students || data;

    students.forEach((name, idx) => {
      const studentData = studentMap[name];
      const rowId = `row-${idx}`;
      const row = document.getElementById(rowId);
      if (!row) return;

      if (!studentData) {
        if (!dirtyRows.has(rowId)) {
          row.querySelectorAll('.qty-input').forEach(i => i.value = '');
          calculateRowTotal(rowId);
          const statusBox = document.getElementById(`save-status-${rowId}`);
          if (statusBox) statusBox.innerHTML = '';
        }
        return;
      }

      if (dirtyRows.has(rowId)) return;

      const fields = ['pant', 'shirt', 'tshirt', 'track', 'towel'];
      fields.forEach(field => {
        const input = row.querySelector(`[data-field="${field}"]`);
        if (input && activeInputElement !== input) {
          const val = studentData[field] || 0;
          input.value = val > 0 ? val : '';
        }
      });

      calculateRowTotal(rowId);

      const statusBox = document.getElementById(`save-status-${rowId}`);
      if (statusBox) {
        if (studentData.saved) {
          statusBox.innerHTML = `<span class="saved-badge">✓ Saved ${studentData.savedAt ? '(' + studentData.savedAt + ')' : ''}</span>`;
        } else {
          statusBox.innerHTML = '';
        }
      }
    });

    calculateGrandTotals();
  }

  /**
   * Reset Table Data
   */
  async function resetTable() {
    if (!confirm('Are you sure you want to reset all laundry data for a new day?')) return;

    dirtyRows.clear();

    try {
      await fetch('/api/laundry/reset', { method: 'POST' });
    } catch (e) {
      localStorage.removeItem('shared_laundry_data');
    }

    students.forEach((name, idx) => {
      const rowId = `row-${idx}`;
      const row = document.getElementById(rowId);
      if (row) {
        row.querySelectorAll('.qty-input').forEach(i => i.value = '');
        calculateRowTotal(rowId);
        const statusBox = document.getElementById(`save-status-${rowId}`);
        if (statusBox) statusBox.innerHTML = '';
      }
    });

    calculateGrandTotals();
    showToast('Reset Complete 🔄', 'All student entries have been reset.', 'info');
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
   * Single Submit All Laundry Function - Opens WhatsApp with Laundry Total Summary
   */
  function handleSendAll() {
    const grandTotal = calculateGrandTotals();

    if (grandTotal === 0) {
      showToast('Validation Warning', 'Please enter laundry items for at least one student.', 'warning');
      return;
    }

    const timestamp = new Date();
    const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = timestamp.toLocaleDateString();

    const sumPant = sumPantEl.textContent || 0;
    const sumShirt = sumShirtEl.textContent || 0;
    const sumTshirt = sumTshirtEl.textContent || 0;
    const sumTrack = sumTrackEl.textContent || 0;
    const sumTowel = sumTowelEl.textContent || 0;

    // Construct WhatsApp message with Laundry Totals
    const waMsg = 
`🧺 *HOSTEL LAUNDRY TOTAL*
📅 *Date & Time:* ${dateStr}, ${timeStr}
----------------------------------
👖 *Pants:* ${sumPant}
👕 *Shirts:* ${sumShirt}
👕 *T-Shirts:* ${sumTshirt}
🩳 *Tracks:* ${sumTrack}
🧣 *Towels:* ${sumTowel}
----------------------------------
🔢 *GRAND TOTAL:* ${grandTotal} Clothes`;

    // Show Success Toast Message
    showToast('Sent Successfully! 🚀', `Opening WhatsApp...`, 'success');

    // Display Status Message Below Button
    if (sendAllStatusEl) {
      sendAllStatusEl.innerHTML = `<span class="sent-status-badge">✓ Submitted & Opening WhatsApp (${grandTotal} items)</span>`;
    }

    // Open WhatsApp directly
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(waMsg)}`;
    window.open(waUrl, '_blank');
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
        toast.style.transform = 'translateY(-20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }
    }, 4000);
  }

  // Event Listeners
  if (sendAllBtn) {
    sendAllBtn.addEventListener('click', handleSendAll);
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', resetTable);
  }

  // Initialize Table
  initTable();
});
