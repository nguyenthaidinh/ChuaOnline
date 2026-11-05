# Nữ áo lam: tám hướng bước và neutral riêng

Nguồn được tạo bằng ImageGen tích hợp, một pose RGBA thật mỗi call. Không đổi màu
hoặc lật atlas nam để làm nữ. Bộ áo lam, vóc dáng, búi đen và khuôn mặt lấy từ chính
neutral/dâng hương nữ đã duyệt. Các ảnh nam chỉ là tham chiếu pose/camera/chân/tay.

## Hợp đồng nguồn

- Tám heading: rear, rearRight, right, frontRight, front, frontLeft, left, rearLeft.
- Mỗi hướng có tám pha, contact phải ở00 và contact trái đối bước ở04.
- Mỗi hướng có `stand.png`; riêng rearRight tái dùng nguyên file neutral nữ cũ.
- Tọa độ chuẩn hóa vẫn384×512/pivot192,468. Không crop/căn alpha riêng từng frame,
  không phóng lớn người ngồi/cúi để bù khung. Đầu y≈30 và sàn y≈1210 trên1254canvas.
- Đích pose nam5hướng lấy từ selection đã kiểm ở directions-v2, ngang trái/phải từ
  directions-v1, lưng phải từ walk-v1 với index12→8:0,1,3,5,6,7,9,11.

`male-reference-manifest.json` ghi chính xác file tham chiếu. Các bảng
`male-*-references.jpg` giữ nguyên toàn thân ở tỷ lệ cố định để rà tay/chân/hướng.
`contacts-plan.json` và `records/*.json` giữ prompt và referenced paths đã gửi tool;
`generation.json` tổng hợp lại sau mỗi lượt review. `toolOutput` là file ImageGen gốc,
ảnh dùng trong dự án đã được copy vào thư mục này.

## Nguồn được chọn

`selection.json` chọn bản sửa dạng sibling, giữ bản gốc để đối chiếu. `rearLeft/stand.png`
ban đầu bị kéo về hướng phải; `rearLeft/stand-v2.png` sửa quay cả thân/đầu/chân sang
trái. Không dùng bản hướng sai để tạo gait hoặc neutral runtime.

`locked-stands.json` ghi tám neutral đã duyệt cùng SHA. `locked-anchors.json` khóa
16 contact và16 passing. Hai revision rearRight02/06 được thông báo trước cho root,
có chấp thuận và giữ nguyên bản cũ trong `anchor-revisions.json`; final là02-v2 và06-v4.
Convention rearRight đã kiểm riêng: RIGHT là chân gần/image-right, LEFT là chân xa/
image-left. Pha02 giữ chân phải gần thẳng trụ, pha06 giữ chân trái xa trụ. Không chỉ
đổi tay rồi coi là đổi chân.

Các sửa khác gồm rearRight06 làm sạch alpha, right06 thu gối, left02/06 thu chu kỳ
và sửa thứ tự thigh occlusion, rearLeft06 đổi thật chân trụ. `selection.json` luôn
trỏ bản được duyệt, không mặc định mọi `*.png` trong folder đều dùng runtime.

## Bàn giao đã kiểm

`handoff.json` chứa đủ72 selected paths/SHA và11 draft paths/SHA/lý do. Tổng83 PNG
native được giữ:82 output ImageGen mới và1 neutral tái dùng nguyên byte.71 output
mới được chọn cùng1 reuse. Một draft từ runner bị ngắt được phục hồi provenance
bằng exact SHA về file builtin; record ghi rõ, không bịa thời điểm generation.

Toàn bộ nguồn native1254×1254 RGBA thật, geometry chuẩn384×512/pivot192,468. Đã
kiểm bounds không cắt người, hash lock, tám board sáng/tối ở144×192 và tám loop
8frame/960ms. Preview loop nguồn không thay kiểm thử runtime/browser của root.

`support-feet.json` đo16 passing supportPoint trên chính ảnh nữ; `neutral-feet.json`
đo16 điểm hai chân của8 stand. Điểm generic giữa passing và neutral dùng cùng loại
landmark (`visible-heel` hoặc `visible-plantar`). Khi heel bị che, dùng plantar
toe-pad nhìn thấy thật và ghi chú; không suy ra heel ẩn hoặc trừ heel với toe.
`supportHeel` chỉ giữ như secondary khi heel thật nhìn thấy. `contact-feet.json`
giữ ba điểm contact ban đầu cho review gait, không dùng để bắt đầu khép chân.

## Công cụ review

```powershell
python artwork/animation-v3/variant-gaits-v1/woman/review.py --male-contacts
python artwork/animation-v3/variant-gaits-v1/woman/review.py --male-phases
python artwork/animation-v3/variant-gaits-v1/woman/review.py --stands
python artwork/animation-v3/variant-gaits-v1/woman/review.py
python artwork/animation-v3/variant-gaits-v1/woman/handoff_assets.py
```

Lệnh cuối tạo board sáng/tối, loop8frame khi đủ và source-review.json chứa hash,
canvas/bounds của selected PNG. Nó không xuất placeholder hoặc atlas runtime.
Loop nguồn960ms không phải video browser hoặc phép đo FPS/khóa chân toàn đường.
