// AI Engine for FiNote: Auto Categorization and Anomaly Detection

const CATEGORY_RULES = [
  {
    category: 'Ăn uống',
    keywords: ['ăn', 'trưa', 'tối', 'sáng', 'bún', 'phở', 'cơm', 'cà phê', 'cafe', 'coffee', 'trà sữa', 'highlands', 'phúc long', 'starbucks', 'kfc', 'lotteria', 'pizza', 'lẩu', 'nướng', 'buffet', 'nhậu', 'quán', 'bánh', 'trái cây', 'snack', 'nhà hàng'],
    weight: 0.96
  },
  {
    category: 'Phương tiện',
    keywords: ['xăng', 'đổ xăng', 'gửi xe', 'vé xe', 'grab', 'be', 'gojek', 'taxi', 'rửa xe', 'thay dầu', 'bảo dưỡng', 'sửa xe', 'vé máy bay', 'xe buýt', 'giao thông', 'phí cầu đường'],
    weight: 0.95
  },
  {
    category: 'Mua sắm',
    keywords: ['mua', 'quần', 'áo', 'giày', 'dép', 'túi', 'shopee', 'lazada', 'tiki', 'tiktok shop', 'siêu thị', 'mỹ phẩm', 'đồ dùng', 'gia dụng', 'điện thoại', 'máy tính', 'tai nghe', 'sách'],
    weight: 0.94
  },
  {
    category: 'Nhà ở',
    keywords: ['tiền nhà', 'tiền trọ', 'thuê nhà', 'chung cư', 'sửa nhà', 'nội thất', 'sơn nhà', 'quản lý tòa nhà'],
    weight: 0.95
  },
  {
    category: 'Hóa đơn',
    keywords: ['điện', 'nước', 'tiền điện', 'tiền nước', 'internet', 'wifi', '4g', 'cước', 'truyền hình', 'rác'],
    weight: 0.97
  },
  {
    category: 'Giải trí',
    keywords: ['xem phim', 'cinema', 'cgv', 'bhd', 'lotte', 'game', 'nạp game', 'netflix', 'spotify', 'du lịch', 'khách sạn', 'resort', 'hát', 'karaoke'],
    weight: 0.93
  },
  {
    category: 'Lương',
    keywords: ['lương', 'salary', 'lương tháng', 'nhận lương', 'chuyển khoản lương', 'công ty chuyển'],
    weight: 0.98
  },
  {
    category: 'Thưởng',
    keywords: ['thưởng', 'bonus', 'hoa hồng', 'thưởng tết', 'thưởng dự án', 'khen thưởng'],
    weight: 0.96
  }
];

function classifyTransaction(description) {
  if (!description || typeof description !== 'string') {
    return null;
  }
  const text = description.toLowerCase().trim();
  let bestMatch = null;
  let maxScore = 0;

  for (const rule of CATEGORY_RULES) {
    let matchedKeywords = 0;
    for (const kw of rule.keywords) {
      if (text.includes(kw)) {
        matchedKeywords++;
      }
    }
    if (matchedKeywords > 0) {
      const score = Math.min(0.99, rule.weight + (matchedKeywords - 1) * 0.02);
      if (score > maxScore) {
        maxScore = score;
        bestMatch = {
          category: rule.category,
          confidence: Math.round(maxScore * 100),
          matchedKeywords
        };
      }
    }
  }

  return bestMatch;
}

module.exports = {
  classifyTransaction
};
