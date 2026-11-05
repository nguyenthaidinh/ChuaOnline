# Rà soát hiệu năng và kế hoạch tối ưu Đi Chùa Online

**Cập nhật triển khai:** xem [kết quả tối ưu và giới hạn kiểm chứng](optimized/README.md). Tài liệu này giữ nguyên baseline trước sửa.

Ngày kiểm tra: 05/11/2026. Nền mã: `1e58cfd`, nhánh `codex/animation-v3`.

Đợt này kiểm tra và lập kế hoạch; chưa thay đổi hành vi ứng dụng, hình ảnh, giao diện hay máy chủ triển khai. Có bổ sung công cụ kiểm tra và bằng chứng cục bộ. Giữ nguyên kích thước cảnh PC, hướng ngồi, đồng bộ nghi lễ, nhạc/lời đọc và nhân vật mô phỏng tĩnh.

## Kết luận

Có các điểm nghẽn xác định được trong cách tải tài nguyên, đổi bộ hoạt ảnh và cập nhật DOM. Chưa đủ bằng chứng để quy toàn bộ hiện tượng nhân vật lúc hiện lúc mất cho một nguyên nhân duy nhất. Không nên giải quyết bằng cách nén mọi ảnh, giảm chất lượng toàn trang hoặc tăng FPS một cách đồng loạt.

Ưu tiên: ổn định việc hiển thị nhân vật → giảm phần phải tải trước khi thấy cảnh → giảm công việc mỗi khung hình → kiểm chứng mạng chậm, thiết bị yếu và nhiều khách.

## Phạm vi và bằng chứng

- Đọc đường chạy production: entry, App, preload/decode, manifest, bộ lấy mẫu chuyển động, renderer, hiệu ứng, âm thanh, SSE, client và HTTP server.
- `npm run typecheck`, `npm test`, `npm run build`: đạt; **132/132 test**. Test logic không thay thế đo trình duyệt/mạng.
- Lấy **101.310 mẫu** ở 3 y phục, ghế 0/5/18/23, cả 4 vị trí lễ, 5 nghi lễ, chế độ đầy đủ và dự phòng; bước lấy mẫu 80 ms. Kiểm tra **517 ô ảnh được dùng**: không tìm thấy ô hoàn toàn trong suốt hoặc chỉ số vượt lưới. Không phải quét mọi thời điểm, mọi tổ hợp ảnh tải dở hay mọi pixel trình duyệt thực sự vẽ.
- Kiểm tra HTTP trên server biệt lập, dùng build thật; xác nhận font 404, không có chính sách cache/validator, JS không được nén, yêu cầu Range cho nhạc vẫn trả cả file.
- Phòng cục bộ: 1 trình duyệt thật + 23 client API/SSE tổng hợp, tối đa 24 khách và 4 nghi lễ. 73 POST đều 200; p50 16,60 ms, p95 22,05 ms. Đây là một lượt localhost ngắn, có cả yêu cầu heartbeat/leave đồng thời; không phải số liệu Internet hoặc sức chứa production.
- Quan sát desktop khi đủ 24 nhân vật: bộ đếm của cảnh báo 30,0 lần cập nhật/giây, trung bình callback vẽ 1,541 ms ở một mẫu có 4 nhân vật làm lễ. Mẫu sau: 1,373 ms với 2 nhân vật hoạt động. Bộ đếm này **không đo toàn bộ style/layout/paint/composite hay frame bị bỏ**, không dùng để kết luận không lag.
- Kiểm tra khung mobile 390×844; ảnh chụp cuối khi các client tổng hợp đã rời, còn 1 khách + nhân vật nền. Không ghi nhận tràn ngang (clientWidth = scrollWidth = 375). Đây là giả lập kích thước trên máy tính, chưa phải điện thoại thật.
- Chưa tái hiện mất sprite trong lần quan sát này. Kiểm tra `img.complete/naturalWidth` chỉ áp dụng cho thẻ ảnh, không chứng minh CSS background sprite luôn được vẽ.
- Chưa có đo cold-cache có kiểm soát, mạng/CPU throttle, LCP/INP/CLS, heap/GPU trace hoặc Safari/iOS thật. Những mục này là điều kiện nghiệm thu tiếp theo, không ghi thành kết quả đã đạt.

Bằng chứng: [ngân sách ảnh](image-budget.json), [HTTP và khung ảnh](source-and-http.json), [tải phòng cục bộ](local-load.json), [quan sát trình duyệt](browser-observations.json), [desktop](desktop-load.png), [mobile](mobile-load.png).

## Dung lượng đã đo

