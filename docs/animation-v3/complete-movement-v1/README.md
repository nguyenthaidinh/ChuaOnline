# Hướng đi nam và chuyển tiếp ba y phục

Ngày 04/11/2026, nhánh `codex/animation-v3`, tiếp tục từ `786d244`.
Phạm vi này tiếp tục chặng 1–3; chưa nghiệm thu toàn bộ kế hoạch mỹ thuật.

## Nguồn và cách nối

- Nam giữ chu kỳ lưng chéo phải 12 pose và hai chu kỳ ngang trái/phải 8 pose đã kiểm.
  Bổ sung năm hướng riêng: lưng thẳng, lưng trái, trước trái, trước thẳng và trước phải,
  mỗi hướng 8 pose. Hướng mới dùng pixel riêng, không mirror hay xoay toàn ảnh.
- Bổ sung bảy tư thế đứng theo hướng; hướng lưng phải dùng neutral đã có. Quay chọn
  các góc 45° liền nhau trên đường ngắn nhất. Quay nửa vòng luôn dùng cùng một chiều
  để các client lấy cùng pose tại cùng timestamp.
- Nữ áo lam và áo nâu có 24 pose chuyển tiếp riêng mỗi người. Neutral đầu tái sử dụng
  đúng ảnh dâng hương của chính y phục; đứng dậy có chuỗi riêng, không đảo clip ngồi.
  Mỗi bộ có 5 điểm gót chân trụ được đo và khóa SHA trên chính nguồn của mình.
- Nam đi hết đường về đã nhìn lên bàn thờ. Clip ngồi mới bắt đầu ở `02-stand-rear`,
  bỏ đoạn quay từ góc chéo để tránh vừa dừng lại quay lệch rồi quay lên lần nữa.
- Mỗi nhóm ảnh được decode riêng. Hỏng ảnh chuyển tiếp nữ vẫn dùng tư thế cũ của nữ,
  không tắt ảnh nam hoặc bộ dâng hương nữ. Sampler nhận query có tên và trạng thái
  sẵn sàng từng nhóm; renderer chỉ vẽ kết quả từ timestamp chung.

[Nguồn nữ/nâu, prompt và điểm chân](../../../artwork/animation-v3/variant-transitions-v1/README.md)
và [nguồn hướng nam](../../../artwork/animation-v3/directions-v2/README.md) giữ ảnh gốc,
ảnh bị loại, selection, prompt/reference, SHA, atlas master, storyboard và loop nguồn.
Loop nguồn không phải video trình duyệt hoặc phép đo FPS.

Đợt này chọn 93 pose mới: 47 hướng/neutral nam và 46 chuyển tiếp nữ/nâu; hai neutral
của nữ/nâu được tái sử dụng, nên ba atlas chứa 95 ô có hình. Có 109 đầu ra ImageGen
mới; giữ 16 bản bị thay thế/loại để đối chiếu, không tính chúng thành pose được nghiệm thu.

| Texture bổ sung | Kích thước | Byte nén | RGBA theo pixel |
| --- | --- | ---: | ---: |
| expanded-directions-3de46c2a6c6e.webp | 768×3072 | 419.774 | 9 MiB |
| woman-movement-a660a3688bbd.webp | 768×1536 | 204.946 | 4,5 MiB |
| granny-movement-f68fcbe7207f.webp | 768×1536 | 208.742 | 4,5 MiB |
| Tổng thêm | | 833.462 | 18 MiB |

Cả 12 texture animation-v3 có 1.986.154 byte nén và 44,625 MiB RGBA tính theo kích thước.
Đây không phải bộ nhớ thật của trình duyệt/toàn cảnh. Không thêm dependency runtime;
App chunk là 118,12 kB chưa gzip. Build không chứa xưởng, đường dẫn PNG/master hoặc FBXLoader.

## Hợp đồng thời gian

| Hợp đồng | Lượt mới | Thời lượng đứng / ngồi | Quay về |
| --- | --- | --- | --- |
| entry4 | Khách vào điện | Ngồi 1.500 ms | Không áp dụng |
| timeline3 | Hoa, cánh sen, chuông, lạy | 1.160 / 1.500 ms | 380 ms với lễ đứng |
| timeline4 | Dâng hương | 1.160 / 1.500 ms | 380 ms |

