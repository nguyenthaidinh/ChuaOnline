# Chu kỳ đi nữ/nâu, khép chân và lạy–cánh sen

Ngày 05/11/2026. Nhánh `codex/animation-v3`, mốc trước đợt này `7e6f045`.
Chỉ lưu trong dự án local; không đẩy GitHub hoặc triển khai hosting.

## Phạm vi triển khai

- Nữ áo lam và áo nâu: mỗi người có tám hướng, tám tư thế mỗi chu kỳ và tám dáng đứng riêng.
  Hai hướng đối nhau dùng ảnh thực, không lật ngang ảnh nhân vật khác.
- Cả ba y phục: hai tư thế thu/chốt chân cho mỗi chân trụ ở cả tám hướng.
  Nam thêm16 tư thế passing gọn để nối đúng chân trụ; không dùng bước heel-strike dài làm điểm dừng.
- Lạy và rải cánh sen: mỗi y phục có24 ô nguồn riêng, gồm16 tư thế dùng trong lạy và9 tư thế cánh sen,
  dùng chung một dáng neutral. Có hạ gối, đặt tay, phủ phục, chống tay, chuyển trọng lượng và đứng lên.
- Tải ảnh theo y phục đang có trong phòng và y phục đang chọn. Lỗi một atlas tùy chọn không khóa thao tác
  hoặc kéo dài nghi lễ; từng nhóm ảnh có đường lui riêng.

Tổng tám atlas mới có328 ô được chọn:144 gait/neutral,112 close/passing và72 lạy/cánh sen.
Trong đó323 ô dùng ảnh mới và5 ô tái dùng nguyên byte neutral đã có. Nguồn, prompt, ảnh tham chiếu,
SHA, lựa chọn sibling và bản bị loại được giữ trong ba thư mục `artwork/animation-v3/*-v1` tương ứng.
Master và bảng kiểm không nằm trong tài nguyên web.

## Hợp đồng chuyển động

Khách mới dùng `entryVersion:5`; hành động mới dùng `movement.version:4`.
Đường đi tới đúng điểm trước, sau đó đứng tại điểm đó420ms để passing → gather → close → neutral.
Phần cuối nhịp dừng ở trạm cho phép hướng thân về tư thế làm lễ. Khi về ghế, nhân vật an tọa nhìn lên bàn thờ.
Tính pha bước và chân trụ hoàn toàn từ khoảng cách/thời gian chung; không tích lũy tiến độ theo số lần RAF.

Lịch diễn xuất vẫn là timeline3 cho hoa/chuông/cánh sen/lạy và timeline4 cho hương.
Nhịp dừng mới cộng420ms mỗi chiều: mốc đặt tuyệt đối của hành động mới muộn hơn420ms so với movement3,
và thời điểm kết thúc muộn hơn840ms; mốc tiếp xúc bên trong nghi lễ không đổi.
Snapshot cũ, entry3/4 và movement2/3 giữ lịch cũ. Bộ lạy/cánh sen mới chỉ áp dụng cho movement4.

Ba lạy lấy từ ba chu kỳ thật của lịch chung.500ms đầu đoạn đứng lên thuộc động tác nâng người;
260ms cuối mới quay về hướng đường về. Cánh sen giữ vật trong tay tới trước marker350ms rồi buông đúng marker.
Điểm phát cánh lấy từ tâm vật tại điểm tay được đo riêng từng y phục; lớp ngón tay dùng chính pixel của nguồn.
Khi atlas mới lỗi, điểm phát dùng bàn tay nguồn cũ đang thực sự hiển thị ở client đó.

## Đo và kiểm nguồn

Passing/gather/close được ghim vào cùng bàn chân của neutral cùng y phục, cùng hướng và cùng loại landmark.
Nếu gót bị che, dùng vùng plantar/toe-pad nhìn thấy được cho cả nguồn và đích; không suy ra gót ẩn.
Metadata ghi ảnh gốc, SHA, điểm native, loại landmark và bằng chứng duyệt. Compiler từ chối nguồn thay đổi,
điểm chưa duyệt, sai chân/loại landmark, offset quá45px logic hoặc ảnh bị cắt sau ghim.

Một nguồn close nam có canvas bị cắt sát còn gần vuông. Nguồn gốc được giữ nguyên; ngoại lệ phải có
`canvas-overrides.json` khóa SHA và đánh dấu đã xem. Compiler căn giữa trong canvas vuông ảo, co đồng đều
hai trục, ghi `sourceCanvas` trong audit. Chỉ chấp nhận lệch tỷ lệ tối đa2%; ảnh portrait bị loại.