MiB = 1.048.576 byte. RGBA là phép tính `rộng × cao × 4`, dùng so sánh ngân sách pixel; không phải RAM/VRAM thực tế đo được. Không nhân dung lượng ảnh dùng chung với số nhân vật.

| Nhóm | Dữ liệu file | RGBA ước tính | Ý nghĩa |
|---|---:|---:|---|
| 16 ảnh bắt buộc, desktop | 1.925.224 byte ≈ 1,84 MiB | 43,60 MiB | Tất cả phải thành công mới hiện cảnh |
| 16 ảnh bắt buộc, mobile | 1.883.614 byte ≈ 1,80 MiB | 43,60 MiB | Cùng 3 atlas dự phòng với desktop |
| 8 ảnh nâng cấp nam, tải sau cảnh | 1.544.082 byte ≈ 1,47 MiB | 31,97 MiB | Được tải dù chưa có khách thật, do warmAppearance mặc định |
| 20 ảnh hoạt ảnh nâng cấp, cả 3 y phục | 3.986.042 byte ≈ 3,80 MiB | 79,22 MiB | Khi có đủ loại khách hoặc người dùng chọn lần lượt các y phục |
| Riêng atlas dự phòng nam 2304×2560 | 599.862 byte | 22,50 MiB | Ảnh nén nhỏ nhưng vùng pixel lớn |
| 40 WebP trong 3 nhóm đang xét | 6.167.610 byte ≈ 5,88 MiB | 129,30 MiB | Gồm cả 2 phông cảnh và preview; không phải tải ban đầu |
| 2 JS production | 399.883 byte | Không áp dụng | Vite báo gzip khoảng 116,3 kB, server hiện chưa gửi gzip |

Ba atlas dự phòng chiếm 1.392.666 byte và 33,75 MiB RGBA. Chúng là phần lớn hàng rào tải ban đầu. Ở đường truyền lý tưởng 1 Mbps, riêng 1.925.224 byte cần khoảng 15,4 giây truyền; đây chỉ là phép tính băng thông, chưa cộng JS, độ trễ, decode hay cạnh tranh tải.

Tổng public lớn hơn vì còn FBX và tài nguyên cũ. File nằm trong public không đồng nghĩa trình duyệt đang tải nó. Chưa có bằng chứng nhánh web đang nạp Three.js/FBX vào đường chạy chính. Xóa các file này chủ yếu giảm gói triển khai, không phải cách chữa lag trước tiên.

## Phát hiện theo ưu tiên

### P1 — Hàng rào tải ban đầu quá rộng

`src/room/layout.ts:65`, `src/room/useSceneAssets.ts:27`, `src/App.tsx:148`.

`Promise.all` chờ 16 ảnh, gồm cả atlas 3 loại khách và vật phẩm. Một ảnh lỗi làm cả cảnh chuyển sang lỗi. Cảnh nền chỉ mount sau khi chờ xong; `fetchPriority="high"` trên ảnh nền lúc đó không giúp ưu tiên lần preload đã xảy ra. Đổi layout desktop/mobile đưa trạng thái về loading và tháo RoomScene; hoạt ảnh/readiness cục bộ được tạo lại.

Sửa: hiện nền + bồ đoàn + nhân vật ngồi trước; bộ chuyển động tải theo nhu cầu. Giữ cảnh cũ trong lúc chuẩn bị phông mới, đổi phông sau decode. Lỗi vật phẩm không che toàn bộ chánh điện.

### P1 — Bộ hoạt ảnh có thể thay đổi ngay giữa động tác

`src/room/useSceneAssets.ts:37`, `src/room/characterAnimation.ts:32`, `src/room/CharacterSprite.tsx:49`.

Mỗi ngân hàng ảnh hoàn tất sẽ bật một cờ readiness và truyền ngay cho sampler đang chạy. Động tác có thể bắt đầu ở bộ dự phòng rồi đổi sang bộ nâng cấp giữa bước/quỳ/dâng. Readiness không được chốt theo một lượt vào điện/nghi lễ. Các tệp vẫn được decode trước khi đặt cờ ready — đây là cơ chế bảo vệ sẵn có, cần giữ lại. Không được kết luận mọi chuyển bộ ảnh đều tạo khung trắng; nguy cơ đã xác nhận từ luồng mã là đổi hình/pose giữa động tác.

Sửa: chuẩn bị bộ tối thiểu trước khi gửi thao tác của chính người dùng; chốt bộ ảnh cho toàn lượt. Với hành động của khách từ xa đã bắt đầu, dựng đúng mốc server bằng bộ sẵn sàng; chỉ nâng cấp tại ranh giới an toàn. Không dịch giờ nghi lễ server để chờ ảnh của một thiết bị.

