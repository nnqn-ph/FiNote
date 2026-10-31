const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const path = require('node:path');

const dbPath = path.join(__dirname, 'finote.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode & foreign keys
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password_hash TEXT NOT NULL,
    avatar TEXT,
    monthly_budget REAL DEFAULT 5000000,
    currency TEXT DEFAULT 'VND',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'expense' | 'income'
    icon TEXT NOT NULL,
    color TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'expense' | 'income'
    amount REAL NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    category_id INTEGER,
    category_name TEXT NOT NULL,
    description TEXT NOT NULL,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at DATETIME NOT NULL
  );
`);

// Password hashing helper
function hashPassword(password) {
  const salt = 'finote_salt_secure_2026';
  return crypto.scryptSync(password, salt, 32).toString('hex');
}

function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

// Seed initial data if empty
function seedDatabase() {
  // Check if categories exist
  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  if (catCount === 0) {
    const insertCat = db.prepare('INSERT INTO categories (name, type, icon, color) VALUES (?, ?, ?, ?)');
    insertCat.run('Mua sắm', 'expense', 'cart', '#3b82f6');
    insertCat.run('Ăn uống', 'expense', 'cutlery', '#f97316');
    insertCat.run('Phương tiện', 'expense', 'car', '#eab308');
    insertCat.run('Lương', 'income', 'wallet', '#8b5cf6');
    insertCat.run('Thưởng', 'income', 'gift', '#10b981');
    insertCat.run('Nhà ở', 'expense', 'home', '#ec4899');
    insertCat.run('Giải trí', 'expense', 'film', '#06b6d4');
    insertCat.run('Hóa đơn', 'expense', 'receipt', '#64748b');
    insertCat.run('Khác', 'expense', 'tag', '#94a3b8');
  }

  // Check if default user exists
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  let userId;
  if (userCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (name, email, phone, password_hash, monthly_budget, currency)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = insertUser.run(
      'User',
      'user@finote.vn',
      '0987 654 321',
      hashPassword('123456'),
      5000000,
      'VND'
    );
    userId = result.lastInsertRowid;
  } else {
    userId = db.prepare('SELECT id FROM users LIMIT 1').get().id;
  }

  // Check if transactions exist for default user
  const txCount = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE user_id = ?').get(userId).count;
  if (txCount === 0) {
    // Seed transactions matching the Figma screenshot:
    // Mua sắm (28/10/2026, Quần áo, -125.000đ)
    // Ăn uống (28/10/2026, Ăn trưa, -50.000đ)
    // Phương tiện (29/10/2026, Gửi xe, -3.000đ)
    // Lương (27/10/2026, Lương tháng 10, +10.000.000đ)
    // Plus historical months for statistical comparisons
    const insertTx = db.prepare(`
      INSERT INTO transactions (user_id, type, amount, date, category_name, description, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // Tháng 10/2026
    insertTx.run(userId, 'expense', 125000, '2026-10-28', 'Mua sắm', 'Quần áo', 'Mua áo sơ mi mới');
    insertTx.run(userId, 'expense', 50000, '2026-10-28', 'Ăn uống', 'Ăn trưa', 'Ăn bún chả với đồng nghiệp');
    insertTx.run(userId, 'expense', 3000, '2026-10-29', 'Phương tiện', 'Gửi xe', 'Vé xe bãi đỗ công ty');
    insertTx.run(userId, 'expense', 250000, '2026-10-25', 'Ăn uống', 'Ăn tối nhà hàng', 'Buffet lẩu');
    insertTx.run(userId, 'expense', 150000, '2026-10-22', 'Phương tiện', 'Đổ xăng', 'Xăng xe máy');
    insertTx.run(userId, 'expense', 422000, '2026-10-18', 'Mua sắm', 'Đồ gia dụng', 'Siêu thị cuối tuần');
    insertTx.run(userId, 'income', 10000000, '2026-10-27', 'Lương', 'Lương tháng 10', 'Lương công ty chuyển khoản');
    insertTx.run(userId, 'income', 3000000, '2026-10-15', 'Thưởng', 'Thưởng dự án', 'Thưởng hoàn thành tiến độ');

    // Tháng 9/2026 (for delta variance calculation)
    insertTx.run(userId, 'expense', 850000, '2026-09-20', 'Ăn uống', 'Ăn uống tháng 9', 'Tiền ăn cả tháng');
    insertTx.run(userId, 'expense', 400000, '2026-09-15', 'Mua sắm', 'Mua sách vở', 'Đồ dùng học tập');
    insertTx.run(userId, 'expense', 200000, '2026-09-10', 'Phương tiện', 'Xăng xe tháng 9', 'Đi lại');
    insertTx.run(userId, 'income', 10000000, '2026-09-25', 'Lương', 'Lương tháng 9', 'Lương định kỳ');

    // Tháng 8/2026
    insertTx.run(userId, 'expense', 1200000, '2026-08-18', 'Ăn uống', 'Liên hoan tháng 8', 'Ăn uống');
    insertTx.run(userId, 'expense', 500000, '2026-08-12', 'Mua sắm', 'Mua sắm quần áo', 'Mua đồ sale');
    insertTx.run(userId, 'income', 9500000, '2026-08-25', 'Lương', 'Lương tháng 8', 'Lương');

    // Tháng 7/2026
    insertTx.run(userId, 'expense', 900000, '2026-07-20', 'Ăn uống', 'Tiền ăn', 'Ăn uống');
    insertTx.run(userId, 'expense', 300000, '2026-07-15', 'Phương tiện', 'Bảo dưỡng xe', 'Thay dầu xe máy');
    insertTx.run(userId, 'income', 9500000, '2026-07-25', 'Lương', 'Lương tháng 7', 'Lương');
  }
}

