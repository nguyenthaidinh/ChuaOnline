# Font tiếng Việt cho ChuaOnline

Font web: `public/assets/fonts/noto-serif-vietnamese.woff2` (82.612 byte).
Đây là subset của Noto Serif chính thức, normal, variable weight400–700; trục độ rộng cố định100.
Đóng gói trong dự án, không gọi Google Fonts khi người dùng mở web.

Nguồn được khóa theo [Google Fonts commit8b0a1d0](https://github.com/google/fonts/tree/8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5/ofl/notoserif).
TTF gốc và bản SIL Open Font License1.1 được giữ ở đây; bản license cũng nằm cùng file web.
Không dựng dấu bằng cách vẽ chắp hoặc thay glyph. Font giữ các bảng GSUB/GPOS/GDEF cùng tính năng mark/mkmk.

```powershell
python scripts/prepare-vietnamese-font.py
```

Script kiểm SHA của nguồn, giữ cả Latin, các nguyên âm tiếng Việt U+1EA0–U+1EF9, dấu kết hợp,
dấu câu và ký hiệu đồng. Kiểm toàn bộ chữ NFC đang dùng trong `src/data/blessingCatalog.ts`,
cùng các trường hợp `điều`, `đều`, `thiền`, `nguyện`, `bình`. Kết quả và SHA nằm trong `manifest.json`.
FontTools4.58.0 và Brotli hiện có trong máy được dùng để dựng; không thêm thư viện runtime cho web.

Kiểm bảng font/cmap không thay thế xem render thật. Kết quả xem dấu trên trình duyệt
ở kích thước desktop và mobile được ghi trong [báo cáo tích hợp](../../docs/blessings-voice-v1/README.md).
