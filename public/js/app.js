// FiNote Frontend Application Logic
// State
const state = {
  currentUser: null,
  activeView: 'dashboard', // 'dashboard' | 'transactions' | 'profile' | 'reports'
  currentMonth: '2026-10',
  currentTypeFilter: 'expense', // 'expense' | 'income' | 'all'
  currentSort: 'desc', // 'desc' (Cao -> Thấp) | 'asc' (Thấp -> Cao)
  searchQuery: '',
  categories: [],
  catFilter: 'all', // 'all' | 'expense' | 'income'
  selectedCatIcon: 'cart',
  selectedCatColor: '#3b82f6',
  deleteCatTargetId: null,
  dashboardChart: null,
  reportsChart: null,
  deleteTargetId: null,
  editTargetId: null
};

// Exchange rates relative to base VND
const EXCHANGE_RATES = {
  'VND': 1,
  'USD': 25000,
  'EUR': 27000
};

function getCurrency() {
  return (state.currentUser && state.currentUser.currency) ? state.currentUser.currency : 'VND';
}

// Formatting helpers
function formatMoney(amountVnd, overrideCurrency = null) {
  if (amountVnd === undefined || amountVnd === null || isNaN(amountVnd)) {
    const curr = overrideCurrency || getCurrency();
    return curr === 'USD' ? '$0' : (curr === 'EUR' ? '€0' : '0đ');
  }

  const curr = overrideCurrency || getCurrency();
  const rate = EXCHANGE_RATES[curr] || 1;
  const converted = amountVnd / rate;

  if (curr === 'USD') {
    // USD format: $125 or $125.50
    const formatted = converted.toLocaleString('en-US', {
      minimumFractionDigits: (converted % 1 !== 0 ? 2 : 0),
      maximumFractionDigits: 2
    });
    return '$' + formatted;
  } else if (curr === 'EUR') {
    // EUR format: €125 or €125.50
    const formatted = converted.toLocaleString('de-DE', {
      minimumFractionDigits: (converted % 1 !== 0 ? 2 : 0),
      maximumFractionDigits: 2
    });
    return '€' + formatted;
  } else {
    // VND format: 5.000.000đ
    const rounded = Math.round(converted);
    return rounded.toLocaleString('vi-VN') + 'đ';
  }
}

