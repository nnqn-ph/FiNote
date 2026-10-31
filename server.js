const express = require('express');
const path = require('node:path');
const dbHelper = require('./database');
const { classifyTransaction } = require('./ai_engine');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for file:// protocol and local testing
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-user-id');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));

// Simple cookie / session simulation
// For convenience in local testing, default to user 1 if not explicitly provided
function getSessionUserId(req) {
  const authHeader = req.headers['x-user-id'];
  if (authHeader) {
    return parseInt(authHeader, 10);
  }
  return 1; // Default demo user
}

// ================= AUTH ROUTES =================
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Vui lòng nhập email/số điện thoại và mật khẩu.' });
  }

  const user = dbHelper.getUserByEmail(email.trim());
  if (!user || !dbHelper.verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác.' });
  }

  const { password_hash, ...safeUser } = user;
  return res.json({ message: 'Đăng nhập thành công', user: safeUser });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ họ tên, email và mật khẩu.' });
  }

  const existing = dbHelper.getUserByEmail(email.trim());
  if (existing) {
    return res.status(400).json({ error: 'Email này đã được sử dụng.' });
  }

  try {
    const passwordHash = dbHelper.hashPassword(password);
    const result = dbHelper.createUser(name.trim(), email.trim(), phone || '', passwordHash);
    const user = dbHelper.getUserById(result.lastInsertRowid);
    return res.json({ message: 'Đăng ký tài khoản thành công', user });
  } catch (err) {
    return res.status(500).json({ error: 'Lỗi đăng ký: ' + err.message });
  }
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  const user = dbHelper.getUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: 'Không tìm thấy tài khoản với email này.' });
  }
  // In real life sends email; here generates demo OTP
  const demoOtp = '8899';
  return res.json({
    message: 'Mã xác thực OTP đã được gửi đến email của bạn.',
    otpHint: demoOtp
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Thiếu thông tin đặt lại mật khẩu.' });
  }
  const user = dbHelper.getUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
  }
  const passwordHash = dbHelper.hashPassword(newPassword);
  dbHelper.updatePassword(user.id, passwordHash);
  return res.json({ message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' });
});

app.get('/api/auth/me', (req, res) => {
  const userId = getSessionUserId(req);
  const user = dbHelper.getUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'Không tìm thấy người dùng' });
  }
  return res.json({ user });
});

