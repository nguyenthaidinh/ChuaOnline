# Bản phòng chung và giao diện ảnh — 03/11/2026

Yêu cầu mới của người dùng: mọi khách cùng một phòng, thấy nhân vật của nhau;
làm lại giao diện bằng tài nguyên tại `F:\Dự Án Chung\ChuaTanPhat`.
Yêu cầu này thay phạm vi phiên riêng và hosting thuần tĩnh ban đầu.

## Đã thay đổi

- `src/App.tsx`, `src/index.css`: giao diện chánh điện ảnh, header gọn, số người thực,
  các bảng vào phòng/y phục/âm thanh/lời chúc và thanh nghi lễ. Giao diện desktop ngang,
  điện thoại dùng ảnh dọc gốc, không có SVG phác thảo trong giao diện hiện tại.
- `src/room/RoomScene.tsx`, `layout.ts`, `Icon.tsx`: nhân vật 2D từ bộ ảnh tham chiếu,
  sprite đi, an tọa và phản hồi nghi lễ hữu hạn. Có nhiều nhân vật theo danh sách thật,
  không tạo crowd giả. Nhãn vàng là nhân vật của khách; chạm khách để thấy tên.
- `src/room/client.ts`, `useRoom.ts`: HTTP và EventSource cùng nguồn; cập nhật khách,
  làm lễ, rời phòng, reconnect và heartbeat. Token chỉ ở bộ nhớ của tab.
- `src/room/protocol.ts`: kiểu dữ liệu và thông số dùng chung frontend/backend.
- `server/room.ts`: chỗ ngồi do máy chủ cấp; lệnh chỉ điều khiển chủ token; chống lệnh
  trùng/xung đột; bốn vị trí nghi lễ; hoàn tất và dọn khách hết hạn.
- `server/index.ts`: máy chủ HTTP thuần Node phục vụ dist và API/SSE. Có giới hạn
  body, phòng, kết nối và tần suất; kiểm tra nguồn POST; token không vào snapshot public.
- `src/services/ritualTimeline.ts`: thêm lấy tư thế theo thời gian tuyệt đối. Khách
  vào sau hoặc reconnect không chạy lại nghi lễ từ đầu. Ba lạy vẫn hữu hạn.
- `scripts/dev.mjs`, `scripts/preview.mjs`, `package.json`, `vite.config.ts`: một lệnh
  dev chạy frontend và phòng; preview/start có cả máy chủ phòng. Đã thử proxy Vite;
  sửa changeOrigin=false để yêu cầu cùng nguồn không bị từ chối nhầm.
- `tsconfig.json`: typecheck strict cả backend; không thêm any hoặc bỏ kiểm tra.
- `public/assets/tanphat/`, `artwork/hall-desktop-original.png`: ảnh nền và sprite,
  bản ngang mở rộng theo ảnh gốc. Không sửa thư mục ChuaTanPhat.
- `tests/room.test.ts`: kiểm tra trạng thái và HTTP/SSE hai khách độc lập.

Không cài thêm package hoặc nâng dependency. React/TypeScript/Vite được giữ.
Mã Three.js của các chặng trước còn trong lịch sử/nguồn, nhưng bản giao diện này dùng
sprite để đồng bộ nhiều khách với cùng phong cách ảnh và giảm yêu cầu GPU.

## Kết quả kiểm tra

- `npm run typecheck`: đạt.
- `npm test`: 19/19 đạt, gồm sáu kiểm tra mới về phòng chung; giữ các kiểm tra timeline
  và phép chiếu của các chặng trước. Các kiểm tra phiên riêng cũ không được dùng làm
  bằng chứng cho phòng chung; bằng chứng phòng là kiểm tra server/HTTP/SSE mới.
- `npm run build`: đạt, JS khoảng 242 KB minified / 76 KB gzip; không tải chunk Three.js.
- `npm run dev`: Vite khởi động cùng Node ở 8787; GET trang, join và leave qua proxy
  cùng nguồn đều HTTP 200. Không cần tự mở backend riêng.
- `npm run preview`: chạy giao diện build và API/SSE ở 4173.
- Hai tab với hai tên An Nhiên và Bình An: cả hai cùng thấy hai ID, hai nhân vật và
  số người bằng 2. Hai tab có self ID khác nhau.
- Tab An Nhiên bấm đúp Lễ Phật: chỉ một nghi lễ; tab Bình An cũng thấy nhân vật
  An Nhiên ở trạng thái moving. Nghi lễ kết thúc và trở lại an tọa, không lặp vô hạn.
- Hai người làm lễ đồng thời: An Nhiên lễ Phật, Bình An thắp hương; cả hai tab thấy
  cùng hai nhân vật di chuyển. Máy chủ cấp hai vị trí nghi lễ khác nhau.
- Bình An rời điện: tab An Nhiên tự còn một nhân vật và số người giảm xuống 1.
- Điện thoại mô phỏng 390×844: nền dọc từ thư mục người dùng, có hai nhân vật,
  scrollWidth=clientWidth=390, không cuộn ngang. Đã mở/đóng bảng âm thanh và lời chúc,
  bật/tắt nhạc và thỉnh chuông.
- Console tab bình thường không có warn/error trong phiên được quan sát.
- Kiểm tra server: không có người mặc định; token không lộ trong snapshot; token A
  không điều khiển người B dù POST có actorId B; nguồn sai và token sai bị từ chối;
  hết heartbeat được dọn và chỗ trống tái sử dụng. Khách vào sau lấy đúng tiến độ.

Bằng chứng: `shared-room-browser-checks.json`, `shared-room-desktop.jpg`,
`shared-room-mobile.jpg`. Hai khách trong ảnh là hai tab kiểm thử thật, không phải
người mặc định của ứng dụng.

## Giới hạn thực tế

- Đã chạy và kiểm tra **cục bộ**, chưa có URL công khai. Muốn khách trên Internet
  vào cùng phòng cần triển khai cả Node service và frontend trên cùng địa chỉ.
  Cấu hình hosting tĩnh trong kế hoạch cũ không còn đủ cho phạm vi này.
- Một tiến trình Node, một phòng 24 khách; chưa kiểm tra 24 thiết bị thật hoặc tải
  đồng thời lớn. Chưa dùng Redis/database để chia sẻ trạng thái nhiều instance.
- Dữ liệu phòng ở RAM, đặt lại khi restart. Không có tài khoản/lịch sử lâu dài.
- Kết nối rơi mà không gửi leave giữ khách tối đa khoảng 90 giây; UI hiện trạng thái
  kết nối lại và tạm chặn gửi nghi lễ khi mất kết nối.
- Hoạt ảnh dùng sprite 2D và biến đổi tư thế theo timeline; không phải avatar FBX
  có rig 3D. Âm thanh phát riêng trên thiết bị, không phát chuông đồng loạt cho cả phòng.
- Mobile mới kiểm tra bằng viewport, chưa điện thoại thật hoặc thời gian dài.
- Tài nguyên lấy từ thư mục được người dùng chỉ định. Nguồn gốc được ghi lại;
  việc công khai tài nguyên cần xem quyền của bản gốc riêng.

## Chạy và khôi phục

Xem README ở gốc cho dev/build/start. Dừng bằng Ctrl+C.
Mốc hiện tại: `shared-room-v1`.

```powershell
git worktree add --detach "../ChuaOnline-before-shared" stage-3-responsive-web
```

Lệnh trên mở bản trước trong thư mục khác, không ghi đè bản phòng chung hiện tại.
