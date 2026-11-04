# Chu kỳ đi mới từ key pose

Tiếp tục chặng 1 trên nhánh `codex/animation-v3`. Đợt này tạo một bộ thử **12 khung nam áo lam,
góc lưng chéo hướng lên bên phải**, từ reference đã có. Chưa phải toàn bộ bộ hoạt ảnh mới.

## Tài nguyên đã làm

Tạo 11 ảnh riêng bằng **image_gen tích hợp**, dùng một ảnh đã tạo trước làm khung 00.
Giữ nhân vật, góc camera và ánh sáng qua reference; không dùng lật ảnh hoặc crossfade để thay thế bước chân.

- Nguồn PNG và bộ prompt: `artwork/animation-v3/walk-v1/` và `generation.json` trong thư mục đó.
- Atlas thử: `walk-atlas.webp`, 1536×1536, 12 ô 384×512, 270.592 byte.
- Điểm gốc chung: (192,468). Toàn bộ nguồn dùng cùng scale và điểm gốc chuẩn hóa;
  không tự crop/căn giữa từng ảnh theo alpha.
- [Bảng 12 tư thế](../../../artwork/animation-v3/walk-v1/contact-sheet.jpg).
- [Vòng lặp từ chính 12 khung nguồn](../../../artwork/animation-v3/walk-v1/review-loop.webp).
- Kích thước nguồn thực tế, bounds, scale và hash lưu trong `review.json` cạnh atlas.

Xuất lại bằng `python scripts/pack-walk-candidate.py` (cần Pillow).
Lệnh từ chối bộ thiếu khung hoặc hình bị cắt. `--draft` dành cho nghiên cứu chưa đủ khung,
được ghi rõ trạng thái và số khung còn thiếu.

## Code hỗ trợ kiểm mẫu

Xưởng `/?animation-lab` có lựa chọn nguồn key pose mới/rig cũ, xem trên nền sáng/tối/chùa,
tua từng bước và phát lặp. Nguồn mới hiện chỉ có một góc; nút đổi góc rig bị khóa khi xem key pose.
Hai cột dùng cùng phần trăm chu kỳ để đối chiếu hình, không phát clip cũ đúng thời lượng gốc của nó.

Thêm phòng thử ngoại tuyến dùng `projectFloor`, `actorMetrics` và nền ngang/dọc hiện tại.
Một chu kỳ đi 0,95 m theo hướng chéo, đồng hồ authoring dài 1,2 giây ở 1×; khi lặp, nhân vật
được đặt lại điểm đầu. Đây là chuyển động thử có chủ đích, không phải lỗi teleport trong phòng chung.
Nhịp authoring này không khẳng định là vận tốc di chuyển server 1,45 m/s.

`CandidatePreview` kiểm manifest, ID trùng, kích thước atlas thật và có timeout/tải lại.
URL atlas mang SHA-256 của nội dung để trình duyệt không dùng nhầm atlas nháp đã cache.
Đồng hồ preview bỏ delta RAF âm ở lần phát đầu; chỉ số khung luôn được chặn trong miền hợp lệ.
Nút tua bước dùng chỉ số nguyên để không bỏ/lặp khung do tích lũy số thực.
Ảnh thử nằm ngoài `public/`; các module kiểm mẫu chỉ được import ở dev nên chưa đưa vào bản production.

## Kết quả đã xem và đo

- Không cắt đầu, tay hoặc chân trong cả 12 ô; alpha trong suốt, có bảng kiểm trên nền sáng.
- Quan sát nhân vật/tóc/màu áo không bị đổi rõ giữa các khung. Trong vùng kiểm alpha đầu cố định,
  các biên đo được chỉ thay đổi tối đa 1 px; số này là chỉ báo căn hình, không thay thế kiểm khuôn mặt
  hoặc giải phẫu. Vùng kiểm không được dùng để tự căn hoặc đổi scale.
- Đã xem vòng lặp và đoạn nối 11→00, thử bước trên sàn. [Tua bước qua UI](step-verification.json)
  xác nhận đủ 12 ID theo đúng thứ tự, không bỏ/lặp khung.
- [Video phòng thử ở 0,25×](floor-review.mp4): 32 ảnh chụp trình duyệt, khoảng 15,7 giây,
  giữ timestamp thật; lấy mẫu được 11/12 ID, không phải video xuất liên tục mọi frame.
  Vòng WebP nguồn chứa đủ 12 frame. [Số liệu ghi hình](recording.json).
- [So sánh sprite cũ và mới](comparison.png), [ảnh phòng thử](floor-study.png).
- [Mobile 390×844](mobile.png): không tràn ngang, sprite giữ tỷ lệ 3:4 và phòng thử đổi sang nền dọc.
  [Số liệu mobile](mobile-verification.json). Sau sửa cache và clock, không ghi cảnh báo/lỗi mới ở lượt kiểm cuối.
- Typecheck, 42 test và build đạt; audit 480 action/207.765 mẫu vẫn khớp bản trước.
  Không gọi việc test code đạt là chứng nhận đã hoàn tất mỹ thuật.

## Điều kiện còn thiếu để hoàn thành chặng 1

Nguồn mới đã vượt bước một ảnh tham chiếu đơn và có thể kiểm chuyển động theo chu kỳ.
Tuy nhiên chưa nghiệm thu chuyển động trong toàn bộ tình huống phòng thật:

- Đã có [bản nối thử đứng–đi–dừng–ngồi](../transitions/README.md) cùng bộ nguồn.
  Cần bổ sung khung quay/đứng dậy và kiểm tiếp xúc trước khi nghiệm thu để dùng trong phòng thật.
- Cần hoàn thiện các hướng đi còn lại; hiện chưa có góc trước và góc ngang mới.
- Cần đo lại tiếp xúc chân ở các độ sâu/hướng đường đi và đồng bộ pha bước khi vào/ra clip,
  đặc biệt lúc đổi hướng. Chưa coi đoạn mô phỏng một chu kỳ là đã khóa chân mọi đường đi.
- Nữ áo lam và áo nâu chưa được sản xuất lại theo chu kỳ này.

Vì vậy chặng 1 vẫn đang thực hiện. Chưa thay nhân vật trong chánh điện chính, chưa làm lại chuỗi dâng hương,
chưa đẩy GitHub hoặc triển khai hosting trong đợt này.
