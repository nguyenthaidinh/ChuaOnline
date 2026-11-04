# Bộ prompt và quy trình sản xuất hoạt ảnh ChuaOnline

Đi kèm [kế hoạch triển khai](KE-HOACH-NANG-CAP-TRAI-NGHIEM.md). Các prompt dưới đây là hướng dẫn sản xuất, chưa được chạy trong đợt lập kế hoạch này. Ảnh đẹp riêng lẻ chưa chứng minh được một chuỗi hoạt ảnh tốt.

## 1. Chuẩn bị tham chiếu và đầu ra

Các tài nguyên đang có để đối chiếu:

- Nền: `public/assets/visual-v2/hall-desktop.webp` và `hall-mobile.webp`.
- Tư thế ngồi nhìn về tượng: `artwork/seating-direction/man.png`, `woman.png`, `granny.png`.
- Bộ nguồn cũ: `artwork/visual-v2/`; prompt cũ: `artwork/visual-v2/generation-prompts.json`.
- Điểm gốc/khung hiện tại: `src/room/animationManifest.ts`, `visualGeometry.ts`, `variantGeometry.ts`.

Trước mỗi lượt tạo, xem ảnh nguồn thật. Chỉ truyền những ảnh tham chiếu cần cho nhân vật/góc/pose đang làm. Nền chùa dùng đối chiếu ánh sáng, không yêu cầu công cụ vẽ nền vào sprite. Nếu chọn một thiết kế mới, mọi pose tiếp theo phải bám thiết kế mới đã đạt, không trộn người cũ và người mới.

Đầu ra nguồn dự kiến: `artwork/animation-v3/<appearance>/<direction>/<clip>/<frame>.png`; metadata và prompt nằm cạnh nhóm nguồn. File web sau khi kiểm: `public/assets/animation-v3/`. Các thư mục này sẽ được tạo khi bắt đầu sản xuất, không có nghĩa hiện đã có bộ animation v3.

Yêu cầu ảnh RGBA trong suốt, toàn thân, khoảng trống quanh tay/chân. Canvas master dự kiến 1536 × 2048; đây là yêu cầu sản xuất, không phải kích thước công cụ chắc chắn trả về. Đo file thực tế rồi chuẩn hóa theo reference và pivot cố định. Không đổi tỷ lệ riêng từng khung cho vừa alpha bounds.

## 2. Prompt nền dùng chung

Dùng đoạn này ở đầu các prompt ảnh nhân vật. Điền DIRECTION bằng góc đã chọn; bỏ các biến chưa sử dụng trước khi gửi công cụ.

```text
Create one production character key pose for ChuaOnline, a quiet Vietnamese
Buddhist temple experience viewed from a fixed elevated camera.

Use the attached approved character reference as the identity and costume lock.
Use the temple reference only to match the warm upper-left lighting, soft fill,
contrast and realistic material response. Do not include the temple in the output.

Adult Vietnamese lay Buddhist visitor wearing a modest loose blue-grey ao lam,
long sleeves, full-length trousers, barefoot. Natural adult proportions, calm
expression when the face is visible. Refined semi-realistic painted game artwork,
with restrained detail that remains readable at a small on-screen size.

Camera: fixed elevated orthographic-style view matching the approved reference.
Direction: DIRECTION. Keep the same camera elevation, focal projection, body scale,
head size, hairstyle, garment design and lighting as the approved reference.
Keep the character's world origin and floor contact consistent with the reference.

One full-body character, centered in the same fixed canvas, with enough margins
for the entire pose. Genuine transparent RGBA background. Target master canvas
1536 by 2048 pixels if supported. No text or labels inside the image.

No floor, pedestal, cushion, background, baked ground shadow, aura, smoke or
particles. Do not include incense, flowers or other held props unless the task
explicitly asks for a separate prop asset. Hands must form a plausible grip around
the specified invisible reference object. No extra limbs, merged fingers, costume
changes, cropped feet, colored transparency fringes or motion blur.
```

Không dùng chỉ dẫn “camera giống ảnh trước” nếu ảnh trước không được đính kèm. Không coi chữ “same identity” là bảo đảm: phải so lại silhouette, đầu, bàn tay, chiều dài tay/chân và nếp áo.

