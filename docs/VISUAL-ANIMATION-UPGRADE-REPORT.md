# Báo cáo nâng cấp hình ảnh và hoạt ảnh

Ngày 04/11/2026, múi giờ Asia/Saigon. Phạm vi: sửa và kiểm thử **local**, không
đẩy GitHub hoặc triển khai website. Bản đầu vào: `ba6b787` / `shared-offerings-audio-v1`.
Mốc bàn giao local: `visual-upgrade-v1`.

Đã đọc toàn bộ `Chùa Online_ đặc tả nâng cấp hình ảnh và hoạt ảnh.md`, README,
protocol, room client/server, renderer, CSS và tài nguyên thật. Không tìm thấy
AGENTS.md trong dự án hoặc các thư mục cha đã kiểm. File đặc tả do người dùng thêm
được giữ nguyên nội dung và giữ nguyên trạng thái chưa được Git theo dõi.

## 1. Đối chiếu và kết quả theo đợt

Đường render thực tế đúng như tài liệu: `App → RoomScene`, HTML/CSS/sprite 2D.
`src/three` và FBX không được App gọi, không viết lại ứng dụng sang 3D.
Ban đầu có 27 test đạt, sprite đi/ngồi 8 ô và timeline co/xoay ảnh để giả lạy.
Ảnh ngồi có sách/bồ đoàn, bộ cũ có viền tím; nền dọc có sẵn bồ đoàn/khói.
Kiểm tra kích thước thật khớp đặc tả: nền ngang cũ 1672×941, nền dọc 1080×1920,
sheet nam/nữ 1696×300 và người áo nâu 1560×300.

| Đợt | Đã triển khai và kiểm | Phần chưa được coi là nghiệm thu cuối |
| --- | --- | --- |
| 1 | Thiết kế gốc áo lam, góc lưng/mặt, tư thế quỳ/lạy/dâng lễ; nền ngang/dọc cùng chùa; bồ đoàn, bóng và vật phẩm rời | Master nền được công cụ trả về 1672×941 / 941×1672, chưa đạt mục tiêu master 2560×1440 / 1080×1920 |
| 2 | Manifest, renderer theo metadata, đường đi có góc bo và độ dài; ảnh phía trước khi quay về; đủ ba lần lạy sát sàn | Chỉ có hai nhóm góc trước/sau với lật trái/phải. Chuyển giữa key pose còn cảm giác từng khung; chưa có rig hoặc tween giải phẫu liên tục |
| 3 | Hương cầm/nâng/đưa tới lư/đặt/rút tay; vật rời tay đúng mốc; khói nhỏ sau khi đặt; kết quả dùng thời gian và ID từ server | Đã xem ở kích thước cảnh và phóng lớn tiếp xúc, chưa có người làm animation độc lập duyệt mọi frame |
| 4 | Sen/khay, cánh sen và chuông có vật phẩm/timeline riêng; nữ áo lam và áo nâu được nhân rộng từ atlas đã kiểm | Đã xem bảng pose và hoạt động trong bài mô phỏng; các biến thể có độ phân giải thấp hơn bộ nam |
| 5 | Decode ảnh trước khi vào điện; lỗi/tải lại; giảm chuyển động áp dụng JS; hai tab, bốn nghi lễ, mô phỏng 24 khách; ảnh và MP4 | Chưa điện thoại thật, chưa thử tải lâu, chưa thử mạng đứt/nối hoặc tab ẩn bằng điều khiển trình duyệt thực tế |

Một nhân vật nam đã được thử đủ ba lạy và thắp hương trong trình duyệt trước khi
nhân rộng hai bộ y phục còn lại. Không lấy một ảnh concept làm bằng chứng hoạt ảnh.

## 2. Code đã đổi và lý do

