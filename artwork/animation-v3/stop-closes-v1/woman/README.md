# Nguồn khép chân nữ: review và contact annotations

Root sinh32 raw poses, mỗi hướng gồm right/left gather và close. Review phụ trợ
giữ nguyên raw; `selection.json` chọn hai sibling rearRight/right-gather-v2 và
left-gather-v2 để đi theo hai gait passing đã sửa đúng chân trụ. Hai output mới
dùng ImageGen tích hợp, exact prompts/references/tool paths trong
`refinement-generation.json`.

`support-contacts.json` có32 entries `frames[heading/right|left-gather|close]`.
Mỗi entry gồm source/sourceSha256, native point, landmark, anatomical supportFoot,
reviewed:true, review/evidence và targetNeutral. Điểm thực được chọn trên grid
ảnh nữ, sample alpha>160; landmark kind khớp đúng neutral foot. Heel bị che dùng
plantar toe-pad thật nhìn thấy, không suy đoán heel ẩn. Max source-to-neutral
distance sau scale là24.311 logical pixels, nhỏ hơn giới hạn45 của root compiler.

Đã xem tám bảng144×192 trên nền sáng/tối, kiểm gather vẫn giữ một chân trụ và
close thu hai chân, riêng rearRight kiểm lại full source theo convention RIGHT
gần/image-right và LEFT xa/image-left. Native vẫn1254×1254 RGBA, scale/canvas cố
định. Không mirror, crop, kéo giãn hay sửa vị trí pixel source bằng code.

```powershell
python artwork/animation-v3/stop-closes-v1/woman/review_sources.py
python artwork/animation-v3/stop-closes-v1/woman/annotate_contacts.py
```

`review/*.jpg` và `feet-review/*-grid.jpg` là evidence phụ trợ. Atlas runtime,
offset/deceleration, chống clip và browser validation do root tích hợp.
