# Dâng hương nam áo lam trong phòng chung

Báo cáo lịch sử của đợt `7f9a6b8`. Đợt tiếp theo đã mở rộng sang nữ/áo nâu,
hoa/chuông và chuyển động3; xem [báo cáo hiện tại](../movement-variants-v1/README.md).

Ngày 04/11/2026, nhánh `codex/animation-v3`, tiếp tục từ `f3b4455`.
Chuỗi mới đã chạy trong web chính cho **nam áo lam**. Đây là phần cốt lõi của chặng 2;
chưa nghiệm thu toàn bộ chặng hoặc toàn bộ kế hoạch.

## Thay đổi nhìn thấy được

- Hương chờ trong ống nhỏ ở bàn, được lấy lên giữa hai tay, nâng ngang trán, cúi lễ,
  đưa tới lư, buông và rút tay, rồi chắp tay trước khi trở về.
- 23 tư thế khác nhau, 24 mốc giữ ảnh trong đoạn tại lư dài 5 giây. Đứng dậy 1,16 giây,
  ngồi xuống 1,50 giây; thời gian đi vẫn theo đường do server đóng dấu.
- Điểm nắm, tay trái/phải và polygon che ngón được đo theo từng ảnh. Lớp tay dùng lại
  đúng pixel của thân; hương nằm dưới ngón, không vẽ bàn tay giả bằng CSS.
- Gốc hương trong tay trùng gốc hương trong lư tại marker. Miệng/thân lư có lớp che riêng;
  khói chỉ bắt đầu sau khi đặt. Các bó đã đặt xoè nhẹ quanh gốc cố định, vẫn giữ giới hạn cũ.
- Dùng nguồn đứng/ngồi v2 và đi lưng chéo phải khi hướng đường phù hợp; tư thế ngồi nhìn tượng
  dùng chung với cuối chuyển tiếp. Góc đi trước/ngang chưa có nguồn v3 hoàn chỉnh.
- Giảm chuyển động giữ tư thế chính và quyền sở hữu hương; lỗi texture mới dùng bộ ảnh dự phòng.

[Ảnh trước nâng cấp](../production-regression.png), [web đang dâng](production-active.png),
[mốc cắm hương phóng lớn](at-contact.png), [video tay–lư 0,25×](hand-review.mp4).

## Lịch và đồng bộ

Server chỉ cấp `timelineVersion:2` cho lệnh thắp hương mới của nam áo lam.
Lệnh khác và action đang có v1 giữ nguyên lịch. Thiếu trường phiên bản được hiểu là v1;
phiên bản không hỗ trợ bị từ chối. Thời gian server lấy từ `shared/ritualSchedule.ts`,
không lấy từ atlas hoặc số khung hình.

| Đoạn tại lư | Thời lượng | Mốc trong đoạn |
| --- | ---: | --- |
| Nhận và nâng | 1.350 ms | Nhận hương ở 240 ms |
| Nâng trán và cúi | 1.100 ms | Giữ thân/tay |
| Đưa vào lư | 1.400 ms | Buông tại 1.000 ms |
| Rút tay và chắp tay | 1.150 ms | Kết thúc tư thế đứng |

Mốc đặt là **3.450 ms sau khi tới trạm**. Vật chờ → vật trong tay → vật trong lư
cùng đọc action/mốc server; kết quả vẫn dùng ID `<action>:placed`, không tạo thêm mỗi lần render.
Chỉnh thời lượng artwork chỉ ánh xạ lại khung; không đổi marker đã công bố của action.

## Nguồn ảnh và cách xuất

Tạo bằng **image_gen tích hợp**, tham chiếu nam áo lam và nguồn chuyển tiếp đã kiểm trước đó.
Có 24 PNG đầu ra mới, mỗi ảnh thực tế 1254×1254 RGBA. Bộ dùng 22 ảnh mới cộng một tư thế
neutral có sẵn; hai bản đầu của reach/grasp được giữ để đối chiếu và thay bằng bản v2.
Không dùng FBX bị loại, không mirror góc mới hoặc crossfade toàn thân để giả chuyển động.

- [18 prompt đầu và tham chiếu](../../../artwork/animation-v3/incense-v1/generation.json).
- [6 prompt tinh chỉnh và ảnh thay thế](../../../artwork/animation-v3/incense-v1/refinement-generation.json).
- [Đo tay/gốc hương/lớp che](../../../artwork/animation-v3/incense-v1/annotations.json).
- [23 tư thế trên một bảng](../../../artwork/animation-v3/incense-v1/contact-sheet.jpg).
- [Canvas, nguồn và hash](../../../artwork/animation-v3/incense-v1/review.json),
  [timeline từng mốc](../../../artwork/animation-v3/incense-v1/sequence.json).

Chuẩn hoá cùng scale/pivot (192,468) trên canvas logic 384×512, không tự crop/căn giữa
từng ảnh theo alpha. Atlas master 1536×3072 nằm trong `artwork/`, chỉ xưởng dev tải.
Texture web dùng ô 192×256, hình học/điểm tay vẫn ở đơn vị logic cũ:

| Texture web có hash nội dung | Kích thước | Byte nén |
| --- | --- | ---: |
| incense-2e23dfe33319.webp | 768×1536 | 184.740 |
| transitions-2776f8aac62d.webp | 768×1536 | 202.918 |
| walk-rear-78213b858f96.webp | 768×768 | 111.176 |
| Tổng mới | 11,25 MiB RGBA theo pixel | 498.834 |