Timeline4 giữ nguyên toàn bộ đoạn dâng hương của timeline2, gồm mốc đặt sau 3.450 ms
kể từ khi tới trạm. Nó thêm 220 ms cho nhịp quay về. Timeline3 giữ thời lượng đoạn
thực hiện và marker của từng lễ cũ, thêm thời gian đứng/ngồi và quay. Ba lạy vẫn đủ
ba vòng, với đoạn đứng lên 760 ms riêng; nhịp quay chỉ dùng phần đã đứng của đoạn đó.

Entry thiếu phiên bản/entry3 vẫn ngồi 860 ms. Timeline thiếu phiên bản/1/2 vẫn dùng
đúng lịch đã ghi. Server xếp action sau thời điểm vào điện của đúng entry version,
không cho action đang chờ rút ngắn clip ngồi. Artwork không quyết định thời gian server.
Phải khởi động lại Node và tải lại trang sau khi cập nhật hợp đồng mới.

## Cách xem

```powershell
cd "F:\Dự Án Chung\ChuaOnline"
npm run dev
```

Web chính dùng bộ ảnh mới. `/?animation-lab=incense` chọn ba y phục và tua cả chuỗi
đứng → dâng → về chỗ bằng đúng sampler production. Xưởng chỉ tải ở development.

`/?animation-lab=responsive` mở iframe cùng origin có viewport thật 360, 390, 768 hoặc
1366 px. Đổi kích thước giữ nguyên iframe/client/action. Thu phóng bản xem chỉ giúp
vừa màn hình kiểm, không thay viewport của trang con. Đây không phải mô phỏng cảm ứng
hoặc phép đo hiệu năng điện thoại thật.

Nếu cần chạy xưởng riêng và giữ nguyên API 8787 đang dùng, có thể mở backend preview
ở cổng riêng rồi đặt `CHUA_ROOM_PROXY` cho Vite:

```powershell
# Terminal 1, sau npm run build
$env:PORT='4180'
npm run preview
# Terminal 2
$env:CHUA_ROOM_PROXY='http://127.0.0.1:4180'
npx vite --host 127.0.0.1 --port 5180 --strictPort
```

Mặc định dev vẫn dùng API 8787. Query `preview` của khung kiểm chỉ nhận địa chỉ HTTP
loopback; iframe khác origin đọc được nhưng công cụ browser hiện không bấm được
nút trong đó, nên kiểm thao tác dùng iframe cùng origin.

## Kết quả kiểm

- **101/101 test**, typecheck và build đạt. Kiểm nguồn thật gồm PNG alpha/kích thước/hash,
  WebP/hash/kích thước, selection/provenance và 5 điểm gót của từng identity. Bộ kiểm mới
  bao phủ tám hướng nam, quay ra đúng hướng đường đi, ngồi thẳng và dự phòng độc lập.
- Audit lịch v1 giữ nguyên 480 action/207.765 pose, digest
  `e90ca77813e0d75ec60a7f6c7630555920330a7c4b58d593cba949729d53d9d4`.
  Entry thiếu phiên bản/3 và timeline thiếu phiên bản/1/2 có kiểm tương thích riêng.
- Ba client thật trong cùng phòng dùng timeline4, cùng dâng hương và trở về pose
  `10-seated-rear` của chính mình: [lượt ghi](three-client-recording.json),
  [kết quả cuối](three-client-complete.json), [ảnh production](production-three-complete.png).
  Lượt ghi nhóm dài 16 giây dừng trước khi nam về xong; kết quả cuối xác nhận riêng sau đó.
- Một chuỗi nam được ghi trọn đến complete: [video](man-full-ritual.mp4),
  [136 ảnh lấy mẫu và timestamp](man-full-recording.json). Video 1280×720 dài 18,2 giây,
  ghép theo timestamp từ 17,728 giây khoảng lấy mẫu; cả call dài 18,129 giây.
  Video không âm thanh; FPS container25 chỉ là cách mã hóa ảnh, không phải FPS chạy web.
  Lượt này quan sát sáu hướng khi đi/về; tám hướng có kiểm nguồn và sampler riêng.
