# Bố cục tham chiếu cho ảnh chánh điện — sau Chặng 3

Hai SVG trong `public/assets/web/` là bản căn bố cục, chưa phải hình ảnh cuối.
Tạo nền ngang trước; dùng nền được chọn làm tham chiếu để tạo nền dọc.
Không tạo ảnh hàng loạt trước khi xác nhận nền đầu tiên hợp các điểm neo dưới đây.

## Kích thước và tọa độ

Tọa độ theo phần trăm khung, gốc ở góc trên trái. Vị trí nhân vật chỉ **điểm trên sàn**,
không phải tâm ảnh nhân vật. Các kích thước pixel là mục tiêu cho ảnh cuối.

| Vùng/điểm neo | Desktop 2560 × 1440 | Mobile 1080 × 1920 |
| --- | --- | --- |
| Tỷ lệ khung | 16:9 | 9:16 |
| Tâm đầu tượng / hào quang | (50%, 26%) ≈ (1280, 374) | (50%, 26%) ≈ (540, 499) |
| Mặt miệng lư hương, nơi khói bắt đầu | (50%, 61%) ≈ (1280, 878) | (50%, 61%) ≈ (540, 1171) |
| Điểm quỳ, vị trí thực hiện nghi lễ | (50%, 75%) = (1280, 1080) | (50%, 75%) = (540, 1440) |
| Điểm trở về / chỗ ngồi | (50%, 89%) ≈ (1280, 1282) | (50%, 89%) ≈ (540, 1709) |
| Chiều cao nhân vật đứng tại chỗ ngồi | 18% khung ≈ 259 px | 13% khung ≈ 250 px |
| Chiều cao đứng tại điểm nghi lễ | 14,76% khung ≈ 213 px | 10,66% khung ≈ 205 px |
| Đường kính hào quang do code dựng | 15% chiều rộng = 384 px | 45% chiều rộng = 486 px |
| Chiều rộng bồ đoàn do code dựng | 8% chiều rộng ≈ 205 px | 24% chiều rộng ≈ 259 px |

Lối đi trung tâm nối hai điểm quỳ/chỗ ngồi tại x=50%. Giữ vùng x=40–60%,
y=68–97% của bản ngang thoáng; bản dọc chừa x=28–72%, y=68–97%.
Không đặt lan can, bình hoa hoặc bậc cao chắn đoạn đi từ y=89% đến y=75%.
Sàn rộng từ khoảng y=65% trở xuống. Tượng nên thấy trọn từ đầu tới bệ,
vùng tượng nằm chủ yếu khoảng y=20–48%; lư hương nằm phía trước bệ.

## Góc nhìn và phối cảnh

- Camera đứng yên, nhìn thẳng vào trục giữa bàn thờ, hơi từ trên xuống.
- Camera 3D tham chiếu: vị trí `(0, 6, 14)`, nhìn về `(0, 0, -16)`, FOV dọc 32°.
  Góc chúc xuống khoảng 11,3°. Điểm tụ phương ngang của sàn ở x=50%,
  y≈15,13%; đường sàn chạy về điểm này, chỉ hiện trên phần sàn nhìn thấy.
- Đây là cảnh 2.5D: kiến trúc/tượng/lư hương ở ảnh, nhân vật ở Three.js.
  Tọa độ trên khung là chuẩn ghép lớp; không suy ra vị trí nhân vật bằng cách
  cắt giữa ảnh ngang để làm dọc.
- Nền dọc giữ cùng kiến trúc, vật liệu và ánh sáng nhưng sắp xếp lại hai bên.

## Những gì nằm trong từng lớp

**Ảnh nền:** kiến trúc chánh điện Việt Nam cách điệu, tượng Phật, bệ thờ,
bậc thềm, một lư hương đồng tĩnh, ánh sáng và sàn. Phong cách bán hiện thực,
trang nghiêm; gỗ nâu, đồng và vàng ấm; chi tiết vừa phải, không mô phỏng nguyên
một ngôi chùa thật.

