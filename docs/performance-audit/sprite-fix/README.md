# Sửa đường vẽ nhân vật bị chớp khi đi — 05/11/2026

Người dùng vẫn thấy nam áo lam lúc hiện lúc mất sau đợt tối ưu tải trang. Các test logic và ảnh chụp thưa trước đó chưa đủ để xác nhận đã hết lỗi hiển thị trên thiết bị người dùng.

## Kiểm tra thuật toán

- Nam, ghế 0, entryVersion 5: lấy mẫu mỗi 33 ms trong lượt vào điện dài 7.239 ms cho thấy **36 lần đổi nguồn atlas**, chủ yếu giữa expanded-directions/directional-walk và man-closes tại tư thế chuyển chân. Đây là số lần đổi nguồn vẽ, không phải số request mạng đã đo được.
- Kiểm tra alpha các ô đã lấy mẫu không thấy khung trắng/ảnh gần như trống: mức phủ alpha ≥128 thấp nhất khoảng 7,37%, thuộc tư thế lạy, không phải khung đi bị thiếu.
- Trước sửa, renderer thay CSS backgroundImage/size/position và preload chỉ giữ Promise hoàn tất; không giữ nguồn bitmap độc lập để vẽ. Những điều này chưa chứng minh độc lập nguyên nhân trên máy người dùng, nhưng để lại phụ thuộc vào decode/cache/paint của trình duyệt khi đổi atlas.
- Vì vậy sửa ở đường vẽ, không chỉ giảm dung lượng hoặc tăng FPS.

## Thay đổi

- Loader giữ nguồn `ImageBitmap` đã giải mã cho atlas/ảnh ngồi khi trình duyệt hỗ trợ; có nguồn HTMLImageElement đã decode làm dự phòng.
- Giải phóng nguồn ảnh tạm sau khi bitmap được tạo; bitmap hoàn tất sau timeout được đóng, không đưa vào cache.
- Nhân vật dùng canvas với bộ đệm chuẩn bị riêng. Chỉ thay bitmap hiển thị sau khi cắt/vẽ thành công khung tiếp theo; nguồn chưa sẵn sàng hoặc không hợp lệ giữ nguyên hình trước đó.
- Giữ backing canvas **192×256** thay vì đổi giữa 144×192 và 192×256 theo atlas. Điều này tránh cấp phát lại surface ở mỗi bước chuyển chân. CSS vẫn giữ đúng kích thước/vị trí nhân vật trong cảnh.
- Lớp che bàn tay dùng cùng cơ chế; hương/lễ vật và thứ tự lớp giữ nguyên. Không đổi lịch nghi lễ, đường đi hay tên nguồn khung.
- Khung có cùng nguồn/ô ảnh không vẽ lại. Tách phép biến đổi vị trí khỏi việc dựng CSS background không còn dùng trong renderer.

## Kiểm chứng

- **141/141 test đạt**, typecheck, build và diff check đạt.
- Test renderer mới: crop đúng ô, chuyển atlas khác độ phân giải mà không đổi kích thước surface, bỏ vẽ lại khung trùng, giữ bitmap trước nếu nguồn thiếu/chỉ số sai/vẽ staging không thành công.
- Chụp **16 mẫu liên tiếp lúc nam đi vào điện**, gồm nhiều điểm chuyển sang man-closes; ảnh nhân vật hiện trong tất cả mẫu đã ghép. [Ảnh mẫu](walking-samples.png).
- Chụp **40 mẫu lúc đứng lên → đi → lấy và nâng hương**, theo dõi nguồn ảnh và kích thước canvas. Có [ảnh ghép](ritual-samples.png); vài mẫu đầu nhân vật nằm sát mép trái vùng crop, không dùng crop này để kết luận mất hình. Các ảnh toàn viewport nằm trong `.local-qa/sprite-walk`.
- Kích thước backing ổn định 192×256. Bộ đếm callback trong lượt kiểm tra nghi lễ khoảng **0,342–0,524 ms**, nhịp **29,7–30,0 Hz**; lượt vào điện có mẫu **0,411 ms / 30,3 Hz**. Đây là callback JS, không phải toàn bộ thời gian trình duyệt paint/composite.
- Chạy lại 24 khách/200 SSE tổng hợp/4 trạm, 20 lượt nghi lễ thuộc cả 3 y phục hoàn tất; 158 POST đều 200, report không lỗi. Không so p95 localhost giữa các lượt khác tải nền để tuyên bố phần trăm cải thiện.
- [Quan sát trình duyệt](browser.json), [kết quả tải phòng](load.json), [ảnh phòng đủ 24 người](crowd.png). Console error trống ở lần lấy log. Phiên browser riêng và server 4187 đã đóng sau kiểm tra; khách thử đã rời phòng.

## Giới hạn

Không giả lập mạng lỗi theo yêu cầu. Chưa tái hiện chính xác môi trường của người dùng (chưa biết URL và thiết bị), nên không khẳng định đã xác nhận nguyên nhân duy nhất hoặc hết lỗi trên mọi máy. Bản này loại bỏ việc đổi URL CSS giữa bước đi và bổ sung cơ chế giữ pixel đã vẽ; cần test bằng build mới, không bằng trang deploy cũ.

Bitmap được giữ dùng chung theo URL trong đời trang; không tạo một atlas mới cho từng nhân vật hoặc từng hành động. Đây là đánh đổi bộ nhớ để giữ nguồn vẽ ổn định. Chưa đo RAM/GPU thực trên điện thoại vật lý.

Sau quan sát browser, bước cuối bổ sung kiểm tra số hợp lệ và tách hàm transform không thay hình; toàn bộ test/typecheck/build đã chạy lại.