function updateModalCurrencyLabel() {
  const curr = getCurrency();
  const label = document.getElementById('txModalAmountLabel');
  const input = document.getElementById('txModalAmount');
  if (label) {
    if (curr === 'USD') {
      label.textContent = 'Số tiền (USD - $)';
      if (input) input.placeholder = 'Ví dụ: 10 hoặc 25.5';
    } else if (curr === 'EUR') {
      label.textContent = 'Số tiền (EUR - €)';
      if (input) input.placeholder = 'Ví dụ: 10 hoặc 20';
    } else {
      label.textContent = 'Số tiền (VNĐ)';
      if (input) input.placeholder = 'Ví dụ: 125000';
    }
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

const ICON_IMG_MAP = {
  'cutlery': { img: 'icons FiNote/cutlery.png', emoji: '🍽️' },
  'vehicles': { img: 'icons FiNote/vehicles.png', emoji: '🚗' },
  'car': { img: 'icons FiNote/vehicles.png', emoji: '🚗' },
  'cart': { img: 'icons FiNote/cart.png', emoji: '🛒' },
  'wage': { img: 'icons FiNote/wage.png', emoji: '💰' },
  'wallet': { img: 'icons FiNote/wallet.png', emoji: '💰' },
  'building': { img: 'icons FiNote/building.png', emoji: '🏠' },
  'home': { img: 'icons FiNote/building.png', emoji: '🏠' },
  'growth-graph': { img: 'icons FiNote/growth-graph.png', emoji: '📈' },
  'chart': { img: 'icons FiNote/growth-graph.png', emoji: '📈' },
  'gift': { img: 'icons FiNote/wage.png', emoji: '🎁' },
  'film': { emoji: '🎮' },
  'receipt': { emoji: '📄' },
  'tag': { emoji: '🏷️' }
};

const COLOR_MAP = {
  '#f97316': 'orange',
  '#eab308': 'yellow',
  '#3b82f6': 'blue',
  '#8b5cf6': 'purple',
  '#10b981': 'green',
  '#ec4899': 'pink',
  '#64748b': 'slate',
  '#06b6d4': 'blue',
  '#94a3b8': 'slate',
  '#ef4444': 'pink'
};

function getCategoryMeta(catName) {
  // Check if categories are loaded dynamically in state
  if (state && state.categories && state.categories.length > 0) {
    const found = state.categories.find(c => c.name.toLowerCase() === (catName || '').toLowerCase());
    if (found) {
      let iconHtml = '';
      let emoji = '🏷️';
      if (ICON_IMG_MAP[found.icon]) {
        if (ICON_IMG_MAP[found.icon].img) {
          iconHtml = `<img src="${ICON_IMG_MAP[found.icon].img}" style="width: 20px; height: 20px; object-fit: contain;">`;
        } else {
          iconHtml = `<span style="font-size: 18px; line-height: 1;">${ICON_IMG_MAP[found.icon].emoji}</span>`;
        }
        emoji = ICON_IMG_MAP[found.icon].emoji;
      } else if (found.icon && (found.icon.startsWith('http') || found.icon.includes('/') || found.icon.endsWith('.png'))) {
        iconHtml = `<img src="${found.icon}" style="width: 20px; height: 20px; object-fit: contain;">`;
      } else if (found.icon) {
        emoji = found.icon;
        iconHtml = `<span style="font-size: 18px; line-height: 1;">${found.icon}</span>`;
      } else {
        iconHtml = '<img src="icons FiNote/cart.png" style="width: 20px; height: 20px; object-fit: contain;">';
      }

      const colorClass = COLOR_MAP[found.color] || 'blue';
      const avatarStyle = (!COLOR_MAP[found.color] && found.color) ? `background-color: ${found.color}25; color: ${found.color};` : '';

      return {
        icon: iconHtml,
        emoji,
        colorClass,
        avatarStyle,
        colorHex: found.color,
        type: found.type
      };
    }
  }

  // Fallback defaults
  const map = {
    'Ăn uống': { icon: '<img src="icons FiNote/cutlery.png" style="width: 20px; height: 20px; object-fit: contain;">', emoji: '🍽️', colorClass: 'orange', type: 'expense' },
    'Phương tiện': { icon: '<img src="icons FiNote/vehicles.png" style="width: 20px; height: 20px; object-fit: contain;">', emoji: '🚗', colorClass: 'yellow', type: 'expense' },
    'Mua sắm': { icon: '<img src="icons FiNote/cart.png" style="width: 20px; height: 20px; object-fit: contain;">', emoji: '🛒', colorClass: 'blue', type: 'expense' },
    'Lương': { icon: '<img src="icons FiNote/wage.png" style="width: 20px; height: 20px; object-fit: contain;">', emoji: '💰', colorClass: 'purple', type: 'income' },
    'Thưởng': { icon: '<img src="icons FiNote/wage.png" style="width: 20px; height: 20px; object-fit: contain;">', emoji: '🎁', colorClass: 'green', type: 'income' },
    'Nhà ở': { icon: '<img src="icons FiNote/building.png" style="width: 20px; height: 20px; object-fit: contain;">', emoji: '🏠', colorClass: 'pink', type: 'expense' },
    'Giải trí': { icon: '<img src="icons FiNote/cart.png" style="width: 20px; height: 20px; object-fit: contain;">', emoji: '🎮', colorClass: 'blue', type: 'expense' },
    'Hóa đơn': { icon: '<img src="icons FiNote/building.png" style="width: 20px; height: 20px; object-fit: contain;">', emoji: '📄', colorClass: 'slate', type: 'expense' }
  };
  return map[catName] || { icon: '<img src="icons FiNote/cart.png" style="width: 20px; height: 20px; object-fit: contain;">', emoji: '📁', colorClass: 'slate', type: 'expense' };
}

// Toast notification helper
function showToast(message, isError = false) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast-custom';
  if (isError) {
    toast.style.background = '#dc2626';
  }
  toast.innerHTML = `<span>${isError ? '⚠️' : '✓'}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// API Base URL (hỗ trợ mở trực tiếp file:/// hoặc qua bất kỳ tên miền nào)
const API_BASE = (window.location.protocol === 'file:') ? 'http://localhost:3000' : '';


// API request helper with active user header
async function apiRequest(url, options = {}) {
  const headers = options.headers || {};
  const activeUserId = (state.currentUser && state.currentUser.id) 
    ? state.currentUser.id 
    : sessionStorage.getItem('finote_user_id');

  if (activeUserId) {
    headers['x-user-id'] = activeUserId;
  }
  options.headers = {
    'Content-Type': 'application/json',
    ...headers
  };
  const fullUrl = url.startsWith('http') ? url : (API_BASE + url);
  try {
    const res = await fetch(fullUrl, options);
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401 && !url.includes('/api/auth/login')) {
        state.currentUser = null;
        sessionStorage.removeItem('finote_user_id');
        showAuthScreen();
      }
      throw new Error(data.error || 'Có lỗi xảy ra');
    }
    return data;
  } catch (err) {
    if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
      throw new Error('Chưa kết nối được máy chủ. Bạn hãy mở bằng địa chỉ: http://localhost:3000');
    }
    throw err;
  }
}

// ================= THEME (LIGHT / DARK MODE) =================
function initTheme() {
  const saved = localStorage.getItem('finote_theme') || 'light';
  applyTheme(saved, false);
}

function applyTheme(theme, notify = true) {
  const isDark = theme === 'dark';
  if (isDark) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
  localStorage.setItem('finote_theme', theme);

  // Update Settings Theme Option Cards
  const cardLight = document.getElementById('themeOptionLight');
  const cardDark = document.getElementById('themeOptionDark');
  if (cardLight && cardDark) {
    if (isDark) {
      cardDark.classList.add('active');
      cardLight.classList.remove('active');
    } else {
      cardLight.classList.add('active');
      cardDark.classList.remove('active');
    }
  }

  // Update Header Theme Toggle Button
  const btnHeaderTheme = document.getElementById('btnHeaderThemeToggle');
  if (btnHeaderTheme) {
    btnHeaderTheme.textContent = isDark ? '☀️' : '🌙';
    btnHeaderTheme.title = isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối';
  }

  // Update Chart Theme colors
  if (state.dashboardChart) {
    updateChartTheme(state.dashboardChart, isDark);
  }
  if (state.reportsChart) {
    updateChartTheme(state.reportsChart, isDark);
  }

  if (notify) {
    showToast(`Đã chuyển sang ${isDark ? 'Giao diện tối (Dark Mode)' : 'Giao diện sáng (Light Mode)'}`);
  }
}

function updateChartTheme(chart, isDark) {
  if (!chart || !chart.options || !chart.options.scales) return;
  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const tickColor = isDark ? '#94a3b8' : '#64748b';
  if (chart.options.scales.y) {
    chart.options.scales.y.grid.color = gridColor;
    chart.options.scales.y.ticks.color = tickColor;
  }
  if (chart.options.scales.x) {
    chart.options.scales.x.ticks.color = tickColor;
  }
  chart.update();
}

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  setupEventListeners();
  initCatPickers();

  // Kiểm tra phiên đăng nhập đã lưu trong tab trình duyệt
  const savedUserId = sessionStorage.getItem('finote_user_id');
  if (savedUserId) {
    try {
      const data = await apiRequest('/api/auth/me');
      state.currentUser = data.user;
      updateUserBadge();
      await loadCategories();
      showAppScreen();
      switchView('dashboard');
      return;
    } catch (e) {
      sessionStorage.removeItem('finote_user_id');
    }
  }

  // Mặc định luôn ở màn hình Đăng nhập khi người dùng mới truy cập link web
  state.currentUser = null;
  showAuthScreen();
});

// View switching
function showAuthScreen() {
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('appScreen').style.display = 'none';
}

function showAppScreen() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appScreen').style.display = 'flex';
}

function switchView(viewName) {
  state.activeView = viewName;

  // Update sidebar active button
  document.querySelectorAll('.sidebar-nav-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.view === viewName) {
      btn.classList.add('active');
    }
  });

  // Hide all view containers
  document.getElementById('viewDashboard').style.display = 'none';
  document.getElementById('viewTransactions').style.display = 'none';
  document.getElementById('viewProfile').style.display = 'none';
  document.getElementById('viewReports').style.display = 'none';

  // Show selected view
  if (viewName === 'dashboard') {
    document.getElementById('viewDashboard').style.display = 'block';
    renderDashboard();
  } else if (viewName === 'transactions') {
    document.getElementById('viewTransactions').style.display = 'block';
    renderTransactions();
  } else if (viewName === 'profile') {
    document.getElementById('viewProfile').style.display = 'block';
    renderProfile();
  } else if (viewName === 'reports') {
    document.getElementById('viewReports').style.display = 'block';
    renderReports();
  }
}

// Update User UI Badge
function updateUserBadge() {
  if (!state.currentUser) return;
  const nameEls = document.querySelectorAll('.user-name-text');
  nameEls.forEach(el => el.textContent = state.currentUser.name || 'User');
}

// Load Categories
async function loadCategories() {
  try {
    const data = await apiRequest('/api/categories');
    state.categories = data.categories;
    populateCategoryDropdown();
  } catch (err) {
    console.error('Error loading categories:', err);
  }
}

function populateCategoryDropdown(selectedCat = null) {
  const select = document.getElementById('txModalCategory');
  if (!select) return;
  select.innerHTML = '';
  state.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.name;
    const meta = getCategoryMeta(cat.name);
    opt.textContent = `${meta.emoji}  ${cat.name}`;
    if (selectedCat && selectedCat === cat.name) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
  updateCategoryIconPreview();
}

function updateCategoryIconPreview() {
  const select = document.getElementById('txModalCategory');
  const preview = document.getElementById('selectedCategoryIconPreview');
  if (select && preview) {
    const meta = getCategoryMeta(select.value);
    preview.innerHTML = meta.icon;
  }
}

// ================= RENDER DASHBOARD (FIGMA IMAGE 2 TOP-LEFT) =================
async function renderDashboard() {
  try {
    const data = await apiRequest(`/api/dashboard/summary?month=${state.currentMonth}`);

    // Update 3 Top KPI Cards
    document.getElementById('kpiCurrentBalance').textContent = formatMoney(data.currentBalance);
    document.getElementById('kpiMonthIncome').textContent = formatMoney(data.monthIncome);
    document.getElementById('kpiMonthExpense').textContent = formatMoney(data.monthExpense);

    // Render Recent Cash Flow List
    const cashflowList = document.getElementById('dashboardRecentCashflow');
    cashflowList.innerHTML = '';

    if (data.recentTransactions.length === 0) {
      cashflowList.innerHTML = '<p class="text-muted" style="text-align: center; padding: 20px;">Chưa có giao dịch gần đây</p>';
    } else {
      data.recentTransactions.forEach(tx => {
        const meta = getCategoryMeta(tx.category_name);
        const isExp = tx.type === 'expense';
        const sign = isExp ? '-' : '+';
        const colorClass = isExp ? 'negative' : 'positive';

        const row = document.createElement('div');
        row.className = 'cashflow-item';
        row.innerHTML = `
          <div class="cashflow-item-left">
            <div class="cat-avatar ${meta.colorClass}">
              ${meta.icon}
            </div>
            <div class="cashflow-info">
              <span class="cashflow-name">${tx.category_name}</span>
              <span class="cashflow-date">${formatDateDisplay(tx.date)}</span>
            </div>
          </div>
          <div class="cashflow-amount ${colorClass}">
            ${sign}${formatMoney(tx.amount)}
          </div>
        `;
        cashflowList.appendChild(row);
      });
    }

    // Render "Tổng quan thu - chi" Bar Chart with Chart.js
    renderDashboardChart(data.chartData);

  } catch (err) {
    showToast('Lỗi tải dữ liệu Dashboard: ' + err.message, true);
  }
}

function renderDashboardChart(chartData) {
  const canvas = document.getElementById('dashOverviewChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (state.dashboardChart) {
    state.dashboardChart.destroy();
  }

  const isDark = document.body.classList.contains('dark-mode');
  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const tickColor = isDark ? '#94a3b8' : '#64748b';

  const curr = getCurrency();
  const rate = EXCHANGE_RATES[curr] || 1;

  // Exact visual replica of Figma: cyan/teal vertical bars, clear grid
  state.dashboardChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartData.labels,
      datasets: [{
        label: 'Chi tiêu',
        data: chartData.fullValues.map(v => {
          const val = v / rate;
          return (curr === 'USD' || curr === 'EUR') ? Math.round(val * 10) / 10 : Math.round(val / 1000000 * 10) / 10;
        }),
        backgroundColor: '#40c4d8',
        borderRadius: 4,
        barThickness: 32
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const fullVal = chartData.fullValues[context.dataIndex];
              return ' Chi tiêu: ' + formatMoney(fullVal);
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: gridColor
          },
          ticks: {
            color: tickColor,
            font: { size: 12 }
          }
        },
        x: {
          grid: { display: false },
          ticks: {
            color: tickColor,
            font: { size: 12 }
          }
        }
      }
    }
  });
}

// ================= RENDER TRANSACTIONS (FIGMA IMAGE 2 TOP-RIGHT) =================
async function renderTransactions() {
  try {
    const params = new URLSearchParams({
      month: state.currentMonth,
      type: state.currentTypeFilter,
      sort: state.currentSort,
      search: state.searchQuery
    });

    const data = await apiRequest(`/api/transactions?${params.toString()}`);
    const container = document.getElementById('transactionsGroupContainer');
    container.innerHTML = '';

    // Update month text display
    const parts = state.currentMonth.split('-');
    document.getElementById('currentMonthDisplay').textContent = `Tháng ${parts[1]}/${parts[0]}`;
    document.getElementById('txListMonthTitle').textContent = `Danh sách giao dịch tháng ${parseInt(parts[1], 10)}`;

    if (!data.grouped || data.grouped.length === 0) {
      container.innerHTML = '<p class="text-muted" style="text-align:center; padding: 40px;">Không có giao dịch nào phù hợp.</p>';
      return;
    }

    // Render grouped categories
    data.grouped.forEach(group => {
      const meta = getCategoryMeta(group.categoryName);
      const isExp = group.type === 'expense';
      const block = document.createElement('div');
      block.className = 'category-group-block';

      let rowsHtml = '';
      group.items.forEach(item => {
        const itemExp = item.type === 'expense';
        const sign = itemExp ? '-' : '+';
        const amountColor = itemExp ? 'color: var(--color-red);' : 'color: var(--color-green);';

        rowsHtml += `
          <tr data-id="${item.id}">
            <td class="col-cat">
              <div class="col-icon-name">
                <div class="cat-avatar ${meta.colorClass}" style="${meta.avatarStyle || ''} width:34px; height:34px; font-size:16px;">
                  ${meta.icon}
                </div>
                <span title="${escapeHtml(item.category_name)}">${escapeHtml(item.category_name)}</span>
              </div>
            </td>
            <td class="col-date">${formatDateDisplay(item.date)}</td>
            <td class="col-desc" title="${escapeHtml(item.description)}">${escapeHtml(item.description)}</td>
            <td class="col-amount" style="${amountColor}">${sign}${formatMoney(item.amount)}</td>
            <td class="col-actions">
              <button class="btn-action-icon btn-edit" onclick="handleEditTransaction(${item.id})" title="Sửa">
                <img src="icons FiNote/edit.png" alt="Sửa" style="width: 15px; height: 15px; object-fit: contain;">
              </button>
              <button class="btn-action-icon btn-delete" onclick="handleOpenDeleteModal(${item.id})" title="Xóa">
                <img src="icons FiNote/delete.png" alt="Xóa" style="width: 15px; height: 15px; object-fit: contain;">
              </button>
            </td>
          </tr>
        `;
      });

      block.innerHTML = `
        <div class="category-group-header">
          <span>${meta.icon} ${escapeHtml(group.categoryName)}</span>
          <span>Tổng: ${formatMoney(group.totalAmount)}</span>
        </div>
        <table class="tx-table-custom">
          <colgroup>
            <col style="width: 220px;">
            <col style="width: 130px;">
            <col>
            <col style="width: 170px;">
            <col style="width: 90px;">
          </colgroup>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `;

      container.appendChild(block);
    });

  } catch (err) {
    showToast('Lỗi tải danh sách giao dịch: ' + err.message, true);
  }
}

// ================= RENDER PROFILE & SETTINGS (FIGMA IMAGE 2 BOTTOM-RIGHT) =================
async function renderProfile() {
  if (!state.currentUser) return;
  document.getElementById('profileNameInput').value = state.currentUser.name || '';
  document.getElementById('profileEmailInput').value = state.currentUser.email || '';
  document.getElementById('profilePhoneInput').value = state.currentUser.phone || '';
  const curr = state.currentUser.currency || 'VND';
  const rate = EXCHANGE_RATES[curr] || 1;
  const rawBudget = state.currentUser.monthly_budget || 5000000;
  const displayBudget = (curr === 'USD' || curr === 'EUR') ? Math.round(rawBudget / rate) : rawBudget;
  document.getElementById('settingsBudgetInput').value = displayBudget;
  document.getElementById('settingsCurrencySelect').value = curr;

  // Đồng bộ trạng thái thẻ theme
  const isDark = document.body.classList.contains('dark-mode');
  const cardLight = document.getElementById('themeOptionLight');
  const cardDark = document.getElementById('themeOptionDark');
  if (cardLight && cardDark) {
    if (isDark) {
      cardDark.classList.add('active');
      cardLight.classList.remove('active');
    } else {
      cardLight.classList.add('active');
      cardDark.classList.remove('active');
    }
  }
}

// ================= RENDER REPORTS (THỐNG KÊ CHI TIÊU & SAI LỆCH THÁNG) =================
async function renderReports() {
  try {
    const data = await apiRequest('/api/reports/variance');
    const stats = data.stats;
    const tableBody = document.getElementById('varianceTableBody');
    tableBody.innerHTML = '';

    const labels = [];
    const expenses = [];
    const deltas = [];

    stats.forEach(item => {
      labels.push('Tháng ' + item.month.split('-')[1]);
      expenses.push(item.totalExpense);
      deltas.push(item.percentExpense);

      const tr = document.createElement('tr');
      const isIncreased = item.deltaExpense > 0;
      const deltaColor = isIncreased ? '#ef4444' : '#22c55e';
      const arrow = isIncreased ? '↑' : (item.deltaExpense < 0 ? '↓' : '-');

      tr.innerHTML = `
        <td><strong>Tháng ${item.month.split('-')[1]}</strong> (${item.month})</td>
        <td>${formatMoney(item.totalIncome)}</td>
        <td><strong>${formatMoney(item.totalExpense)}</strong></td>
        <td style="color: ${deltaColor}; font-weight: 700;">
          ${arrow} ${formatMoney(Math.abs(item.deltaExpense))} (${item.percentExpense}%)
        </td>
      `;
      tableBody.appendChild(tr);
    });

    // Render variance comparison chart
    const canvas = document.getElementById('varianceReportChart');
    if (canvas) {
      if (state.reportsChart) state.reportsChart.destroy();
      const isDark = document.body.classList.contains('dark-mode');
      const gridColor = isDark ? '#334155' : '#e2e8f0';
      const tickColor = isDark ? '#94a3b8' : '#64748b';

      const curr = getCurrency();
      const rate = EXCHANGE_RATES[curr] || 1;

      state.reportsChart = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Tổng chi tiêu',
            data: expenses.map(v => Math.round((v / rate) * 10) / 10),
            backgroundColor: '#40c4d8',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ' ' + formatMoney(ctx.raw)
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: gridColor },
              ticks: { color: tickColor, font: { size: 12 } }
            },
            x: {
              grid: { display: false },
              ticks: { color: tickColor, font: { size: 12 } }
            }
          }
        }
      });
    }

    // Load AI anomalies
    const anomaliesData = await apiRequest('/api/ai/anomalies');
    const anomalyBox = document.getElementById('anomalyNoticeBox');
    if (anomaliesData.anomalies && anomaliesData.anomalies.length > 0) {
      anomalyBox.style.display = 'block';
      let listHtml = '<ul>';
      anomaliesData.anomalies.forEach(a => {
        listHtml += `<li>Khoản chi <strong>${a.description}</strong> (${formatMoney(a.amount)}) ngày ${formatDateDisplay(a.date)} cao hơn ${a.spikeRatio}% so với mức trung bình của nhóm ${a.category_name}.</li>`;
      });
      listHtml += '</ul>';
      document.getElementById('anomalyListContent').innerHTML = listHtml;
    } else {
      anomalyBox.style.display = 'none';
    }

  } catch (err) {
    showToast('Lỗi tải báo cáo: ' + err.message, true);
  }
}

// ================= MODAL THÊM / SỬA GIAO DỊCH =================
let modalActiveType = 'expense';

function openAddTransactionModal() {
  state.editTargetId = null;
  document.getElementById('txModalTitle').textContent = 'Thêm giao dịch mới';
  document.getElementById('txModalSubmitBtn').textContent = 'Lưu giao dịch';

  // Default values
  setModalType('expense');
  document.getElementById('txModalAmount').value = '';
  document.getElementById('txModalDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('txModalDesc').value = '';
  document.getElementById('txModalNote').value = '';
  document.getElementById('aiSuggestChip').style.display = 'none';

  updateModalCurrencyLabel();
  populateCategoryDropdown();
  document.getElementById('addTransactionModal').classList.add('show');
}

function setModalType(type) {
  modalActiveType = type;
  const btnExp = document.getElementById('btnTypeExpense');
  const btnInc = document.getElementById('btnTypeIncome');

  if (type === 'expense') {
    btnExp.classList.add('active');
    btnInc.classList.remove('active');
  } else {
    btnInc.classList.add('active');
    btnExp.classList.remove('active');
  }
}

async function handleEditTransaction(id) {
  try {
    const data = await apiRequest(`/api/transactions/${id}`);
    const tx = data.transaction;
    state.editTargetId = id;

    document.getElementById('txModalTitle').textContent = 'Chỉnh sửa giao dịch';
    document.getElementById('txModalSubmitBtn').textContent = 'Cập nhật giao dịch';

    setModalType(tx.type);
    const curr = getCurrency();
    const rate = EXCHANGE_RATES[curr] || 1;
    const displayAmount = (curr === 'USD' || curr === 'EUR')
      ? Math.round((tx.amount / rate) * 100) / 100
      : tx.amount;
    document.getElementById('txModalAmount').value = displayAmount;
    document.getElementById('txModalDate').value = tx.date;
    document.getElementById('txModalDesc').value = tx.description;
    document.getElementById('txModalNote').value = tx.note || '';

    updateModalCurrencyLabel();
    populateCategoryDropdown(tx.category_name);
    document.getElementById('aiSuggestChip').style.display = 'none';
    document.getElementById('addTransactionModal').classList.add('show');
  } catch (err) {
    showToast('Lỗi khi mở giao dịch: ' + err.message, true);
  }
}

// AI Auto Categorization Listener
let typingTimeout = null;
function handleDescriptionInput() {
  clearTimeout(typingTimeout);
  const text = document.getElementById('txModalDesc').value.trim();
  const chip = document.getElementById('aiSuggestChip');

  if (text.length < 2) {
    chip.style.display = 'none';
    return;
  }

  typingTimeout = setTimeout(async () => {
    try {
      const res = await apiRequest(`/api/ai/classify?description=${encodeURIComponent(text)}`);
      if (res.result) {
        chip.style.display = 'inline-flex';
        chip.innerHTML = `✨ Gợi ý AI: <strong>${res.result.category}</strong> (${res.result.confidence}% độ tin cậy)`;
        chip.dataset.suggestedCategory = res.result.category;
      } else {
        chip.style.display = 'none';
      }
    } catch (e) {
      chip.style.display = 'none';
    }
  }, 300);
}

function applyAiSuggestion() {
  const chip = document.getElementById('aiSuggestChip');
  const cat = chip.dataset.suggestedCategory;
  if (cat) {
    document.getElementById('txModalCategory').value = cat;
    updateCategoryIconPreview();
    showToast(`Đã áp dụng danh mục AI: ${cat}`);
    chip.style.display = 'none';
  }
}

// Save Transaction
async function handleSaveTransaction() {
  const inputAmount = parseFloat(document.getElementById('txModalAmount').value);
  const date = document.getElementById('txModalDate').value;
  const category_name = document.getElementById('txModalCategory').value;
  const description = document.getElementById('txModalDesc').value.trim();
  const note = document.getElementById('txModalNote').value.trim();

  if (!inputAmount || isNaN(inputAmount) || inputAmount <= 0) {
    showToast('Vui lòng nhập số tiền hợp lệ.', true);
    return;
  }
  if (!date) {
    showToast('Vui lòng chọn ngày giao dịch.', true);
    return;
  }
  if (!description) {
    showToast('Vui lòng nhập mô tả / ghi chú.', true);
    return;
  }

  const curr = getCurrency();
  const rate = EXCHANGE_RATES[curr] || 1;
  const amount = (curr === 'USD' || curr === 'EUR') ? Math.round(inputAmount * rate) : Math.round(inputAmount);

  const payload = {
    type: modalActiveType,
    amount,
    date,
    category_name,
    description,
    note
  };

  try {
    if (state.editTargetId) {
      await apiRequest(`/api/transactions/${state.editTargetId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast('Cập nhật giao dịch thành công!');
    } else {
      await apiRequest('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('Thêm giao dịch mới thành công!');
    }

    document.getElementById('addTransactionModal').classList.remove('show');
    if (state.activeView === 'dashboard') {
      renderDashboard();
    } else if (state.activeView === 'transactions') {
      renderTransactions();
    }
  } catch (err) {
    showToast(err.message, true);
  }
}

// Delete Confirmation Modal
function handleOpenDeleteModal(id) {
  state.deleteTargetId = id;
  document.getElementById('deleteConfirmModal').classList.add('show');
}

async function handleConfirmDelete() {
  if (!state.deleteTargetId) return;
  try {
    await apiRequest(`/api/transactions/${state.deleteTargetId}`, { method: 'DELETE' });
    showToast('Đã xóa giao dịch thành công.');
    document.getElementById('deleteConfirmModal').classList.remove('show');
    state.deleteTargetId = null;
    if (state.activeView === 'dashboard') {
      renderDashboard();
    } else if (state.activeView === 'transactions') {
      renderTransactions();
    }
  } catch (err) {
    showToast('Lỗi xóa giao dịch: ' + err.message, true);
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Navigation / Sidebar
  document.querySelectorAll('.sidebar-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view === 'logout') {
        handleLogout();
      } else if (view) {
        switchView(view);
      }
    });
  });

  // Back button in header: returns to dashboard
  document.getElementById('btnHeaderBack').addEventListener('click', () => {
    switchView('dashboard');
  });

  // User Dropdown in Header
  const userBadge = document.getElementById('userBadgeDropdown');
  const userMenu = document.getElementById('userDropdownMenu');
  userBadge.addEventListener('click', (e) => {
    e.stopPropagation();
    userMenu.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    userMenu.classList.remove('show');
  });

  // Dropdown items
  document.getElementById('menuItemProfile').addEventListener('click', () => switchView('profile'));
  document.getElementById('menuItemReports').addEventListener('click', () => switchView('reports'));
  document.getElementById('menuItemLogout').addEventListener('click', handleLogout);

  // Add Transaction Buttons (Header & View)
  document.querySelectorAll('.btn-add-transaction-trigger').forEach(btn => {
    btn.addEventListener('click', openAddTransactionModal);
  });

  // Transaction Modal Toggles & Actions
  document.getElementById('btnTypeExpense').addEventListener('click', () => setModalType('expense'));
  document.getElementById('btnTypeIncome').addEventListener('click', () => setModalType('income'));
  document.getElementById('txModalDesc').addEventListener('input', handleDescriptionInput);
  document.getElementById('aiSuggestChip').addEventListener('click', applyAiSuggestion);
  document.getElementById('txModalCategory').addEventListener('change', updateCategoryIconPreview);
  document.getElementById('txModalSubmitBtn').addEventListener('click', handleSaveTransaction);

  // Close modals on overlay click or cancel
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
      }
    });
  });

  document.getElementById('btnCancelDelete').addEventListener('click', () => {
    document.getElementById('deleteConfirmModal').classList.remove('show');
  });
  document.getElementById('btnConfirmDelete').addEventListener('click', handleConfirmDelete);

  // Category Management Modal Listeners
  const btnOpenCatModal = document.getElementById('btnOpenCategoryModal');
  if (btnOpenCatModal) {
    btnOpenCatModal.addEventListener('click', openCategoryManageModal);
  }

  const btnManageCatFromTxModal = document.getElementById('btnManageCatFromTxModal');
  if (btnManageCatFromTxModal) {
    btnManageCatFromTxModal.addEventListener('click', () => {
      document.getElementById('addTransactionModal').classList.remove('show');
      openCategoryManageModal();
    });
  }

  const btnCloseCatModal = document.getElementById('btnCloseCatModal');
  if (btnCloseCatModal) {
    btnCloseCatModal.addEventListener('click', closeCategoryManageModal);
  }

  const btnToggleAddCatForm = document.getElementById('btnToggleAddCatForm');
  if (btnToggleAddCatForm) {
    btnToggleAddCatForm.addEventListener('click', openAddCategoryForm);
  }

  const btnCancelCatForm = document.getElementById('btnCancelCatForm');
  if (btnCancelCatForm) {
    btnCancelCatForm.addEventListener('click', closeCatForm);
  }

  const btnResetCatForm = document.getElementById('btnResetCatForm');
  if (btnResetCatForm) {
    btnResetCatForm.addEventListener('click', closeCatForm);
  }

  const btnSubmitCatForm = document.getElementById('btnSubmitCatForm');
  if (btnSubmitCatForm) {
    btnSubmitCatForm.addEventListener('click', handleSaveCategory);
  }

  document.querySelectorAll('.cat-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.catFilter = btn.dataset.catFilter;
      renderCategoryList();
    });
  });

  const catFormNameInput = document.getElementById('catFormName');
  if (catFormNameInput) {
    catFormNameInput.addEventListener('input', updateCatFormPreview);
  }

  const catFormTypeSelect = document.getElementById('catFormType');
  if (catFormTypeSelect) {
    catFormTypeSelect.addEventListener('change', updateCatFormPreview);
  }

  const btnCancelDeleteCat = document.getElementById('btnCancelDeleteCat');
  if (btnCancelDeleteCat) {
    btnCancelDeleteCat.addEventListener('click', () => {
      document.getElementById('deleteCatConfirmModal').classList.remove('show');
    });
  }

  const btnConfirmDeleteCat = document.getElementById('btnConfirmDeleteCat');
  if (btnConfirmDeleteCat) {
    btnConfirmDeleteCat.addEventListener('click', handleConfirmDeleteCategory);
  }

  // Search and Sort in Transactions Page
  document.getElementById('txSearchInput').addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderTransactions();
  });

  document.getElementById('txSortSelect').addEventListener('change', (e) => {
    state.currentSort = e.target.value;
    renderTransactions();
  });

  document.getElementById('txTypeFilterSelect').addEventListener('change', (e) => {
    state.currentTypeFilter = e.target.value;
    renderTransactions();
  });

  // Month navigation (Previous & Next month)
  document.getElementById('btnMonthPrev').addEventListener('click', () => {
    changeMonth(-1);
  });
  document.getElementById('btnMonthNext').addEventListener('click', () => {
    changeMonth(1);
  });

  // Profile Save Actions
  document.getElementById('btnSaveProfile').addEventListener('click', async () => {
    const name = document.getElementById('profileNameInput').value.trim();
    const email = document.getElementById('profileEmailInput').value.trim();
    const phone = document.getElementById('profilePhoneInput').value.trim();

    try {
      const res = await apiRequest('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, email, phone })
      });
      state.currentUser = res.user;
      updateUserBadge();
      showToast('Cập nhật hồ sơ thành công!');
    } catch (err) {
      showToast(err.message, true);
    }
  });

  document.getElementById('btnUpdatePassword').addEventListener('click', async () => {
    const currentPassword = document.getElementById('pwdCurrentInput').value;
    const newPassword = document.getElementById('pwdNewInput').value;
    const confirmPassword = document.getElementById('pwdConfirmInput').value;

    if (!currentPassword || !newPassword) {
      showToast('Vui lòng điền mật khẩu hiện tại và mật khẩu mới.', true);
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Xác nhận mật khẩu mới không trùng khớp.', true);
      return;
    }

    try {
      await apiRequest('/api/user/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      showToast('Đổi mật khẩu thành công!');
      document.getElementById('pwdCurrentInput').value = '';
      document.getElementById('pwdNewInput').value = '';
      document.getElementById('pwdConfirmInput').value = '';
    } catch (err) {
      showToast(err.message, true);
    }
  });

  const btnSaveFin = document.getElementById('btnSaveFinancialSettings');
  if (btnSaveFin) {
    btnSaveFin.addEventListener('click', async () => {
      const rawInputBudget = parseFloat(document.getElementById('settingsBudgetInput').value) || 0;
      const currency = document.getElementById('settingsCurrencySelect').value;
      const rate = EXCHANGE_RATES[currency] || 1;
      const budget = (currency === 'USD' || currency === 'EUR') ? Math.round(rawInputBudget * rate) : rawInputBudget;

      try {
        const res = await apiRequest('/api/user/financial-settings', {
          method: 'PUT',
          body: JSON.stringify({ budget, currency })
        });
        if (res.user) {
          state.currentUser = res.user;
        } else {
          state.currentUser.currency = currency;
          state.currentUser.monthly_budget = budget;
        }
        updateModalCurrencyLabel();
        showToast(`Đã lưu thiết lập! Đơn vị tiền tệ: ${currency}`);

        // Re-render any active views to reflect new currency immediately
        if (state.activeView === 'dashboard') {
          renderDashboard();
        } else if (state.activeView === 'transactions') {
          renderTransactions();
        } else if (state.activeView === 'reports') {
          renderReports();
        }
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

  // Real-time conversion in Settings when selecting different currency
  const settingsCurrencySelect = document.getElementById('settingsCurrencySelect');
  if (settingsCurrencySelect) {
    settingsCurrencySelect.addEventListener('change', (e) => {
      const newCurr = e.target.value;
      const rate = EXCHANGE_RATES[newCurr] || 1;
      const baseBudget = state.currentUser?.monthly_budget || 5000000;
      const displayBudget = (newCurr === 'USD' || newCurr === 'EUR') ? Math.round(baseBudget / rate) : baseBudget;
      document.getElementById('settingsBudgetInput').value = displayBudget;
    });
  }

  // Theme toggle listeners
  const cardThemeLight = document.getElementById('themeOptionLight');
  const cardThemeDark = document.getElementById('themeOptionDark');
  const btnHeaderTheme = document.getElementById('btnHeaderThemeToggle');

  if (cardThemeLight) {
    cardThemeLight.addEventListener('click', () => applyTheme('light'));
  }
  if (cardThemeDark) {
    cardThemeDark.addEventListener('click', () => applyTheme('dark'));
  }
  if (btnHeaderTheme) {
    btnHeaderTheme.addEventListener('click', () => {
      const isDark = document.body.classList.contains('dark-mode');
      applyTheme(isDark ? 'light' : 'dark');
    });
  }

  // Export CSV
  const btnExport = document.getElementById('btnExportCsv');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      window.location.href = (API_BASE || '') + '/api/export/csv';
    });
  }

  // Auth Form Handlers
  document.getElementById('btnLogin').addEventListener('click', async () => {
    const email = document.getElementById('loginEmailInput').value.trim();
    const password = document.getElementById('loginPasswordInput').value;

    if (!email || !password) {
      showToast('Vui lòng nhập email/SĐT và mật khẩu.', true);
      return;
    }

    try {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      state.currentUser = data.user;
      sessionStorage.setItem('finote_user_id', data.user.id);
      updateUserBadge();
      await loadCategories();
      showAppScreen();
      showToast('Đăng nhập thành công! Chào mừng bạn đến với FiNote.');
      switchView('dashboard');
    } catch (err) {
      showToast(err.message, true);
    }
  });

  // Switch between Login and Register / Forgot modal
  document.getElementById('linkRegister').addEventListener('click', () => {
    document.getElementById('registerModal').classList.add('show');
  });

  document.getElementById('linkForgotPassword').addEventListener('click', () => {
    document.getElementById('forgotModal').classList.add('show');
  });

  document.getElementById('btnRegisterSubmit').addEventListener('click', async () => {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value;

    if (!name || !email || !password) {
      showToast('Vui lòng điền đầy đủ họ tên, email và mật khẩu.', true);
      return;
    }

    try {
      const res = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone, password })
      });
      document.getElementById('registerModal').classList.remove('show');
      showToast('Đăng ký thành công! Đang chuyển đến ứng dụng...');
      state.currentUser = res.user;
      sessionStorage.setItem('finote_user_id', res.user.id);
      updateUserBadge();
      await loadCategories();
      showAppScreen();
      switchView('dashboard');
    } catch (err) {
      showToast(err.message, true);
    }
  });

  document.getElementById('btnSendForgotOtp').addEventListener('click', async () => {
    const email = document.getElementById('forgotEmail').value.trim();
    try {
      const res = await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      document.getElementById('forgotStep1').style.display = 'none';
      document.getElementById('forgotStep2').style.display = 'block';
      showToast(res.message + ` (Mã demo: ${res.otpHint})`);
    } catch (err) {
      showToast(err.message, true);
    }
  });

  document.getElementById('btnResetPasswordSubmit').addEventListener('click', async () => {
    const email = document.getElementById('forgotEmail').value.trim();
    const otp = document.getElementById('forgotOtp').value.trim();
    const newPassword = document.getElementById('forgotNewPassword').value;

    try {
      const res = await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, otp, newPassword })
      });
      document.getElementById('forgotModal').classList.remove('show');
      showToast(res.message);
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

