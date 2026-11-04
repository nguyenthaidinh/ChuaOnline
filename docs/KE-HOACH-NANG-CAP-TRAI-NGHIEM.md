# Kế hoạch nâng cấp trải nghiệm ChuaOnline

Ngày 04/11/2026. Mốc nguồn: `628098d`. Đây là kế hoạch triển khai, chưa phải báo cáo hoàn thành. Bộ prompt đi kèm: [PROMPT-HOAT-ANH.md](PROMPT-HOAT-ANH.md).

Tiến độ gần nhất: đã tích hợp phần cốt lõi dâng hương nam áo lam của chặng 2 vào web chính,
kèm lịch v2, 23 tư thế và chuyển hương từ tay vào lư. Chặng 1–2 vẫn mở ở các hướng đi,
điểm nối và kiểm mobile; chưa đánh dấu toàn bộ kế hoạch hoàn thành.
[Bảng tiến độ](animation-v3/README.md) và [bằng chứng đợt mới](animation-v3/incense-v1/README.md).

## 1. Kết quả hướng tới

Một chánh điện trên trình duyệt có không khí trang nghiêm, nhân vật hòa với nền, đi đứng có trọng lượng và dâng lễ có tiếp xúc rõ ràng. Khách thấy nhau trong cùng phòng, nghi lễ chạy đúng thời gian, nhạc dễ sử dụng. Tính năng mới tạo khoảng lặng và sự gắn kết, thay vì làm người dùng phải thao tác nhiều.

Thứ tự ưu tiên: **một nghi lễ dâng hương thật tốt → các nghi lễ còn lại → hoàn thiện không gian → lời nguyện và thiền → tính năng cộng đồng**. Không sản xuất hàng loạt ảnh trước khi mẫu thử đạt chất lượng.

Không cam kết tuyệt đối không có lỗi. Điều kiện phát hành là không còn lỗi nghiêm trọng đã biết trong phạm vi kiểm thử, có bằng chứng kiểm tra, ghi rõ phần chưa kiểm và có cách quay về bản ổn định.

## 2. Hiện trạng và vấn đề cần giải quyết

| Hiện trạng trong code | Hệ quả cần xử lý |
| --- | --- |
| App đang dùng RoomScene, nhân vật DOM/CSS sprite 2D | Giữ phòng chung hiện có; thử chất lượng hình trước khi quyết định thay renderer |
| Mỗi atlas có 30 ô, hai chu kỳ đi 8 khung; nhiều clip dùng lại tư thế | Chuyển hướng và chuyển động tay thiếu khung trung gian; cần ảnh hoặc rig đúng giải phẫu |
| Đi bộ chỉ phân trước/sau rồi lật trái/phải | Góc cơ thể chưa khớp hướng đi; cần các hướng đi và chuyển hướng riêng |
| Ngồi đã có góc lưng thẳng cho ba y phục | Dùng làm chuẩn đích khi về chỗ; nối tư thế đứng/ngồi vào chuẩn này |
| ritual.ts lấy thời lượng từ manifest hình và được server sử dụng | Thay ảnh/thời lượng có thể đổi timeline phòng; cần tách lịch nghi lễ và phiên bản hóa |
| Vật phẩm được gắn qua điểm tay; hình thân chưa tách bàn tay trước/sau | Cần lớp che và điểm nắm chính xác, tránh hương đè lên ngón hoặc xuyên thân |
| Hiệu ứng tượng kéo dài 6 giây, dùng ID/mốc server | Hoàn thiện hình thức và xử lý nhiều lễ đồng thời; giữ tính đồng bộ |
| App.tsx chứa nhiều dialog, audio và điều phối nghi lễ | Chia theo tính năng để thay đổi dễ kiểm soát |
| 80 lời chúc và 3 bài nhạc đã có; bộ kiểm tra trước đó đạt 36 test | Đây là nền tảng hồi quy, không đồng nghĩa hoạt ảnh đã được nghiệm thu mỹ thuật |

## 3. Hướng mỹ thuật

