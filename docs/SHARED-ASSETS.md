# Nguồn ảnh cho giao diện phòng chung

Nguồn người dùng chỉ định: `F:\Dự Án Chung\ChuaTanPhat\assets`.
Thư mục nguồn không bị sửa. Lấy các file ảnh và nhạc để dùng trong giao diện React mới;
không sao chép JS/CSS, API tặng quà hoặc 12 nhân vật demo của dự án tham chiếu.

## File dùng trong dự án

- `public/assets/tanphat/hall.jpg`: bản dọc gốc, chép nguyên file.
- `c_man.png`, `c_woman.png`, `c_granny.png`: nhân vật đang an tọa, nguyên bản.
- `anim_man.png`, `anim_woman.png`, `anim_granny.png`: tám khung hình đi/ngồi,
  nguyên bản, được hiển thị bằng background-position trong ứng dụng mới.
- `fx_incense.png`: ảnh hương cho lúc thực hiện nghi lễ.
- `fx_lotus.png`, `fx_bell.png`: hiệu ứng dâng sen và thỉnh chuông.
- `fx_petal.png`, `fx_halo.png`: cánh sen và quầng sáng khi dâng lễ.
- `music/music1.mp3`, `music/music2.mp3`: chép nguyên file từ thư mục tham chiếu;
  tên hiển thị lấy từ hall.js: Trăng trên rừng trúc và Hơi thở ban mai.
- `public/assets/tanphat/hall-desktop.webp`: nền ngang mở rộng theo hall.jpg bằng
  **công cụ image_gen tích hợp**, sau đó đổi định dạng sang WebP cùng số pixel;
  dung lượng khoảng 313 KB. Không cắt ảnh dọc để thay cho nền ngang.
- `artwork/hall-desktop-original.png`: master PNG của ảnh ngang, ngoài public/dist.
  Bản công cụ gốc cũng được giữ trong thư mục generated_images của Codex.

README trong dự án nguồn ghi tài nguyên xuất phát từ trang Chánh điện Tịnh Tâm
và chưa xác nhận quyền phát hành lại. Ghi chú này chỉ lưu nguồn cung cấp, không
khẳng định người dùng sở hữu hoặc đã có giấy phép công khai các ảnh gốc/ảnh phái sinh.

## Prompt đã dùng cho ảnh ngang

```text
Use case: precise-object-edit / landscape expansion. Asset type: actual background
art for a Vietnamese online Buddhist temple website. Input image 1 is the user's
supplied portrait temple hall and is the edit target. Create a wide 16:9 landscape
variation, ideally 2560x1440, by thoughtfully expanding and recomposing the same
hall, not by cropping away the statue or stretching it. Preserve the beautiful
warm painted illustration style, brown carved Vietnamese wood, dragon columns,
softly glowing hanging lanterns, warm gold seated Buddha on lotus pedestal,
altar furniture, and polished wooden floor. One central Buddha, one incense burner.
The Buddha's head should be around horizontal 50%, vertical 28%; complete seated
body and pedestal visible by y=52%. Bronze incense burner's lip centered around
(50%,61%). Leave a wide believable empty wooden floor from y=70% to y=98% for
placing visitors in the browser. Extend the temple architecture harmoniously
on both sides with matching columns and soft lantern light. Remove all empty
floor cushions, all fixed smoke, any existing people, text or graphical interface;
cushions and characters are supplied separately by application code. Keep a straight
central aisle with no obstacle between floor positions (50%,88%) and (50%,75%).
A refined immersive illustrated sacred interior, no vector placeholder appearance,
no text, logo, watermark or UI. This is a background image, not a screenshot or mockup.
```

Ảnh nhận được 1672×941, gần đúng 16:9; giữ nguyên master. Điện thoại dùng ảnh dọc
gốc, vốn đã có bồ đoàn và khói vẽ trong ảnh; ứng dụng không đặt thêm khói lư hương
hoặc bồ đoàn trùng lớp trên nền đó. Nhân vật tĩnh có bồ đoàn trong chính sprite.

Giữ thêm chill_relax.mp3 của bản dự án trước làm lựa chọn Nhạc thư giãn.
Cả ba bài chỉ tải khi người dùng bật nhạc. Chuông/mõ được tổng hợp bằng Web Audio,
không lấy JS hoặc hệ thống tiền/quà của dự án tham chiếu.

Hash và dung lượng các tài nguyên mới: `offerings-audio-assets.json`.
