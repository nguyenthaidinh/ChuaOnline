# Bàn giao Chặng 0–1 — 03/11/2026

Đã tách bản web chạy bằng Vite và tạo `dist/` không cần backend.
Chỉ làm chặng chuẩn bị và tách web; chưa thực hiện Chặng 2–6, chưa xuất bản website.

## Bản gốc và môi trường

- Khi tiếp nhận, thư mục chưa có `.git` và chưa có `node_modules`. Không có thay đổi
  Git sẵn có để ghi đè. Toàn bộ nguồn được sao lưu trước khi di chuyển hoặc sửa.
- ZIP sao lưu: `F:\Dự Án Chung\ChuaOnline-original-20261103-0.zip`.
- SHA-256 ZIP: `BBAFEF4B96400D18F9ED34D72F15D18FA1AF48483634A7218682E0D782C111E3`.
- Commit nhập ban đầu: `4dedf92`, tag `baseline-import-20261103`.
- Đã so nội dung tám file quan trọng với commit upstream
  `0f52515c2737a9a9ca4f1f9517bd0454e30e33ae`: package, lockfile, BAT, server, App,
  ChanhDienStage, soundEngine, templeScene. Cả tám khớp khi chuẩn hóa xuống dòng.
  Chi tiết: `baseline-comparison.json`. Không khẳng định đã đối chiếu mọi file upstream.
- Windows, Node.js `22.18.0`, npm `11.17.0`; đáp ứng engine của công cụ trong lockfile.

## File thay đổi

| File/nhóm | Thay đổi |
| --- | --- |
| package.json, package-lock.json | dev/start chạy Vite; thêm typecheck; bỏ dependency server, TikTok, TTS, motion/lucide không còn dùng; khóa đúng phiên bản đã có trong lockfile |
| .npmrc | ignore-scripts=true, ngăn lifecycle scripts chạy khi cài |
| tsconfig.json | strict=true, chỉ kiểm tra src và vite.config.ts; giữ skipLibCheck cho declaration của thư viện như bản gốc |
| vite.config.ts | Vite trực tiếp, base tương đối, chặn truy cập archive qua dev server; không proxy/backend |
| index.html | Tiếng Việt, title/description cho website, bỏ font từ Google và metadata livestream; favicon tạm rỗng |
| src/App.tsx | Màn hình vào, tên tùy chọn trong bộ nhớ, âm thanh chủ động, quay lại trang đầu |
| src/components/WelcomePanel.tsx | Form bắt đầu, tên tối đa 32 ký tự, nhạc mặc định tắt |
| src/components/ChanhDienStage.tsx | Cảnh kiểm thử một nhân vật, không quà/like/bảng xếp hạng/crowd; tải Three.js sau khi vào |
| src/config/templeAssets.ts | Một cấu hình cho ảnh nền, nhạc và năm FBX; dùng BASE_URL |
| src/services/soundEngine.ts | Thay engine TTS bằng nhạc cục bộ, chuông Web Audio, âm lượng, hủy nhạc và giải phóng âm thanh |
| src/three/Temple3D.tsx | Giữ pipeline tải model; timeout 30 giây, xử lý mất context, báo fallback và cho thử lại |
| src/three/templeScene.ts | Giữ animation; tải asset từ cấu hình, bỏ dò nhanvat.fbx không tồn tại, thay Clock đã deprecated bằng delta time |
| src/three/retarget.ts | Tái sử dụng nguyên nội dung |
| src/main.tsx, src/index.css | Entry mới và CSS tối thiểu; Tailwind chỉ quét src, không quét archive |
| archive/live/ | Lưu nguyên source, BAT, server, tài liệu/cấu hình gốc và asset không còn sử dụng |
| public/assets | Chỉ giữ một nền gốc, một nhạc và năm FBX trong bản web; các file khác được chuyển vào archive |
| README.md, docs/, .gitignore | Hướng dẫn chạy, báo cáo, danh mục asset, bằng chứng kiểm tra; bỏ qua dữ liệu QA tạm |

## Dependency và lifecycle scripts

1. Đọc script ở package gốc, lockfile và BAT trước khi cài. Không chạy BAT.
2. Kiểm tra metadata `msedge-tts@2.1.0`: preinstall là `npx only-allow pnpm`.
   Bỏ hoàn toàn package này cùng đường TTS, không sửa bằng cách chạy npx đó.
3. Tạo lại lockfile bằng `npm install --package-lock-only --ignore-scripts --no-audit --no-fund`.
4. So lockfile trước/sau: 296 → 123 package; không có phiên bản package giữ lại bị đổi.
   Bỏ esbuild/tsx/autoprefixer và dependency backend không còn dùng. Chỉ `fsevents@2.3.3`
   còn được đánh dấu hasInstallScript, là gói tùy chọn macOS, không cài trên Windows này.
