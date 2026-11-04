# Mở rộng chuyển động, y phục và lễ vật trong web chính

Ngày 04/11/2026, nhánh `codex/animation-v3`, tiếp tục từ `7f9a6b8`.
Đã đưa nguồn mới vào phòng chung. Phạm vi này mở rộng chặng 1–3; chưa nghiệm thu toàn bộ kế hoạch.

Đây là báo cáo của mốc `786d244`. Đợt tiếp theo đã bổ sung hướng nam, chuyển tiếp nữ/nâu,
entry4/timeline3/4 và kiểm viewport thật; xem [báo cáo hiện hành](../complete-movement-v1/README.md).

## Thay đổi đã tích hợp

- Chuyển động mới tăng tốc240 ms, giảm tốc360 ms; đường ngắn co cả hai nhịp.
  Tích phân giải tích theo timestamp giữ nguyên độ dài đường, mốc tương tác và thời điểm kết thúc.
  Hướng được chuẩn hóa, nhìn trước0,22 m tại góc; không còn phụ thuộc độ dài từng vector segment.
- Nam áo lam có hai chu kỳ ngang trái/phải riêng, mỗi hướng 8tư thế. Không mirror bộ mới.
  Các clip bước đầu/dừng đã kiểm trước đó được dùng cho hướng lưng chéo phù hợp;
  clip đứng/ngồi có quay và điểm chân trụ được dùng cho các action nam mới.
- Nữ áo lam và áo nâu có **23 tư thế dâng hương riêng mỗi người**, cùng lịch v2 và mốc đặt 3.450 ms
  sau khi tới trạm. Điểm tay và lớp che được đo theo chính ảnh từng identity.
- Ba y phục có **3 pose cầm dùi** và **2 pose đỡ hoa** riêng. Chuông giữ dùi qua mốc gõ và thu tay;
  hoa chuyển từ hai tay xuống bàn, giữ đúng kích thước và gốc ảnh ở marker.
- Metadata 15 pose của bộ cũ được đo lại riêng: sửa tay, kích thước canvas và lớp che cho các lễ còn dùng nguồn cũ,
  gồm cánh sen và ảnh dự phòng. Không lấy tọa độ nam chia đôi cho nữ/áo nâu.
- Chỉ hiện tên khách khác khi hover/focus, giữ tên bản thân; giảm nhãn che tay và chuông.

[Bản production mới](production-three-visitors.png), [dùi chạm chuông](bell-contact-clear.png),
[hoa được đưa tới bàn](lotus-place.png), [tay–lư nữ](woman-contact.png), [tay–lư áo nâu](granny-contact.png).

## Code và hợp đồng thời gian

`characterAnimation.ts` là hàm thuần chọn vị trí/pose/canvas/prop từ người, timestamp và trạng thái ảnh.
`CharacterSprite.tsx` chỉ dựng style/lớp ảnh; dùng scheduler hiện có, không dùng React state cho mỗi frame.
Xưởng và web chính dùng cùng hàm chọn pose, cùng geometry và CSS background/hand mask.

Server cấp `movement.version:3` cho action mới và `entryVersion:3` cho khách mới.
Snapshot cũ thiếu phiên bản vào điện và action movement2 giữ cách lấy mẫu cũ.
Tất cả lệnh thắp hương mới dùng timeline2; hoa/cánh sen/chuông/lạy vẫn dùng lịch nghi lễ1.
Đổi y phục không thay marker. Server vẫn chọn ghế/trạm, thời gian và ID; client không gửi tọa độ đặt vật.

Dùi là dụng cụ, được giữ qua mốc gõ. Hoa/hương/cánh sen rời tay tại marker.
Vật mới lưu thêm `artworkVersion:3` và `appearance`, nên người vào muộn vẫn dùng đúng điểm nhận
theo nguồn đã đặt, kể cả khi chủ lễ đã rời điện. Prediction trước SSE và kết quả server có cùng ID/metadata.

Ảnh tải/decode độc lập theo nhóm và identity. Hỏng ảnh nữ không tắt nguồn nam; optional asset không khóa vào điện.
Tỷ lệ prop/mask lấy theo canvas của **frame đang vẽ**:192×256 cho fallback nữ/nâu,384×512 cho pose mới.
Các texture web đều dùng ô192×256; geometry giữ đơn vị logic gốc.

## Nguồn và ngân sách ảnh

Tạo bằng **ImageGen tích hợp**, giữ nguồn và prompt trong repo:

| Nhóm | PNG đầu ra / tư thế mới dùng | Nguồn, prompt, bảng hình |
| --- | --- | --- |
| Ngang trái/phải nam | 20 / 16; giữ 4 bản thay thế | [directions-v1](../../../artwork/animation-v3/directions-v1/README.md) |
| Dâng hương nữ và nâu | 46 / 46 | [variants-v1](../../../artwork/animation-v3/variants-v1/README.md) |
| Chuông và hoa, ba y phục | 15 / 15 | [rituals-v1](../../../artwork/animation-v3/rituals-v1/README.md) |
| Đo tiếp xúc bộ cũ | Không sinh lại hình | [ritual-contacts](../../../artwork/animation-v3/ritual-contacts/README.md) |

Tổng 81 PNG được tạo,77 tư thế mới được chọn. Không coi số lượng ảnh là chứng nhận chất lượng chuyển động.
Master nằm ngoài public; packer không tự crop/căn giữa từng pose, không lật hướng mới hoặc đổi màu nam để làm nữ.