seedDatabase();

// Database Query Helpers
module.exports = {
  db,
  hashPassword,
  verifyPassword,

  // User queries
  getUserByEmail: (email) => db.prepare('SELECT * FROM users WHERE email = ? OR phone = ?').get(email, email),
  getUserById: (id) => db.prepare('SELECT id, name, email, phone, avatar, monthly_budget, currency, created_at FROM users WHERE id = ?').get(id),
  createUser: (name, email, phone, passwordHash) => {
    return db.prepare('INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)').run(name, email, phone, passwordHash);
  },
  updateProfile: (id, name, email, phone, avatar) => {
    if (avatar) {
      return db.prepare('UPDATE users SET name = ?, email = ?, phone = ?, avatar = ? WHERE id = ?').run(name, email, phone, avatar, id);
    }
    return db.prepare('UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?').run(name, email, phone, id);
  },
  updatePassword: (id, passwordHash) => {
    return db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id);
  },
  updateFinancialSettings: (id, budget, currency) => {
    return db.prepare('UPDATE users SET monthly_budget = ?, currency = ? WHERE id = ?').run(budget, currency, id);
  },

  // Categories
  getCategories: () => db.prepare('SELECT * FROM categories ORDER BY id ASC').all(),

  // Transactions CRUD
  getTransactions: (userId, { month, category, type, search, sort } = {}) => {
    let sql = 'SELECT * FROM transactions WHERE user_id = ?';
    const params = [userId];

    if (month) {
      // month formatted as 'YYYY-MM'
      sql += ' AND date LIKE ?';
      params.push(`${month}%`);
    }

    if (category && category !== 'all') {
      sql += ' AND category_name = ?';
      params.push(category);
    }

    if (type && type !== 'all') {
      sql += ' AND type = ?';
      params.push(type);
    }

    if (search && search.trim() !== '') {
      sql += ' AND (description LIKE ? OR note LIKE ? OR category_name LIKE ? OR amount LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    if (sort === 'asc') {
      sql += ' ORDER BY amount ASC';
    } else if (sort === 'desc') {
      sql += ' ORDER BY amount DESC';
    } else {
      sql += ' ORDER BY date DESC, id DESC';
    }

    return db.prepare(sql).all(...params);
  },

  getTransactionById: (id, userId) => {
    return db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(id, userId);
  },

  createTransaction: (userId, type, amount, date, categoryName, description, note) => {
    return db.prepare(`
      INSERT INTO transactions (user_id, type, amount, date, category_name, description, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, type, amount, date, categoryName, description, note || '');
  },

  updateTransaction: (id, userId, type, amount, date, categoryName, description, note) => {
    return db.prepare(`
      UPDATE transactions
      SET type = ?, amount = ?, date = ?, category_name = ?, description = ?, note = ?
      WHERE id = ? AND user_id = ?
    `).run(type, amount, date, categoryName, description, note || '', id, userId);
  },

  deleteTransaction: (id, userId) => {
    return db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(id, userId);
  },

  // Summary statistics for Dashboard
  getMonthlySummary: (userId, month) => {
    // Total income for month
    const incomeRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE user_id = ? AND type = 'income' AND date LIKE ?
    `).get(userId, `${month}%`);

    // Total expense for month
    const expenseRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE user_id = ? AND type = 'expense' AND date LIKE ?
    `).get(userId, `${month}%`);

    // All time balance (Total Income - Total Expense)
    const allIncome = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'income'`).get(userId).total;
    const allExpense = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'expense'`).get(userId).total;
    const currentBalance = allIncome - allExpense;

    return {
      currentBalance,
      monthIncome: incomeRow.total,
      monthExpense: expenseRow.total
    };
  },

  // Monthly statistical variance for "Báo cáo thống kê"
  getMonthlyVariance: (userId) => {
    // Group expenses and incomes by month (YYYY-MM)
    const rows = db.prepare(`
      SELECT 
        substr(date, 1, 7) as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense
      FROM transactions
      WHERE user_id = ?
      GROUP BY substr(date, 1, 7)
      ORDER BY month ASC
    `).all(userId);

    // Compute delta variance compared to previous month
    const results = [];
    for (let i = 0; i < rows.length; i++) {
      const cur = rows[i];
      let deltaExpense = 0;
      let percentExpense = 0;
      if (i > 0) {
        const prev = rows[i - 1];
        deltaExpense = cur.total_expense - prev.total_expense;
        percentExpense = prev.total_expense > 0 ? (deltaExpense / prev.total_expense) * 100 : 0;
      }
      results.push({
        month: cur.month,
        totalIncome: cur.total_income,
        totalExpense: cur.total_expense,
        deltaExpense,
        percentExpense: Math.round(percentExpense * 10) / 10
      });
    }
    return results;
  },

  // Anomaly Detection Algorithm
  detectAnomalies: (userId) => {
    // Find expenses that exceed 2.2x the average of that category
    const categoryStats = db.prepare(`
      SELECT category_name, AVG(amount) as avg_amount, MAX(amount) as max_amount, COUNT(*) as cnt
      FROM transactions
      WHERE user_id = ? AND type = 'expense'
      GROUP BY category_name
      HAVING cnt >= 2
    `).all(userId);

    const statsMap = {};
    for (const stat of categoryStats) {
      statsMap[stat.category_name] = stat.avg_amount;
    }

    const expenses = db.prepare(`
      SELECT * FROM transactions
      WHERE user_id = ? AND type = 'expense'
      ORDER BY date DESC
    `).all(userId);

    const anomalies = [];
    for (const tx of expenses) {
      const avg = statsMap[tx.category_name];
      if (avg && tx.amount >= avg * 2.0 && tx.amount >= 200000) {
        anomalies.push({
          ...tx,
          avgAmount: Math.round(avg),
          spikeRatio: Math.round((tx.amount / avg) * 100)
        });
      }
    }
    return anomalies;
  }
};