Giữ kiến trúc gỗ, tượng Phật vàng và ánh sáng ấm. Nhân vật cần cùng độ tương phản, màu ánh sáng và phối cảnh với nền. Áo lam thiên xám xanh dịu; áo nâu trầm; tránh áo phát sáng hoặc ngả tím quá khác nền. Giữ tỷ lệ người lớn và sự kín đáo của trang phục.

- Camera cố định; nền desktop và mobile có cùng hệ tọa độ bàn thờ, sàn và vị trí tương tác đã hiệu chỉnh.
- Khi an tọa, đầu và lưng ở giữa bồ đoàn, nhìn về tượng. Khi đi ngang hoặc chéo, thân phải quay theo đường đi.
- Bóng chạm chân rõ nhưng mềm; không dùng một ellipse giống nhau cho đứng, đi, quỳ và lạy.
- Lễ vật là lớp độc lập. Khói nhỏ, ngọn hương đỏ nhẹ, cánh sen đủ nhìn nhưng không che mặt tượng hoặc nút thao tác.
- Hiệu ứng trước tượng xuất hiện rồi tan mềm; nhiều người dâng cùng lúc phải có bố cục giới hạn, không chồng bốn biểu tượng vào cùng một điểm.
- Bổ sung ánh nến/đèn nhẹ và chuyển động không khí sau khi hoạt ảnh cơ thể đạt. Không lạm dụng blur, bloom hoặc rung camera.

## 4. Cách sản xuất hoạt ảnh

**Ưu tiên thử rig rồi xuất sprite ngoại tuyến**: tạo nhân vật có bộ xương, khóa camera/ánh sáng, diễn hoạt bằng keyframe và xuất các góc thành ảnh trong suốt. Web vẫn dùng atlas, không bắt buộc tải một cảnh 3D đầy đủ. Cách này cho phép khóa chân, giữ tỷ lệ cơ thể và sửa động tác có hệ thống.

Chưa chốt phần mềm hay thêm phụ thuộc runtime. Chặng thử phải xác định công cụ và khả năng rig sẵn có. Nếu chưa có rig đạt, dùng ảnh tham chiếu và key pose được chỉnh nhất quán, bổ sung khung trung gian rồi kiểm từng chuỗi. Nếu chuỗi AI thay mặt, thay tay, đổi tỷ lệ hoặc rung hình, phải sửa nguồn hoặc chuyển phương án; không che lỗi bằng tăng tốc/crossfade.

Công cụ tạo ảnh dùng cho thiết kế nhân vật, reference góc nhìn, key pose, lớp áo và prop. Ảnh tạo ra không tự có xương, điểm tiếp xúc hay chuyển động liên tục. Không coi một sprite sheet AI là sản phẩm đã sẵn sàng đưa vào web.

### Quy mô tài nguyên dự kiến

Số khung dưới đây là mục tiêu sản xuất ban đầu, có thể điều chỉnh sau bản thử. Chỉ triển khai một nhân vật nam áo lam trước; nữ và áo nâu theo sau khi chuyển động chuẩn đã đạt.

| Nhóm | Mục tiêu ban đầu | Điều kiện quan trọng |
| --- | --- | --- |
| Đi bộ | 12 khung/chu kỳ, 6 hướng: trước, sau, chéo trước trái/phải, chéo sau trái/phải | Chân trụ không trượt; khoảng đi tương ứng độ dài bước |
| Bắt đầu và dừng đi | 4–6 khung mỗi chuyển tiếp | Không bật từ đứng yên sang tốc độ tối đa |
| Quay người | 6–8 khung cho góc quay thực sự dùng | Chuyển trọng lượng và bước xoay chân, không xoay toàn ảnh |
| Ngồi xuống và đứng lên | 10–14 khung mỗi chuỗi | Điểm chạm sàn ổn định, nối đúng tư thế ngồi lưng thẳng |
| Dâng hương tại bàn | 18–24 khung, giữ một số tư thế theo thời lượng | Hai tay nắm đúng, điểm đặt vào đúng lư |
| Dâng hoa | 14–20 khung | Nâng hai tay, đặt, buông và rút tay có phân biệt |
| Một chu kỳ lạy | 18–24 khung cùng tư thế giữ | Quỳ, hạ thân, trán chạm sàn, chống tay và nâng thân đúng trình tự |
| Chuông và cánh sen | 10–16 khung mỗi chuỗi | Mốc chạm chuông/thả cánh hoa có thể xác định chính xác |