Các lỗi phát hiện qua ảnh native được sửa bằng nguồn sibling và lưu lịch sử: nữ rearRight02/06 từng
chưa đổi chân thật; áo nâu rearLeft06 và nhãn chân neutral bị ngược; một số gather/close nam theo nguồn
passing cũ giữ cùng chân trụ. Không dùng việc đổi tên hoặc đổi điểm metadata để che lỗi hình.

## Cách kiểm lại

```powershell
cd "F:\Dự Án Chung\ChuaOnline"
npm run dev
```

Vào địa chỉ Vite in ra. Xưởng `?animation-lab=incense` có chọn cả năm nghi lễ, ba y phục,
tua bằng thời điểm ms và kiểm trọn chuỗi. Trang xưởng chỉ tải trong development.

Compiler:

```powershell
python scripts/pack-variant-gaits.py
python scripts/pack-stop-closes.py
python scripts/pack-bow-petal.py
```

## Kết quả kiểm tra

- Typecheck,119/119 test và build đạt. Audit lịch cũ khớp480 hành động/207.765 mẫu pose;
  test movement4 kiểm408 đường và các mốc mới. Không dùng số test để thay nghiệm thu ảnh.
- Tám atlas mới có1.999.888 byte nén,34,59375 MiB RGBA theo kích thước pixel.
  Cả20 atlas animation-v3 là79,21875 MiB; con số này không gồm ảnh nền, bộ cũ, DOM, cache hoặc bản sao GPU.
- Ba khách thật trong phòng kiểm chạy ba lạy đồng thời, từng người đi qua bộ đếm0→1→2→3,
  dùng đúng atlas mới của mình và trở về tư thế ngồi nhìn bàn thờ. Console bốn trang kiểm cuối không có lỗi/cảnh báo JS.
- Khung360→390 giữ nguyên person/action ID giữa lễ rải sen. Khung390→768 giữ person ID khi đang lạy;
  ngay sau đổi layout, node sprite mới chưa có đủ dataset trước nhịp animation tiếp theo. Quan sát sau đó
  ở390px vẫn là ba người đó, đủ3lạy và an tọa. Không coi dataset rỗng tức thời là bằng chứng giữ timestamp.
- Khách vào giữa lễ thấy các action ID đang chạy. Cả ba y phục hiện18-pre-release trước marker1ms,
  chuyển19-release và bỏ vật khỏi tay đúng marker. Tâm vật cầm và điểm phát sen đo từ DOM lệch dưới0,05 CSSpx
  trong mẫu nữ đã bắt được; đây là phép kiểm hình học, không phải đo chuyển động từ pixel video.
- Máy chủ kiểm riêng trả404 có chủ ý cho atlas close và lạy/sen nữ. Gait và chuyển tiếp nữ vẫn hiện,
  nghi lễ dùng nguồn cũ, phát sen từ tay cũ (mẫu DOM lệch dưới0,04 CSSpx) và kết thúc, mở lại nút thao tác.
- Sau kiểm đã cho mọi khách thử rời điện, đóng các tab và dừng ba máy chủ kiểm riêng. Không thay API8787 đang có của người dùng.

Ảnh08 ban đầu thực tế còn nâng tay/cúi đầu, không đạt phủ phục dù metadata đặt tên `prostrate`.
Đã sửa9 nguồn07/08/09 sau khi xem trực tiếp trên web; ảnh cũ và lịch sử bị loại vẫn giữ nguyên.
Thêm nhịp07 làm cầu nối120ms khi nâng người, giảm nhịp10 tương ứng để `bowUp` vẫn1.020ms.
Guard mới khóa SHA và kiểm điểm trán/tay thấp so với hông cùng mặt sàn phối cảnh; nguồn cũ không thể được chọn lại chỉ bằng đổi tên.

- [Thông tin kiểm tra](verification.json)
- [Lạy nữ sau sửa](bow-woman-web.png) · [Trước sửa](bow-woman-before-refinement.png)
- [Video ba khách lạy](bow-room-web.mp4) · [Video đi–dừng–rải sen](petal-room-web.mp4)
- [Mốc thả sen trên trình duyệt](petal-marker-browser.json) · [Khung390px](mobile-room-390.png)

Video được ghép từ72 ảnh/24,493s (lạy) và80 ảnh/24,883s (sen), giữ timestamp chụp thật,
khoảng3 ảnh chụp/giây. Đây không phải phép đo FPS của renderer hoặc hiệu năng điện thoại.

## Giới hạn nghiệm thu

Đây là hoạt ảnh sprite theo tư thế, không phải rig liên tục. Bảng điểm chân và kiểm lịch không thay thế
việc xem chuyển động thật. Chưa nghiệm thu hiệu năng trên điện thoại vật lý hoặc toàn bộ ma trận phát hành24 khách.
Các mục không gian/âm thanh, lời nguyện/thiền và phát hành ở chặng4–6 vẫn theo kế hoạch riêng.