function changeMonth(delta) {
  const parts = state.currentMonth.split('-');
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10) + delta;

  if (month > 12) {
    month = 1;
    year++;
  } else if (month < 1) {
    month = 12;
    year--;
  }

  state.currentMonth = `${year}-${month.toString().padStart(2, '0')}`;
  if (state.activeView === 'transactions') {
    renderTransactions();
  } else if (state.activeView === 'dashboard') {
    renderDashboard();
  }
}

function handleLogout() {
  state.currentUser = null;
  sessionStorage.removeItem('finote_user_id');
  localStorage.removeItem('finote_user_id');
  showAuthScreen();
  showToast('Đã đăng xuất khỏi FiNote.');
}

// ================= QUẢN LÝ DANH MỤC (THÊM, XÓA, SỬA) =================
const PRESET_ICONS = [
  { id: 'cart', label: 'Mua sắm', html: '<img src="icons FiNote/cart.png" style="width: 20px; height: 20px; object-fit: contain;">', emoji: '🛒' },
  { id: 'cutlery', label: 'Ăn uống', html: '<img src="icons FiNote/cutlery.png" style="width: 20px; height: 20px; object-fit: contain;">', emoji: '🍽️' },
  { id: 'vehicles', label: 'Phương tiện', html: '<img src="icons FiNote/vehicles.png" style="width: 20px; height: 20px; object-fit: contain;">', emoji: '🚗' },
  { id: 'wage', label: 'Lương / Thu nhập', html: '<img src="icons FiNote/wage.png" style="width: 20px; height: 20px; object-fit: contain;">', emoji: '💰' },
  { id: 'building', label: 'Nhà ở', html: '<img src="icons FiNote/building.png" style="width: 20px; height: 20px; object-fit: contain;">', emoji: '🏠' },
  { id: 'growth-graph', label: 'Đầu tư', html: '<img src="icons FiNote/growth-graph.png" style="width: 20px; height: 20px; object-fit: contain;">', emoji: '📈' },
  { id: '☕', label: 'Cà phê', html: '<span>☕</span>', emoji: '☕' },
  { id: '🎁', label: 'Thưởng / Quà', html: '<span>🎁</span>', emoji: '🎁' },
  { id: '🎮', label: 'Giải trí', html: '<span>🎮</span>', emoji: '🎮' },
  { id: '📄', label: 'Hóa đơn', html: '<span>📄</span>', emoji: '📄' },
  { id: '🏥', label: 'Sức khỏe', html: '<span>🏥</span>', emoji: '🏥' },
  { id: '📚', label: 'Giáo dục', html: '<span>📚</span>', emoji: '📚' },
  { id: '✈️', label: 'Du lịch', html: '<span>✈️</span>', emoji: '✈️' },
  { id: '🛍️', label: 'Thời trang', html: '<span>🛍️</span>', emoji: '🛍️' },
  { id: '🐾', label: 'Thú cưng', html: '<span>🐾</span>', emoji: '🐾' },
  { id: '🏋️', label: 'Thể thao', html: '<span>🏋️</span>', emoji: '🏋️' },
  { id: '💡', label: 'Tiện ích', html: '<span>💡</span>', emoji: '💡' },
  { id: '💼', label: 'Công việc', html: '<span>💼</span>', emoji: '💼' }
];

