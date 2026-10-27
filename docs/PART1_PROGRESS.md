# Tiến độ Người 1 — Players & Matches

Cập nhật 28/10/2026. Auth đã chuyển sang form email/password theo [AUTH.md](AUTH.md).

| Mốc | Trạng thái | Bằng chứng / việc còn lại |
| --- | --- | --- |
| 1. Nền chung | Đã hoàn thành | Core HTTP/config/middleware/health, ghép router, dev + JS build và smoke |
| 2. Backend API | Đã triển khai | Players, Matches, compare, parse theo contract/DTO; ghép server chính |
| 3. Chức năng | Đã triển khai và kiểm thử | Profile/stats/history/heroes/peers/rank, chi tiết trận; parse dùng app session email/password, chống gửi trùng, polling và notification; chưa parse nguồn thật |
| 4. Nối frontend | Đã triển khai | Home, Profile/Player, Matches, Match Detail, Compare, inventory trong Build; loading/error/retry/empty, phân trang, session parse |
| 5. Kiểm thử | Tự động và smoke GET thật đạt; form Auth mới chờ Android | Backend 101/101 sau thay Auth; E2E 25 qua/1 optional live skipped. Smoke GET Người 1 thật qua. Người dùng xác nhận Home/Matches/Peers trên Android đã tải được; cần kiểm lại đăng nhập form mới trên thiết bị, parse thật chưa kiểm |
| 6. Git / bàn giao | Bàn giao trên branch riêng | Phần Người 1 và thay đổi Auth bàn giao trên feature/players-matches-form-auth |

Chi tiết ghép module và lệnh chạy: [PART1_FOUNDATION.md](PART1_FOUNDATION.md).
API, ngữ nghĩa dữ liệu và parse: [PART1_API.md](PART1_API.md).
Frontend, lệnh chạy và kiểm thử: [PART1_FRONTEND.md](PART1_FRONTEND.md).
Nền Người 1 tái sử dụng client của Người 2 và session/database/parse store của Người 3.
Steam web login từng được xác nhận; ngày 28/10 đã thay bằng form email/password.
Không còn việc kiểm Steam native; dữ liệu tài khoản cũ được giữ bằng migration 003.

## Kiểm lại lỗi Android — 28/10/2026

Kiểm tra server tạm dùng source mới với OpenDota thật: account 311360822 trả 200 cho
Home Recent Matches (limit=3), Performance (limit=20), Ranked (lobby_type=7), Unranked
(lobby_type=0), Turbo (game_mode=23) và Peers. Turbo hiện có 0 kết quả, là trạng thái trống.
Server đang chạy ở cổng 3000 vẫn trả 502 cho history không lọc trong cùng lượt kiểm tra;
cần restart tiến trình backend để nạp bản sửa hero_id=0 rồi Retry/reload trên điện thoại.
Đã mở rộng smoke:part1 để bao phủ các query này.

Peers của account 1326634622 trả 404 do upstream không có profile. Chưa biết account
cụ thể mà người dùng báo lỗi Peers; đang chờ ID để xác minh, chưa đánh dấu mọi lỗi thiết
bị đã hết. Không tạo profile/thống kê giả thay cho dữ liệu OpenDota chưa có.

Sau lượt kiểm tra trên, người dùng đã xác nhận Peers hết lỗi khi refresh và Home/
Matches đã có dữ liệu sau bản sửa. Đây là xác nhận UI/API công khai trên Expo Go,
không phải xác nhận form Auth mới hoặc parse thật.
