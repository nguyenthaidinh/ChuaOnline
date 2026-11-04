# Tư thế cầm dùi và đỡ hoa riêng cho ba y phục

15 PNG tạo bằng **ImageGen tích hợp**: mỗi identity có ba tư thế chuông (chuẩn bị, chạm, thu tay)
và hai tư thế hoa (đỡ trước ngực, đặt). [Prompt và reference thực tế](generation.json).
Ảnh thực tế 1254×1254 RGBA; giữ camera, scale, chân trụ và ánh sáng theo reference cùng identity.
Tay trống trong ảnh; dùi và khay hoa được vẽ riêng ở runtime.

```powershell
python scripts/pack-ritual-poses.py
```

Packer giữ canvas 384×512/pivot 192,468, đo grip và hull từ pixel tay thật ở vùng cánh tay hành động.
Các `hand-review.jpg` cần được xem trước khi dùng; thuật toán màu không thay thế việc kiểm giải phẫu.
Mỗi `review.json` có geometry, source audit, kích thước, bounds, SHA nguồn và hash texture.
Không mirror nguồn, nội suy chồng hai thân hoặc co/xoay người để tạo động tác.

- [Nam](man/contact-sheet.jpg), [tay nam](man/hand-review.jpg).
- [Nữ](woman/contact-sheet.jpg), [tay nữ](woman/hand-review.jpg).
- [Áo nâu](granny/contact-sheet.jpg), [tay áo nâu](granny/hand-review.jpg).

Master 1152×1024 nằm ngoài public. Mỗi texture web 576×512 có 6 ô 192×256, trong đó 5 ô dùng.
`ritualPoseGeometry.ts` được sinh; `offeringAnimation.ts` chọn pose và điểm nhận theo identity.
Đây là các key pose mới, chưa phải bộ diễn hoạt 18–24khung cho từng nghi lễ.
Xem [bằng chứng runtime và giới hạn](../../../docs/animation-v3/movement-variants-v1/README.md).
