# FiNote - Ứng Dụng Quản Lý Thu Chi Cá Nhân

Dự án website quản lý thu chi cá nhân **FiNote** được hiện thực hóa chính xác theo các bản thiết kế Figma của bạn, tối ưu hóa giao diện trực quan, chuyên nghiệp và đầy đủ các tính năng trong đặc tả kỹ thuật.

---

## 📸 Các Tính Năng Đã Hoàn Thành (Đối Chiếu Với Thiết Kế Figma)

1. **Màn Hình Đăng Nhập (Login Screen)**:
   - Giao diện chia đôi hiện đại: banner đồ họa bên trái và form đăng nhập bên phải.
   - Các trường nhập liệu bo góc pill: Email/Số điện thoại, Mật khẩu.
   - Nút bấm `Đăng nhập` màu xanh Navy đậm (`#242f7d`) kèm hiệu ứng đổ bóng.
   - Liên kết `Đăng ký tài khoản mới` và `Quên mật khẩu?` (kèm xác thực OTP và đổi mật khẩu).
   - Mã hóa mật khẩu an toàn với thuật toán mã hóa một chiều scrypt/PBKDF2.

2. **Dashboard (Bảng Điều Khiển Tổng Quan)**:
   - Header xanh Navy đồng bộ với nút quay lại, Avatar người dùng, Menu thả xuống và Chuông thông báo.
   - Sidebar cố định bên trái gồm: Trang chủ (Dashboard), Quản lý thu chi, Cài đặt cá nhân và Đăng xuất.
   - **3 Thẻ KPI tổng quan**:
     - *Tổng số dư*: `5.000.000đ`
     - *Tổng thu tháng này*: `3.000.000đ`
     - *Tổng chi tháng này*: `1.000.000đ`
   - **Biểu đồ "Tổng quan thu - chi"**: Cột màu xanh ngọc cyan (`#40c4d8`) trực quan hóa biến động các tháng bằng Chart.js.
   - **Danh sách "Dòng tiền gần đây"**: Hiển thị avatar tròn theo màu từng danh mục (Phương tiện vàng, Lương tím, Ăn uống cam, Mua sắm xanh), số tiền thu (+ xanh lá) và số tiền chi (- đỏ).

3. **Màn Hình Quản Lý Thu / Chi**:
   - Thanh công cụ điều hướng: Bộ chọn tháng (`◀ Tháng 10/2026 ▶`), Ô tìm kiếm tức thì (`🔍 Tìm kiếm giao dịch...`) và Dropdown sắp xếp `Lọc: Cao → Thấp ▼` hoặc `Thấp → Cao ▲`.
   - **Gom nhóm theo danh mục cùng 1 tháng**: Tự động nhóm các khoản chi tiêu cùng loại (Ăn uống, Mua sắm, Phương tiện...) vào từng khối riêng biệt kèm tổng tiền của từng nhóm.
   - Thao tác trên từng dòng: Nút `Sửa` (Bút chì) và `Xóa` (Thùng rác).
   - **Modal xác nhận xóa**: Hộp thoại cảnh báo xác nhận trước khi xóa nhằm tránh mất mát dữ liệu.
   - Nút `Xem thêm` bo tròn tinh tế.

4. **Modal "Thêm Giao Dịch Mới"**:
   - Nút bật/tắt giữa `Khoản chi` (xanh lá `#5cb85c`) và `Khoản thu` (đỏ `#e55353`).
   - Các trường nhập liệu: Số tiền (VNĐ), Ngày giao dịch, Danh mục, Ghi chú.
   - **Tính năng AI Tự Phân Loại (Auto Categorization)**: Tự động phân tích từ khóa khi người dùng gõ mô tả (ví dụ: gõ *"Ăn trưa bún chả"* $\rightarrow$ AI gợi ý ngay chip `✨ Gợi ý AI: Ăn uống (98% độ tin cậy)` cho phép 1-click chọn danh mục).

5. **Màn Hình Thông Tin Cá Nhân & Cài Đặt**:
   - **Hồ sơ cá nhân**: Avatar người dùng lớn, Họ tên, Email, Số điện thoại và nút cập nhật ảnh.
   - **Bảo mật**: Form đổi mật khẩu với Mật khẩu hiện tại, Mật khẩu mới, Xác nhận mật khẩu.
   - **Thiết lập tài chính**: Cài đặt định mức ngân sách tháng (`5.000.000 VNĐ`) và lựa chọn đơn vị tiền tệ (`VNĐ`, `USD`, `EUR`).

6. **Báo Cáo Thống Kê & Phân Tích Độ Lệch Tháng**:
   - Thống kê chi tiết từng tháng: Tổng thu, Tổng chi, Độ sai lệch so với tháng trước (Delta $\Delta$ và tỷ lệ %).
   - Biểu đồ xu hướng chi tiêu nhiều tháng liên tiếp.
   - **Phát hiện thói quen chi tiêu bất thường (AI Anomaly Detection)**: Cảnh báo tự động các khoản chi tiêu vượt ngưỡng 200% so với mức trung bình của nhóm.
   - Nút xuất dữ liệu ra file Excel/CSV.

---

## 🚀 Hướng Dẫn Chạy Website

Server hiện đang được khởi chạy tại:
👉 **`http://localhost:3000`**

### Khởi động lại server thủ công (nếu cần):
```bash
cd "C:\Users\Admin\.gemini\antigravity\scratch\finote"
node server.js
```

### Tài khoản trải nghiệm mặc định:
- **Email**: `user@finote.vn`
- **Mật khẩu**: `123456`
*(Hoặc bạn có thể bấm **Đăng ký** để tạo tài khoản mới ngay trên giao diện).*