## 3. Khóa thiết kế và các góc nhìn

### Mẫu thiết kế nam áo lam

Đính kèm nhân vật đang dùng và nền chùa. Tạo một ảnh trước để chọn chất liệu và tỷ lệ, không tạo tám người trong một ảnh.

```text
Establish the approved neutral standing design for this character.
Show a rear three-quarter view facing toward the altar, head gently aligned with
the torso, feet grounded at a natural standing width, knees relaxed, hands resting
comfortably in front of the abdomen. Both feet and the full outline of both arms
must remain readable. Match the scale and camera of the attached reference.
The clothing should feel like soft matte woven fabric lit by the temple's warm
light, without a purple color cast or glossy synthetic highlights.
Deliver one character only on transparent background.
```

### Góc lưng thẳng về tượng

```text
Using the approved standing character, produce the exact straight rear view.
The camera sees the center of the back. Head, spine and pelvis align on the
character's vertical center. Shoulders are balanced and no facial profile is
visible. Preserve the costume, proportions, ground position and lighting.
This is a direction reference, not a new character design.
```

### Góc trước và góc chéo

Chạy từng góc riêng từ reference đã đạt, thay DIRECTION bằng một trong các giá trị:
`straight front`, `front three-quarter facing screen-left`, `front three-quarter facing screen-right`, `rear three-quarter facing screen-left`, `rear three-quarter facing screen-right`.

```text
Rotate the approved character to DIRECTION while keeping the camera, world origin,
body proportions and lighting fixed. Preserve anatomical left and right sides.
Keep the neutral standing pose. Do not mirror a previous image: create the correct
lighting, garment overlap and visible anatomy for this direction.
```

Tư thế ngồi lưng thẳng đang có là điểm nối cần giữ, nhưng không ép tư thế đi bộ luôn nhìn lưng thẳng. Góc cơ thể khi đi phải theo hướng đường đi.

## 4. Chu kỳ đi và chuyển hướng

Ảnh tạo bằng AI chỉ dùng làm key pose/tham chiếu cho chu kỳ. Để có chuỗi thật sự liên tục, rig hoặc animator phải kiểm khóa chân và chuyển trọng lượng; không tự động nội suy ảnh bằng crossfade.

### Prompt một key pose đi bộ

Ghép prompt nền, ảnh direction đã đạt và ảnh pose trước nếu cần. Điền PHASE, SUPPORT và SWING cụ thể; không để công cụ tự đoán toàn bộ chu kỳ.

```text
Create one key pose for a slow, grounded, respectful walk in place.
Walk direction and camera are exactly those of the approved direction reference.
Phase: PHASE.
Support leg: SUPPORT. Swing leg: SWING.

Show believable weight transfer over the supporting foot, a small natural pelvis
shift, soft knee bend and a restrained counter-swing of the arms. The robe follows
the legs with a small fabric lag. Keep the torso stable, shoulders relaxed and the
head level. The character is not carrying an object during this walk.

Maintain the identical canvas scale and world origin. Do not move the whole
character across the canvas; translation will be driven separately in the app.
Do not change the body design or invent decorative folds between frames.
The full soles and ankle positions must be readable for contact annotation.
```

| Key pose | PHASE | SUPPORT | SWING |
| --- | --- | --- | --- |
| 01 | Left heel contact, right foot finishing push-off | Weight transitioning onto anatomical left foot | Right heel lifting |
| 02 | Left loading response | Left foot planted, knee gently flexed | Right foot leaving ground |
| 03 | Right passing left | Left planted under pelvis | Right knee moving forward |
| 04 | Left mid-to-late stance | Left planted, heel preparing to rise | Right lower leg extending |
| 05 | Right heel contact | Weight transitioning onto anatomical right foot | Left heel lifting |
| 06 | Right loading response | Right foot planted, knee gently flexed | Left foot leaving ground |
| 07 | Left passing right | Right planted under pelvis | Left knee moving forward |
| 08 | Right mid-to-late stance | Right planted, heel preparing to rise | Left lower leg extending |