Không tải toàn bộ master vào web. Dùng atlas theo nhóm động tác/hướng, tải trước phần cần thiết; giữ tư thế ngồi nhẹ cho phòng đông. Các khung được giữ lâu hơn nếu cần nhịp chậm; không đồng nhất số khung artwork với FPS renderer.

## 5. Kịch bản chuẩn của một lần dâng hương

Thời lượng diễn xuất ở bàn dưới đây là dự kiến; thời gian đi đến/về phụ thuộc ghế và chiều dài đường. Không kéo dài nghi lễ bằng đi chậm bất thường.

| Nhịp | Khoảng thời gian dự kiến | Hành động và điểm kiểm |
| --- | --- | --- |
| Đứng dậy | 0,9–1,3 giây | Chuyển trọng lượng, chống/thu tay hợp lý, đứng vững rồi mới bước |
| Đi tới | Theo khoảng cách | Rời ghế vào lối đi, né bồ đoàn, chọn hướng cơ thể theo tiếp tuyến |
| Dừng và hướng bàn thờ | 0,4–0,6 giây | Giảm tốc, đặt chân, xoay người về lư |
| Nhận/nâng hương | 0,6–0,9 giây | Hương xuất hiện từ nguồn hợp lý ở bàn, nằm giữa hai tay |
| Chắp hương trước ngực | 0,7–1,0 giây | Vai thư giãn, thân ổn định |
| Nâng ngang trán và cúi đầu | 1,0–1,4 giây | Tay đi theo quỹ đạo liên tục, không xuyên mặt |
| Đưa hương vào lư | 0,8–1,1 giây | Đầu gốc hương tới điểm nhận, ngón tay còn giữ trước mốc đặt |
| Buông và rút tay | 0,5–0,8 giây | Tại mốc đặt: vật rời tay đúng một lần, tồn tại trong lư; khói bắt đầu |
| Chắp tay và lùi | 0,6–0,9 giây | Khoảng dừng ngắn rồi lùi khỏi bàn, xoay người trước khi về |
| Trở về và ngồi | Theo khoảng cách + 1,0–1,4 giây | Về đúng ghế, quay nhìn tượng, ngồi giữa bồ đoàn |

Quy trình là diễn xuất cho trải nghiệm website, chưa phải khẳng định một nghi thức Phật giáo thống nhất. Nếu định vị website theo một chùa/truyền thống cụ thể, cần người hiểu nghi lễ đó duyệt dáng tay và trình tự trước khi chốt bộ hình.

## 6. Các chặng triển khai

### Chặng 0 Khóa bản chuẩn và lập phòng kiểm tra

Tạo nhánh `codex/animation-v3`, giữ mốc quay lại `628098d`. Đọc lại các thay đổi người dùng trước khi sửa. Chụp/video nghi lễ hiện tại; lập bảng lỗi về bước chân, hướng đi, tay, bóng và chuyển cảnh. Tạo trang kiểm tra local có scrub timeline, lặp clip, xem chậm, hiển thị pivot/điểm tay và so sánh nền sáng/tối. Trang này không được đưa vào luồng người dùng hoặc cho phép điều khiển phòng thật.

**Đạt khi:** tái hiện cùng một action tại cùng thời gian cho cùng tư thế; có video trước sửa và danh sách lỗi có vị trí cụ thể. Chưa cần thay nền hoặc thêm tính năng.

### Chặng 1 Một mẫu nhân vật và một chu kỳ đi

Dùng prompt trong tài liệu đi kèm để làm một bộ reference nam áo lam. Thử một chu kỳ đi sau chéo và một chuyển tiếp về tư thế ngồi lưng thẳng. So sánh phương án rig xuất sprite với key pose ảnh nếu cần. Dựng loop ở tốc độ thật và 0,25× trong cảnh chùa.

