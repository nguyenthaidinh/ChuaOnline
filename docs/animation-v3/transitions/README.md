# Đợt nối đứng dậy, bước đi, dừng và ngồi

Báo cáo lịch sử của commit `c412eec`. Xưởng hiện đã chuyển sang
[bản tinh chỉnh v2](../transition-refinement/README.md); nguồn, atlas và bằng chứng v1 vẫn được giữ nguyên.

Ngày 04/11/2026, nhánh `codex/animation-v3`. Tiếp tục chặng 1: tạo nguồn chuyển tiếp nam áo lam,
ghép với chu kỳ đi 12 khung đã có. Đây là bản kiểm nguồn ở xưởng; chưa thay hoạt ảnh trong phòng chung.

## Tài nguyên và chuỗi đã làm

Đã tạo **17 PNG RGBA riêng** bằng image_gen tích hợp, giữ nhân vật nam áo lam, ánh sáng ấm,
camera cố định và tỷ lệ đầu theo nguồn đi. Ngồi nhìn thẳng về tượng Phật; tư thế đứng dậy có ảnh chống tay,
đặt chân và đẩy thân riêng. Không dùng lật ảnh, biến dạng toàn thân hoặc đảo ngược đoạn ngồi để giả đứng dậy.

- [Bảng 17 tư thế](../../../artwork/animation-v3/transitions-v1/contact-sheet.jpg).
- Nguồn, prompt và ảnh tham chiếu: `artwork/animation-v3/transitions-v1/generation.json`.
- Atlas WebP: 1536×2560, 4 cột × 5 hàng, 17 ô có hình, 355.528 byte.
- Mỗi ô 384×512; điểm gốc sàn (192,468), scale 0,33 ở canvas nguồn chuẩn 1280.
  PNG thực tế 1254×1254; dùng cùng phép đổi tỷ lệ và điểm gốc chuẩn hóa cho cả bộ,
  không tự crop/căn giữa theo alpha mỗi tư thế. Kích thước, bounds và SHA-256 lưu trong `review.json`.

| Clip thử | Mốc tư thế trong timeline | Thời lượng ở 1× |
| --- | ---: | ---: |
| Đứng dậy có điểm tựa | 7 | 1,16 giây |
| Bắt đầu bước | 6 | 0,72 giây |
| Giảm tốc và dừng | 7 | 0,90 giây |
| Quay và ngồi nhìn tượng Phật | 11 | 1,50 giây |
| Ghép đứng dậy → đi → dừng → ngồi | 43 | 5,48 giây |

43 mốc ghép có sử dụng lại tư thế đầu/cuối và 12 ảnh đi, không phải 43 PNG mới.
Đoạn ghép đi 1,31 m trên mặt sàn thử, kết thúc tại bồ đoàn đích và giữ nguyên vị trí.
Thời lượng này để duyệt nguồn; không thay tốc độ hoặc lịch nghi lễ v1 của server.

[Vòng xem nguồn toàn chuỗi](../../../artwork/animation-v3/transitions-v1/sequence-loop.webp),
[đứng dậy](../../../artwork/animation-v3/transitions-v1/standUp-loop.webp),
[bắt đầu bước](../../../artwork/animation-v3/transitions-v1/startWalk-loop.webp),
[dừng](../../../artwork/animation-v3/transitions-v1/stopWalk-loop.webp),
[ngồi](../../../artwork/animation-v3/transitions-v1/sitDown-loop.webp).
Đây là WebP hoạt ảnh ghép từ ô atlas theo timeline nguồn, thêm 600 ms giữ cuối trước khi lặp;
không phải video ghi trình duyệt. Xưởng phát một lượt và giữ tư thế cuối, không tự nhảy về đầu.

## Mở và xuất lại

Chạy dev theo README dự án, mở `/?animation-lab=transitions` trên cổng Vite.
Nếu API 8787 đang chạy và chỉ cần xưởng:

```powershell
cd "F:\Dự Án Chung\ChuaOnline"
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5180 --strictPort
```

