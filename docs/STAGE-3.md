# Bàn giao Chặng 3 — desktop 16:9 và mobile

Đã làm bố cục ngang/dọc và đồng bộ các lớp theo một cấu hình cảnh.
Giữ chức năng nghi lễ của Chặng 2. Chưa thực hiện ảnh hoàn thiện Chặng 4 hoặc xuất bản.

## Thay đổi chính

- Desktop từ 768px dùng khung 16:9, rộng theo diện tích màn hình, không còn giới hạn
  sân khấu 430px. Ở 1366×768 và 1920×1080, cảnh, nút và trạng thái nằm trong trang
  mà không cần cuộn dọc/ngang.
- Mobile dưới 768px dùng khung 9:16 và nền dọc riêng. Điện thoại dùng dọc được;
  có thể cuộn dọc xuống thao tác/âm thanh, không phải xoay ngang, không cuộn ngang.
- Khi xoay sang ngang trên màn hình thấp, giữ cảnh đủ rộng và cho cuộn dọc;
  không ép toàn bộ cảnh thành một ô rất nhỏ để nhét vào chiều cao.
- `sceneLayout.ts` là nguồn chung cho vị trí chỗ ngồi, vùng quỳ, lư hương, hào quang,
  bồ đoàn, kích thước nhân vật và camera. Desktop/mobile có cấu hình riêng.
- Three.js cập nhật camera, điểm sàn và tỷ lệ nhân vật khi resize. Giữ nguyên timeline,
  command ID và tiến độ đang chạy. Bản 2D cũng đổi tọa độ theo layout mới mà không
  tạo timeline khác.
- Bỏ kích thước nhân vật cố định nhỏ ở bản trước: chiều cao biểu kiến theo phần trăm
  khung, có độ nhỏ dần khi đi lên. Hương cầm tay được chỉnh tỷ lệ tương ứng.
- Nền SVG tạm ngang/dọc có cùng kiến trúc, một lư hương và sàn trống. Đường sàn dùng
  điểm tụ tính từ chính camera Three.js. Không có người, chữ, bồ đoàn hoặc khói vẽ sẵn.
- Thanh thao tác ở ngoài khung. Âm thanh có nút thu gọn trên mobile. Lời chúc dùng
  dialog trong viewport, có đóng/ESC và focus của dialog. Có vào/thoát toàn màn hình.

## File thay đổi

