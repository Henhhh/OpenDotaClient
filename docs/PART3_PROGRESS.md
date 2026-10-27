# Tiến độ Người 3 — Pro Scene & tài khoản

Cập nhật 28/10/2026. Theo yêu cầu, Steam đã được thay hẳn bằng form email/password;
không còn hạng mục xác minh Steam native. Auth hiện hành: [AUTH.md](AUTH.md).

| Mốc | Trạng thái | Bằng chứng / phần còn lại |
| --- | --- | --- |
| 1. Nền chung | Đã triển khai | Session/database/parse store dùng chung; migration 003 tách app user khỏi Dota ID, có backup và giữ dữ liệu cũ |
| 2. Backend API | Đã triển khai | Pro/Me; register, login, session, logout, legacy credentials, Dota profile preference; endpoint Steam đã gỡ |
| 3. Chức năng | Đã triển khai | Hash scrypt, giới hạn auth, session web/native, phân quyền favorites/settings/notifications/parse; chưa có reset/verify email hoặc poller kết quả nền |
| 4. Nối frontend | Đã triển khai | Form đăng ký/đăng nhập trong app, tên/email tài khoản, chuyển credential cho user cũ; dùng được trên Expo Go |
| 5. Kiểm thử | Tự động đạt; người dùng xác nhận checklist thủ công | Backend 101/101; E2E 25 passed, 1 optional live skipped; typecheck/lint/build/export qua. Người dùng xác nhận các mục đã test đúng mong muốn |
| 6. Git / bàn giao | Bàn giao trên branch riêng | Mã Người 3 trước đây merge PR #2 (9761ede); phần mới bàn giao cùng Người 1 trên feature/players-matches-form-auth |

## Kết quả Auth mới

- HTTP tests: register/login, password sai/email không tồn tại, validation, duplicate
  registration đồng thời, cookie/Origin/Bearer, logout, rate limit và rollback.
- Migration từ schema v2 giữ user ID, session và dữ liệu phụ thuộc; không gán tài khoản
  cũ chỉ từ Dota ID. Legacy user còn session đặt credentials trong Settings.
- Web E2E: đăng ký, refresh giữ session, favorites/settings/notifications persistence,
  password sai/đúng, logout, account isolation và form validation.
- Người dùng xác nhận đã test lại checklist và mọi thứ đúng mong muốn; đây là xác
  nhận thủ công của người dùng, không thay thế bằng chứng tự động hoặc xác nhận riêng parse nguồn thật.
- API công khai OpenDota không phụ thuộc email login; parse thật vẫn chưa kiểm.

## Dữ liệu local

Trước migration đã backup SQLite vào backend/data/opendota.sqlite.before-form-auth-*.backup.
Migration đã kiểm số hàng users/sessions/favorites/settings/notifications/parse_jobs được
giữ nguyên, foreign_key_check không có lỗi. Dừng hai backend cũ cùng cổng 3000 và khởi động
một backend với Auth mới. Không commit database hoặc backup.

## Lịch sử trước khi thay Auth

Steam web login/callback và refresh giữ account từng được người dùng xác nhận.
Android Expo Go đã mở UI/API công khai; các lỗi Home/Matches/Peers đã được người dùng
xác nhận hết sau refresh/bản sửa hero_id=0. Luồng Steam native gặp lỗi mạng và không
hỗ trợ callback trong Expo Go; người dùng đã chọn bỏ Steam, không tiếp tục hạng mục này.
Các tài liệu PART3_FOUNDATION/API/FRONTEND cũ được giữ để tham khảo lịch sử và có banner
trỏ sang AUTH.md.
