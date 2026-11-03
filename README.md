# Đi Chùa Online — bản web độc lập

Bản làm việc sau Chặng 0–1: React, TypeScript, Vite và Three.js chạy trong trình duyệt.
Không cần server Express, TikTok, SSE, API điều khiển hoặc TTS.
Mỗi tab giữ tên hiển thị và trạng thái nhạc trong bộ nhớ; không đăng nhập,
không gửi tên lên máy chủ, không lưu vào localStorage.

## Chạy tại máy

Môi trường đã kiểm tra: Windows, Node.js 22.18.0, npm 11.17.0.
`package.json` khai báo Node `^22.12.0 || >=24.0.0`.

```powershell
npm ci --ignore-scripts
npm run dev
```

Mở địa chỉ Local Vite in ra, thường là `http://127.0.0.1:5173/`.
Bấm **Bắt đầu**, nhập tên tùy chọn; mặc định không phát âm thanh.
Nhạc chỉ được tải khi bạn chọn bật nhạc. Có chuông tổng hợp và chỉnh âm lượng.
Không cần `.env`, không chạy file BAT cũ.

```powershell
npm run typecheck
npm run build
npm run preview
```

`dist/` là đầu ra tĩnh. `preview` chỉ để kiểm tra tại máy.
`npm start` là bí danh chạy Vite ở chế độ phát triển. `.npmrc` tắt lifecycle scripts;
không tự bật lại nếu chưa rà dependency thay đổi.

## Phạm vi đã làm

- Luồng vào riêng, tên tùy chọn, lựa chọn bật nhạc sau thao tác chủ động.
- Cảnh cũ dạng dọc với một nhân vật để kiểm tra tải model, đi và quỳ.
- Tách UI/sự kiện livestream và TTS khỏi mã frontend đang chạy.
- Cấu hình đường dẫn ảnh, FBX, nhạc tại `src/config/templeAssets.ts`.
- Thông báo tải, lỗi 3D, biểu tượng dự phòng và nút thử lại.
- TypeScript strict cho toàn bộ `src` và cấu hình Vite.

Chưa thực hiện lệnh thắp hương/lễ Phật trực tiếp (Chặng 2), bố cục desktop 16:9
và điểm neo desktop/mobile (Chặng 3), ảnh mới và tối ưu phát hành (Chặng 4–5).
Không triển khai công khai trong lượt này.

## Tài liệu và điểm phục hồi

- [Báo cáo Chặng 0–1](docs/STAGE-0-1.md): thay đổi, kiểm tra, giới hạn và công việc tiếp theo.
- [Danh mục tài nguyên](docs/ASSETS.md): nguồn khai báo và quyền chưa xác minh.
- `archive/live/` giữ mã livestream, cấu hình và README gốc; không nằm trong build.
- Tag `baseline-import-20261103` giữ toàn bộ bản nhập trước khi sửa.
- Tag `stage-1-static-web` giữ bản hoàn thành chặng này.

Tạo thư mục riêng để xem lại bản gốc mà không ghi đè công việc hiện tại:

```powershell
git worktree add --detach "../ChuaOnline-baseline" baseline-import-20261103
```

Không chạy BAT hoặc cài dependency của bản gốc trước khi rà lại lifecycle scripts.

## Giấy phép

Mã nguồn: [MIT](LICENSE). Tài nguyên có điều kiện riêng; xem `docs/ASSETS.md` trước khi xuất bản.