### P1 — Ảnh nâng cấp lỗi một lần có thể nằm ở fallback lâu dài

`src/room/useSceneAssets.ts:16–79`.

Ảnh lỗi/timeout 20 giây xóa Promise khỏi map; tuy nhiên hook bắt lỗi rồi im lặng, chỉ chạy lại khi mask y phục đổi hoặc remount. Nếu mask giữ nguyên và mạng hồi phục, ảnh không tự được thử lại. Nút tải lại hiện tại thuộc essentialAssets, không khôi phục các ảnh nâng cấp riêng lẻ. Không có trạng thái lỗi theo asset để chẩn đoán.

Sửa: registry tải ảnh dùng chung, trạng thái idle/loading/ready/error, chống tải trùng, giới hạn số tải/decode đồng thời, retry hữu hạn với backoff khi online trở lại hoặc người dùng thử lại. Giữ ảnh/pose hợp lệ cuối cùng khi đổi nguồn; không chuyển sang nguồn chưa sẵn sàng. Không cam kết cache Promise có nghĩa bitmap luôn nằm trong RAM của trình duyệt.

### P1 — Phục vụ tài nguyên production còn thiếu

`server/index.ts:8`, `server/index.ts:74–82`, `index.html:8`.

- Font `.woff2` bị chặn bởi allowlist MIME: kiểm tra thực tế **404**. Việc có tên font trong CSS không chứng minh font đã tải.
- Tài nguyên tĩnh không có Cache-Control, ETag, Last-Modified. Yêu cầu điều kiện vẫn 200 và toàn bộ ảnh. Trình duyệt có thể áp dụng heuristic cache; không nên nói mọi lượt đều chắc chắn tải lại, nhưng server chưa cung cấp chính sách tin cậy.
- Accept-Encoding `gzip, br` vẫn nhận JS không nén.
- Range `bytes=0-1023` cho nhạc nhận 200, toàn bộ 1.562.815 byte thay vì đoạn 206. Điều này không chứng minh nhạc luôn phải tải xong mới phát, nhưng thiếu hỗ trợ truyền/tua từng đoạn.

Sửa: MIME font, cache theo phiên bản, conditional request và byte range. Tài nguyên có hash được cache dài hạn; HTML và đường dẫn asset chưa có hash phải revalidate/version trước khi đặt immutable. Có thể dùng reverse proxy/static server chuẩn để nén JS/CSS và phục vụ range; phải kiểm tra cấu hình thực, không chỉ mã dev. Không nén/gom SSE theo cách làm chậm đẩy sự kiện.

### P2 — Công việc lặp lại trong vòng vẽ

`src/room/OfferingLayer.tsx:49–81`, `src/room/CharacterSprite.tsx:12–49`, `src/room/ShrineEffects.tsx`.

- Mỗi cánh sen đọc `getBoundingClientRect()` bên trong vòng lặp sau các DOM write: tối đa 8 lần đọc/hiệu ứng/lượt vẽ. Đây là mẫu read/write dễ buộc tính layout; cần trace để định lượng chi phí thực.
- Mỗi lễ vật tự gọi lại `visibleOfferings(candidates, now)` và dựng cùng các Set/filter. Các lễ vật đứng yên vẫn callback tới hết hạn (ví dụ 60 giây); chế độ giảm chuyển động vẫn làm phần lớn công việc.
- Renderer gán lại left/top/height/aspect-ratio/background, nhiều dataset và src vật phẩm ở mỗi lượt vẽ, dù nhiều giá trị không đổi. Không khẳng định gán cùng src gây tải mạng lại mỗi frame.
- `App` setClock mỗi 100 ms trong hành động của chính mình; RoomScene/crowd/layers được render React theo đó dù chuyển động đã có RAF riêng.
- `sceneAnimation.ts:6` giới hạn khoảng 30 Hz; không có đường chạy 60 Hz. Một RAF dùng chung, ngủ khi không còn việc và dừng khi document.hidden là các điểm tốt đang có.

Sửa: cache layout bằng ResizeObserver, đọc một lần ngoài vòng cánh; tính lễ vật nhìn thấy một lần/lượt; cập nhật DOM theo phần thay đổi; tách đồng hồ nhãn/nút khỏi cảnh; giữ cấu trúc snapshot/props ổn định. Lễ vật tĩnh ngủ và hẹn mốc thay đổi/expire, hiệu ứng còn động mới dùng RAF. Sau khi đo mới thử dịch vị trí bằng transform và chế độ 60 Hz; không thêm `will-change` cho mọi thứ hoặc chuyển cả hệ thống sang WebGL ngay.

