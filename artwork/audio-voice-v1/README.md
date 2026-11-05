# Giọng đọc lời chúc và lời nguyện nghi lễ

Bộ âm thanh được tạo cục bộ ngày 05/11/2026 bằng giọng **Microsoft An, vi-VN**
đã cài trên máy soạn. Đây là giọng tổng hợp, không phải bản thu một người đọc.
Web chỉ phát MP3 đã chuẩn bị sẵn; máy khách không cần cài giọng Windows hay gọi dịch vụ TTS.

Nội dung duy nhất lấy từ `src/data/blessingCatalog.ts`, chuẩn Unicode NFC:

- 20 lời chúc: tên lời chúc, dấu chấm rồi toàn văn nội dung, theo ID `b01`–`b20`.
- 5 lời nguyện ngắn tương ứng hương, hoa sen, cánh sen, chuông và lạy.

File web nằm trong `public/assets/audio/blessings` và `public/assets/audio/rituals`.
WAV gốc được giữ riêng trong `masters`, không tải vào web.

## Tạo lại

Trong thư mục dự án, dùng PowerShell trên Windows với `System.Speech`,
giọng Microsoft An và FFmpeg/FFprobe có trong PATH:

```powershell
pwsh -File scripts/render-temple-voice.ps1
```

Script đọc trực tiếp catalog TypeScript bằng Node, từ chối giọng không phải vi-VN,
xuất WAV24kHz/16bit/mono rồi MP3 mono24kHz/64kbps. Rate=-1, volume nguồn100.
Cắt phần gần im lặng ở hai đầu, thêm đuôi0,18s và chuẩn âm lượng mục tiêu-19LUFS/TP-2dB.
Nghỉ giữa câu được giữ. Không thay cài đặt giọng Windows hoặc dùng API key.

`manifest.json` ghi đúng câu đã đọc, giọng, thông số, đường dẫn, dung lượng,
thời lượng và SHA-256 từngMP3/WAV. `sourceSha256` là bytehash của catalog tại lúc tạo;
kiểm nội dung nên so `entry.text` với catalog để không nhầm thay đổi CRLF/LF là đổi câu đọc.
Khi đổi nội dung, cần tạo lại âm thanh tương ứng.

## Kiểm file

25/25file đã giải mã lại bằng FFmpeg thành PCM để kiểm tín hiệu, SHA và Unicode:

- 20 lời chúc dài 5,44–7,69 s; 5 lời nguyện dài 3,06–4,11 s.
- Tổng 25 MP3: 1.265.637 byte.
- RMS toàn câu từ -20,116 đến -18,608 dBFS; peak lớn nhất -2,301 dBFS, không clipping 16 bit.
- Phần gần im lặng ở đầu dưới 0,2 s, cuối dưới 0,5 s với ngưỡng -55 dB.

Chi tiết từng file trong `signal-verification.json`. Đây là kiểm tín hiệu và nội dung
đầu vào, không phải nghiệm thu nghe/phát âm. Kiểm phát, dừng, chuyển câu và hòa âm
trên trình duyệt thuộc phần tích hợp của ứng dụng.
