# Sửa hướng ngồi về tượng Phật

Ngày 04/11/2026. Bản sửa local tiếp nối `visual-upgrade-v1`.

Ảnh ngồi trước đây dùng góc lưng ba phần tư nghiêng sang phải cho mọi ghế,
khiến đầu và thân trông lệch hướng bàn thờ. Đã thay bằng ba ảnh nhìn thẳng
từ phía sau cho áo lam nam, áo lam nữ và người cao tuổi áo nâu. Đầu, lưng và
hai đầu gối cân giữa bồ đoàn; vị trí ghế trong phòng được giữ nguyên.

Tư thế mới dùng chung cho lúc an tọa, khung cuối khi ngồi xuống và khung đầu
khi đứng dậy. Giữ nguyên thời lượng động tác, đường đi, nghi lễ và giao thức phòng.

## Nguồn ảnh và xuất tài nguyên

- Ảnh gốc tạo bằng công cụ image_gen: `artwork/seating-direction/{man,woman,granny}.png`.
- Prompt và ảnh tham chiếu: `artwork/seating-direction/prompts.json`.
- Xuất lại bằng `python scripts/pack-seated-rear.py` (cần Pillow).
- Ảnh WebP trong `public/assets/seating-direction/`; tổng khoảng 22 KB.
- Canvas và điểm chạm sàn khớp atlas hiện có; không cắt theo từng tư thế.
- Kích thước, vùng alpha và SHA-256: [assets.json](assets.json).
- Bảng ảnh tư thế: [poses.jpg](poses.jpg).

## Kiểm tra

`npm run typecheck`, `npm test` (33/33) và `npm run build` đều đạt.

Kiểm tra trực tiếp bản production với 24 khách thử tạm thời, đủ ba y phục:

| Khung nhìn | Ảnh thực tế | Kết quả DOM |
| --- | --- | --- |
| Desktop 1920 × 1080 | [desktop.png](desktop.png) | 24/24 dùng `seatedRear`, không tràn ngang |
| Điện thoại 390 × 844 | [mobile.png](mobile.png) | 24/24 dùng `seatedRear`, không tràn ngang |

Quan sát ảnh: mọi người quay lưng về phía người xem, hướng lên bàn thờ,
thân người nằm giữa bồ đoàn. Console không có cảnh báo hoặc lỗi khi kiểm tra.
Số liệu DOM lưu trong hai file `*-verification.json`. Khách thử chỉ dùng
cho kiểm tra local; không thêm người mẫu vào ứng dụng.

Chưa đẩy GitHub hoặc triển khai website trong đợt sửa này.
