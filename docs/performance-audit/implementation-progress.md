# Tiến độ tối ưu — 05/11/2026

**Cập nhật:** phần triển khai tiếp theo và kiểm tra cuối đã có ở [báo cáo kết quả](optimized/README.md). Nội dung bên dưới lưu lịch sử đợt 1.

Theo yêu cầu mới, bỏ kịch bản giả lập mạng lỗi. Chưa đánh dấu toàn bộ kế hoạch hoàn thành.

## Đã thực hiện đợt 1

- Tách HTTP static response thành module riêng; phục vụ WOFF2 đúng MIME.
- Thêm ETag/Last-Modified và conditional response 304. Đường dẫn chưa có hash phải revalidate, tránh giữ nhầm ảnh cũ sau triển khai.
- Nén gzip cho nội dung text khi client chấp nhận; tôn trọng gzip;q=0; giữ SSE riêng.
- Hỗ trợ byte range, suffix/open range, 206/416, If-Range và HEAD cho tài nguyên.
- Gửi heartbeat SSE bằng cùng luồng broadcast, chỉ serialize snapshot một lần và áp dụng giới hạn buffer hiện có.
- Đo kích thước lớp lễ vật qua ResizeObserver; bỏ getBoundingClientRect trong vòng vẽ từng cánh sen; ngắt observer khi unmount.
- Giữ nguyên giao diện, kích thước cảnh PC, ảnh và thời gian nghi lễ.

## Kiểm chứng

133/133 test đạt; typecheck và production build đạt. Test HTTP mới kiểm tra font, ETag, gzip, range, stale If-Range và HEAD. Audit production sau sửa được lưu ở `.local-qa/performance-stage1`, không ghi đè baseline.

Chưa đo hiệu năng trên điện thoại thật hoặc kiểm chứng trực quan sau thay đổi này; không coi số test đạt là bằng chứng đã hết lag/mất sprite.

## Tiếp theo

Chốt readiness ảnh đồng bộ cho nhân vật, tay và lớp lễ vật theo từng lượt hành động; sau đó tách ảnh bắt buộc khỏi ảnh tải theo nhu cầu và điều phối tải/decode. Các bước này chưa được thực hiện trong đợt 1.