const PRESET_COLORS = [
  '#3b82f6', // Xanh dương
  '#f97316', // Cam
  '#eab308', // Vàng
  '#8b5cf6', // Tím
  '#10b981', // Xanh lá
  '#ec4899', // Hồng
  '#06b6d4', // Cyan
  '#64748b', // Xám đá
  '#ef4444'  // Đỏ
];

function initCatPickers() {
  const iconPicker = document.getElementById('catIconPicker');
  const colorPicker = document.getElementById('catColorPicker');

  if (iconPicker) {
    iconPicker.innerHTML = '';
    PRESET_ICONS.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `cat-icon-choice ${state.selectedCatIcon === item.id ? 'active' : ''}`;
      btn.dataset.iconId = item.id;
      btn.title = item.label;
      btn.innerHTML = item.html;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cat-icon-choice').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.selectedCatIcon = item.id;
        updateCatFormPreview();
      });
      iconPicker.appendChild(btn);
    });
  }

  if (colorPicker) {
    colorPicker.innerHTML = '';
    PRESET_COLORS.forEach(color => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = `cat-color-choice ${state.selectedCatColor === color ? 'active' : ''}`;
      dot.dataset.color = color;
      dot.style.backgroundColor = color;
      dot.title = color;
      dot.addEventListener('click', () => {
        document.querySelectorAll('.cat-color-choice').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        state.selectedCatColor = color;
        updateCatFormPreview();
      });
      colorPicker.appendChild(dot);
    });
  }
}

