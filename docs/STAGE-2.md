# Bàn giao Chặng 2 — phiên cá nhân và thao tác web

Hoàn thành chức năng Chặng 2 trên bản web. Chưa chuyển sang bố cục Chặng 3,
chưa tạo ảnh mới, chưa xuất bản website.

## Hành vi đã có

- Mỗi lần vào chánh điện tạo một phiên và một ID nhân vật riêng. ID giữ nguyên qua
  các nghi lễ; rời cảnh rồi vào lại tạo phiên mới. Không đăng nhập hoặc lưu trên server.
- **Thắp hương:** đi từ chỗ ngồi lên vị trí nghi lễ, cầm hương, hoàn tất rồi quay về.
  Có khói nhẹ tại vị trí lư hương sau khi thắp. Không tự kèm thêm lượt lạy.
- **Lễ Phật · 3 lạy:** đi lên, lạy đúng ba lần, quay về chỗ và hiện lời báo hoàn tất.
  Nhân vật chờ yên sau đó, không có vòng lạy tự động.
- Trạng thái `idle → moving → performing → returning → idle`; khi lỗi chuyển `error`,
  bỏ lệnh đang chạy và cho phép thực hiện lại. Watchdog 45 giây ngăn khóa thao tác mãi.
- Chỉ có một lệnh cơ thể tại một thời điểm; chặn ngay trong store trước khi React
  kịp vẽ nút disabled. Không giữ hàng đợi và không tạo thêm nhân vật khi bấm dồn.
- Nhạc, chuông, âm lượng và lời chúc vẫn dùng được khi nhân vật bận.
- Lời chúc soạn sẵn, mở/đóng được và tránh lặp ngay lời vừa nhận.
- Khi không tải được model hoặc cảnh 3D mất khả dụng, chuyển sang hình đại diện 2D.
  Cả hai nghi lễ vẫn chạy hữu hạn và có thông báo hoàn tất. Có nút thử lại 3D.

## File thay đổi

| File | Vai trò |
| --- | --- |
| src/types/experience.ts | Kiểu lệnh, trạng thái, sự kiện và phiên |
| src/services/templeSession.ts | Một store riêng mỗi lần vào cảnh; giữ ID, chặn lệnh trùng, bỏ callback cũ, xử lý lỗi |
| src/hooks/useTempleSession.ts | Kết nối React qua useSyncExternalStore và watchdog |
| src/services/ritualTimeline.ts | Chuỗi nghi lễ hữu hạn dùng chung cho renderer 3D và 2D; tiến độ từng lạy, callback một lần |
| src/config/ritual.ts | Ba lạy, thời lượng, timeout và điểm neo tạm cho nền dọc |
| src/three/templeScene.ts | Một nhân vật, không crowd/zoom; đi, cầm hương, lạy hữu hạn, về chỗ; giải phóng tài nguyên khi rời cảnh |
| src/three/Temple3D.tsx | Nhận lệnh trực tiếp và trả sự kiện; timeout tải, mất context, hủy tác vụ và thu hồi asset |
| src/components/TempleFallback.tsx | Nhân vật SVG 2D, chuyển động và nghi lễ theo cùng timeline |
| src/components/ChanhDienStage.tsx | Ghép 3D/2D, ảnh, nhãn tên, khói và thử lại model |
| src/components/TempleExperience.tsx | Điều phối phiên, trạng thái, thanh nghi lễ và lời chúc |
| src/components/ExperienceActions.tsx | Nút thắp hương, ba lạy và lời chúc |
| src/data/blessings.ts | Nội dung lời chúc cục bộ |
| src/App.tsx, src/index.css | Tích hợp trải nghiệm, trạng thái bận, nhãn và bảng lời chúc |
| package.json, tsconfig.json, tests/ritual.test.ts | npm test bằng Node, kiểm tra kiểu cả tests và tám bài kiểm tra hành vi |
| README.md, docs/STAGE-2.md, docs/stage-2-* | Hướng dẫn và bằng chứng kiểm tra |

Không thêm package và không đổi package-lock. Nguồn lưu trữ trong archive không thay đổi.

## Kiểm tra đã chạy