Đây là tám mốc tham chiếu; bổ sung khung giữa hoặc render rig để tạo chu kỳ khoảng 12 khung trở lên. Đo độ dài bước thực tế theo scale thế giới rồi mới nối vào tốc độ đường đi, không giữ nguyên hằng số stride nếu bộ chân mới khác.

### Prompt chuyển từ đi sang đứng

```text
Create the specified transition key pose between the attached walking pose and
the approved standing pose. The character gently decelerates, brings the trailing
foot beside the planted foot, transfers weight to both feet and settles the hands.
Keep the planted foot fixed in world contact. No body slide, sudden scale change,
rigid whole-body rotation or stretched limb. Pose progress: TRANSITION_PROGRESS.
```

Chỉ dùng `TRANSITION_PROGRESS` để chỉ mốc mong muốn, ví dụ “trailing foot moving inward; weight still on left”. Không kỳ vọng tỷ lệ 25/50/75% tự tạo được chuyển động vật lý đúng.

### Brief quay người dành cho animator hoặc công cụ rig

```text
Animate a small step turn from the approved travel heading to the altar heading.
Shift weight first, release the free foot, place it in the new direction, then turn
the pelvis and upper body with a short natural follow-through. Maintain supporting
foot contact until the weight transfer. The head may lead slightly. Finish in a
stable two-foot stance. Keep root translation explicit and separate from pose.
Export turn keys with contact-foot annotations; do not rotate the flattened sprite.
```

## 5. Key pose dâng hương

Sản xuất góc đang dùng tại trạm trước, chưa tạo mọi hướng. Dùng vật hương tham chiếu để định vị tay nhưng xuất thân và hương riêng. Nếu bàn tay không che/nắm đúng khi tách vật, cần mask bàn tay hoặc lớp bàn tay riêng.

Ghép prompt nền và một trong các mô tả sau:

| Mốc | Nội dung prompt bổ sung |
| --- | --- |
| Nhận hương | `Both hands gently reach toward the incense source at the ritual table. The leading hand prepares to grasp the lower part of a thin upright bundle; the other hand supports it. Preserve believable wrist angles.` |
| Trước ngực | `Stand grounded with both hands together at sternum height, fingers naturally holding an invisible upright incense bundle between the palms. Elbows relaxed and slightly away from the torso; shoulders lowered.` |
| Nâng lên | `Raise the joined hands halfway from chest height toward forehead height. Keep the bundle grip stable; elbows and shoulders follow a continuous natural arc. Head remains calm and slightly inclined.` |
| Ngang trán | `Hold the joined hands near forehead height without covering or intersecting the face. Gently incline the head in a respectful pause. Maintain both feet planted and the same body proportions.` |
| Đưa vào lư | `Lean forward slightly from hips and ankles, extending the gripping hand toward the exact burner insertion reference. The supporting hand follows naturally. The incense base is just above its insertion point; grip remains closed.` |
| Buông hương | `At the burner insertion point, the fingers release the upright incense bundle. Show the opening grip clearly, without moving the whole torso or changing hand size. The supporting hand begins to withdraw.` |
| Rút tay | `Withdraw both empty hands along a relaxed curved path from the burner toward the chest. Keep the shoulders relaxed. The hands must not appear to still hold an object.` |
| Chắp tay | `Return to palms joined at chest height, pause respectfully, eyes directed toward the Buddha where visible. Stable posture, calm expression, no celebratory gesture.` |

### Prompt tạo khung chuyển tiếp có ràng buộc

Đính kèm hai key pose đã đạt và reference thiết kế. Mỗi lượt yêu cầu một trạng thái giải phẫu cụ thể.

```text
Create one anatomically plausible transition pose between approved pose A and
approved pose B, preserving the identity, camera, lighting and fixed canvas.
Target anatomy: TARGET_ANATOMY.
Keep the planted feet and ground origin fixed. Move the elbows, wrists and fingers
along the specified action rather than blending two silhouettes. Preserve garment
construction and the number of limbs. Do not add motion blur or a double image.
If the requested pose cannot preserve the stated contacts, prioritize plausible
anatomy and make the contact discrepancy visible for review rather than hiding it.
```

