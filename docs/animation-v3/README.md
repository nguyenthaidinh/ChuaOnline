# Kết quả triển khai nền tảng và kiểm mẫu hoạt ảnh

Ngày 04/11/2026. Nhánh `codex/animation-v3`, bản chuẩn trước nâng cấp `628098d`.

## Trạng thái theo kế hoạch

| Chặng | Trạng thái thực tế |
| --- | --- |
| 0 | Đã khóa bản chuẩn, dựng công cụ xem chậm, ghi video nguồn hiện tại và lập danh sách lỗi |
| 1 | Nam có đủ tám hướng đi riêng, bảy neutral mới để quay và nối ngồi nhìn lên bàn thờ. Nữ/nâu có 24 pose chuyển tiếp riêng mỗi người, đo gót độc lập. Còn thiếu gait nữ/nâu, clip bước đầu/khép chân ở mọi hướng và đo chân trụ mọi đường. [Đợt mới](complete-movement-v1/README.md) |
| 2 | Cả ba y phục có 23 tư thế dâng hương riêng, lớp tay và mốc vào lư. Đã kiểm ba khách với timeline4, khách vào giữa lễ, lỗi riêng ảnh chuyển tiếp nữ và đổi viewport thật giữa lễ. Chưa nghiệm thu toàn chặng do gait nữ/nâu và các phần còn mở ở chặng 1. [Báo cáo mới](complete-movement-v1/README.md) |
| 3 | Đã bắt đầu: mỗi y phục có 3 pose chuông và 2 pose hoa; đo lại tiếp xúc bộ cũ. Cánh sen/lạy còn dùng nguồn trước, chuyển tiếp tay mới và hướng đi còn thiếu. Chưa nghiệm thu toàn chặng |
| 4–6 | Chưa triển khai phần nâng cấp mới; tiếp tục sau các phạm vi còn mở ở chặng 1–3 |

Không coi bộ kiểm tra code đạt là đã hoàn tất nâng cấp hình ảnh. Chánh điện đã dùng nguồn mới
cho dâng hương cả ba y phục, hoa/chuông, đứng/ngồi ba y phục và tám hướng đi nam.
Chu kỳ đi nữ/nâu, clip bắt đầu/dừng ở mọi góc, cánh sen và lạy vẫn cần nguồn bổ sung.
Rig thử không tham gia render sản phẩm.

Đợt mới nhất bổ sung 93 tư thế mới được chọn, thêm 833.462 byte nén/18 MiB RGBA theo kích thước pixel.
Cả 12 texture animation-v3 dùng 44,625 MiB theo pixel; đây không phải bộ nhớ trình duyệt thực.
Typecheck, 101 test, build và audit v1 đạt. Xem [báo cáo hướng đi/chuyển tiếp](complete-movement-v1/README.md)
để biết kiểm mobile bằng iframe thật và giới hạn còn lại. [Báo cáo mở rộng trước](movement-variants-v1/README.md)
và [báo cáo dâng hương nam](incense-v1/README.md) là các mốc trước.
[Báo cáo tinh chỉnh chuyển tiếp](transition-refinement/README.md), [bản 17 tư thế](transitions/README.md)
và các bằng chứng phía dưới là lịch sử những đợt trước.

## Nền tảng đã làm ở đợt đầu

Phần này và bằng chứng đợt đầu bên dưới là lịch sử trước khi tích hợp v2.
Quy tắc của đợt đó nằm trong [báo cáo dâng hương](incense-v1/README.md).
Hợp đồng hiện hành entry4/timeline3/4 được ghi trong [báo cáo mới](complete-movement-v1/README.md).

- `src/shared/ritualSchedule.ts`: lịch nghi lễ v1, thời lượng clip và mốc tương tác;
  server không còn lấy thời gian từ manifest artwork.
- `src/room/ritual.ts`: lấy lịch dùng chung. Server ghi `timelineVersion:1` cho action mới;
  action cũ không có trường phiên bản vẫn dùng lịch v1.
- `sampleScheduledClip` trong manifest: ánh xạ thời gian server sang thời gian bộ ảnh;
  ánh xạ từng phía của marker để ảnh tay buông vật vẫn khớp mốc đặt kể cả khi bộ ảnh đổi thời lượng.
- `src/main.tsx`: chỉ tải xưởng hoạt ảnh ở chế độ development. Bản production không chứa
  AnimationLab, FBXLoader hoặc SkinnedMesh qua đường entry này.
- `src/dev/AnimationLab.tsx`: tua clip, phát lặp 0,25×/0,5×/1× theo thời gian sprite,
  tiến/lùi từng bước, xem ba y phục, nền sáng/tối/chùa và điểm gốc/điểm tay.
- `src/dev/RigPreview.tsx`: xem FBX thật ở sáu góc, hiện skeleton, xuất atlas thử
  12 ô 384×512 RGBA. Khung camera được fit một lần qua nhiều pose, không crop theo từng frame.
  Có dọn mixer, geometry, material, skeleton và WebGL context khi đóng.

Xưởng hoạt ảnh ngoại tuyến không tạo RoomClient, không gọi API và không chứa nút điều khiển phòng chung.
Khung `?animation-lab=responsive` nhúng web thật qua iframe và dùng backend phòng chung đã chạy.
Hai cột chạy cùng phần trăm tiến độ để xem nguồn; không khẳng định clip FBX quỳ và clip sprite ngồi
là cùng một động tác. Nguồn FBX hiện chỉ là nam; chọn nữ/áo nâu thay cột sprite đối chiếu.

## Cách mở xưởng

```powershell
cd "F:\Dự Án Chung\ChuaOnline"
npm run dev
```

