# Kết quả tối ưu — 05/11/2026

Đã triển khai các sửa đổi tải tài nguyên, ổn định hoạt ảnh và giảm công việc renderer trong repository. Không chạy giả lập mạng lỗi theo yêu cầu người dùng. Không thay đổi kích thước cảnh PC, ảnh gốc, vị trí ngồi, thời gian nghi lễ hoặc nội dung âm thanh.

## Thay đổi

- Hàng đợi dùng chung giới hạn 3 công việc tải/decode đồng thời, gộp yêu cầu trùng, timeout có dọn handler và cho phép thử lại yêu cầu thất bại.
- Cảnh ban đầu không tải atlas chuyển động của cả ba y phục. Nhân vật nền chỉ dùng ảnh ngồi. Chuẩn bị chuyển động khi mở/chọn y phục hoặc gặp khách thật; chuẩn bị nghi lễ khi người dùng yêu cầu hoặc phòng có hành động tương ứng.
- Chỉ gửi join/action của người dùng sau khi chuẩn bị ảnh. Có trạng thái đang chuẩn bị và chặn gửi trùng. Bộ ảnh dự phòng bắt buộc phải giải mã được; ảnh nâng cấp không chặn hoàn tất một nghi lễ khi không có sẵn.
- Nhân vật từ xa chưa đủ ảnh tạm hiện tư thế ngồi đã tải; khi ảnh sẵn sàng dựng lại đúng mốc giờ server. Không tham chiếu atlas chưa sẵn sàng.
- Khóa readiness theo ID lượt vào điện/nghi lễ. Nhân vật và lớp vật phẩm dùng chung snapshot, tránh chuyển ảnh nâng cấp giữa động tác. Khóa được giữ tới hết đời lễ vật rồi dọn.
- Khi đổi desktop/mobile, giữ RoomScene đang có cho tới khi ảnh nền mới sẵn sàng; không reset phiên hoạt ảnh bằng cách tháo cả cảnh.
- Memo hóa cảnh để timer nhãn/nút trong App không render lại toàn cảnh. Giữ room object khi heartbeat không đổi revision; vẫn xử lý thay đổi kết nối/clock.
- Đọc kích thước lớp lễ vật qua ResizeObserver, dùng chung thời điểm vẽ cho mỗi lượt RAF, cache tập lễ vật nhìn thấy theo tập dữ liệu/thời điểm. Không gán lại src vật phẩm và nền sprite khi giá trị không đổi.
- Scheduler hỗ trợ deadline: lễ vật tĩnh chờ mốc xuất hiện, thay đổi hoặc fade; khói/cánh sen đang chuyển động tiếp tục vẽ. Dừng RAF/timer khi ẩn tab, khôi phục theo giờ thực khi quay lại và dọn subscription khi unmount.
- Font WOFF2, gzip JS/CSS, ETag/Last-Modified, conditional 304, range MP3 206/416, If-Range và HEAD được hỗ trợ trong server production. Cache revalidate với URL chưa có hash, tránh lưu ảnh cũ sau deploy.
- Heartbeat SSE serialize snapshot một lần mỗi nhịp và dùng bảo vệ buffer chung. Heartbeat POST có bucket giới hạn riêng, không tiêu hao hạn mức thao tác; không tin X-Forwarded-For tùy tiện.

## Số liệu

| Hạng mục | Trước | Sau |
|---|---:|---:|
| Ảnh bắt buộc trước khi hiện cảnh desktop | 1.925.224 byte | 532.558 byte (**giảm 72,34%**) |
| Ảnh bắt buộc trước khi hiện cảnh mobile | 1.883.614 byte | 490.948 byte (**giảm 73,94%**) |
| Pixel RGBA quy đổi của nhóm ảnh bắt buộc | 43,60 MiB | 9,85 MiB |
| Atlas chuyển động trong nhóm bắt buộc | 3 | 0 |
| Font production | 404 | 200, font/woff2 |
| Ảnh không đổi, yêu cầu điều kiện | 200 + cả file | 304 |
| Range nhạc 0–1023 | 200 + 1.562.815 byte | 206 + 1.024 byte |

