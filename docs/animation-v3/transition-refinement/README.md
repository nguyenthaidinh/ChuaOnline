# Tinh chỉnh quay người, đứng dậy và điểm chân trụ

Ngày 04/11/2026, nhánh `codex/animation-v3`. Tiếp tục mẫu nam áo lam của chặng 1.
Đã xử lý thêm đoạn đổi hướng và nâng thân; chưa nghiệm thu toàn bộ hoạt ảnh hay đưa nguồn thử vào phòng chung.

## Những thay đổi xem được

- Tạo bảy tư thế trung gian mới: bốn tư thế quay và ba tư thế nâng thân.
- Sửa riêng tư thế nửa quỳ: chân phải được đặt gần vị trí khung trước/sau hơn.
  Nguồn cũ và atlas v1 được giữ nguyên để đối chiếu.
- Bộ v2 có 24 tư thế chuyển tiếp, dùng 16 PNG từ v1 và tám PNG v2.
  [Bảng tư thế](../../../artwork/animation-v3/transitions-v2/contact-sheet.jpg).
- Atlas 1536×3072, 24 ô 384×512, 506.452 byte; cùng tỷ lệ/canvas/pivot (192,468).
  Giữ nguyên ảnh đầu vào, không tự crop/căn giữa từng tư thế theo alpha.
- Quay tăng từ ba lên bảy mốc; đứng dậy từ bảy lên 14 mốc.
  Chuỗi ghép tăng từ 43 lên 54 mốc, vẫn dài 5,48 giây và đi 1,31 m.
  Đây là mốc timeline có dùng lại ảnh, không phải 54 PNG riêng.

Prompt, reference và nguồn được lưu trong
`artwork/animation-v3/transitions-v2/generation.json`, tạo bằng **image_gen tích hợp**.
`review.json` chứa kích thước thực, bounds, nguồn và SHA-256. Không lật hình, crossfade hoặc đảo ngược video ngồi để tạo đứng dậy.

| Clip | Mốc tư thế | Thời lượng 1× |
| --- | ---: | ---: |
| Đứng dậy và quay theo hướng đi | 14 | 1,16 giây |
| Quay về bàn thờ | 7 | 0,38 giây |
| Bắt đầu bước | 6 | 0,72 giây |
| Giảm tốc và dừng | 7 | 0,90 giây |
| Quay và ngồi | 15 | 1,50 giây |
| Chuỗi ghép | 54 | 5,48 giây |

## Điểm tiếp xúc chân

Năm tư thế nâng thân có điểm tiếp xúc gót phải được kiểm trên master 1254 px và đổi sang canvas atlas.
Trong đoạn này, compiler tính bù vị trí gốc nhân vật để đưa điểm đó về điểm của khung chống tay đầu tiên.
Bù chỉ dịch vị trí thân theo dữ liệu tiếp xúc; không kéo giãn ảnh hay đổi thời gian/đường đi.
Thiếu điểm chân hoặc tọa độ ngoài canvas khiến bộ thử báo lỗi trước khi phát.

Xưởng có bật/tắt bù để so sánh và ba vị trí gần/giữa/xa. Đã đo tọa độ điểm tiếp xúc sau CSS transform
ở desktop 1440×1080 và mobile 390×844:

- Trước bù: độ dịch tối đa giữa năm điểm khoảng 1,52–2,19 px màn hình tùy vị trí/layout.
- Sau bù: dưới 0,01 px trong cả sáu trường hợp.
- [Dữ liệu từng điểm](contact-matrix.json), [tổng hợp](contact-summary.json).

Phép đo này kiểm **các điểm đã khai báo** và phép chiếu/render; không phải theo dõi quang học mọi ngón chân,
không chứng minh toàn bộ bàn chân hoặc chu kỳ đi đã được khóa trên mọi hướng. Ảnh nguồn vẫn cần xem bằng mắt.
Vòng WebP nguồn làm tròn phần bù tới pixel atlas; trình duyệt dùng phần bù dưới pixel.

## Bằng chứng chuyển động và kiểm thử