**Đạt khi:** không đổi mặt/tóc/tỷ lệ giữa khung; chân trụ không trượt dễ thấy ở tốc độ thật; không cắt đầu/chân; ánh sáng hợp nền; khung đầu/cuối vòng lặp nối được. Nếu chưa đạt thì sửa mẫu, chưa nhân bản ra ba y phục và toàn bộ hướng.

### Chặng 2 Dâng hương hoàn chỉnh

Sản xuất và nối đủ các nhịp ở mục 5. Bổ sung điểm nắm của hai tay, điểm gốc hương, điểm nhận của lư và lớp che bàn tay/lư. Ghép đi–dừng–dâng–quay–về–ngồi thành một action. Tách lịch nghi lễ khỏi metadata hình trước khi thay thời lượng.

**Đạt khi:** một người dâng được trọn chuỗi từ nhiều ghế; vật không nhân đôi ở mốc chuyển; client vào muộn vẫn thấy đúng giai đoạn; không phát lại chuông/hiệu ứng cũ khi quay lại tab. Bàn giao video desktop, mobile và clip phóng lớn tay–lư.

### Chặng 3 Đủ nghi lễ và ba y phục

Mở rộng theo mẫu đã đạt: dâng hoa, rải cánh sen, thỉnh chuông, ba lần lạy. Làm nữ áo lam và người áo nâu; đo metadata riêng thay vì mặc định chia đôi tọa độ của nam. Kiểm toàn bộ ghế, hướng đi và lớp trước/sau. Dùng hàng đợi hoặc lượt đi hợp lý tại vùng giao nhau nếu quan sát thấy nhân vật xuyên nhau.

**Đạt khi:** ba lạy đếm theo chu kỳ thực; ba y phục đều qua kiểm hình và động tác; bốn người làm lễ đồng thời không chiếm cùng trạm; người về ghế không đi xuyên người đang quỳ. Không thay server để tin tọa độ hay mốc đặt do client gửi.

### Chặng 4 Không gian và âm thanh

Chỉnh màu nhân vật, bóng, tiếp xúc sàn, khói và hiệu ứng tượng. Đặt giới hạn số hiệu ứng và bố cục khi có nhiều lễ. Tách điều khiển nhạc nền/chuông/âm cảnh; lưu lựa chọn âm lượng trên thiết bị. Thêm fade đầu/cuối, giảm nhạc nhẹ khi chuông vang nếu người dùng bật tùy chọn. Kiểm tắt tiếng, đổi bài lỗi, màn hình khóa và resume; âm thanh chỉ khởi động qua thao tác người dùng.

**Đạt khi:** nhìn ảnh tĩnh nhân vật không như dán lên nền; ở chuyển động thật không có hiệu ứng che nghi lễ; không có hai bài nhạc phát chồng do đổi bài; tắt âm lượng có hiệu lực ngay.

### Chặng 5 Tính năng tạo giá trị

Ưu tiên triển khai hai tính năng nhỏ trước:

1. **Lời nguyện riêng:** chọn chủ đề hoặc nhập ngắn, xem lại và xóa trên thiết bị. Ghi rõ chỉ lưu ở trình duyệt này. Nội dung riêng không xuất hiện trong snapshot phòng, log hay danh sách khách.
2. **Thiền 1–3–5 phút:** hướng dẫn thở tùy chọn, chuông đầu/cuối, tạm dừng/kết thúc. Bộ đếm dùng thời gian thực thay vì phụ thuộc FPS; hành vi khi tab ẩn phải rõ. Có bản tĩnh cho người giảm chuyển động.

Tiếp theo là chọn âm cảnh mưa/chim và “một việc thiện hôm nay”. Vườn đèn và lời nguyện công khai triển khai sau: cần lưu trữ có thời hạn, giới hạn gửi, lọc nội dung, báo cáo và khả năng ẩn/xóa. Không coi textarea công khai chưa kiểm soát là bản hoàn thiện. Trước khi công khai cần xác định người quản lý và nơi lưu dữ liệu.