| Texture mới | Kích thước | Byte nén |
| --- | --- | ---: |
| directional-walk-7e5dc65f63fd.webp | 768×1024 | 157.036 |
| woman-incense-8fea45e46523.webp | 768×1536 | 182.170 |
| granny-incense-7d8518c76879.webp | 768×1536 | 185.952 |
| man-ritual-ca49b87c3b99.webp | 576×512 | 42.754 |
| woman-ritual-c3b3fcf28fda.webp | 576×512 | 44.008 |
| granny-ritual-bb6ffb1e27e3.webp | 576×512 | 41.938 |
| Tổng thêm | 15,375 MiB RGBA theo pixel | 653.858 |

Cả9 texture animation-v3 hiện dùng26,625 MiB theo width×height×4; chưa phải bộ nhớ thực của trình duyệt
hoặc toàn cảnh. Không thêm dependency runtime. Build không chứa xưởng, đường dẫn master hoặc FBXLoader.

## Kiểm thử thực tế

- **80/80 test**, typecheck và build đạt. Matrix hàm thuần:1.440 action =3 y phục×5 lễ×24 ghế×4 trạm;
  chuyển động kiểm 408 đường. Đây là kiểm logic, không phải1.440lượt xem hình trực tiếp.
- Audit lịch cũ:480 action,207.765 pose, digest giữ nguyên
  `e90ca77813e0d75ec60a7f6c7630555920330a7c4b58d593cba949729d53d9d4`.
- Browser production có3 khách thật, ba y phục cùng dâng hương, sau đó đều về ghế:
  [dữ liệu](three-client-verification.json), [video 1×](three-visitors.mp4).
- Tua 24 mốc cho từng y phục, thấy đủ23 ID và đúng 1 bó hương tại từng mốc:
  [kiểm từng bước](three-appearance-step-verification.json).
- Nam thỉnh chuông, nữ dâng hoa, áo nâu rải cánh sen đồng thời; đều hoàn thành, chỉ hoa/cánh sen để lại vật:
  [dữ liệu](mixed-rites-verification.json), [video](mixed-rites.mp4).
- Khách xem mới mở trang giữa action, nhận cùng ID/timeline2/movement3 và thấy đúng tiến trình:
  [late client](late-client-verification.json). Hai lần đọc cách nhau nên pose có thể đã tiến thêm.
- Áo nâu lạy qua các số 0, 1, 2, 3 rồi về ghế; dùng hình lạy trước đây:
  [dữ liệu](three-bows-verification.json), [ảnh](three-bows.png).
- Cold origin 4181 cố ý thiếu riêng ảnh nữ: HTTP 404, nữ dùng fallback hoàn thành,
  nam vẫn dùng nguồn incense mới; hai nút mở lại, hai vật được đặt:
  [dữ liệu](isolated-asset-fallback.json), [ảnh](isolated-asset-fallback.png).
- Chuỗi nữ trong xưởng dùng cùng sampler production, chạy 1× tới đúng complete/ngồi ở 11.582 ms:
  [dữ liệu](full-woman-ritual.json), [ảnh cuối](full-woman-complete.png).
- [Console](console-verification.json) không ghi warn/error trong lượt cuối.404 được xác nhận riêng bằng HTTP.
  Đã sửa loader xưởng nhận manifest `compiled`; test dùng chính review.json thật để ngăn fallback âm thầm.

Video3 khách lấy mẫu 109 ảnh/15,319 giây; H.264 1280×720 dài 15,48 giây.
Video các lễ lấy mẫu 77 ảnh/12,291 giây, dài 12,52 giây. Cả hai không âm thanh, không phải ghi hình liên tục/FPS.
Hai video ghi trước thay đổi cuối chỉ ẩn nhãn tên khách khác; [ảnh chuông rõ](bell-contact-clear.png)
và [bản hiện tại](production-current.png) đã kiểm sau thay đổi đó. Bộ sampler/ảnh nghi lễ không đổi.

## Phần còn mở

- Chưa có đầy đủ nguồn mới cho mọi góc trước/chéo, quay và dừng ở mọi hướng.
  Nữ/nâu vẫn dùng bộ đi/đứng/ngồi cũ; hiện nâng cấp riêng đoạn dâng hương, hoa và chuông của họ.
- Hoa/chuông mới có key pose chính; vẫn cần chuyển tiếp tay mịn hơn. Cánh sen mới sửa tiếp xúc/lớp che;
  bộ hình lạy chưa được sản xuất lại. Chưa đánh dấu chặng 1–3 hoàn tất mỹ thuật.
- Chưa quay được mobile của chuỗi mới: override 390×844 vẫn đo1280×720,
  [lượt thử responsive](responsive-attempt.json) được ghi là chưa xác nhận. Unit test hai phép chiếu không thay kiểm UI mobile.
- Chưa chạy lại phòng 24 khách/4 lễ trên thiết bị thật, đo chân trụ mọi đường hoặc FPS/bộ nhớ thực.
  Kiểm giảm chuyển động đợt này ở hàm thuần; không ghi thành đã kiểm lại UI mọi lễ.

## Chạy và xuất lại

```powershell
cd "F:\Dự Án Chung\ChuaOnline"
npm run dev
```

Mở địa chỉ Vite in ra. Web chính có đủ3 y phục; xưởng `/?animation-lab=incense` có chọn y phục.
Phải khởi động lại Node sau khi đổi server; API cũ không cấp hợp đồng mới.

```powershell
python scripts/pack-incense-study.py
python scripts/pack-directional-movement.py
python scripts/pack-variant-incense.py
python scripts/pack-ritual-poses.py
python scripts/pack-ritual-contacts.py
npm run typecheck
npm test
npm run build
```

Đợt này lưu local, chưa push hoặc deploy. Các phiên kiểm và server QA đã dừng; tiến trình API khác của người dùng không bị dừng.
