# Danh mục tài nguyên — bản thử nghiệm cục bộ

Giấy phép MIT của repo chỉ áp dụng cho mã nguồn, không bao gồm `public/assets`.
Các nguồn dưới đây được chép lại từ README gốc, chưa phải xác nhận độc lập về quyền phát hành.
Danh mục đầy đủ với dung lượng và SHA-256 nằm trong `asset-inventory.json`.

| Tài nguyên | Vị trí hiện tại | Nguồn ghi trong bản gốc | Việc cần làm trước công khai |
| --- | --- | --- | --- |
| di.fbx, khan.fbx, quy.fbx, thaphuong.fbx | public/assets/3d | Adobe Mixamo | Xác nhận điều khoản phân phối file trên web |
| nguoi.fbx | public/assets/3d | Chủ dự án cung cấp | Xác minh nguồn và quyền sử dụng/phân phối |
| chanh-dien-2.webp | archive/live/public/assets/bg | Chủ dự án cung cấp | Không còn dùng trong bản web sau Chặng 3 |
| temple-layout-desktop.svg, temple-layout-mobile.svg | public/assets/web | Tạo bằng code tại scripts/create-scene-placeholders.mjs | Bản căn bố cục tạm, không dùng tài nguyên ngoài; thay ảnh hoàn thiện ở Chặng 4 |
| chill_relax.mp3 | public/assets/audio | Tạo bằng ACE-Step theo README gốc | Ghi lại bản model, nguồn tạo và điều khoản áp dụng |
| buddhist_flute.mp3, khuc_thien_dao.mp3 | archive/live/public/assets/audio | Chưa rõ | Chưa đưa vào bản web |
| niem_phat_nam_mo_a_di_da_phat.mp3 | archive/live/public/assets/audio | Bản thu của người khác | Chưa đưa vào bản web |
| chanh-dien-2-hd.webp, chanh-dien-2-4k.webp | archive/live/public/assets/bg | Phóng bằng Real-ESRGAN từ nền gốc | Quyền phụ thuộc nền gốc; chưa dùng trong bản web |
| phattu.png | archive/live/public/assets/devotees | Chủ dự án cung cấp | Chưa đưa vào bản web |

Chuông được tổng hợp bằng Web Audio, không sử dụng bản thu bên ngoài.
Hình đại diện dự phòng dùng ký tự Unicode của thiết bị.
Ở bản thử nghiệm ban đầu, CSS giữ tên font Lora và dùng serif hệ thống khi máy
không có font. Bản cập nhật ngày 05/11/2026 đã đóng gói Noto Serif có đủ tiếng Việt,
thay cho font hệ thống ở các tiêu đề và lời chúc; xem danh mục bổ sung dưới đây.

Sau Chặng 3, `dist` chứa hai nền SVG tạm (~5,6 KB và ~4,7 KB), một bản nhạc
(~5.66 MB), năm file FBX (~8.45 MB) và mã frontend. Nền raster cũ được chuyển
sang archive. Quyền nhạc và model vẫn cần được xác minh trước khi công khai.

## Bổ sung lời chúc có giọng đọc — 05/11/2026

| Tài nguyên | Vị trí | Nguồn và hồ sơ |
| --- | --- | --- |
| Noto Serif tiếng Việt, WOFF2, 82.612 byte | public/assets/fonts | Noto Serif từ Google Fonts, SIL OFL 1.1; nguồn TTF, giấy phép, SHA và script subset trong artwork/fonts-v1 |
| 20 lời chúc MP3 | public/assets/audio/blessings | Giọng tổng hợp Microsoft An vi-VN đã cài trên máy, tạo cục bộ từ src/data/blessingCatalog.ts |
| 5 lời nguyện nghi lễ MP3 | public/assets/audio/rituals | Cùng giọng và workflow; tương ứng hương, hoa sen, cánh sen, chuông và lạy |

25 MP3 tổng cộng 1.265.637 byte. WAV gốc, câu đọc, thông số, SHA và kết quả
kiểm tín hiệu được giữ trong `artwork/audio-voice-v1`; WAV không đi vào bản web.
Âm điểm nghi lễ được tổng hợp bằng Web Audio. Trang web tải font và giọng đọc
từ cùng máy chủ ứng dụng, không gọi dịch vụ TTS hoặc Google Fonts khi truy cập.

Xem [kiểm tra tích hợp và ảnh giao diện](blessings-voice-v1/README.md),
[hồ sơ font](../artwork/fonts-v1/README.md) và
[workflow giọng đọc](../artwork/audio-voice-v1/README.md).
