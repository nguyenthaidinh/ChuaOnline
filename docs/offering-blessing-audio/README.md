# Lời chúc, lễ vật trước tượng và âm thanh

Ngày 04/11/2026. Phạm vi local, tiếp nối commit `06fa16c`.

## Thay đổi

- Tăng từ 6 lên 80 lời chúc với 8 nhóm tiêu đề. Xáo một bộ câu mỗi lượt,
  xem hết mới lặp, tránh trùng câu ở ranh giới hai lượt. Thêm nút nhận lời chúc khác.
- Đối chiếu `ChuaTanPhat/assets/hall.js`: bản tham chiếu có hiệu ứng lễ vật tại tượng
  ngoài hiệu ứng của người dâng. Bổ sung lớp hiển thị tương ứng vào chánh điện hiện tại:
  hương và khói, hoa sen và cánh hoa, cánh sen rơi, chuông và vòng sáng.
- Hiệu ứng trước tượng kéo dài tối đa 6 giây, lấy mốc tiếp xúc từ action/offerings
  của server. Khách vào muộn thấy phần còn lại; snapshot trùng không tạo thêm hiệu ứng.
  Vật phẩm đã đặt tại lư/bàn vẫn theo thời hạn hiện có.
- Sửa CSS ép ảnh cánh sen xuống khoảng 1 px do `max-width:100%` trong vùng phát 1 px.
  Cánh hoa nay giữ đúng kích thước trên desktop/mobile, gồm cả hiệu ứng rải ở trạm.
- Nhạc không bị xóa: giữ đủ 3 MP3, chuông và mõ. Nút Bật nhạc phát ngay trong thao tác
  của người dùng, đồng thời mở bảng chọn bài. Có tùy chọn bật nhạc khi vào điện.
  HTMLAudio phát trực tiếp, không chờ mở Web Audio trước; chuông/mõ dùng Web Audio riêng.
  Âm lượng khởi đầu 40%; có tắt nhạc, đổi bài và chỉnh âm lượng.
- Bỏ lời báo hoàn tất vật phẩm sau khi dâng. Khi nhân vật về chỗ, chỉ hiện trạng thái an tọa.
  Không thêm thông báo cảm ơn dùng vật phẩm.

## Kiểm tra

- Typecheck và build đạt; 36 test đạt, gồm xáo lời chúc qua nhiều lượt,
  mốc hiệu ứng và đồng bộ snapshot, gọi phát nhạc ngay trong thao tác người dùng.
- Ba đường dẫn MP3 trả HTTP 200. Trình duyệt phát và đổi bài thật:
  `paused:false`, `readyState:4`, thời gian chạy tăng, không có lỗi media.
- Bấm chuông và mõ không báo lỗi; chưa đo âm thanh đầu ra bằng thiết bị thu.
- 10 lần nhận lời chúc trên giao diện cho 10 câu khác nhau.
- Hai tab quan sát cùng action dâng hương: ID khớp trong [shared-effect.json](shared-effect.json).
- Đã quan sát hương, hoa sen, cánh sen và chuông tại tượng; desktop 1440 × 1000,
  mobile 390 × 844. Mobile không tràn ngang. Console không ghi cảnh báo/lỗi lúc kiểm tra.
- Sau nghi lễ, trạng thái trở lại an tọa; không có popup cảm ơn hay thông báo dùng vật phẩm.

## Ảnh giao diện thực tế

- [Hoa sen tại tượng, desktop](lotus-desktop.png)
- [Hương ở tab người quan sát](incense-desktop.png)
- [Cánh sen trên điện thoại](petals-mobile.png)
- [Chuông trên điện thoại](bell-mobile.png)
- [Lời chúc và nút đổi câu](blessings.png)
- [Bảng nhạc](audio.png)
- [Số liệu phát nhạc và 10 câu lời chúc đã nhận](browser-verification.json)

Chưa đẩy GitHub hoặc triển khai website trong đợt này.