| File/nhóm file | Thay đổi |
| --- | --- |
| `src/App.tsx` | Trạng thái tải/lỗi, khóa vào điện đến khi decode xong; tùy chọn giảm chuyển động; chuông theo mốc chạm và không phát bù; thông báo hoàn tất đúng nghi lễ hiện tại |
| `src/room/RoomScene.tsx` | Ghép nền, bồ đoàn cố định, nhân vật và lớp lễ vật; bỏ bộ ảnh cũ khỏi đường render |
| `src/room/CharacterSprite.tsx` | Renderer đọc kích thước atlas, clip, floor pivot, điểm tay/lớp prop; chọn hướng theo vector di chuyển; không squash/rotate toàn người để giả lạy |
| `src/room/animationManifest.ts` | Clip/frame/thời lượng/loop/hướng/stride, các mốc place/release/strike và metadata cho ba bộ ảnh |
| `src/room/visualGeometry.ts`, `variantGeometry.ts` | Điểm tay và đỉnh hình đo theo canvas cố định, xuất từ các script đóng gói |
| `src/room/motion.ts` | Mặt sàn logic, cửa, 24 chỗ ngồi, bốn vị trí làm lễ, đường bo góc, lấy vị trí theo quãng đường; làn đi/về lệch nhau |
| `src/room/layout.ts` | Chiếu mặt sàn sang hai bố cục; tỷ lệ người và vị trí nhận lễ xuất phát từ cùng điểm tay |
| `src/room/ritual.ts` | Một timeline tuyệt đối cho pose, bộ đếm ba lạy, cầm/rời prop và mốc tương tác; thời lượng di chuyển do server gửi |
| `src/room/OfferingLayer.tsx`, `placedOfferings.ts` | Bàn/lư/chuông, lớp che trước/sau, kết quả tồn tại có giới hạn; tái dựng cùng ID trước khi SSE tới, không sinh thêm kết quả khi render lại |
| `src/room/sceneAnimation.ts` | Một bộ lập lịch khoảng 30 Hz; bỏ qua nhân vật đã nghỉ; dừng khi tab ẩn và lấy lại tư thế theo thời gian khi hiện |
| `src/room/useReducedMotion.ts`, `useSceneAssets.ts` | Tùy chọn hệ thống và UI; tải/decode/cache ảnh với timeout, lỗi và retry |
| `src/room/clock.ts`, `client.ts` | Ước lượng clock theo RTT HTTP, không để SSE trễ kéo clock ngược; refresh khi reconnect/hiện tab |
| `src/room/interactionCue.ts` | Chuông một lần tại mốc chạm; bỏ cue cũ/quá hạn hoặc khi tab ẩn |
| `src/room/protocol.ts`, `server/room.ts` | Thời lượng/seat của đường đi, vật đã đặt, TTL và giới hạn; server áp dụng kết quả một lần, không tin thời gian do client tự gửi |
| `src/index.css` | Canvas/pivot mới, bóng, bồ đoàn, lớp che/prop/khói/cánh sen nhỏ; desktop 1366×768 vừa viewport; không còn CSS giả lạy bằng co ảnh |
| `tests/sharedRitual.test.ts`, `tests/room.test.ts` | Cập nhật các bất biến timeline, ba pose lạy sát sàn, một lần đặt vật, clock, vào muộn và tái dựng; bỏ giả định bộ cũ luôn kết thúc sau số giây cố định |
| `scripts/pack-visual-assets.py`, `pack-visual-variants.py` | Đóng atlas từ nguồn đã xem; pivot/scale được đo, không auto-crop rồi căn giữa từng frame; kiểm frame bị cắt và alpha |
| `scripts/qa-room-load.mjs` | Client HTTP/SSE mô phỏng chỉ cho localhost, tự vào/rời phòng và ghi kết quả; không tạo người giả trong sản phẩm |
| `scripts/export-visual-evidence.py` | MP4 từ ảnh chụp trình duyệt có timestamp, storyboard và kiểm số lần xuất hiện pose lạy |

Các clip và helper cũ trong `src/three`/services được giữ để không phá phần lịch sử;
không được dùng để vẽ nhân vật hiện tại. Nhạc, lời chúc, chọn y phục, rời điện và
cơ chế phòng chung vẫn có. Không thêm tài khoản, xu, thanh toán hoặc TikTok.

## 3. Tài nguyên đã tạo và hợp đồng hình/code

Nguồn chất lượng gốc: `artwork/visual-v2/`. Bản web: `public/assets/visual-v2/`.
Công cụ: **image_gen tích hợp**, không dùng CLI/API riêng. Đã thực hiện 29 lượt
tạo/chỉnh ảnh; giữ 29 PNG nguồn và một atlas nam được đóng từ các pose đã kiểm.
Prompt đầy đủ, ảnh tham chiếu và file đầu ra: `artwork/visual-v2/generation-prompts.json`.
Kích thước, alpha, SHA256 và dung lượng: `visual-upgrade/asset-inventory.json`.

- Nhân vật gốc: reference riêng → pose quỳ/lạy/dâng lễ và hai study đi bộ →
  kiểm/chuẩn hóa → atlas → thử chuỗi trong trình duyệt → hai biến thể nữ/áo nâu.
- Mỗi atlas có 30 ô: 14 ô tư thế/chuyển tiếp (có ô quỳ dùng lại), tám ô đi về phía
  bàn thờ và tám ô phía trước cho chiều trở về. Bộ nam 384×512/ô; biến thể
  192×256/ô. Cả hai quy về cùng chiều cao thế giới và floor pivot.
- Không gắn sách, bồ đoàn, khói hoặc lễ vật vào ảnh cơ thể. Bồ đoàn và chín ảnh
  prop/bàn nhận lễ là tài nguyên riêng. Bóng là ellipse CSS đơn giản.