5. Cài bằng `npm ci --ignore-scripts --no-audit --no-fund`: thành công, 51 package thực tế.
6. Đọc package manifest đã tải mà không chạy script: prepare của tween.js, enhanced-resolve
   và lightningcss được ghi trong `dependency-lifecycle-review.json`; không thực thi chúng.
7. `npm audit --omit=dev --json` và `npm audit --json`: không có advisory được báo tại lần kiểm tra.

Không nâng hàng loạt thư viện. Đây là rà dependency/lifecycle và advisory, không phải
kiểm toán toàn bộ mã của mọi dependency.

## Lệnh và kết quả nghiệm thu

| Kiểm tra | Kết quả quan sát |
| --- | --- |
| npm run typecheck | Đạt, TypeScript strict cho mã web và cấu hình; không thêm any hoặc ts-ignore |
| npm run build | Đạt, Vite 8.3.5; 11 file, khoảng 15.37 MB gồm model/nhạc |
| npm run dev -- --port 5173 --strictPort | Vite khởi động trực tiếp; GET / trả 200; không chạy server.ts |
| npm run preview -- --port 4173 --strictPort | Bản build khởi động bằng Vite preview |
| Preview có request log tại 4174 | Mở bằng trình duyệt thực, có ảnh, FBX, trạng thái “Chánh điện đã sẵn sàng” và một nhân vật |
| Vào không nhập tên | Hiển thị “Khách”, mặc định nhạc tắt |
| Vào với tên An Nhiên | Tên hiển thị đúng, vẫn giữ trong bộ nhớ trang |
| Thỉnh chuông/bật nhạc/tắt nhạc/âm lượng | Không có lỗi console; nút nhạc chuyển trạng thái phát/tắt, slider lên 100%; chưa đánh giá chất lượng nghe bằng thiết bị âm thanh thực |
| Nhạc tải muộn | GET MP3 xuất hiện sau khi bấm bật nhạc, trả 206; không tải nhạc lúc mở trang im lặng |
| Network | Các request ghi lại chỉ tới HTML/CSS/JS/ảnh/FBX/MP3; không /api/tiktok, /api/control, /api/tts hoặc SSE |
| Build scan | Không có EventSource, URL API cũ, msedge-tts, tiktok-live-connector, archive/server/BAT/.env trong output |
| Console bản build cuối | Không có warn/error trong phiên được quan sát |

Chứng cứ: `static-web-verification.json`, ảnh `stage-1-preview.jpg`.
Request log có một favicon 404 của phiên kiểm thử đầu; đã thêm favicon rỗng và kiểm tra
bản build cuối. Cảnh báo THREE.Clock ở phiên đầu đã được sửa; log console cuối rỗng.

## Chưa xác minh và phần để sau

- Chưa thử điện thoại thật, các kích thước mục tiêu, xoay máy hoặc desktop 16:9.
  Cảnh tạm vẫn dọc 9:16/max 430px theo phạm vi Chặng 1.
- Chưa kiểm tra lệnh thắp hương/lễ Phật hữu hạn, bấm liên tục, hai tab và callback hoàn tất:
  các chức năng này chưa được tạo và thuộc Chặng 2.
- Có nhánh fallback/timeout/mất context và thử lại trong code, chưa mô phỏng lỗi model,
  tải chậm, mất WebGL hoặc trình duyệt từ chối audio trong QA lần này.
- Chưa thử liên tục 15–30 phút, đo FPS/bộ nhớ hoặc xác minh thu hồi hết tài nguyên 3D.
- Build vẫn cảnh báo chunk Three.js khoảng 647 KB lớn hơn 500 KB; đã lazy-load khỏi
  trang bắt đầu, tối ưu sâu hơn thuộc Chặng 5.
- Asset dùng cho thử tại máy chưa xác minh đầy đủ quyền xuất bản; xem `ASSETS.md`.
- Chưa deploy và chưa kiểm tra HTTPS/hosting thật.

## Chặng 2 tiếp theo

Tạo useTempleSession và kiểu hành động: ID ổn định, idle/moving/performing/returning/error,
lệnh thắp hương và lễ Phật hữu hạn, callback hoàn tất, chặn lệnh xung đột bằng ref đồng bộ,
watchdog khi animation lỗi. Giữ chuông/nhạc độc lập với trạng thái bận. Thử bấm nhanh,
hai tab, lỗi model và hoàn tất nghi lễ trước khi chuyển sang bố cục.

## Quay lại phiên bản trước

Để xem bản gốc trong thư mục riêng, không làm mất bản web đang sửa:

```powershell
git worktree add --detach "../ChuaOnline-baseline" baseline-import-20261103
```

Hoặc giải nén ZIP sao lưu sang một thư mục khác. Không chạy BAT hoặc cài package bản
gốc trước khi xử lý lifecycle scripts. Bản hoàn thành hiện tại lưu tại tag `stage-1-static-web`.
