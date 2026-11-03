# Danh mục tài nguyên — bản thử nghiệm cục bộ

Giấy phép MIT của repo chỉ áp dụng cho mã nguồn, không bao gồm `public/assets`.
Các nguồn dưới đây được chép lại từ README gốc, chưa phải xác nhận độc lập về quyền phát hành.
Danh mục đầy đủ với dung lượng và SHA-256 nằm trong `asset-inventory.json`.

| Tài nguyên | Vị trí hiện tại | Nguồn ghi trong bản gốc | Việc cần làm trước công khai |
| --- | --- | --- | --- |
| di.fbx, khan.fbx, quy.fbx, thaphuong.fbx | public/assets/3d | Adobe Mixamo | Xác nhận điều khoản phân phối file trên web |
| nguoi.fbx | public/assets/3d | Chủ dự án cung cấp | Xác minh nguồn và quyền sử dụng/phân phối |
| chanh-dien-2.webp | public/assets/bg | Chủ dự án cung cấp | Xác minh quyền hoặc thay nền mới ở chặng 4 |
| chill_relax.mp3 | public/assets/audio | Tạo bằng ACE-Step theo README gốc | Ghi lại bản model, nguồn tạo và điều khoản áp dụng |
| buddhist_flute.mp3, khuc_thien_dao.mp3 | archive/live/public/assets/audio | Chưa rõ | Chưa đưa vào bản web |
| niem_phat_nam_mo_a_di_da_phat.mp3 | archive/live/public/assets/audio | Bản thu của người khác | Chưa đưa vào bản web |
| chanh-dien-2-hd.webp, chanh-dien-2-4k.webp | archive/live/public/assets/bg | Phóng bằng Real-ESRGAN từ nền gốc | Quyền phụ thuộc nền gốc; chưa dùng trong bản web |
| phattu.png | archive/live/public/assets/devotees | Chủ dự án cung cấp | Chưa đưa vào bản web |

Chuông được tổng hợp bằng Web Audio, không sử dụng bản thu bên ngoài.
Hình đại diện dự phòng dùng ký tự Unicode của thiết bị.
Không tải font, ảnh avatar hoặc âm thanh từ dịch vụ bên ngoài. CSS giữ tên font Lora;
khi thiết bị không có Lora sẽ dùng serif hệ thống. Font đóng gói và bộ nhận diện cuối
cùng để chặng hoàn thiện hình ảnh.

Hiện `dist` chỉ chứa một nền (~372 KB), một bản nhạc (~5.66 MB), năm file FBX (~8.45 MB)
và mã frontend. Đây chưa phải bộ asset đã được duyệt để phát hành công khai.