11,25 MiB chỉ là phần texture mới tính bằng width×height×4, không phải số đo bộ nhớ trình duyệt
hoặc chứng nhận ngân sách toàn cảnh. Các texture này tải/decode tùy chọn, không chặn vào điện.
Nhạc và bộ hình dự phòng vẫn theo cơ chế hiện có; đợt này không thêm bài nhạc.

```powershell
python scripts/pack-incense-study.py
node --experimental-strip-types scripts/export-incense-sequence.mjs
npm run typecheck
npm test
npm run build
```

Packer yêu cầu đủ nguồn và metadata hai tay, sinh texture có hash cùng hai file geometry TypeScript.
Không cần cài thêm dependency runtime.

## Bằng chứng và phạm vi kiểm

- Typecheck, **55/55 test** và build đạt. Test mới kiểm 24 ghế × 4 trạm × 2 phiên bản,
  marker một lần, tái dựng muộn, kết thúc action, ánh xạ artwork, hash/kích thước texture thật,
  và khớp gốc hương ở cả hai phép chiếu desktop/mobile.
- Audit v1 khớp bản chuẩn: 480 action, 207.765 mẫu, digest
  `e90ca77813e0d75ec60a7f6c7630555920330a7c4b58d593cba949729d53d9d4`.
  Điều này bảo vệ lịch cũ, không chứng minh lịch v2 tương đương lịch v1.
- [Tua 24 mốc thực trong xưởng](step-verification.json) thấy đủ 23 ID tư thế;
  mỗi mốc có đúng một bó hương. Đã sửa sai số số thực ở biên khung có thể làm bỏ một tư thế
  khi tua; test hồi quy kiểm cả hai phiên bản lịch.
- [Trước/đúng/sau marker](handoff-verification.json): 1 hương trong tay/0 trong lư đổi thành
  0/1; bounding box gốc chênh dưới 0,01 px trong phép đo desktop này.
- [Hai client production](shared-room-verification.json): cùng ID action/v2, client thứ hai
  reload giữa lễ vẫn thấy đúng tư thế đang cầm; sau khi về ghế cả hai thấy cùng một ID vật đã đặt.
  Client thứ hai trở thành khách xem sau reload; đây không phải hai người cùng làm lễ đồng thời.
- [Ảnh tùy chọn 404](fallback-verification.json): dùng bản dist sao chép ở origin riêng 4181,
  chủ động bỏ đúng texture incense để tránh cache. Vào điện, làm lễ v2 bằng bộ cũ, đặt đúng một vật,
  trở về idle và nút làm lễ mở lại. Bản dist chính không bị sửa.
- [Giảm chuyển động qua UI](reduced-motion-verification.json): giữ hương ở tư thế chính,
  đặt một lần, hết lễ về idle, khói bị tắt. [Ảnh](reduced-motion.png).
- [Console](console-verification.json) không có warn/error được ghi trong lượt kiểm cuối.
  404 của bài thử thiếu ảnh được xác nhận riêng qua HTTP; không suy từ console trống rằng mọi request đạt.
- Build không chứa IncenseLab/TransitionLab/FBXLoader hoặc đường dẫn master. Xưởng chỉ mở ở dev.

Video tay–lư là 58 ảnh chụp trình duyệt thực, lấy mẫu trong 21,429 giây ở 0,25×,
H.264 456×374 dài 21,52 giây, không âm thanh. Video quan sát được 21/23 ID;
hai tư thế rất ngắn còn lại được kiểm bằng tua từng mốc. Đây không phải ghi hình liên tục
hoặc số đo FPS. [Thông tin ghi](hand-review.json).

## Còn mở trước nghiệm thu chặng 2

- Hoàn thiện hướng đi trước/ngang, quay, dừng và các điểm nối vào/ra đoạn dâng; nguồn mới
  chưa thay toàn bộ đường đi. Các nghi lễ khác và hai y phục còn lại vẫn dùng nguồn cũ.
- Chưa có video mobile của chuỗi mới. Override 390×844 không được trình duyệt kiểm thử áp dụng;
  kích thước đo vẫn 1280×720. [Lượt thử responsive không đạt điều kiện](responsive-attempt.json),
  [ảnh thực là desktop](responsive-attempt.png). Không coi unit test phép chiếu là kiểm UI mobile.
- 24 ghế/4 trạm được kiểm bằng logic, không phải 96 lượt xem hình trực tiếp. Chưa chạy lại ma trận
  phòng 24 người/4 lễ, tab ẩn/hiện và hiệu năng trên điện thoại thật với bộ hình mới.
- Nguồn raster vẫn là các tư thế rời. Chưa coi là chuyển động liên tục hoặc hoàn tất nghiệm thu mỹ thuật.

## Chạy thử

Tại thư mục dự án:

```powershell
npm run dev
```

Mở địa chỉ Vite in ra, thường `http://127.0.0.1:5173/`; chọn **Nam áo lam** và thắp hương.
Xưởng riêng: `/?animation-lab=incense`. Nếu chỉ xem xưởng và API 8787 đã chạy, mở riêng Vite như
hướng dẫn ở [báo cáo chung](../README.md). Để thử web chính sau khi sửa server, phải khởi động lại
tiến trình Node bằng code mới; API cũ vẫn cấp lịch v1. Với bản production: `npm run build` rồi
`npm start`, cổng mặc định 3000. Các máy chủ QA 4180/4181 đã dừng sau kiểm tra.

Đợt này lưu local, chưa push GitHub hoặc triển khai hosting. Mốc trước đợt: `f3b4455`.
