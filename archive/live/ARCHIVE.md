# Bản livestream được giữ để tham chiếu

Snapshot nguồn trước khi tách website, đã lưu trong tag `baseline-import-20261103`.
Không cài dependency ở đây, không chạy BAT/server từ thư mục này. Một số asset vẫn dùng
chung nằm ở `public/assets` ngoài gốc dự án, nên thư mục này không phải bản cài độc lập.

Frontend mới không import mã ở đây; tsconfig loại thư mục này khỏi phạm vi đầu vào.
Tailwind chỉ quét `src`; Vite dev chặn đường dẫn `archive`. Build chỉ sao chép `public/`,
không sao chép thư mục lưu trữ này.

Muốn khôi phục bản livestream đầy đủ, dùng ZIP gốc hoặc tạo worktree từ tag baseline
theo hướng dẫn README ở gốc, rồi rà dependency cũ trước khi cài.
