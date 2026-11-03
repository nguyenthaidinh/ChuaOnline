# Đi Chùa Online — bản web độc lập

Bản làm việc sau Chặng 3: React, TypeScript, Vite và Three.js chạy trong trình duyệt.
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
Chọn **Thắp hương** hoặc **Lễ Phật · 3 lạy** để nhân vật đi lên thực hiện nghi lễ và
trở về chỗ. Khi nhân vật bận, nút nghi lễ tạm khóa; nhạc, chuông và lời chúc vẫn dùng được.
Nếu model lỗi, bản web tự chuyển sang nhân vật 2D có cùng luồng nghi lễ.
Không cần `.env`, không chạy file BAT cũ.

```powershell
npm run typecheck
npm test
npm run build
npm run preview
```

`dist/` là đầu ra tĩnh. `preview` chỉ để kiểm tra tại máy.
`npm start` là bí danh chạy Vite ở chế độ phát triển. `.npmrc` tắt lifecycle scripts;
không tự bật lại nếu chưa rà dependency thay đổi.

## Phạm vi đã làm

- Luồng vào riêng, tên tùy chọn, lựa chọn bật nhạc sau thao tác chủ động.
- Chánh điện ngang 16:9 trên máy tính, dọc 9:16 trên điện thoại; một nhân vật riêng mỗi phiên.
- Điểm neo, camera, kích thước nhân vật, hào quang, bồ đoàn dùng chung cấu hình desktop/mobile.
- Đổi kích thước hoặc xoay màn hình không khởi động lại nghi lễ; thanh thao tác nằm ngoài cảnh.
- Có toàn màn hình, âm thanh thu gọn trên mobile và bảng lời chúc đóng được bằng nút hoặc Escape.
- Thắp hương và lễ Phật đủ ba lạy, theo trạng thái di chuyển/thực hiện/trở về/hoàn tất/lỗi.
- Chặn bấm dồn, không xếp hàng vô hạn; lỗi có thể thử lại, có watchdog 45 giây.
- Lời chúc soạn sẵn; nghi lễ hoạt động cả ở chế độ dự phòng 2D.
- Tách UI/sự kiện livestream và TTS khỏi mã frontend đang chạy.
- Cấu hình đường dẫn ảnh, FBX, nhạc tại `src/config/templeAssets.ts`.
- Thông báo tải, lỗi 3D, biểu tượng dự phòng và nút thử lại.
- TypeScript strict cho `src`, cấu hình Vite và tests; 13 bài kiểm tra nghi lễ/phiên/tọa độ.

Nền hiện tại là SVG tạm để căn bố cục. Ảnh hoàn thiện và tối ưu phát hành thuộc
Chặng 4–5. Ô lời nguyện cá nhân để sau luồng chính.
Không triển khai công khai trong lượt này.

## Tài liệu và điểm phục hồi

- [Báo cáo Chặng 0–1](docs/STAGE-0-1.md): thay đổi, kiểm tra, giới hạn và công việc tiếp theo.
- [Báo cáo Chặng 2](docs/STAGE-2.md): thao tác web, kiểm thử và phần chưa xác minh.
- [Báo cáo Chặng 3](docs/STAGE-3.md): bố cục desktop/mobile, kiểm thử resize và file thay đổi.
- [Mô tả ảnh cần tạo](docs/SCENE-ART-BRIEF.md): góc nhìn, điểm neo và prompt cho Chặng 4.
- [Danh mục tài nguyên](docs/ASSETS.md): nguồn khai báo và quyền chưa xác minh.
- `archive/live/` giữ mã livestream, cấu hình và README gốc; không nằm trong build.
- Tag `baseline-import-20261103` giữ toàn bộ bản nhập trước khi sửa.
- Tag `stage-1-static-web` giữ bản hoàn thành Chặng 1.
- Tag `stage-2-web-actions` giữ bản có thao tác nghi lễ trực tiếp.
- Tag `stage-3-responsive-web` giữ bản bố cục ngang và mobile.

Tạo thư mục riêng để xem lại bản gốc mà không ghi đè công việc hiện tại:

```powershell
git worktree add --detach "../ChuaOnline-baseline" baseline-import-20261103
```

Không chạy BAT hoặc cài dependency của bản gốc trước khi rà lại lifecycle scripts.

## Giấy phép

Mã nguồn: [MIT](LICENSE). Tài nguyên có điều kiện riêng; xem `docs/ASSETS.md` trước khi xuất bản.