- Nền là thiết kế gốc mới; bản mobile tham chiếu chính nền desktop mới, không
  mở rộng lại ảnh Tân Phát. Không vẽ bồ đoàn hoặc khói sẵn vào sàn.
- Có bảng pose nền sáng/tối, loop đi/lạy và ảnh tiếp xúc phóng lớn. Không thấy
  viền tím/hồng rõ hoặc mất chi trong các hình đã kiểm. Script kiểm giới hạn ô
  trước khi ghép để không âm thầm cắt hình.
- Study `walk-front.png` lần đầu còn nền sáng đục: **không dùng**. Đã yêu cầu công
  cụ tách nền, kiểm alpha và dùng `walk-front-alpha.png` cho atlas.
- Quy tắc scale/pivot/hand đo bằng tay được lưu trong `frame-normalization.json`;
  không căn lại từng pose theo alpha bounds. Bounds chỉ dùng kiểm clipping và
  làm nhãn; crop tĩnh chỉ áp dụng khi xuất riêng prop/preview.

Tổng 17 ảnh web khoảng **2,16 MB** cho cả hai nền và preview; phần thiết yếu
desktop khoảng **1,90 MB**, chưa tính JS/CSS/nhạc. Không tải FBX/ảnh cũ trong cảnh.
Nhạc chỉ tải khi bật. Mã và tài nguyên cũ vẫn giữ nguồn như tài liệu lịch sử;
việc tạo bộ hình mới không thay đổi điều kiện của các bài nhạc đã có.

## 4. Quy tắc đồng bộ và vòng đời

Server giữ 24 khách, bốn slot. Thời gian vào/đi lên/đi về phụ thuộc độ dài đường
logic, không phụ thuộc viewport. Server và renderer dùng chung clip durations và
interaction markers. Resize, render lại hoặc lấy snapshot muộn không đổi startedAt.

Mỗi kết quả có ID `${action.id}:placed`, thời điểm đặt và hết hạn. Server áp dụng
mỗi action một lần, kể cả khi sweep đi qua nhiều giai đoạn. Khói bắt đầu từ đầu
hương sau mốc đặt. Client chỉ tái dựng kết quả từ cùng command server trong khoảng
chờ SSE, gộp theo cùng ID.

Giới hạn: tối đa 12 kết quả trong phòng; tối đa ba bó hương hoặc một khay sen mỗi
slot. Hương/sen 60 giây, cánh sen 8 giây. Đổi loại bố trí tại một slot dọn vật của
loại cũ; chuông không tạo vật tồn tại lâu. Vật còn lại không biến mất chỉ vì người
đặt rời phòng. Phòng và kết quả vẫn ở RAM một tiến trình Node.

Chuông của người thao tác chỉ vang tại marker strike, theo âm lượng thiết bị;
khách khác thấy động tác. Cue quá 350 ms hoặc tab ẩn bị bỏ, không phát bù hàng loạt.
Giảm chuyển động thay bước đi bằng tư thế chính và tắt chuyển động khói/cánh hoa;
thời gian, bộ đếm và kết quả server vẫn tiếp tục.

## 5. Kết quả kiểm tra

| Kiểm tra | Kết quả thực tế |
| --- | --- |
| `npm run typecheck` | Đạt |
| `npm test` | **33/33 đạt**, 0 lỗi |
| `npm run build` | Đạt; JS khoảng 261,8 KB, CSS khoảng 20,4 KB trước gzip |
| Atlas | Có alpha; kiểm bounds toàn bộ ô, bảng nền sáng/tối; không crop động theo từng pose |
| Desktop | 1366×768 và 1920×1080; bản cuối 1366×768 có scrollHeight=clientHeight=768, không tràn ngang |
| Mobile | Viewport 390×844, documentWidth=390; xem cảnh, menu và nghi lễ |
| Hai client | Hai tab độc lập; thấy chung người, hành động và ID kết quả |
| Vào muộn/tải lại | Khay sen `766b49bb-9c68-4db8-90a3-6085881c1442:placed` giữ đúng một ID trước/sau reload; không nhân đôi |
| Resize | Trong bài 24 khách, chuyển desktop sang mobile khi người đang lạy; tiến độ đi tiếp đến ba lạy, không trở lại đứng dậy |
| Giảm chuyển động JS | Đã bật ngay khi đang đi: phase moving dùng standFront; tắt lại trong cùng nghi lễ trở về walkRear, không phát lại action |
| Lỗi tài nguyên | Tạm làm thiếu atlas ở dist: báo lỗi, khóa vào điện; phục hồi file và Retry thành công. File đã trả lại trước khi bàn giao |
| Tải phòng | Hai khách trình duyệt + 22 client HTTP/SSE mô phỏng, 24 người/bốn action đồng thời; 31 action, 1946 SSE event, không lỗi runner; client mô phỏng tự rời |
| Chi phí vẽ | Quan sát desktop khoảng 28,7 cập nhật/s, 0,670 ms/callback batch; mobile khoảng 30,0 cập nhật/s, 0,887 ms. Đây là chi phí JS, không phải thời gian paint/GPU hay kết quả điện thoại thật |
| Console | Các lượt production bình thường được kiểm không có warn/error; ca cố tình làm thiếu ảnh có lỗi tải dự kiến |
| Video | H.264, 1366×768, 28,24 giây, 505 ảnh chụp có timestamp, khoảng 17,9 fps; giải mã toàn file không lỗi. Thấy ba lần bowHold và bộ đếm 0/1/2/3 |

