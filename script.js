/**
 * Hostel Laundry Management System
 * Shared Real-Time Multi-Device Sync & Per-Row Save
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const studentTableBody = document.getElementById('student-table-body');
  const currentDateEl = document.getElementById('current-date');
  const toastContainer = document.getElementById('toast-container');
  const sendAllBtn = document.getElementById('send-all-btn');
  const sendAllStatusEl = document.getElementById('send-all-status');
  const resetBtn = document.getElementById('reset-btn');
  const syncStatusEl = document.getElementById('sync-status');

  // Total Row Elements
  const sumPantEl = document.getElementById('sum-pant');
  const sumShirtEl = document.getElementById('sum-shirt');
  const sumTshirtEl = document.getElementById('sum-tshirt');
  const sumTrackEl = document.getElementById('sum-track');
  const sumTowelEl = document.getElementById('sum-towel');
  const sumGrandTotalEl = document.getElementById('sum-grand-total');

  // Exactly 5 students
  const students = ['Ronit', 'Raj', 'Harsh', 'Preet', 'Meet'];

  // Track active focus to prevent overwriting field while user is typing
  let activeInputElement = null;

  // Display Current Date
  const today = new Date();
  const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
  currentDateEl.textContent = today.toLocaleDateString('en-US', options);

  // Initialize Default Table
  function initTable() {
    studentTableBody.innerHTML = '';
    students.forEach((name, index) => {
      addStudentRow(name, index);
    });

    calculateGrandTotals();
    fetchSharedData();

    // Start Real-Time Live Sync Polling (Every 3 seconds)
    setInterval(fetchSharedData, 3000);
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
    tr.dataset.studentName = studentName;
    tr.dataset.rowIndex = index;

    tr.innerHTML = `
      <td class="col-name">
        <input type="text" class="name-input" value="${studentName}" placeholder="Name" data-field="name">
      </td>
      <td class="col-item">
        <input type="number" inputmode="numeric" pattern="[0-9]*" min="0" class="qty-input" value="" placeholder="0" data-field="pant" data-col="0">
      </td>
      <td class="col-item">
        <input type="number" inputmode="numeric" pattern="[0-9]*" min="0" class="qty-input" value="" placeholder="0" data-field="shirt" data-col="1">
      </td>
      <td class="col-item">
        <input type="number" inputmode="numeric" pattern="[0-9]*" min="0" class="qty-input" value="" placeholder="0" data-field="tshirt" data-col="2">
      </td>
      <td class="col-item">
        <input type="number" inputmode="numeric" pattern="[0-9]*" min="0" class="qty-input" value="" placeholder="0" data-field="track" data-col="3">
      </td>
      <td class="col-item">
        <input type="number" inputmode="numeric" pattern="[0-9]*" min="0" class="qty-input" value="" placeholder="0" data-field="towel" data-col="4">
      </td>
      <td class="col-total">
        <span class="total-badge" id="total-${rowId}">0</span>
      </td>
      <td class="col-save">
        <button type="button" class="btn-save-row" data-student="${studentName}" data-row-id="${rowId}">💾 Save</button>
        <div class="save-status-box" id="save-status-${rowId}"></div>
      </td>
    `;

    studentTableBody.appendChild(tr);

    // Input Events & Phone Touch Selection
    const qtyInputs = tr.querySelectorAll('.qty-input');
    qtyInputs.forEach(input => {
      input.addEventListener('input', () => {
        calculateRowTotal(rowId);
        calculateGrandTotals();
      });

      input.addEventListener('focus', function() {
        activeInputElement = this;
        this.select();
      });

      input.addEventListener('blur', function() {
        if (activeInputElement === this) {
          activeInputElement = null;
        }
      });

      input.addEventListener('touchstart', function() {
        setTimeout(() => this.select(), 50);
      });

      input.addEventListener('keydown', (e) => {
        handleKeyboardNav(e, index, parseInt(input.dataset.col));
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

    // Update Status Badge locally right away
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
      // Fallback local storage
      const localData = JSON.parse(localStorage.getItem('shared_laundry_data') || '{}');
      localData[studentName] = payload;
      localStorage.setItem('shared_laundry_data', JSON.stringify(localData));
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
      // Fallback local storage sync
      const localData = JSON.parse(localStorage.getItem('shared_laundry_data') || '{}');
      applySharedData(localData);
    }
  }

  /**
   * Apply shared data to table rows
   */
  function applySharedData(data) {
    if (!data) return;

    students.forEach((name, idx) => {
      const studentData = data[name];
      if (!studentData) return;

      const rowId = `row-${idx}`;
      const row = document.getElementById(rowId);
      if (!row) return;

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
      if (statusBox && studentData.saved) {
        const total = (studentData.pant || 0) + (studentData.shirt || 0) + (studentData.tshirt || 0) + (studentData.track || 0) + (studentData.towel || 0);
        statusBox.innerHTML = `<span class="saved-badge">✓ Saved ${studentData.savedAt ? '(' + studentData.savedAt + ')' : ''}</span>`;
      }
    });

    calculateGrandTotals();
  }

  /**
   * Reset Table Data
   */
  async function resetTable() {
    if (!confirm('Are you sure you want to reset all laundry data for a new day?')) return;

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
Mer: *Towels:* ${sumTowel}
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