Ví dụ TARGET_ANATOMY: `right elbow half extended toward the burner; left hand still supporting the incense grip; torso leaning slightly forward; both heels grounded`.

## 6. Ngồi xuống, lạy, hoa và chuông

### Ngồi xuống

```text
Create the specified key pose of a respectful transition from standing to seated
on a floor cushion. Use the approved straight rear seated reference as the final
pose. Current phase: PHASE. Maintain believable balance and joint articulation.
The head and spine finish centered above the cushion location, facing the altar.
Do not draw the cushion. Do not collapse, shorten or squash the body to simulate
sitting. Both hands must have an explicit plausible supporting or resting role.
```

PHASE lần lượt là chuyển trọng lượng, hạ gối, ổn định khi quỳ, sắp chân và hạ thân vào tư thế ngồi. Cần animator kiểm trình tự chân; không đảo ngược video ngồi để mặc định thành động tác đứng đúng.

### Lạy Phật

```text
Create one key pose in a calm Buddhist prostration sequence consistent with the
approved ritual storyboard. Phase: PHASE. Preserve the same adult anatomy,
costume, camera and floor origin. Show the actual articulation of hips, knees,
shoulders, elbows and neck. Keep contact points with the invisible floor coherent.
For the lowest pose, the forehead reaches the floor naturally with hands placed
according to the approved ritual reference. Do not rotate or flatten a standing
body. No cushion, ground shadow, prop, facial distortion or missing hands.
```

PHASE: quỳ ổn định → đặt tay → hạ thân → trán chạm sàn → chống tay nâng thân → quỳ chắp tay. Dáng tay cụ thể theo storyboard đã được duyệt về nghi lễ, không tự trộn nhiều truyền thống.

### Dâng hoa sen

```text
Create the specified pose of offering a small lotus arrangement with both hands.
Phase: PHASE. Both palms support the underside of an invisible tray at its actual
reference size. Move from abdomen height to chest height, then extend toward the
table. At placement, release the tray only after its base reaches the tabletop;
the next pose has visibly empty hands withdrawing. Keep shoulders relaxed and
hands symmetrical where the camera permits. Do not draw the tray into the body.
```

### Thỉnh chuông

```text
Create a restrained bell-striking pose using the approved bell and mallet size
references. Phase: PHASE. The hand grips the invisible mallet at the specified
handle point. A small forearm and wrist motion brings the tip toward the bell's
marked contact point, then rebounds gently. No overhead swing, exaggerated force,
floating mallet or intersection through the bell. Export the body separately.
```

### Rải cánh sen

```text
Create a gentle petal-release pose. One hand supports the small invisible petal
container; the other lifts a small pinch, opens its fingers and follows through
with a restrained wrist motion. Phase: PHASE. Do not draw floating petals into
the body image: particles are rendered separately at the release marker.
Keep the movement quiet and respectful, not a throwing or celebratory gesture.
```

Mỗi PHASE phải là một mốc cụ thể được ghi trong manifest. Không gửi nguyên bảng nhiều động tác rồi yêu cầu một ảnh duy nhất chứa tất cả.

## 7. Prop, bàn tay và biến thể y phục

### Prompt prop riêng

```text
Create one isolated OBJECT for the approved ChuaOnline ritual scene, matching the
camera elevation, warm lighting and material treatment of the attached reference.
Preserve its actual intended scale relative to the reference hand and ritual table.
Full object visible on genuine transparent RGBA background. No hand, person,
table, text, smoke, baked ground shadow or decorative aura. The grip point and
base/contact point must be visually unambiguous. Object orientation: ORIENTATION.
```

OBJECT là một bó hương, hoa sen trên đĩa, dùi chuông hoặc từng cánh sen. Ghi grip/base riêng bằng metadata; không yêu cầu công cụ vẽ dấu tọa độ lên ảnh thành phẩm.

### Prompt bàn tay phía trước

```text
Using the attached approved full-body pose and prop placement reference, produce
only the visible foreground hand region needed to occlude the held prop correctly.
Preserve exact finger shape, sleeve edge, lighting, pose and registration to the
original canvas. Transparent elsewhere. Do not redesign the hand or add a prop.
```