**Đạt khi:** tính năng dùng được bằng bàn phím và trên điện thoại, trạng thái lưu/thất bại rõ, không làm người đang thiền bị bật popup. Không thêm điểm công đức, xếp hạng trả tiền hay cơ chế thúc ép quay lại.

### Chặng 6 Hoàn thiện code và phát hành

Refactor từng phần cùng tính năng liên quan, không viết lại toàn bộ ứng dụng trong một lần. Kiểm hồi quy, hiệu năng, lỗi tài nguyên và kết nối. Bàn giao diff, checklist, ảnh/video, lệnh chạy và các giới hạn còn lại. Phát hành qua mốc có thể quay lại; phạm vi hiện tại tiếp tục là local, việc đẩy repo/triển khai theo yêu cầu tiếp theo của người dùng.

## 7. Kiến trúc code mục tiêu

| Phần | Trách nhiệm và thay đổi |
| --- | --- |
| `shared/ritualTimeline` dự kiến | Lịch và marker nghi lễ dùng chung server/client, độc lập atlas; mỗi action có phiên bản timeline |
| `room/animation` dự kiến | Manifest, ánh xạ thời gian sang pose, hướng đi, metadata tay/chân; hàm thuần, không gọi DOM/network |
| `room/motion.ts` | Đường đi, độ dài, vận tốc và hướng; tính/cache route khi action đổi, tránh dựng lại đường trong mọi khung |
| `room/render` dự kiến | Chuyển pose thành style/sprite/prop/bóng; một scheduler, không dùng React state cho từng khung |
| `room/effects` dự kiến | Hiệu ứng theo ID/mốc server, giới hạn số lớp, không tự suy ra vật phẩm mới từ render |
| `features/audio` | Player, preference, lỗi media, UI điều khiển; dọn listener và voice khi unmount |
| `features/blessings`, `features/wishes`, `features/meditation` | State và UI riêng; App chỉ lắp ghép và điều phối |
| `server` | Ghế, trạm, thời gian, idempotency, validation và snapshot công khai |
| `scripts` và `artwork` | Nguồn gốc ảnh, prompt, chuẩn hóa, đóng atlas và kiểm tự động |

Quy ước: TypeScript strict; kiểu dữ liệu hữu hạn cho state/clip; đặt tên mô tả nhiệm vụ; định dạng code nhất quán; không thêm `any` để bỏ qua lỗi. Loại mã cũ khỏi đường build sau khi kiểm import, không xóa tài liệu hay nguồn người dùng. Mỗi commit gồm một thay đổi có thể xem lại và quay về.

Phiên bản timeline phải đi cùng hợp đồng server/client. Khi đổi độ dài nghi lễ, action đang chạy vẫn dùng phiên bản cũ hoặc phải chờ phòng kết thúc trước khi chuyển. Không triển khai server và client hiểu khác mốc đặt vật. Lỗi asset mới phải fallback về bộ hình đã đạt, không khiến người dùng mắc kẹt trạng thái bận.

## 8. Chuẩn tài nguyên

- Master RGBA cùng canvas, camera, scale và điểm gốc; không crop từng pose rồi tự căn giữa.
- Đo metadata trên kích thước thật của file. Công cụ có thể trả kích thước khác yêu cầu; không ghi manifest theo kích thước mong muốn.
- Lưu pivot gốc, điểm chân trái/phải, tay trái/phải, grip của vật và mặt phẳng che theo khung/hướng cần dùng.
- Giữ nguồn, prompt, ảnh tham chiếu, phiên bản, kích thước, hash và ghi chú quyền sử dụng. Không ghi nguồn là tự tạo nếu là ảnh bên ngoài.
- Kiểm alpha trên nền sáng/tối; không viền màu, không bóng bake trùng bóng runtime; tay không mất ngón hoặc đổi hình đột ngột.
- Đóng atlas có khoảng đệm và kiểm clipping. Không nội suy chồng hai ảnh toàn thân để giả chuyển động tay/chân.
- Asset cache có version/hash; preload clip kế tiếp, xử lý timeout/retry, giữ bộ tối thiểu để còn vào điện được.