// ================= USER & PROFILE ROUTES =================
app.put('/api/user/profile', (req, res) => {
  const userId = getSessionUserId(req);
  const { name, email, phone, avatar } = req.body;
  try {
    dbHelper.updateProfile(userId, name, email, phone, avatar);
    const updated = dbHelper.getUserById(userId);
    return res.json({ message: 'Cập nhật thông tin thành công', user: updated });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/user/password', (req, res) => {
  const userId = getSessionUserId(req);
  const { currentPassword, newPassword } = req.body;
  const fullUser = dbHelper.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

  if (!dbHelper.verifyPassword(currentPassword, fullUser.password_hash)) {
    return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng.' });
  }

  const newHash = dbHelper.hashPassword(newPassword);
  dbHelper.updatePassword(userId, newHash);
  return res.json({ message: 'Cập nhật mật khẩu thành công.' });
});

app.put('/api/user/financial-settings', (req, res) => {
  const userId = getSessionUserId(req);
  const { budget, currency } = req.body;
  dbHelper.updateFinancialSettings(userId, parseFloat(budget) || 5000000, currency || 'VND');
  const user = dbHelper.getUserById(userId);
  return res.json({ message: 'Đã lưu thiết lập tài chính.', user });
});

// ================= CATEGORIES =================
app.get('/api/categories', (req, res) => {
  const categories = dbHelper.getCategories();
  res.json({ categories });
});

// ================= TRANSACTIONS =================
app.get('/api/transactions', (req, res) => {
  const userId = getSessionUserId(req);
  const { month, category, type, search, sort } = req.query;

  const transactions = dbHelper.getTransactions(userId, {
    month: month || '2026-10',
    category,
    type,
    search,
    sort
  });

  // Group by category (requirement: "các danh mục cùng loại được sắp xếp chung với nhau (phải cùng 1 tháng)")
  const grouped = {};
  for (const tx of transactions) {
    const cat = tx.category_name;
    if (!grouped[cat]) {
      grouped[cat] = {
        categoryName: cat,
        type: tx.type,
        totalAmount: 0,
        items: []
      };
    }
    grouped[cat].totalAmount += tx.amount;
    grouped[cat].items.push(tx);
  }

  return res.json({
    transactions,
    grouped: Object.values(grouped),
    month: month || '2026-10'
  });
});

app.get('/api/transactions/:id', (req, res) => {
  const userId = getSessionUserId(req);
  const tx = dbHelper.getTransactionById(req.params.id, userId);
  if (!tx) {
    return res.status(404).json({ error: 'Không tìm thấy giao dịch.' });
  }
  return res.json({ transaction: tx });
});

app.post('/api/transactions', (req, res) => {
  const userId = getSessionUserId(req);
  const { type, amount, date, category_name, description, note } = req.body;

  if (!type || !amount || !date || !category_name || !description) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ các thông tin bắt buộc.' });
  }

  try {
    const result = dbHelper.createTransaction(
      userId,
      type,
      parseFloat(amount),
      date,
      category_name,
      description,
      note
    );
    const created = dbHelper.getTransactionById(result.lastInsertRowid, userId);
    return res.json({ message: 'Thêm giao dịch thành công', transaction: created });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/transactions/:id', (req, res) => {
  const userId = getSessionUserId(req);
  const { type, amount, date, category_name, description, note } = req.body;
  const id = req.params.id;

  try {
    dbHelper.updateTransaction(
      id,
      userId,
      type,
      parseFloat(amount),
      date,
      category_name,
      description,
      note
    );
    const updated = dbHelper.getTransactionById(id, userId);
    return res.json({ message: 'Cập nhật giao dịch thành công', transaction: updated });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/transactions/:id', (req, res) => {
  const userId = getSessionUserId(req);
  const id = req.params.id;
  try {
    dbHelper.deleteTransaction(id, userId);
    return res.json({ message: 'Xóa giao dịch thành công.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= DASHBOARD SUMMARY =================
app.get('/api/dashboard/summary', (req, res) => {
  const userId = getSessionUserId(req);
  const month = req.query.month || '2026-10';

  const summary = dbHelper.getMonthlySummary(userId, month);
  const recent = dbHelper.getTransactions(userId, { sort: 'desc' }).slice(0, 5);

  // Chart data: 4 periods or last 4 months
  const monthlyStats = dbHelper.getMonthlyVariance(userId);
  const lastMonths = monthlyStats.slice(-4);

  return res.json({
    month,
    currentBalance: summary.currentBalance,
    monthIncome: summary.monthIncome,
    monthExpense: summary.monthExpense,
    recentTransactions: recent,
    chartData: {
      labels: lastMonths.map(m => 'Tháng ' + m.month.split('-')[1]),
      expenses: lastMonths.map(m => Math.round(m.totalExpense / 1000000 * 10) / 10), // in millions
      fullValues: lastMonths.map(m => m.totalExpense)
    }
  });
});

// ================= REPORTS & MONTHLY VARIANCE =================
app.get('/api/reports/variance', (req, res) => {
  const userId = getSessionUserId(req);
  const stats = dbHelper.getMonthlyVariance(userId);
  return res.json({ stats });
});

// ================= AI FEATURES =================
app.get('/api/ai/classify', (req, res) => {
  const desc = req.query.description;
  const result = classifyTransaction(desc);
  return res.json({ result });
});

app.get('/api/ai/anomalies', (req, res) => {
  const userId = getSessionUserId(req);
  const anomalies = dbHelper.detectAnomalies(userId);
  return res.json({ anomalies });
});

// ================= EXPORT CSV =================
app.get('/api/export/csv', (req, res) => {
  const userId = getSessionUserId(req);
  const transactions = dbHelper.getTransactions(userId);

  let csv = 'ID,Loại,Danh mục,Mô tả,Số tiền (VNĐ),Ngày,Ghi chú\n';
  for (const t of transactions) {
    csv += `"${t.id}","${t.type === 'income' ? 'Khoản thu' : 'Khoản chi'}","${t.category_name}","${t.description}","${t.amount}","${t.date}","${(t.note || '').replace(/"/g, '""')}"\n`;
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=finote_transactions.csv');
  return res.send('\uFEFF' + csv);
});

// Fallback to SPA index.html
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  if (req.path === '/favicon.ico') {
    return res.status(204).end();
  }
  res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
  }
});

app.listen(PORT, () => {
  console.log(`FiNote Web Server running at http://localhost:${PORT}`);
});