Nếu công cụ không giữ registration chính xác, tạo mask từ ảnh nguồn đã đạt bằng quy trình compositing có kiểm tra; không chấp nhận tay lệch chỉ vì ảnh riêng trông đẹp.

### Nữ áo lam và người áo nâu

```text
Create a costume/identity variant of the approved pose while preserving its camera,
world scale, body action, floor contacts and prop-contact intent.
Variant: VARIANT.
Keep anatomy appropriate to the character. Do not blindly resize the male hands
or limbs. Keep clothing modest and materials consistent with the temple artwork.
No change to the direction or action phase. Transparent background.
```

VARIANT: nữ trưởng thành tóc búi thấp áo lam; hoặc người cao tuổi tóc bạc búi thấp áo nâu. Đo lại grip, đầu và chân theo ảnh thật của từng biến thể. Không suy ra mọi metadata bằng phép chia đôi từ ảnh nam.

## 8. Brief rig và xuất ảnh

Đây là brief dành cho animator/công cụ dựng rig, không phải prompt yêu cầu công cụ tạo ảnh sinh ra một rig có thể dùng ngay.

```text
Build a production animation source for the approved temple visitor.
Use a humanoid skeleton with explicit root, pelvis, spine, neck, head, shoulders,
arms, hands, fingers, legs and feet. Support planted-foot constraints and precise
hand-to-prop contact targets. Keep cloth motion restrained and free of penetration.

Author the agreed walk, start, stop, turn, stand-to-sit, sit-to-stand and offering
clips. Keep travel/root motion explicit so the web timeline can use the same
distance-to-gait relationship. Mark pickup, placement, hand release, petal release,
bell contact and bow-floor contact. Provide time in milliseconds and source frame.

Render transparent sprites from fixed approved cameras with identical lighting,
world origin and framing. Keep held props and required foreground hand masks as
separate passes. Export contact/shadow metadata. Include source files, rig, clip
names, frame rate, version, contact annotations and a preview at actual speed.
```

## 9. Quy trình kiểm và loại ảnh

1. Kiểm cấu trúc file: kích thước thật, alpha, toàn thân, không clipping.
2. So reference: đầu/tóc/tỷ lệ, màu áo, nếp chính, góc camera, ánh sáng.
3. Đặt ảnh lên sàn với pivot cố định; overlay chân trụ, tay và điểm nhận lễ.
4. Xem chuỗi ở 0,25×: tìm rung đầu, đổi độ dài tay, tay xuyên đồ vật, chân trượt và bước nhảy silhouette.
5. Xem ở tốc độ thật và kích thước mobile: tư thế phải đọc được mà không cần phóng to.
6. So vòng lặp đầu/cuối và các đường nối clip; không giật khi từ đi sang đứng hoặc từ ngồi sang đứng.
7. Kiểm trên nền sáng/tối; không dùng ảnh có nền giả trong suốt hoặc viền màu.
8. Chỉ đóng atlas khi nhóm ảnh đạt. Ghi ảnh bị loại và lý do để không tái sử dụng nhầm.

Nếu sau hai vòng chỉnh cùng lỗi vẫn thay tỷ lệ hoặc tiếp xúc không ổn định, dừng nhân thêm khung bằng cùng cách đó; đánh giá rig/chỉnh tay nguồn. Hai vòng là điểm đánh giá lại phương pháp, không phải mức bảo đảm thành công.

## 10. Phiếu bàn giao mỗi clip

Mỗi clip cần: nhân vật, hướng, phiên bản, danh sách file, thời lượng, loop/non-loop, pivot, điểm chân, điểm tay/grip, lớp trước/sau, mốc sự kiện, nguồn tham chiếu và preview. Ghi rõ phần do AI tạo, phần chỉnh/rig, trạng thái kiểm và lỗi còn lại.

Người nghiệm thu cần xem được cả ảnh phóng lớn và video trong chùa. Prompt, số lượng frame và một ảnh tĩnh đẹp không thay thế bằng chứng chuyển động thực tế.