- Đã dừng xưởng ở [900 ms](turn-rear-left-900.png), [1.000 ms](turn-left-1000.png)
  và [1.100 ms](turn-front-left-1100.png), thấy đúng neutral lưng trái/ngang trái/trước trái.
  [Ảnh quay production](production-pivot.png) và [probe](pivot-probe.json) không tái hiện mất hình.
  Lượt capture dùng clip trước đó bị lệch gốc ảnh và có một hình trống; đã loại khỏi video
  nghiệm thu và ghi lại toàn viewport. Chưa có bằng chứng kết luận đó là lỗi renderer.
- Responsive dùng iframe DEV cùng origin, nối backend thật 4180. Đo đúng 360×800,
  390×844, 768×1024, 1366×768; scrollWidth bằng viewport ở cả bốn cỡ.
  Đổi 390→360→768→390 trong cùng action giữ ID/người/timeline4, đổi layout đúng breakpoint,
  rồi ngồi xong và mở lại nút: [dữ liệu](responsive-verification.json),
  [360 đang đi](responsive-360-moving.png), [768 đang đi](responsive-768-moving.png),
  [390 hoàn thành](responsive-390-complete.png), [1366](responsive-1366.png).
  Hộp dâng lễ 360 px rộng322 px, nằm từ x19 đến341, không tràn ngang:
  [ảnh](responsive-360-offerings.png). Đây là kiểm bố cục trình duyệt, chưa kiểm điện thoại thật.
- Client production mở giữa lễ nhận cùng actor/action/timeline4 đang đi:
  [dữ liệu](late-client-verification.json), [ảnh](late-client.png). Lần đọc sau đã thấy
  pose ngồi mới của áo nâu: [trạng thái sau](late-client-later.json).
- Origin4182 cố ý thiếu riêng texture chuyển tiếp nữ, HTTP404; nam vẫn dùng hướng mới,
  nữ dùng đứng/ngồi dự phòng nhưng vẫn dùng ảnh dâng hương riêng. Cả hai hoàn thành,
  hai nút mở lại, hai vật được đặt: [dữ liệu](isolated-movement-fallback.json),
  [đang dâng](isolated-movement-fallback-performance.png),
  [hoàn thành](isolated-movement-fallback-complete.png).
- [Console browser](console-verification.json) không ghi warn/error trong các tab kiểm cuối;
  HTTP404 được xác nhận riêng bằng request. Kiểm giảm chuyển động đợt này ở hàm thuần,
  chưa ghi thành đã kiểm lại UI giảm chuyển động cho mọi lễ.
- Đã rời điện, thấy cả hai phòng về0 khách, đóng tab thử và dừng ba server do lượt này mở.
  Không dừng API8787 của người dùng. [Dọn phiên browser](browser-cleanup.json).

DOM được đọc sát trước/sau ảnh chụp nhưng không nguyên tử cùng pixel; pose có thể tiến thêm.
PNG video và probe gốc nằm trong `.local-qa/complete-movement-capture` không commit;
repo giữ JSON, ảnh đại diện và video cuối. [Số liệu ảnh/video](asset-and-recording-summary.json).

## Phần còn mở

- Nữ/nâu còn dùng chu kỳ đi cũ; cần nguồn bước theo hướng và quay ra phía cửa riêng.
- Các hướng nam mới có gait và mốc neutral; chưa có đầy đủ clip nhấc bước/khép chân
  riêng như hướng lưng phải. Nối góc 45° vẫn là chuyển ảnh, chưa phải rig liên tục.
- Nguồn lạy/cánh sen và các chuyển tiếp tay hoa/chuông chưa được sản xuất lại đầy đủ.
- Điểm gót được pin trong nhóm nâng người đã đo; chưa chứng nhận khóa cả bàn chân
  trên mọi đường, phòng 24 khách hoặc FPS/bộ nhớ trên thiết bị thật.
