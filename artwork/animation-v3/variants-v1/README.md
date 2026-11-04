# Nguồn dâng hương nữ áo lam và áo nâu

46 PNG riêng, mỗi identity có đủ 23 tư thế tương ứng chuỗi nam đã kiểm. Tạo bằng **ImageGen tích hợp**:
ảnh nam là mục tiêu pose/camera; ảnh nữ hoặc người áo nâu là identity/trang phục. Không chỉ tô lại màu atlas nam.
Các PNG thực tế 1254×1254 RGBA, không chứa prop, bồ đoàn hoặc bóng sàn.

[Prompt và reference](generation.json); riêng `woman/03-chest.png` dùng [prompt pilot thực tế](pilot-generation.json)
thay cho dòng generic chưa chạy trong danh sách job. Không ghi nhận thêm một lần tạo cho dòng generic đó.

```powershell
python scripts/pack-variant-incense.py
```

Packer dùng canvas/pivot cố định từ `pose_canvas.py`, không auto-crop theo alpha hoặc đổi tỷ lệ từng pose.
Tay trái/phải và polygon được đo từ pixel da trong vùng tay của **chính ảnh đang chọn**.
Grip theo ngón thật khi ảnh lệch khỏi mục tiêu; pose cắm phải chạm được mục tiêu dùng chung, nếu không compiler báo lỗi.
`contacts.json` ghi tọa độ nguồn và khoảng cách tới da; `review.json` ghi kích thước, bounds, nguồn và hash.
Đây là phép đo hỗ trợ cần xem bằng mắt, không phải mô hình nhận dạng bàn tay hay bảo đảm giải phẫu.

- [Bảng nữ](woman/contact-sheet.jpg), [tay nữ](woman/hand-review.jpg).
- [Bảng áo nâu](granny/contact-sheet.jpg), [tay áo nâu](granny/hand-review.jpg).

Atlas master nằm cạnh nguồn. Texture web là 768×1536, ô192×256 có hash; geometry vẫn ở đơn vị 384×512.
File `src/room/variantIncenseGeometry.ts` được sinh từ packer.
Kết quả tích hợp, kiểm từng mốc và các giới hạn nằm trong
[báo cáo đợt mở rộng](../../../docs/animation-v3/movement-variants-v1/README.md).