## 9. Ma trận nghiệm thu

| Nhóm | Tình huống phải kiểm | Bằng chứng |
| --- | --- | --- |
| Hình và chuyển động | 3 y phục; toàn bộ hướng; bước đầu/cuối; quay; ngồi; đặt lễ; ba lạy | Video tốc độ thật và chậm, storyboard tiếp xúc, ảnh desktop/mobile |
| Đồng bộ | 2 client, vào giữa nghi lễ, reconnect, tab ẩn/hiện, request lặp, bấm nhanh | ID/mốc khớp, không nhân đôi đồ vật/âm báo, đúng trạm/ghế |
| Phòng đông | 24 khách, 4 nghi lễ đồng thời, cả khách chờ và khách rời | Không ghế trùng, không trạm trùng, không xuyên vùng nghi lễ |
| Sự cố | Ảnh/audio 404, mạng chậm, server tắt, request timeout, snapshot trễ | Có phục hồi và lỗi dễ hiểu, không màn trắng/treo bận |
| Âm thanh | Bật/tắt, đổi nhanh, volume 0, phát lỗi, khóa màn hình, resume | Media state và nghe thực tế nếu có thiết bị; không gọi kiểm tra API là kiểm nghe |
| Responsive | 360/390/768/1366/1920 px, xoay máy, zoom 200% | Không tràn ngang, đủ nút, không che tượng/vật, vị trí tương tác đúng |
| Trợ năng | Tab/Shift+Tab, Escape, focus sau dialog, tên nút, giảm chuyển động | Thao tác được không cần chuột; không chạy hiệu ứng mạnh khi đã giảm chuyển động |
| Dữ liệu mới | Xóa lời nguyện, lưu lỗi/hết quota, nội dung riêng, thiền tạm dừng | Không lộ lời nguyện riêng ra phòng; đồng hồ không chạy sai khi FPS giảm |

Mục tiêu hiệu năng ban đầu, cần đo trên thiết bị cụ thể ở chặng 0: phòng 24 khách và 4 nghi lễ giữ khoảng 30 FPS trên thiết bị mobile trung bình được chọn; p95 thời gian khung không quá 33 ms. Ghi tên thiết bị, trình duyệt, cách đo và kết quả, không chỉ đọc một chỉ số FPS tức thời.

Mục tiêu tải ban đầu: ảnh thiết yếu của một layout không quá 5 MB nén; audio tải khi bật; không tải master/FBX không dùng. Mục tiêu texture giải mã đang giữ khoảng 96 MiB trở xuống, tính theo kích thước pixel và đo lại bộ nhớ thực tế. Nếu không đạt, giảm số atlas đồng thời, dùng LOD/phân nhóm tải và hiệu chỉnh tài nguyên trước khi thêm hiệu ứng.

Chạy `npm run typecheck`, `npm test`, `npm run build` cho mỗi thay đổi logic/tài nguyên ảnh hưởng runtime. Bổ sung test cho timeline version, marker một lần, chuyển hướng, fallback và dữ liệu riêng. Không viết test chỉ sao chép số trong implementation. Build và test đạt là điều kiện cần; nghiệm thu mỹ thuật vẫn cần xem chuyển động thật.

## 10. Bàn giao đầu tiên

Gói đầu tiên chỉ gồm: danh sách lỗi hiện tại, mẫu nam áo lam nhất quán, loop đi thử, chuyển tiếp đứng/ngồi và một đoạn đưa hương vào lư có lớp che đúng. Kèm video trước/sau và kết quả đánh giá lựa chọn rig/sprite. Sau khi mẫu đạt tiêu chí chặng 1 mới triển khai trọn chuỗi và nhân bản tài nguyên.

Những mục cần chốt bằng mẫu thử: phong cách nhân vật cuối cùng, năng lực tạo rig, góc camera, kích thước sprite đủ rõ trên điện thoại và ngân sách bộ nhớ. Không lấy số lượng ảnh tạo ra làm thước đo tiến độ; lấy số chuỗi đã đạt nghiệm thu làm thước đo.