- `npm run typecheck`: đạt, strict cho src/tests/cấu hình. Không thêm any hoặc ts-ignore.
- `npm test`: 8/8 đạt. Bao gồm ba lạy rồi dừng, thắp hương không lạy ngầm,
  hủy callback, dữ liệu thời gian không hợp lệ, 100 lần gọi chỉ nhận một lệnh,
  chuyển fallback giữa nghi lễ, giải phóng sau lỗi/watchdog và hai phiên độc lập.
- `npm run build`: đạt, 39 module. Cảnh 3D tải riêng sau khi vào chánh điện.
- Bản production preview được kiểm tra bằng trình duyệt ở 4174. File asset được
  ghi request log ở lớp phục vụ tĩnh, không thêm mã kiểm thử vào bản web.
- Trình duyệt: lễ Phật hoàn tất đủ ba lạy, trở lại idle, command rỗng, nút mở lại.
  Thắp hương bằng bấm đúp chỉ chạy một nghi lễ, vẫn chỉ có một canvas/nhân vật.
- Khi đang thực hiện nghi lễ: dùng được chuông, nhạc chuyển sang đang phát, nhận được lời chúc.
- Hai tab cùng địa chỉ có ID khác nhau: tab một idle, tab hai moving; khói và tiến độ
  không truyền sang nhau. Mỗi tab chỉ có một nhân vật.
- Rời chánh điện khi đang thắp hương rồi vào lại: phiên mới, trạng thái idle, không
  nối tiếp nghi lễ cũ hoặc nhân đôi canvas.
- QA lỗi model ở 4175: chủ động trả HTTP 503 cho di.fbx. Web chuyển sang 2D;
  bấm đúp lễ Phật hoàn tất ba lạy, thắp hương hoàn tất, nút mở lại.
- Sau khi bỏ lỗi 503, bấm Thử lại 3D: model tải được và nghi lễ sẵn sàng.
- Console của phiên bình thường không ghi nhận warn/error. Ở phiên lỗi có request
  503 cố ý; không xem lỗi chủ động đó là lỗi tải tự nhiên của bản phát hành.
- Quét mã src/output và request log: không có request API hoặc SSE. Request quan sát
  là HTML/CSS/JS, nền, FBX và MP3; nhạc tải khi người dùng bật.

Ảnh minh họa: `stage-2-preview.jpg`, `stage-2-fallback.jpg`.
Bằng chứng request: `stage-2-verification.json`.

## Giới hạn còn lại

- Đây vẫn là cảnh dọc tạm 9:16, điểm nghi lễ tạm. Bố cục desktop 16:9, camera/kích cỡ
  nhân vật và điểm neo mobile sẽ xử lý ở Chặng 3.
- Chưa thử điện thoại thật, đo FPS hoặc dùng liên tục 15–30 phút.
- Chưa cưỡng bức mất WebGL context thật hoặc chờ watchdog hết 45 giây trong trình duyệt;
  nhánh giải phóng lỗi và bỏ callback cũ đã được kiểm tra ở tầng logic.
- Chưa đo tài nguyên GPU sau nhiều vòng vào/ra, dù code đã có dispose geometry,
  material, texture, skeleton, renderer và hủy RAF/ResizeObserver/timer.
- Chunk 3D khoảng 641 KB vẫn có cảnh báo lớn hơn 500 KB; tối ưu sâu ở Chặng 5.
- Quyền asset cũ vẫn chưa được xác minh đầy đủ; không tự xuất bản bộ tài nguyên này.
- Ô lời nguyện cá nhân là phần bổ sung sau luồng chính, chưa thực hiện trong chặng này.

## Chạy và quay lại

```powershell
npm run dev
npm run typecheck
npm test
npm run build
npm run preview
```

Điểm lưu: tag `stage-2-web-actions`. Xem lại bản trước trong thư mục riêng:

```powershell
git worktree add --detach "../ChuaOnline-stage-1" stage-1-static-web
```

Chặng 3 tiếp theo: bố cục desktop 16:9 và mobile, gom ảnh/điểm nghi lễ/nhân vật/camera
vào cấu hình bố cục chung, kiểm tra đổi kích thước khi nghi lễ đang chạy.