| File/nhóm | Công việc |
| --- | --- |
| src/config/sceneLayout.ts | Hai layout, điểm neo, camera, tỷ lệ nhân vật, vị trí theo tiến độ và chân trời của sàn |
| src/hooks/useSceneLayout.ts | Theo dõi breakpoint ngang/dọc, dọn listener khi rời trải nghiệm |
| src/three/sceneProjection.ts | Quy đổi điểm trên khung sang sàn 3D và ngược lại, tính tỷ lệ nhân vật theo chiều cao biểu kiến |
| src/three/templeScene.ts | Reflow camera/điểm neo/kích thước, giữ tiến độ, hiệu chỉnh tỷ lệ hương |
| src/three/Temple3D.tsx | Chuyển layout vào cảnh, cập nhật bằng layout effect, không remount khi đổi layout |
| src/components/TempleFallback.tsx | Layout ref và tiến độ riêng, không khởi động lại animation khi resize |
| src/components/ChanhDienStage.tsx | Tỷ lệ khung, nền theo layout, hào quang/bồ đoàn/khói theo cùng điểm neo |
| src/components/TempleExperience.tsx | Layout dùng chung, toàn màn hình, dialog lời chúc, thanh thao tác ngoài cảnh |
| src/components/ExperienceActions.tsx, src/App.tsx | Thanh nghi lễ không nhảy chiều cao lúc bận; âm thanh thu gọn trên mobile |
| src/index.css | Layout desktop/mobile, bảng lời chúc, focus, kích thước nút, fullscreen và màn hình thấp |
| src/config/ritual.ts | Bỏ tọa độ tạm cũ, chỉ giữ thông số nghi lễ |
| src/config/templeAssets.ts | Cặp đường dẫn nền ngang/dọc tập trung |
| scripts/create-scene-placeholders.mjs | Sinh nền SVG có điểm neo và phối cảnh từ cấu hình |
| public/assets/web/*.svg | Hai bản vẽ căn bố cục tạm |
| archive/live/public/assets/bg/chanh-dien-2.webp | Chuyển nền cũ không dùng khỏi public; bản gốc vẫn được giữ |
| tests/sceneLayout.test.ts, package.json | Thêm năm kiểm tra tọa độ/camera/resize vào npm test |
| README.md, docs/ | Báo cáo, danh mục tài nguyên, ảnh nghiệm thu và brief ảnh cuối |

Không thêm dependency, không đổi lockfile. Snapshot mã cũ trong archive giữ nguyên;
chỉ bổ sung nền gốc được chuyển ra khỏi public.

## Kiểm tra đã chạy

- `npm run typecheck`: đạt, strict cho src, tests và cấu hình.
- `npm test`: 13/13 đạt. Giữ tám kiểm tra Chặng 2 và thêm năm kiểm tra:
  round-trip điểm neo/sàn, thay aspect phải quy đổi lại điểm, phối cảnh sàn khớp camera,
  tỷ lệ chiều cao nhân vật ở hai đầu đường đi, timeline không đổi khi đổi layout.
- `npm run build`: đạt, 42 module. Không thêm thư viện.
- Production preview trên 4174: desktop 1366×768 và 1920×1080 có đúng 16:9,
  không overflow ngang, toolbar nằm dưới mép cảnh. Đã lưu ảnh hai kích thước.
- Mobile mô phỏng 360×800, 390×844 và 430×932: tỷ lệ 9:16, nền dọc tải được,
  không overflow ngang, toolbar ở ngoài cảnh. Có cuộn dọc tự nhiên trên điện thoại.
  Windows có thanh cuộn dọc khoảng 15px, nên clientWidth đo được nhỏ hơn viewport đặt.
- Đổi từ desktop sang dọc khi đang đi lên: vẫn một canvas, giữ command ID,
  kết thúc ba lạy, về y=89% và trở về idle.
- Xoay dọc sang 844×390 khi đang lạy: giữ command ID, chân ở vùng nghi lễ y=75%,
  không sinh nhân vật/lượt lạy mới. Hoàn tất đủ ba lạy rồi về chỗ.
- Kiểm tra lại sau khi chỉnh camera cuối: đổi 1920×1080 sang 430×932 trong trạng thái
  performing, command không đổi, chân ở y=75%, sau đó đủ ba lạy và idle.
- Chủ động làm di.fbx trả HTTP 503 ở preview 4175: chuyển 2D; đổi dọc sang ngang
  giữa lúc lạy vẫn giữ command, avatar ở y=75%; đủ ba lạy rồi trở về idle.
- Mobile: mở/thu âm thanh, thỉnh chuông, mở và đóng lời chúc. Dialog nằm trong
  viewport, không làm thay đổi bố cục cảnh bên dưới.
- Nút Toàn màn hình đổi thành Thu nhỏ/aria-pressed=true; thoát trở lại trang bình thường.
- Thắp hương ở bản cuối hoàn tất, khói xuất hiện tại x=50%, y=61%, chân nhân vật
  trở về y=89%. Console phiên bình thường không có warn/error được ghi nhận.
- Request log chỉ có file tĩnh. HTTP 503 duy nhất là lỗi model chủ động dùng cho QA.

Bằng chứng: `stage-3-layout-checks.json`, `stage-3-verification.json`,
`stage-3-desktop-1366.jpg`, `stage-3-desktop-1920.jpg`, `stage-3-mobile-360.jpg`,
`stage-3-mobile-430.jpg`, `stage-3-fallback.jpg`.

## Giới hạn và phần tiếp theo

- Nền SVG là bản căn bố cục, chưa phải hình ảnh bán hiện thực cuối. Brief đã ghi
  tại [SCENE-ART-BRIEF.md](SCENE-ART-BRIEF.md), có tọa độ, kích thước và prompt.
- Kiểm thử mobile ở viewport trình duyệt, chưa phải thiết bị điện thoại thật;
  chưa xác minh bàn phím ảo, thanh địa chỉ động và fullscreen trên iOS/Android.
- Chưa đo FPS/bộ nhớ hoặc chạy liên tục 15–30 phút; thuộc Chặng 5.
- Chunk Three.js khoảng 642 KB vẫn có cảnh báo lớn hơn 500 KB. Đã giữ lazy-load;
  không tự nâng độ phân giải renderer vượt giới hạn 1080px đang có.
- Nguồn/quyền model và nhạc cũ vẫn cần kiểm tra trước phát hành.
- Chưa thêm ô lời nguyện, mức chất lượng hoặc ảnh/logo/nhạc mới; không công khai website.

## Cách chạy và quay lại

```powershell
npm run dev
npm run typecheck
npm test
npm run build
npm run preview
```

Mốc hoàn thành: tag `stage-3-responsive-web`. Để xem lại Chặng 2 trong thư mục riêng:

```powershell
git worktree add --detach "../ChuaOnline-stage-2" stage-2-web-actions
```

Chặng 4: dùng brief và hai SVG làm tham chiếu để tạo một nền ngang trước,
sau đó nền dọc cùng phong cách; kiểm tra ghép lớp trước khi tối ưu WebP và làm nhận diện.