Đây là dung lượng file/nhóm tải và phản hồi HTTP, không phải tỷ lệ tăng tốc đo trên Internet. RGBA là rộng × cao × 4, không phải RAM/VRAM đo trực tiếp. Ảnh gốc và tổng bộ ảnh vẫn giữ nguyên; khi phòng sử dụng đầy đủ ba y phục và nghi lễ, không khẳng định bộ nhớ cực đại đã giảm cùng tỷ lệ với tải ban đầu.

## Kiểm tra đã chạy

- **139/139 test đạt**, `npm run typecheck`, `npm run build`, `git diff --check` đạt.
- Test mới cho hàng đợi tải/gộp request, khóa ảnh giữa actor và lễ vật, ngân sách ảnh ban đầu, deadline lễ vật, ngủ/đánh thức/dọn scheduler, và HTTP static response.
- Audit **101.310 mẫu**, **517 ô atlas** thuộc 3 y phục × 5 nghi lễ tại các ghế/vị trí đại diện, đầy đủ và dự phòng: không thấy ô trong suốt hoàn toàn/chỉ số vượt lưới. Không phải kiểm tra mọi frame thực tế trình duyệt đã paint.
- Kiểm thử tải localhost: **24 khách, 200 kết nối SSE tổng hợp**, tối đa **4 nghi lễ đồng thời**, **20 lượt lễ hoàn thành**, gồm đủ 5 loại cho cả 3 y phục. **164 POST đều 200**, không lỗi trong report, p95 khoảng **63,37 ms** ở lượt này. Sau cleanup phòng còn 0 khách.
- Browser production: chọn nữ áo lam, đi vào điện, rải cánh sen; quan sát khách từ xa và phòng đủ 24 người; thay đổi layout trong khi còn nhân vật hoạt động; lời chúc báo đang đọc; nhạc chuyển sang đang phát và tắt lại; console error/warning của trang trống trong lượt lấy mẫu.
- Desktop 1920×1080 vẫn có cảnh **1600×900**. Khung mobile 390×844 ghi nhận 24 nhân vật, không tràn ngang (clientWidth = scrollWidth = 375).
- Hai mẫu bộ đếm scene: desktop 30 Hz / 0,858 ms callback vẽ; mobile viewport 30 Hz / 0,349 ms. Khác số tác vụ/pha nên không dùng hai số này để tuyên bố phần trăm tăng tốc. Đây không phải full-frame paint/composite hay thiết bị mobile thật.

## Giới hạn và quyết định

Không thay ảnh gốc bằng phiên bản giảm độ nét hoặc ép 60 FPS khi chưa có đo chất lượng/chi phí trên điện thoại thật. Giữ mức 30 Hz đang dùng, giảm công việc trong mức đó trước. Các mục tiêu thử nghiệm LCP/INP, RAM/GPU, mobile ≤64 MiB và 60 Hz trong audit ban đầu chưa được xác nhận. Không có tuyên bố đã đạt toàn bộ mục tiêu production trên mọi thiết bị.

Chưa kiểm chứng Safari/iPhone/Android vật lý, mạng WAN, proxy triển khai thật hoặc nhiều process chia sẻ phòng. Sức chứa ứng dụng vẫn 24 chỗ/4 trạm; 200 người xem ở đây là client SSE tổng hợp cùng một máy, không phải 200 trình duyệt vẽ cảnh.

Các kiểm tra trình duyệt được thực hiện trước bước cuối định dạng lại RoomScene và đổi cách khởi tạo ArtworkSessions sang lazy state; typecheck/test/build đã chạy lại sau bước đó. Không có thay đổi ảnh/CSS hay lịch hoạt ảnh ở bước định dạng.

## Bằng chứng và chạy lại

- [HTTP và các mẫu khung](source-and-http.json), [ngân sách ảnh](image-budget.json).
- [Kiểm thử tải](load.json), [quan sát trình duyệt](browser.json).
- [Desktop đủ 24 người](desktop.png), [mobile đủ 24 người](mobile.png).

```powershell
npm run typecheck
npm test
npm run build
node --experimental-strip-types scripts/audit-performance.mjs docs/performance-audit/optimized
python scripts/audit-image-budget.py docs/performance-audit/optimized
```

`scripts/qa-performance.mjs` chỉ dùng server QA localhost riêng cổng 4186. Script tạo và xóa khách tạm, chạy 200 SSE và 20 hành động rồi dọn. Không chạy nó trên phòng đang có người dùng thật. Server QA của đợt này đã được tắt; không triển khai/push repo trong đợt tối ưu.