- [Video trình duyệt ở 0,25×](browser-review.mp4): 70 ảnh chụp thực, khoảng 21,66 giây lấy mẫu,
  video H.264 1384×654 dài 21,88 giây, không có âm thanh. Giữ timestamp, quan sát được 33 ID tư thế;
  đây là lấy mẫu màn hình, không phải ghi liên tục tất cả khung hoặc chứng nhận FPS sản phẩm.
  [Thông tin ghi](browser-review.json).
- [Tua đủ 54 mốc](step-verification.json): đối chiếu ID, phase và thời điểm với timeline biên dịch.
- [Phát 1×](playback-verification.json): đứng dậy, quay, ngồi và chuỗi đầy đủ đều kết thúc đúng tư thế/thời lượng.
  Hết chuỗi giữ ngồi nhìn tượng Phật tại điểm đích, không tự nhảy về đầu.
- [Ảnh tư thế nửa quỳ đã sửa](refined-half-kneel.png), [ảnh chạy hết chuỗi](completed.png),
  [mobile](mobile.png). Mobile không tràn ngang: [số đo](mobile-verification.json).
- Không ghi cảnh báo/lỗi trình duyệt trong lượt kiểm cuối: [console.json](console.json).
- Typecheck, 48 test và build đạt. Test mới kiểm giữ điểm chân mà thời gian/đường đi không đổi,
  từ chối thiếu điểm tiếp xúc, đối chiếu clip với atlas thật và hash nội dung.
- Audit lịch nghi lễ vẫn khớp bản `628098d`: 480 action, 207.765 mẫu.
  Lịch server v1 và bộ ảnh production không đổi.

Ngoài video trình duyệt, có [vòng nguồn toàn chuỗi](../../../artwork/animation-v3/transitions-v2/sequence-loop.webp),
[đứng dậy](../../../artwork/animation-v3/transitions-v2/standUp-loop.webp) và
[quay](../../../artwork/animation-v3/transitions-v2/turn-loop.webp). Đây là ảnh hoạt họa ghép từ atlas,
thêm 600 ms giữ cuối trước khi lặp, không phải bản ghi hành vi phòng chung.

## Mở và xuất lại

Mở `/?animation-lab=transitions` trên Vite dev. Nếu API 8787 đang có tiến trình khác chạy,
chỉ mở xưởng bằng:

```powershell
cd "F:\Dự Án Chung\ChuaOnline"
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5180 --strictPort
```

Địa chỉ: `http://127.0.0.1:5180/?animation-lab=transitions`.
Xưởng không kết nối phòng chung. Nguồn v2 nằm ngoài `public/`, chỉ được tải ở dev, không đi vào bản production.

```powershell
python scripts/pack-transition-refinement.py
node --experimental-strip-types scripts/export-transition-sequences.mjs
python scripts/render-transition-loops.py
```

Video thực được mã hóa từ các screenshot đã chụp bằng CUA:

```powershell
python scripts/encode-study-recording.py .local-qa/transition-refinement/captures.json docs/animation-v3/transition-refinement/browser-review.mp4
```

Screenshot thô là dữ liệu local được ignore; video và báo cáo đã lưu trong repo.

## Trạng thái kế hoạch

Đã hoàn thành đợt tinh chỉnh quay/đứng dậy và bù chân của mẫu thử này. Chưa đủ cơ sở kết luận toàn bộ web
đã đạt mức hoạt ảnh chuyên nghiệp hoặc không còn lỗi:

- Chu kỳ đi cần kiểm tiếp chân trụ, đổi pha bước và hướng trên các đường trong phòng thật.
- Chưa có bộ hướng trước/ngang mới hoặc bộ nữ/áo nâu tương ứng.
- Chuỗi dâng hương mới, điểm nắm hai tay và lớp che tay/lư chưa làm; đây là phần tiếp theo của nghi lễ.
- Chưa tích hợp bộ mới vào chánh điện production hay kiểm lại 24 khách trên thiết bị thật.

Lưu local; không đẩy GitHub hoặc triển khai hosting trong đợt này.