Mở `http://127.0.0.1:5173/?animation-lab` theo cổng Vite thực tế in ra.
Nếu máy đã chạy API 8787 và muốn mở riêng xưởng:

```powershell
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5180 --strictPort
```

Sau đó mở `http://127.0.0.1:5180/?animation-lab`.
Để xem chuỗi nối mới, mở `http://127.0.0.1:5180/?animation-lab=transitions`.
Để xem tay–lư và tua mốc đặt hương, mở `http://127.0.0.1:5180/?animation-lab=incense`.
Xưởng chỉ có ở dev; thêm query này vào bản production vẫn mở chánh điện bình thường.

## Kết quả kiểm hình và chuyển động

### Bộ sprite hiện tại

- Chân ở mỗi khung đọc được nhưng chu kỳ chỉ có tám khung; bước chéo và quay hướng còn đổi ảnh rõ.
- Tư thế ngồi lưng thẳng không cùng góc với một số khung đang hạ người nên mối nối còn giật.
- Nhiều nhịp dâng dùng lại hình tay; chưa có đủ chuyển tiếp nâng–đặt–rút tay.
- Điểm tay đang có là một điểm nắm; chưa giải quyết đầy đủ hai bàn tay và lớp che ngón.

### Rig có sẵn

Đã đọc các file FBX trong `public/assets/3d`, dùng code retarget hiện có để thử:

- `nguoi.fbx`: một skinned mesh, 28 bones, 18.144 vertices; vật liệu màu phẳng, không texture.
- Các nguồn `di/khan/quy/thaphuong.fbx`: rig Mixamo, có clip khoảng 1,03/4,27/2,77/6,67 giây.
- Chuyển động có thể lấy mẫu liên tục và xuất nhiều góc. Tuy nhiên người mặc áo dài phẳng,
  hình thể và khuôn mặt khác hẳn bộ ảnh đang dùng. Có vùng áo/đùi méo, chân lộ và thiếu cảm giác tiếp sàn;
  tư thế nguồn quỳ chưa tương ứng ngồi bồ đoàn. Xem ảnh và video kèm theo.

**Kết luận kiểm mẫu:** không đạt điều kiện mỹ thuật chặng 1 để nhân bản ra ba y phục hoặc thay vào chánh điện.
Cần sửa mesh, skin weights, trang phục/chất liệu và diễn xuất nguồn; không thể giải quyết bằng chỉ đổi màu hoặc tăng FPS.

### Ảnh tham chiếu mới

Đã dùng image_gen tích hợp tạo một key pose đi bộ từ reference nam áo lam hiện có,
giữ nhân vật và cải thiện ánh sáng ấm/màu áo. File thực tế 1254×1254 RGBA, chưa phải atlas hoặc loop đi.
Ảnh có thể làm tham chiếu tạo nguồn tiếp theo; cần kiểm riêng chân trụ, phase trái/phải và độ nhất quán cả chu kỳ.
Không đánh dấu key pose đơn là clip đạt.

- Ảnh nguồn: `artwork/animation-v3/pilot/walk-contact-reference.png`.
- Prompt, ảnh tham chiếu và công cụ: `artwork/animation-v3/pilot/generation.json`.
- Atlas rig bị loại: `artwork/animation-v3/pilot/rig-walk-rejected.png`.
- Kích thước và SHA-256: [pilot-assets.json](pilot-assets.json).

## Bằng chứng đợt nền tảng

- `npm run typecheck`, `npm test` (39/39) và `npm run build` đạt.
- `npm run audit:animation`: 480 action, 207.765 mẫu pose/marker/thời điểm kết thúc khớp hoàn toàn
  với digest đã ghi trước refactor. Xem [timeline-equivalence.json](timeline-equivalence.json).
- Test mới chứng minh đổi thời lượng artwork không đổi marker/thời gian server,
  action v1 tương thích action cũ, và artwork đổi marker vẫn hiện pose buông đúng lúc server đặt vật.
- Đã mở bản production tại cổng kiểm riêng, vào điện và dâng hương qua UI:
  hiệu ứng đặt xuất hiện, không mở xưởng dù có query; console không có cảnh báo/lỗi.
- Đã xuất atlas 12 khung qua nút UI, không lấy ảnh render thử làm ảnh nhân vật production.
- Xưởng đã kiểm ở viewport 390×844: không tràn ngang, sprite giữ tỷ lệ 3:4;
  [số liệu kiểm mobile](lab-mobile-verification.json) và [ảnh mobile](lab-mobile.png).
- Video so sánh là 36 ảnh chụp trình duyệt thực, giữ timestamp, khoảng 3,52 giây;
  đủ thấy tám khung sprite ở 0,25×. Video không chứng minh toàn bộ nghi lễ mới đạt hoặc đạt 30 FPS phòng đông.
- Chưa đo hiệu năng trên điện thoại thật và chưa chạy lại toàn bộ ma trận 24 người của chặng phát hành.

### Tệp xem được

- [Ảnh so sánh trên nền sáng](lab-comparison.png)
- [Video so sánh bước đi](walk-comparison.mp4)
- [Kiểm tư thế hạ người](rig-kneel-review.png)
- [Bản production sau refactor](production-regression.png)
- [Thông tin ghi hình](recording-summary.json)

## Công việc tiếp theo đã xác định

Hoàn thiện góc trước/chéo, quay/dừng các hướng chưa có nguồn và chuyển tiếp đứng/ngồi nữ–áo nâu;
bổ sung chuyển tiếp tay hoa/chuông, bộ cánh sen/lạy và video mobile.
Chạy lại phòng 24 khách/4 nghi lễ với texture mới và đo trên thiết bị thật trước khi phát hành.

Đợt này lưu local. Không đẩy GitHub hoặc triển khai hosting.