Video dựng từ **ảnh chụp thật của trình duyệt theo thời gian**, không tạo motion từ
ảnh concept. Video không có track âm thanh và không dùng để suy ra FPS ứng dụng.
Những lần xuất bản video gặp lỗi metadata đã được ghi lại; file bàn giao dùng
capture mới có đủ 505 frame và đã được kiểm container/giải mã.

Bằng chứng chính trong `docs/visual-upgrade/`:

- `ritual-sequence.mp4`, `ritual-storyboard.jpg`, `video-verification.json`.
- `desktop-1366.png`, `desktop-1920.png`, `load-desktop-1920.png`, `load-mobile-390.png`.
- `lotus-mobile.png`, `petal-mobile.png`, `bell-mobile.png`, `bow-contact-detail.png`,
  `incense-contact-study.jpg`, `reduced-motion-mobile.png`, `asset-error.png`.
- `poses-light.jpg`, `poses-dark.jpg`, `woman-atlas-check.jpg`, `granny-atlas-check.jpg`,
  các loop WebP và ảnh kiểm mép sáng/tối.
- `browser-checks.json`, `load-report.json`, `frame-normalization.json`, `asset-inventory.json`.

## 6. Giới hạn và mục còn thiếu

Chưa coi chuyển động đã đạt chất lượng animation cuối cùng. Những gì còn cần làm
hoặc kiểm chứng ngoài đợt này:

1. Thêm frame trung gian/rig 2D để chuyển quỳ–lạy–đứng và tay nâng/đặt liên tục hơn.
   Hiện đã có pose cơ thể thật, nhưng vẫn nhìn ra các bước key pose. Nhịp chân được
   gắn quãng đường; chưa thể khẳng định đã hết trượt chân ở mọi đường đi/góc.
2. Bổ sung góc nghiêng bên và nhiều góc quay thay cho chỉ hai nhóm trước/sau.
   Chưa có camera tự do hoặc rig 3D; bàn nhận lễ chuyển bố trí theo loại nghi lễ.
3. Master nền chưa đạt độ phân giải mục tiêu; biến thể nữ/áo nâu chỉ phù hợp avatar
   nhỏ. Phóng lớn toàn cảnh hoặc màn hình DPR cao cần nguồn render nét hơn.
4. Chưa thử điện thoại thật, Safari/iOS, loa/tai nghe hoặc chất lượng tiếng chuông
   bằng tai. Đã kiểm logic cue/volume; MP4 bàn giao không ghi audio.
5. Chưa kiểm e2e mạng mất/nối hoặc tab bị ẩn/throttled lâu. Đã có xử lý trong code
   và test bỏ cue cũ, nhưng không ghi thành kết quả trình duyệt đã thử.
6. Bài tải khoảng 100 giây, cùng một máy. Không thay cho thử 24 thiết bị/đường mạng
   độc lập hoặc vận hành lâu. Chưa database, Redis hoặc nhiều server.
7. Chưa có họa sĩ/animator độc lập duyệt toàn bộ anatomy, loop và độ mượt. Ảnh/clip
   được giao để người dùng kiểm trực quan; build/test đạt không thay thế bước đó.

Không có triển khai công khai hoặc push repo trong đợt này. Thư mục Tân Phát không
bị sửa. Máy chủ preview và các khách mô phỏng thuộc phiên kiểm tra được dọn khi kết thúc.

## 7. Chạy lại

```powershell
cd "F:\Dự Án Chung\ChuaOnline"
npm run dev
```

Mở `http://127.0.0.1:5173/`, mở hai tab để thử phòng chung. Ctrl+C dừng.

```powershell
npm run typecheck
npm test
npm run build
npm run preview
```

Preview production: `http://127.0.0.1:4173/`. Không cần tạo lại ảnh để chạy web.
Script đóng gói ảnh là công cụ tác giả tùy chọn, cần Python/Pillow; xuất lại MP4
cần ffmpeg và raw capture trong `.local-qa/`, thư mục này không đưa vào Git.
`node scripts/qa-room-load.mjs` chạy bài mô phỏng trên preview localhost và tự dọn
client do nó tạo; chạy bài này trong một phòng kiểm tra riêng.