function updateCatFormPreview() {
  const nameInput = document.getElementById('catFormName');
  const previewBadge = document.getElementById('catFormPreviewBadge');
  const previewIcon = document.getElementById('catPreviewIcon');
  const previewName = document.getElementById('catPreviewName');
  if (!previewBadge || !nameInput) return;

  const nameVal = nameInput.value.trim() || 'Tên danh mục';
  previewName.textContent = nameVal;

  const iconItem = PRESET_ICONS.find(i => i.id === state.selectedCatIcon);
  if (iconItem) {
    previewIcon.innerHTML = iconItem.html;
  } else {
    previewIcon.innerHTML = '🏷️';
  }

  const color = state.selectedCatColor || '#3b82f6';
  previewBadge.style.backgroundColor = `${color}25`;
  previewBadge.style.color = color;
  previewBadge.style.border = `1px solid ${color}60`;
}

function openCategoryManageModal() {
  const modal = document.getElementById('categoryManageModal');
  if (!modal) return;
  modal.classList.add('show');
  closeCatForm();
  renderCategoryList();
}

function closeCategoryManageModal() {
  const modal = document.getElementById('categoryManageModal');
  if (modal) modal.classList.remove('show');
}

function openAddCategoryForm() {
  const formBox = document.getElementById('catFormContainer');
  if (!formBox) return;

  document.getElementById('catFormTitleText').textContent = 'Thêm danh mục mới';
  document.getElementById('catFormEditId').value = '';
  document.getElementById('catFormName').value = '';
  document.getElementById('catFormType').value = 'expense';

  state.selectedCatIcon = 'cart';
  state.selectedCatColor = '#3b82f6';

  // Update active states
  document.querySelectorAll('.cat-icon-choice').forEach(b => {
    b.classList.toggle('active', b.dataset.iconId === 'cart');
  });
  document.querySelectorAll('.cat-color-choice').forEach(d => {
    d.classList.toggle('active', d.dataset.color === '#3b82f6');
  });

  updateCatFormPreview();
  formBox.style.display = 'block';
  formBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeCatForm() {
  const formBox = document.getElementById('catFormContainer');
  if (formBox) formBox.style.display = 'none';
}

function handleEditCategory(catId) {
  const cat = state.categories.find(c => c.id === catId);
  if (!cat) return;

  const formBox = document.getElementById('catFormContainer');
  if (!formBox) return;

  document.getElementById('catFormTitleText').textContent = `Chỉnh sửa danh mục "${cat.name}"`;
  document.getElementById('catFormEditId').value = cat.id;
  document.getElementById('catFormName').value = cat.name;
  document.getElementById('catFormType').value = cat.type;

  state.selectedCatIcon = cat.icon || 'cart';
  state.selectedCatColor = cat.color || '#3b82f6';

  document.querySelectorAll('.cat-icon-choice').forEach(b => {
    b.classList.toggle('active', b.dataset.iconId === state.selectedCatIcon);
  });
  document.querySelectorAll('.cat-color-choice').forEach(d => {
    d.classList.toggle('active', d.dataset.color === state.selectedCatColor);
  });

  updateCatFormPreview();
  formBox.style.display = 'block';
  formBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function handleSaveCategory() {
  const nameInput = document.getElementById('catFormName');
  const name = nameInput.value.trim();
  const type = document.getElementById('catFormType').value;
  const editId = document.getElementById('catFormEditId').value;
  const icon = state.selectedCatIcon || 'cart';
  const color = state.selectedCatColor || '#3b82f6';

  if (!name) {
    showToast('Vui lòng nhập tên danh mục.', true);
    nameInput.focus();
    return;
  }

  try {
    if (editId) {
      // Update
      const res = await apiRequest(`/api/categories/${editId}`, {
        method: 'PUT',
        body: JSON.stringify({ name, type, icon, color })
      });
      showToast(res.message || 'Đã cập nhật danh mục thành công.');
    } else {
      // Create
      const res = await apiRequest('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name, type, icon, color })
      });
      showToast(res.message || 'Đã thêm danh mục mới thành công.');
    }

    closeCatForm();
    await loadCategories();
    renderCategoryList();

    if (state.activeView === 'transactions') {
      renderTransactions();
    } else if (state.activeView === 'dashboard') {
      renderDashboard();
    }
  } catch (err) {
    showToast(err.message, true);
  }
}

function handleOpenDeleteCatModal(catId) {
  const cat = state.categories.find(c => c.id === catId);
  if (!cat) return;

  if (cat.name === 'Khác') {
    showToast('Không thể xóa danh mục mặc định "Khác".', true);
    return;
  }

  state.deleteCatTargetId = catId;
  const confirmText = document.getElementById('deleteCatConfirmText');
  const usageCount = cat.usage_count || 0;
  if (confirmText) {
    confirmText.textContent = `Bạn có chắc chắn muốn xóa danh mục "${cat.name}"? ${usageCount > 0 ? `(${usageCount} giao dịch thuộc danh mục này sẽ tự động được chuyển sang danh mục "Khác")` : ''}`;
  }

  const modal = document.getElementById('deleteCatConfirmModal');
  if (modal) modal.classList.add('show');
}

async function handleConfirmDeleteCategory() {
  if (!state.deleteCatTargetId) return;

  try {
    const res = await apiRequest(`/api/categories/${state.deleteCatTargetId}`, {
      method: 'DELETE'
    });
    showToast(res.message || 'Đã xóa danh mục thành công.');

    document.getElementById('deleteCatConfirmModal').classList.remove('show');
    state.deleteCatTargetId = null;

    await loadCategories();
    renderCategoryList();

    if (state.activeView === 'transactions') {
      renderTransactions();
    } else if (state.activeView === 'dashboard') {
      renderDashboard();
    }
  } catch (err) {
    showToast(err.message, true);
  }
}

function renderCategoryList() {
  const container = document.getElementById('catListContainer');
  if (!container) return;

  const filter = state.catFilter || 'all';
  const list = state.categories.filter(cat => {
    if (filter === 'all') return true;
    return cat.type === filter;
  });

  if (list.length === 0) {
    container.innerHTML = '<p class="text-muted" style="text-align: center; padding: 24px 0;">Chưa có danh mục nào trong nhóm này.</p>';
    return;
  }

  let html = '<div style="display: flex; flex-direction: column; gap: 6px;">';
  list.forEach(cat => {
    const meta = getCategoryMeta(cat.name);
    const isExpense = cat.type === 'expense';
    const typeLabel = isExpense ? 'Khoản chi' : 'Khoản thu';
    const typeClass = isExpense ? 'expense' : 'income';
    const usage = cat.usage_count || 0;
    const isKhac = cat.name === 'Khác';

    html += `
      <div class="cat-list-item-row" data-cat-id="${cat.id}">
        <div class="cat-item-left">
          <div class="cat-avatar ${meta.colorClass}" style="${meta.avatarStyle || ''} width: 36px; height: 36px; font-size: 16px;">
            ${meta.icon}
          </div>
          <div>
            <div style="font-weight: 700; color: inherit; font-size: 14px;">
              ${escapeHtml(cat.name)}
              <span class="cat-badge-type ${typeClass}">${typeLabel}</span>
            </div>
            <div class="cat-usage-text">${usage} giao dịch sử dụng</div>
          </div>
        </div>
        <div class="cat-item-actions">
          <button type="button" class="btn-action-icon" onclick="handleEditCategory(${cat.id})" title="Chỉnh sửa danh mục">
            <img src="icons FiNote/edit.png" alt="Sửa" style="width: 15px; height: 15px; object-fit: contain;">
          </button>
          ${isKhac ? '' : `
            <button type="button" class="btn-action-icon btn-delete" onclick="handleOpenDeleteCatModal(${cat.id})" title="Xóa danh mục">
              <img src="icons FiNote/delete.png" alt="Xóa" style="width: 15px; height: 15px; object-fit: contain;">
            </button>
          `}
        </div>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}
