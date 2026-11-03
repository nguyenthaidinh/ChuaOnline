# Đi Chùa Online — chánh điện chung

Bản hiện tại cho nhiều khách cùng xuất hiện trong một chánh điện. Mỗi người có tên,
y phục và chỗ ngồi riêng; mọi khách thấy nhân vật và nghi lễ của nhau. Số người là
khách đang tham gia thật, không có người mẫu hoặc số trực tuyến giả.

Giao diện dùng ảnh và nhân vật từ thư mục ChuaTanPhat do người dùng chỉ định.
Bản ngang được tạo theo ảnh chánh điện đó, không dùng nền SVG tạm trước đây.

## Chạy để phát triển

Node.js 22.12 trở lên (đã kiểm tra 22.18.0), npm.

```powershell
npm ci --ignore-scripts
npm run dev
```

Mở địa chỉ Vite in ra, thường là http://127.0.0.1:5173/.
Lệnh dev chạy cả Vite và máy chủ phòng ở 127.0.0.1:8787. Ctrl+C dừng cả hai.
Vite chuyển tiếp /api/room tới máy chủ phòng; không cần mở thêm terminal.

## Kiểm tra và chạy bản build

```powershell
npm run typecheck
npm test
npm run build
npm run preview
```

Preview phục vụ cả giao diện production và phòng chung ở http://127.0.0.1:4173/.
Để chạy bình thường bằng cổng 3000:

```powershell
npm run build
npm start
```

Nếu cổng bị chiếm, đặt PORT trước khi chạy. Máy chủ mặc định chỉ nhận từ máy này.
Để thử các thiết bị cùng mạng, có thể đặt HOST=0.0.0.0 và mở địa chỉ IP LAN của máy
chạy Node; các thiết bị phải cùng truy cập một máy chủ đó.

## Thử phòng chung

1. Mở hai tab cùng địa chỉ.
2. Tab đầu bấm Vào an tọa, nhập tên và chọn y phục.
3. Tab thứ hai vào với tên khác: cả hai thấy cùng danh sách và hai nhân vật.
4. Thắp hương hoặc Lễ Phật 3 lạy: khách khác nhìn thấy hành động.
5. Rời điện: người đó biến mất ở các tab còn lại.

Lệnh nghi lễ do máy chủ nhận và định thời. Bấm dồn không tạo hàng đợi vô hạn.
Khách vào sau thấy đúng tiến độ đang chạy. Nhạc/chuông là âm thanh riêng trên thiết bị,
chỉ phát sau thao tác. Tên hiển thị công khai trong phòng và dài tối đa 32 ký tự.

## Vận hành hiện tại

- Một phòng, tối đa 24 khách, bốn vị trí làm lễ đồng thời.
- Trạng thái nằm trong bộ nhớ một tiến trình Node; khởi động lại máy chủ sẽ đặt lại phòng.
- Khi đóng tab, trình duyệt gửi yêu cầu rời phòng. Mất kết nối không gửi được yêu cầu:
  khách được dọn sau khoảng 90 giây không có heartbeat.
- Chưa có tài khoản, lịch sử lâu dài hoặc đồng bộ giữa nhiều máy chủ.
- Đã kiểm tra hai tab trình duyệt và giao tiếp HTTP/SSE; chưa thử tải 24 thiết bị thật.

**Bản này cần máy chủ Node để chia sẻ phòng. Chỉ tải dist lên hosting tĩnh sẽ không
đủ. Chưa triển khai công khai lên Internet.** Người truy cập bản được triển khai chỉ
cần trình duyệt, không cần cài Node trên thiết bị của họ.

## Tài liệu

- [Báo cáo bản phòng chung và giao diện mới](docs/SHARED-ROOM.md)
- [Kiểm tra hai tab](docs/shared-room-browser-checks.json)
- [Nguồn tài nguyên và ảnh mở rộng](docs/SHARED-ASSETS.md)

Mốc Git mới: shared-room-v1. Bản trước còn ở tag stage-3-responsive-web.
Các báo cáo STAGE-0-1/2/3 là lịch sử phạm vi cũ; quyết định dùng phiên riêng/hosting
thuần tĩnh trong các báo cáo đó đã được thay bằng yêu cầu phòng chung của người dùng.

Mã: MIT theo LICENSE. Tài nguyên có nguồn và điều kiện riêng, xem tài liệu tài nguyên.