Mở `http://127.0.0.1:5180/?animation-lab=transitions`. Có chọn clip, phát 0,25×/0,5×/1×,
tua từng tư thế, scrub theo mili giây, nền sáng/tối/chùa và hai kích thước xem.
Phòng thử dùng cùng `projectFloor` và `actorMetrics` với sản phẩm; không tạo client hoặc gọi API phòng.

Xuất lại atlas nguồn v1 với Python/Pillow:

```powershell
python scripts/pack-transition-study.py
```

Packer từ chối thiếu ảnh hoặc phần thân bị cắt. `--draft` ghi rõ nguồn chưa đủ.
Timeline và vòng WebP v1 được lưu ở commit `c412eec`. Script xuất timeline/vòng xem hiện tại dùng nguồn v2;
xem cách xuất trong báo cáo tinh chỉnh. Script dùng đúng hàm TypeScript của xưởng, không giữ bản lịch riêng bằng Python.
Loader dùng chung cho hai bộ thử: kiểm manifest/ID/kích thước thật, decode ảnh, timeout/tải lại,
URL atlas mang SHA-256 để tránh lấy nhầm ảnh nháp trong cache. Module và ảnh thử nằm ngoài bản production.

## Kiểm tra đã thực hiện

- Tua đủ 43 mốc qua UI, so sánh ID/thứ tự/thời điểm với timeline biên dịch:
  [step-verification.json](step-verification.json). Ở cuối chuỗi giữ tư thế `10-seated-rear`.
- Phát 1× chuỗi ghép và đứng dậy: đúng 5,48/1,16 giây, giữ tư thế cuối:
  [playback-verification.json](playback-verification.json).
- Đứng dậy ở 0,25× cũng chạy hết và giữ tư thế đứng:
  [slow-playback-verification.json](slow-playback-verification.json).
- Phát riêng bắt đầu/dừng: đúng 0,72/0,90 giây, lần lượt giữ khung tiếp đất và đứng yên:
  [short-clips-verification.json](short-clips-verification.json).
- [Ảnh tư thế chống tay](rise-support.png) và [ảnh sau khi chạy hết chuỗi](completed.png)
  là ảnh chụp giao diện trình duyệt thật.
- [Mobile 390×844](mobile.png): dùng nền dọc, không tràn ngang, canvas nhân vật giữ tỷ lệ 3:4.
  [Số đo](mobile-verification.json). Không ghi cảnh báo/lỗi trình duyệt trong lượt kiểm này.
- `npm run typecheck`, `npm test` (46/46), `npm run build` đạt.
  Test kiểm chuyển mốc, vị trí liên tục, giữ điểm cuối, delta RAF âm và từ chối nguồn sai/thiếu.
- `npm run audit:animation`: 480 action, 207.765 mẫu vẫn khớp digest cũ;
  lịch phòng chung không đổi. Không có module TransitionLab/FBXLoader/useStudyAtlas hoặc nguồn transitions-v1
  trong JavaScript production sau build.

## Phần còn mở

Bộ hình đã có thể kiểm cả đoạn nối thay vì từng tư thế lẻ. Chưa coi là nghiệm thu hoàn tất chặng 1:

- Quay hiện có ba tư thế hướng chính; đứng dậy có bảy mốc. Cần thêm khung trung gian tại những chỗ
  đổi thân/tay rõ, so với mục tiêu 6–8 khung quay và 10–14 khung đứng dậy của kế hoạch.
- Cần khóa chân theo các đường đi và độ sâu thực, thử hướng trước/ngang và các góc còn lại.
  Một đường chéo trong xưởng chưa chứng minh chân không trượt ở toàn bộ phòng.
- Nguồn hiện mới nam áo lam; chưa sản xuất lại nữ/áo nâu.
- Chưa tạo chuỗi dâng hương mới, hai điểm nắm, lớp che bàn tay/lư hoặc thay toàn bộ nghi lễ.
- Chưa đo 24 khách trên điện thoại thật hoặc thực hiện đầy đủ ma trận phát hành.

Đợt này lưu local, không đẩy GitHub hoặc triển khai hosting. Bước tiếp theo trong chặng 1 là bổ sung
khung quay/đứng dậy và kiểm tiếp xúc chân; sau khi mẫu đạt mới ghép đoạn đưa hương vào lư của chặng 2.
