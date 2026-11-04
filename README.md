# Đi Chùa Online — chánh điện chung

Bản hiện tại cho nhiều khách cùng xuất hiện trong một chánh điện. Mỗi người có tên,
y phục và chỗ ngồi riêng; mọi khách thấy nhân vật và nghi lễ của nhau. Số người là
khách đang tham gia thật, không có người mẫu hoặc số trực tuyến giả.

Giao diện dùng nền ngang/dọc, ba y phục, bồ đoàn và vật phẩm tách rời từ `visual-v2`.
Nam áo lam có chuỗi dâng hương v2 và một phần chuyển động từ `animation-v3`, tạo bằng image_gen.
Bộ tham chiếu ChuaTanPhat còn lưu để
đối chiếu lịch sử; ảnh và sprite cũ không còn nằm trong đường render chính.

## Chạy để phát triển

Đang nâng cấp trên nhánh `codex/animation-v3`. Có xưởng xem chậm hoạt ảnh tại
`/?animation-lab` khi chạy dev. [Kết quả kiểm mẫu và hướng dẫn](docs/animation-v3/README.md).
Chuỗi đứng dậy–bước đi–dừng–ngồi mới có bản thử riêng tại `/?animation-lab=transitions`;
xem [bản tinh chỉnh, video và kết quả kiểm](docs/animation-v3/transition-refinement/README.md).
Chuỗi dâng hương mới đã vào phòng chung cho nam áo lam: lấy hương, nâng, cúi lễ,
cắm vào lư và rút tay; xem [ảnh, video và kết quả kiểm](docs/animation-v3/incense-v1/README.md).
Xưởng riêng tại `/?animation-lab=incense`. Các hướng đi và y phục còn lại vẫn cần hoàn thiện.

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
4. Thắp hương, Lễ Phật 3 lạy hoặc Dâng lễ: khách khác nhìn thấy hành động và lễ vật.
5. Rời điện: người đó biến mất ở các tab còn lại.

Lệnh nghi lễ do máy chủ nhận và định thời. Bấm dồn không tạo hàng đợi vô hạn.
Khách vào sau thấy đúng tiến độ đang chạy. Nhạc/chuông là âm thanh riêng trên thiết bị,
chỉ phát sau thao tác. Tên hiển thị công khai trong phòng và dài tối đa 32 ký tự.

Nhân vật đi vào và ngồi xuống; khi làm lễ sẽ đứng dậy, đi lên, thực hiện nghi lễ,
trở về rồi ngồi lại. Renderer đọc atlas/clip/pivot/điểm tay từ manifest. Có ảnh mặt
cho chiều quay về, tư thế quỳ và lạy sát sàn, không co/xoay cả ảnh để giả lạy.
Bồ đoàn ở lại chỗ. Đường đi đo theo quãng đường trên cùng mặt sàn logic cho mọi
viewport; server đóng dấu thời lượng riêng cho từng đường đi.

Dâng lễ có bốn lựa chọn miễn phí: hương, hoa sen, cánh sen và thỉnh chuông.
Hương chuyển từ tay vào lư tại mốc đặt, sau đó mới có khói nhỏ. Sen đặt lên bàn,
cánh sen rơi xuống sàn, chuông có mốc chạm riêng. Server giữ kết quả tối đa
60 giây (cánh sen 8 giây), tối đa 12 vật, ba bó hương hoặc một khay sen mỗi vị trí.
Đổi loại nghi lễ sẽ dọn vật của bố trí trước tại vị trí đó.

Nút **Bật nhạc** phát ngay và mở bảng âm thanh. Khi vào điện có tùy chọn bật nhạc thiền.
Chọn **Trăng trên rừng trúc**, **Hơi thở ban mai** hoặc **Nhạc thư giãn**.
Có bật/tắt, bài tiếp theo, chỉnh âm lượng, chuông và mõ. Nhạc chỉ tải sau thao tác bật;
đổi bài dùng lại một bộ phát. Âm lượng 0 tắt cả nhạc và tiếng chuông/mõ.
Có Giảm chuyển động trong menu Âm thanh, áp dụng cả chuyển động bằng JS.

Lời chúc có 80 câu, xáo ngẫu nhiên không lặp cho đến hết lượt; có nút nhận câu khác.
Khi dâng lễ, hương/hoa/chuông/cánh sen hiện thêm ở trước tượng Phật trong 6 giây,
đồng bộ theo mốc dâng của phòng chung. Sau khi về chỗ không hiện lời cảm ơn dùng vật phẩm.
Ảnh và kết quả kiểm tra: [lời chúc, hiệu ứng bàn thờ và nhạc](docs/offering-blessing-audio/README.md).
Ảnh thiết yếu được tải/decode trước khi cho vào điện; lỗi ảnh có nút tải lại.

## Vận hành hiện tại

- Một phòng, tối đa 24 khách, bốn vị trí làm lễ đồng thời.
- Trạng thái nằm trong bộ nhớ một tiến trình Node; khởi động lại máy chủ sẽ đặt lại phòng.
- Khi đóng tab, trình duyệt gửi yêu cầu rời phòng. Mất kết nối không gửi được yêu cầu:
  khách được dọn sau khoảng 90 giây không có heartbeat.
- Chưa có tài khoản, lịch sử lâu dài hoặc đồng bộ giữa nhiều máy chủ.
- Đã kiểm tra hai tab, mô phỏng 22 client HTTP/SSE cộng hai khách trình duyệt:
  24 người và bốn nghi lễ đồng thời; chưa thử 24 thiết bị thật.
- Bộ hình 2D dùng tư thế chính và các frame đi bộ; chuyển tư thế còn cảm giác
  từng khung, chưa đạt mức chuyển động mượt của nhân vật có rig.

**Bản này cần máy chủ Node để chia sẻ phòng. Chỉ tải dist lên hosting tĩnh sẽ không
đủ. Chưa triển khai công khai lên Internet.** Người truy cập bản được triển khai chỉ
cần trình duyệt, không cần cài Node trên thiết bị của họ.

## Tài liệu

- [Báo cáo nâng cấp hình ảnh và hoạt ảnh hiện tại](docs/VISUAL-ANIMATION-UPGRADE-REPORT.md)
- [Video chuỗi nghi lễ](docs/visual-upgrade/ritual-sequence.mp4)
- [Báo cáo bản phòng chung và giao diện mới](docs/SHARED-ROOM.md)
- [Kiểm tra hai tab](docs/shared-room-browser-checks.json)
- [Nguồn tài nguyên và ảnh mở rộng](docs/SHARED-ASSETS.md)
- [Hoạt ảnh, lễ vật và âm thanh](docs/OFFERINGS-AUDIO.md)

Mốc Git mới: visual-upgrade-v1 (local). Bản trước ở shared-offerings-audio-v1.
Bản phòng chung trước còn ở shared-room-v1;
bản trước phòng chung còn ở stage-3-responsive-web.
Các báo cáo STAGE-0-1/2/3 là lịch sử phạm vi cũ; quyết định dùng phiên riêng/hosting
thuần tĩnh trong các báo cáo đó đã được thay bằng yêu cầu phòng chung của người dùng.

Mã: MIT theo LICENSE. Tài nguyên có nguồn và điều kiện riêng, xem tài liệu tài nguyên.