### P2 — Bộ nhớ ảnh và tải nền chưa có ngân sách

Registry giữ trạng thái Promise cho mọi ảnh đã tải, không có mức chất lượng theo kích thước hiển thị và không điều phối ưu tiên. Khi có 3 y phục, 20 ảnh nâng cấp có thể được yêu cầu đồng thời sau hàng rào essential.

Sửa: chia nhóm scene/seated/locomotion/ritual; ưu tiên nhân vật của người dùng và hành động đang nhìn thấy; tải tiếp khi rảnh với giới hạn đồng thời. Tạo biến thể ảnh nhỏ cho mobile khi thử nghiệm chất lượng cho phép. Tách atlas lớn theo nhóm động tác có lợi thực tế, giữ tọa độ logical, pivot, anchor bàn tay, timing và hash manifest. Tránh chia vụn thành hàng trăm file hoặc xóa ảnh đang được hành động sử dụng.

### P2 — Giới hạn đồng bộ và quan sát cần rõ ràng

`server/index.ts:36–64`, `src/room/client.ts:20–36`.

- Heartbeat SSE dựng/stringify toàn snapshot riêng từng kết nối; có thể dựng một lần cho mỗi nhịp.
- Client nhận cùng revision vẫn thay room object và báo React cập nhật. Có thể giữ object nếu nội dung không đổi, vẫn cập nhật clock/status cần thiết.
- Tất cả POST, gồm heartbeat, dùng chung hạn mức 180/phút theo remoteAddress. Lần POST thứ 181 trả 429 đã được tái hiện. Sau reverse proxy nhiều người có thể chung địa chỉ; cần tách giới hạn action/join và heartbeat, tin forwarded-IP chỉ khi đã cấu hình trusted proxy. Không tắt giới hạn chống spam.
- Hiện chỉ có **24 chỗ thật**, tối đa 4 trạm nghi lễ và 256 SSE connections, state nằm trong một process. Không suy từ một lần thử 24 người ra khả năng hàng nghìn khách hoặc chạy nhiều replica có cùng phòng. Nâng sức chứa là việc riêng, sau tối ưu nền tảng này.

### P3 — Âm thanh và vận hành

Nhạc đang dùng preload=none; lời đọc tải theo yêu cầu, cache giới hạn 25 AudioBuffer. Đây không phải tải toàn bộ 25 giọng đọc ở lần vào trang. Giữ cơ chế chỉ phát sau thao tác, một kênh lời đọc, hạ nhạc lúc đọc và hủy khi đóng/ẩn. Sau khi sửa HTTP range, đo thời gian mở nhạc/lời đọc và cân nhắc làm ấm đúng đoạn lời nguyện khi bắt đầu nghi lễ, không tải toàn bộ kho âm thanh.

## Kế hoạch thực hiện

Mỗi chặng có thay đổi độc lập, kiểm tra và bằng chứng trước/sau; chưa đánh dấu hoàn thành khi mới qua unit test.

| Chặng | Việc làm | Điều kiện kết thúc |
|---|---|---|
| 0. Đo được lỗi | Thêm đo có thể bật/tắt cho tải/decode/lỗi asset, ranh giới đổi ảnh, long frame; kịch bản cold/warm/ảnh lỗi/mạng chậm; ghi cấu hình máy và mạng | Tái hiện được lỗi hoặc phân loại rõ chưa tái hiện; có baseline production và video/trace, không dựa riêng sceneDrawMs |
| 1. Ổn định hình + sửa HTTP | Registry ảnh, retry hữu hạn, giữ pose hợp lệ, chốt bộ ảnh theo lượt; font MIME, cache/version, nén text, range MP3 | Không khung trắng/đổi bộ giữa động tác trong ma trận lỗi; font 200; 206/304 hoạt động; không đổi mốc server hay vị trí/vật phẩm |
| 2. Tải nhanh và tiết kiệm pixel | Tách cảnh nhìn thấy đầu tiên khỏi 3 atlas; tải theo y phục/nghi lễ, hàng đợi ưu tiên; không remount toàn cảnh khi đổi layout; biến thể atlas theo thiết bị | Cảnh xuất hiện trước các ngân hàng chưa dùng; không tải 3 bộ chuyển động chỉ để vẽ người ngồi; giữ chất lượng PC và độ rõ mobile |
| 3. Làm mượt cập nhật | Cache kích thước, tách read/write, diff style, ngủ hiệu ứng tĩnh, tách timer App, ổn định props/snapshot; đo lựa chọn 30/60 Hz | Không đọc kích thước theo từng cánh; cảnh ngồi yên không chạy vòng vẽ liên tục; frame time đạt mục tiêu trên thiết bị đã chọn |
| 4. Kiểm thử và triển khai thử | 3 y phục × 5 nghi lễ; reconnect, đổi tab, xoay màn hình; 24 người/4 lễ và nhiều người xem; HTTP proxy thật, cache sau deploy; soak test | Checklist dưới đạt, có report trước/sau, rollback độc lập; sau đó mới kết luận đủ cho production trong tải đã đo |