**Code:** nhân vật, bồ đoàn ở y=75% và 89%, khói ở y=61%, hào quang quanh đầu,
nhãn tên, mọi nút và văn bản. Không vẽ những phần này sẵn trong ảnh.

Ảnh không có người, chữ, logo, UI, nút bấm, khói cố định hoặc bồ đoàn.
Không tạo thêm một lư hương trùng với lư hương ở giữa. Không cắt đầu hoặc bệ tượng.

Thanh thao tác nằm ngoài mép dưới khung ảnh. Nhãn “Nam Mô A Di Đà Phật”
đặt trong ô nền rõ ở góc trên trái bản ngang, giữa phía trên bản dọc;
không dành chỗ cho chữ hoặc nút bằng cách vẽ chúng vào ảnh.

## Prompt nền ngang

```text
Tạo một ảnh nền chánh điện Phật giáo Việt Nam cách điệu, ngang 16:9,
mục tiêu 2560x1440. Bán hiện thực, thanh tịnh, gỗ nâu và đồng vàng ấm,
ánh sáng dịu, không gian cân bằng hai bên, không mô phỏng một chùa có thật.

Dùng bố cục SVG ngang đính kèm làm bản vị trí, không sao chép phong cách vector.
Tượng Phật ở chính giữa, tâm đầu tại (50%,26%), thấy trọn đầu, thân và bệ.
Chỉ một lư hương bằng đồng phía trước bệ; tâm miệng lư ở (50%,61%).
Sàn rộng từ khoảng 65% chiều cao trở xuống. Chừa lối đi x=40–60%,
y=68–97%, đặc biệt hai vị trí ghép nhân vật (50%,75%) và (50%,89%).
Camera cố định hơi nhìn xuống khoảng 11 độ; phối cảnh sàn nhất quán,
đường sàn quy tụ gần (50%,15%).

Không người, chữ, logo, nút, UI, bồ đoàn, khói cố định hoặc hào quang phát sáng
vẽ sẵn. Không cắt đầu tượng, không thêm chướng ngại trên lối đi.
Đây là ảnh nền độc lập, không phải mockup hay ảnh chụp màn hình website.
```

## Prompt biến thể dọc

```text
Dựa trên ảnh ngang được chọn, tạo nền dọc 9:16, mục tiêu 1080x1920.
Giữ cùng kiến trúc, tượng, vật liệu và ánh sáng. Dùng SVG dọc làm bản vị trí.
Sắp xếp lại hai bên, không chỉ cắt giữa ảnh ngang.

Tâm đầu tượng tại (50%,26%), miệng lư hương tại (50%,61%).
Thấy trọn tượng và bệ. Chừa vùng sàn x=28–72%, y=68–97%,
đặc biệt hai vị trí ghép nhân vật (50%,75%) và (50%,89%).
Giữ góc nhìn hơi từ trên xuống, phối cảnh nhất quán với bản ngang.
Không người, chữ, logo, UI, bồ đoàn, khói cố định hoặc hào quang phát sáng.
Không cắt đầu tượng hoặc mất phần sàn cho nhân vật.
```

## Đưa ảnh cuối vào web

1. Giữ bản gốc chất lượng cao ngoài public. Chuẩn hóa bản dùng cho web sang WebP;
   ngân sách ban đầu dưới khoảng 1 MB mỗi nền nếu chất lượng chấp nhận được.
2. Thay cặp đường dẫn trong `src/config/templeAssets.ts`. Dùng đúng tỷ lệ và điểm neo.
3. Nếu ảnh cuối lệch bố cục, sửa `src/config/sceneLayout.ts` rồi kiểm tra lại cả 3D,
   2D, khói, bồ đoàn và hào quang. Không chỉ kéo ảnh bằng object-fit: cover.
4. Kiểm tra lại các kích thước desktop/mobile và đổi bố cục giữa nghi lễ.
5. Ghi nguồn/cách tạo của ảnh trong danh mục tài nguyên trước khi phát hành.
