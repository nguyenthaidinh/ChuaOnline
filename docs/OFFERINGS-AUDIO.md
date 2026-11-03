# Hoạt ảnh, lễ vật và âm thanh — 03/11/2026

Bản này tiếp nối `shared-room-v1`, tập trung vào trải nghiệm web theo yêu cầu:
đi lên dâng hương, lễ vật và âm nhạc. Mốc bàn giao: `shared-offerings-audio-v1`.

## Hành vi hiện tại

- Vào điện: đi từ cửa tới chỗ riêng rồi ngồi xuống, tổng 3,28 giây.
- Dâng lễ: đứng dậy → đi lên → dâng lễ → trở về → ngồi lại, tổng 9,8 giây.
  Bốn lựa chọn hoàn toàn miễn phí: dâng hương, dâng hoa sen, rải cánh sen,
  thỉnh chuông. Có lễ vật bên nhân vật và hiệu ứng ở khu vực bàn thờ.
- Lễ Phật: đứng dậy → đi lên → quỳ → đủ 3 lạy → đứng dậy → trở về → ngồi lại,
  tổng 15,06 giây. Các nút nghi lễ tạm khóa trong lúc nhân vật đang di chuyển/làm lễ.
- Máy chủ định thời toàn bộ chuỗi, kể cả lúc đứng/ngồi. Khách khác cùng thấy
  hành động và lễ vật. Vào muộn hoặc đổi kích thước màn hình không chạy lại nghi lễ.
  Nếu API nhận lệnh trong lúc đi vào, lệnh chờ kết thúc hoạt ảnh vào điện.
- Dùng đủ tám khung hình sẵn có cho mỗi y phục: bốn đi, bốn ngồi;
  đảo thứ tự khung ngồi để đứng dậy. Không sao chép người demo của Tân Phát.
- Nhạc: Trăng trên rừng trúc, Hơi thở ban mai, Nhạc thư giãn. Có chọn bài,
  bài tiếp theo, bật/tắt, âm lượng, chuông và mõ. Chỉ một bộ phát nhạc;
  âm lượng điều khiển cả nhạc và âm thanh tổng hợp.
- Khi chính người dùng chọn lễ thỉnh chuông, chuông vang một lần ở giai đoạn
  làm lễ trên thiết bị đó. Khách khác thấy hiệu ứng; âm thanh vẫn riêng từng thiết bị.
  Không tự phát nhạc khi mở trang hoặc khi có người khác dâng lễ.

## Kiểm tra đã thực hiện

- `npm run typecheck`: đạt.
- `npm test`: 27/27 đạt; bao gồm HTTP/SSE, xác thực, giới hạn phòng,
  bốn lễ vật, thứ tự các giai đoạn, đủ ba lạy, vào muộn, đổi bố cục,
  dùng một bộ phát, đổi bài khi lệnh phát cũ còn chờ, lỗi autoplay và tắt tiếng.
- `npm run build`: đạt.
- Trình duyệt bản production cục bộ, hai tab độc lập An Nhiên/Bình An:
  thấy cùng phòng; dâng sen, rải cánh sen và thỉnh chuông truyền sang tab còn lại.
  Lễ Phật hoàn tất có bộ đếm 3, trở về chỗ và mở lại các nút.
- Chuyển tab quan sát sang 390×844 ngay trong giai đoạn lạy:
  hành động tiếp tục; chiều rộng tài liệu và viewport đều 390 px, không tràn ngang.
  Menu lễ vật và âm thanh vừa màn hình.
- Bấm bật nhạc thành công; đổi sang Hơi thở ban mai khi đang phát;
  Bài tiếp theo sang Nhạc thư giãn; giảm âm lượng về 0 và tắt nhạc.
  Bấm chuông/mõ không có lỗi được ghi nhận. Hai tab không có console warn/error
  trong các lần kiểm tra. Đây là kiểm tra trạng thái phát và giao diện,
  chưa phải đánh giá chất lượng âm thanh bằng tai trên loa/điện thoại thật.

Ảnh bằng chứng: `offerings-desktop.png`, `offerings-mobile.png`,
`offerings-mobile-menu.png`, `audio-mobile.png`.
Ảnh có hai khách kiểm thử thật, không phải đám đông dựng sẵn.

## Phạm vi thực tế

Hoạt ảnh là sprite 2D. Cúi lạy dùng biến đổi hình ảnh; bộ tham chiếu chỉ có
khung nhìn từ sau, chưa có hoạt ảnh quay mặt về phía người xem hoặc nhân vật 3D
có khớp tay chân thực hiện lễ sát đất. Đổi bố cục kiểm tra bằng viewport,
chưa kiểm tra trên điện thoại thật.

Vẫn chạy cục bộ, chưa phát hành công khai. Phòng chung vẫn dùng một tiến trình
Node, RAM, tối đa 24 khách; chưa kiểm tra tải 24 thiết bị. Thư mục ChuaTanPhat
không bị sửa. Chỉ chép tài nguyên được liệt kê trong SHARED-ASSETS;
không lấy hệ thống xu, thanh toán hoặc bảng xếp hạng của bản tham chiếu.

Chạy bằng `npm run dev`, hoặc `npm run build` rồi `npm run preview`.
Ảnh kiểm tra được giữ lại; máy chủ preview dùng cho kiểm tra được dừng sau khi bàn giao.