### Mục tiêu nghiệm thu đề xuất (chưa đạt/chưa đo)

- Không nhân vật biến mất, tay/vật phẩm lệch, dâng lặp, kẹt bận, đổi chỗ ngồi, hoặc lịch server bị kéo dài do chờ tải ảnh. Kiểm tra bộ đầy đủ, bộ dự phòng và từng nhóm ảnh lỗi riêng.
- Đặt ngân sách **≤ 0,8 MB transfer cho lần hiển thị đầu tiên của phòng trống** (HTML/JS/CSS/font + cảnh cơ bản; không tính nhạc do người dùng bật). Nhóm ảnh nền/ngồi/bồ đoàn/trạm hiện có chỉ khoảng 420.418 byte desktop, nên có cơ sở để thử tách tải mà không thu nhỏ cảnh. Phòng đang có hành động đo ngân sách riêng.
- Trên profile chuẩn cố định, ví dụ 4 Mbps/RTT 150 ms, CPU slowdown 4×: mục tiêu LCP ≤ 2,5 giây, INP p75 ≤ 200 ms và CLS ≤ 0,1. Đây là đích kiểm thử ban đầu; cần đo lặp và dữ liệu sử dụng thực trước khi tuyên bố p75 production.
- Chế độ 30 Hz: khoảng cách cập nhật p95 ≤ 40 ms trên thiết bị mobile mục tiêu. Chỉ mở 60 Hz khi kiểm tra toàn frame trên desktop đạt p95 ≤ 20 ms; đo cả đoạn đi, xoay, dâng và 4 lễ đồng thời. Theo dõi frame >50/100 ms, không dùng giá trị trung bình đơn lẻ che giật.
- Ngân sách pixel ảnh hoạt động thử nghiệm: mobile ≤64 MiB RGBA, desktop ≤128 MiB; kiểm tra heap/decoded-image/process memory riêng. Không ép giảm ảnh nếu đo chứng minh ảnh không phải nút thắt.
- 20 chu kỳ vào/rời/làm lễ + đổi tab/layout: không tăng đều số subscription, request đang treo hoặc bộ nhớ giữ lại; không âm thanh chồng, không nhiều SSE/heartbeat do remount.
- 24 khách, 4 nghi lễ + các mức 50/100/200 người xem, chỉ chạy trên server QA biệt lập; không chặn heartbeat hợp lệ, không tăng hàng đợi SSE vô hạn. Kiểm tra mất mạng 5/20/60 giây và server restart.
- Thiết bị: Chrome/Edge desktop, Android tầm trung, iPhone Safari; đo cold cache và warm cache. Viewport mobile trên máy mạnh không thay cho điện thoại thật.
- Kiểm tra giữ kích thước PC hiện có (1920×1080: cảnh 1600×900), không thêm trang trí, không thay đổi phong cách ảnh vì mục đích tối ưu.

## Cách chạy lại phần audit tự động

Chạy từ gốc repository, với Node theo package.json và Python có Pillow (đã có trong môi trường hiện tại):

```powershell
npm run build
node --experimental-strip-types scripts/audit-performance.mjs
python scripts/audit-image-budget.py
npm run typecheck
npm test
```

Script Node mở server biệt lập ở cổng tự chọn rồi đóng; không dùng token khách thật. Script Python đọc pixel/alpha tại các ô sampler đã chọn. Báo cáo JSON sẽ được ghi đè khi chạy lại; lưu baseline trước khi so sánh.

`local-load-runner.mjs` là bản lưu kịch bản đã dùng cho server QA riêng cổng 4186: tạo client tạm, làm lễ và tự rời. Không chạy nó trên phòng người dùng đang thử. `local-load.json` ghi còn 1 khách là trình duyệt kiểm thử tại thời điểm runner kết thúc; sau đó trình duyệt đã rời và xác nhận phòng còn 0 người, server QA đã tắt.

Ảnh `desktop-load.png` chụp sau mẫu DOM 4 nghi lễ, khi một số nhân vật đang trở về; `mobile-load.png` chụp sau khi client tổng hợp đã rời. Không dùng ảnh này làm bằng chứng kiểm thử đầy đủ 24 người trên điện thoại.
