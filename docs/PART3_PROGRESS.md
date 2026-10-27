# Tiến độ Người 3 — Pro Scene & tài khoản

Cập nhật 27/10/2026; đã triển khai nền, backend và nối frontend Người 3; còn kiểm chứng Steam thật và thiết bị.

| Mốc | Trạng thái | Bằng chứng / phần còn lại |
| --- | --- | --- |
| 1. Nền chung | Đã triển khai | Contract/DTO hiện có + Teams search, DB migration, SessionStore, requireSession, ParseJobStore, factory tích hợp |
| 2. Backend API | Đã triển khai | Router Pro/Auth/Me + server tích hợp; live trả 501 theo contract |
| 3. Chức năng | Đã triển khai, chờ xác minh Steam thật | Pro services, OpenID/session, favorites/settings, notification producer và thông báo login; chưa có poller trận/favorite |
| 4. Nối frontend | Đã triển khai | Pro/Team/League/Rankings, Settings/Account/Steam callback, favorites và notifications; Home pro previews/badge |
| 5. Kiểm thử | Backend + frontend đạt tự động | Backend 65/65; frontend 18 passed/1 optional live test skipped; web/Android export qua; còn Steam thật và thiết bị |
| 6. Git / bàn giao | Tài liệu local | Chưa commit/push/PR |

Hướng dẫn file, lệnh chạy và ghép dependencies: [PART3_FOUNDATION.md](PART3_FOUNDATION.md).

Chi tiết API, env, cách chạy và giới hạn: [PART3_API.md](PART3_API.md).
Frontend và cách chuẩn bị xác minh Steam: [PART3_FRONTEND.md](PART3_FRONTEND.md).

Kết quả local: typecheck + lint qua; **65/65 tests** (43 regression Người 2, 8 nền Người 3, 14 API/auth/me).
Smoke qua health, pro players, leagues, team, roster, matches và teams list với OpenDota thật.
Catalog teams thực tế lúc kiểm tra: 22.022 đội. Migration 002 chạy thành công trên DB local.
Steam start/callback/exchange đã kiểm thử tự động bằng verifier/response giả lập;
chưa đăng nhập tài khoản Steam thật hoặc kiểm thử trên thiết bị. Live giữ 501 theo contract.

Frontend: typecheck/lint qua; 3 bài E2E Người 3 chạy qua router/backend SQLite thật với upstream/Steam verifier fixture.
Toàn suite 18 passed, 1 skipped (LIVE_PART2_API chưa bật). Export web và Android thành công;
ảnh Pro Scene ở 360px: `frontend/test-results/part3-pro-360.png` (không đưa vào Git).
