/**
 * Hostel Laundry Management System
 * Core Application Logic - Single Submit All
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const studentTableBody = document.getElementById('student-table-body');
  const currentDateEl = document.getElementById('current-date');
  const toastContainer = document.getElementById('toast-container');
  const sendAllBtn = document.getElementById('send-all-btn');
  const sendAllStatusEl = document.getElementById('send-all-status');

  // Total Row Elements
  const sumPantEl = document.getElementById('sum-pant');
  const sumShirtEl = document.getElementById('sum-shirt');
  const sumTshirtEl = document.getElementById('sum-tshirt');
  const sumTrackEl = document.getElementById('sum-track');
  const sumTowelEl = document.getElementById('sum-towel');
  const sumGrandTotalEl = document.getElementById('sum-grand-total');

  // Exactly 5 students as requested
  const students = ['Ronit', 'Raj', 'Harsh', 'Preet', 'Meet'];

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

    // Initial Grand Totals Calculation
    calculateGrandTotals();
  }

  /**
   * Add a student row to the table (no row-level Send button)
   * @param {string} studentName 
   * @param {number} index 
   */
  function addStudentRow(studentName, index) {
    const rowId = `row-${index}`;
    const tr = document.createElement('tr');
    tr.id = rowId;
    tr.dataset.studentIndex = index;

    const pantVal = '';
    const shirtVal = '';
    const tshirtVal = '';
    const trackVal = '';
    const towelVal = '';

    tr.innerHTML = `
      <td class="col-name">
        <input type="text" class="name-input" value="${studentName}" placeholder="Enter Name" data-field="name">
      </td>
      <td class="col-item">
        <input type="number" min="0" class="qty-input" value="${pantVal}" placeholder="0" data-field="pant">
      </td>
      <td class="col-item">
        <input type="number" min="0" class="qty-input" value="${shirtVal}" placeholder="0" data-field="shirt">
      </td>
      <td class="col-item">
        <input type="number" min="0" class="qty-input" value="${tshirtVal}" placeholder="0" data-field="tshirt">
      </td>
      <td class="col-item">
        <input type="number" min="0" class="qty-input" value="${trackVal}" placeholder="0" data-field="track">
      </td>
      <td class="col-item">
        <input type="number" min="0" class="qty-input" value="${towelVal}" placeholder="0" data-field="towel">
      </td>
      <td class="col-total">
        <span class="total-badge" id="total-${rowId}">0</span>
      </td>
    `;

    studentTableBody.appendChild(tr);

    // Attach Event Listeners for inputs
    const qtyInputs = tr.querySelectorAll('.qty-input');
    qtyInputs.forEach(input => {
      input.addEventListener('input', () => {
        calculateRowTotal(rowId);
        calculateGrandTotals();
      });
      input.addEventListener('focus', function() { this.select(); });
    });

    const nameInput = tr.querySelector('.name-input');
    nameInput.addEventListener('input', () => {
      calculateGrandTotals();
    });

    // Initial calculation for this row
    calculateRowTotal(rowId);
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
   * Calculate Column Totals & Grand Total for the TOTAL Row
   * @returns {number} grandTotal
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
   * Single Submit All Laundry Function - Opens https://www.patelsamajnikol.org/
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
    showToast('Sent Successfully! 🚀', `Laundry recorded! Opening Patel Samaj Nikol site...`, 'success');

    // Display Status Message Below Button
    if (sendAllStatusEl) {
      sendAllStatusEl.innerHTML = `<span class="sent-status-badge">✓ Submitted All Laundry at ${timeStr} (${grandTotal} items)</span>`;
    }

    // Open https://www.patelsamajnikol.org/ directly
    window.open('https://www.patelsamajnikol.org/', '_blank');
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
