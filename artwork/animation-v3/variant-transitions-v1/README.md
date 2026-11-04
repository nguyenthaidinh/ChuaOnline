# Chuyển tiếp đứng/ngồi riêng cho nữ áo lam và áo nâu

Mỗi identity dùng 24 ID tư thế tương ứng bộ chuyển tiếp đã kiểm của nam. Pose
`00-stand-angled` tái sử dụng neutral của chính identity trong `variants-v1` để nối
đúng vào bộ dâng hương. Các pose còn lại là nguồn riêng, không đổi màu atlas nam.
Prompt/reference và số đầu ra thực tế được giữ trong `generation.json` của nhóm nguồn.
`selection.json` chọn đúng 24 pose mỗi identity; các bản đầu được giữ nguyên.

Đã sửa riêng đầu/cổ ở `18-turn-second`, `01-turn-mid`, `19-turn-fourth` của cả hai
identity để đầu quay dần theo thân, thay cho việc giữ profile rồi nhảy sang nhìn lưng.
Nữ dùng ba bản v2; áo nâu dùng 18v2/19v2 và 01v3. Bản áo nâu 01v2 bị loại do hạt
alpha rời và được làm sạch thành v3. `refinement-generation.json` giữ prompt, đường
dẫn reference chính xác, SHA từng reference/candidate và lý do chọn/loại. Năm nguồn
đo gót không bị thay đổi trong lần tinh chỉnh đầu này.

## Canvas và lịch

Mỗi ảnh được chuẩn hóa bằng `pose_canvas.py`: canvas logic 384×512, pivot (192,468),
cùng scale và gốc nguồn cố định. Không tự crop/căn giữa từng pose theo alpha, không
mirror, đảo clip ngồi để giả đứng dậy hoặc chồng hai ảnh thân để tạo chuyển động.

Packer đọc lịch từ `transitions-v2/sequences.json`:

| Clip | Số mốc | Thời lượng nguồn |
| --- | ---: | ---: |
| standUp | 14 | 1.160 ms |
| sitDown | 15 | 1.500 ms |

Thời gian artwork không quyết định lịch server. Runtime ánh xạ clip theo phiên bản
của action/entry; nguồn này chỉ chứa geometry, pose và lịch xuất đã kiểm.

## Điểm chân trụ riêng

Đã xem full pose và crop nguồn có lưới tọa độ của từng identity. Sau đó đo mặt dưới
gót phải đang chịu lực trong 5 pose: `14-rise-support`, `22-rise-weight`,
`15-rise-half-kneel`, `23-rise-extend`, `16-rise-crouch`.

[contacts.json](contacts.json) lưu điểm nguồn thật và SHA-256 của đúng PNG đã đo.
Điểm được tinh chỉnh bằng contour da/alpha của chính ảnh, không lấy số của nam hoặc
chia đôi tọa độ. Một số điểm hai identity có thể trùng khi hình cùng pose; chúng vẫn
được kiểm trên hai file nguồn độc lập.

- [Chân nữ](woman/foot-calibration.jpg), [toàn thân nữ ở nhóm nâng người](woman/support-poses.jpg).
- [Chân áo nâu](granny/foot-calibration.jpg), [toàn thân áo nâu](granny/support-poses.jpg).

Compiler dùng `14-rise-support` của chính identity làm reference. Trong các bước có
`rightFootReference`, rootOffset = reference − contact; không đổi world path hoặc thời
gian. Chênh lệch lớn hơn 20 px logic hoặc bù làm cắt ảnh đều khiến export dừng để sửa nguồn.
Thay PNG/selection mà chưa đo lại chân cũng bị từ chối vì hash không khớp.

Phép bù giữ **điểm đã khai báo**. Đây không phải optical tracking toàn bàn chân hoặc
chứng nhận mọi clip đi bộ đều khóa chân trên mọi đường.

## Cách xem và xuất

```powershell
python scripts/pack-variant-transitions.py --contacts-review woman
python scripts/pack-variant-transitions.py --contacts-review granny
python scripts/pack-variant-transitions.py --review woman
python scripts/pack-variant-transitions.py --review granny
python scripts/pack-variant-transitions.py
```

`--contacts-review` chỉ cần 5 nguồn nâng người, xuất crop/lưới để đo, không tự điền
annotation. `--review` xuất bảng sáng/tối và storyboard/loop khi một identity đủ 24 ảnh
và annotation chân. Cả hai chế độ
đều không xuất placeholder hoặc texture runtime.

Lệnh mặc định yêu cầu cả hai bộ nguồn và đủ annotation trước khi xuất module.
Atlas master 1536×3072 ở cạnh nguồn; texture web 768×1536 có hash nội dung, ô 192×256.
Geometry vẫn dùng đơn vị 384×512. `variantMovementGeometry.ts` chỉ chứa asset/clip/idle
để renderer tải nguồn web; không đưa master hoặc PNG nguồn vào bundle.

| Identity | Texture web đã kiểm hash | Dung lượng |
| --- | --- | ---: |
| Nữ áo lam | `woman-movement-a660a3688bbd.webp` | 204.946 byte |
| Áo nâu | `granny-movement-f68fcbe7207f.webp` | 208.742 byte |

Hai texture giải mã RGBA chiếm tổng 9 MiB. Đã xem bản giải mã trên nền sáng/tối
ở `production-atlas-light.jpg` và `production-atlas-dark.jpg`; các hình này được
compiler tạo từ đúng WebP web, không chỉ từ PNG nguồn. Bù root lớn nhất là 9,095 px
logic ở nữ và 9,432 px ở áo nâu; toàn bộ pose sau bù vẫn trong canvas.

Loop `standUp-loop.webp` và `sitDown-loop.webp` là ảnh preview ghép từ atlas và giữ
cuối 600 ms trước khi lặp; không phải video trình duyệt hoặc phép đo FPS. Preview
làm tròn root offset đến pixel atlas, còn runtime dùng giá trị logic dưới pixel.

`node --experimental-strip-types --test tests/variantMovement.test.ts` đạt 4/4:
48 PNG đã chọn, hash/dimension/alpha format của nguồn và texture thật, neutral riêng,
selection/provenance, lịch nguồn, điểm gót chuẩn hóa và mốc đứng/ngồi cuối đều khớp.

Kết quả tích hợp và nghiệm thu hình trong trình duyệt được ghi trong báo cáo đợt
triển khai của web chính; nhóm nguồn này riêng lẻ chưa chứng minh toàn bộ chuyển động đạt.
