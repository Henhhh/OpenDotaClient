# Tiến độ phần 2 — Backend API

## Đã triển khai

| Endpoint | Code + kiểm thử local | Smoke test HTTP với OpenDota thật |
| --- | --- | --- |
| GET /heroes | ✅ Lọc, sort, phân trang, Unicode, query strict | ✅ 200 |
| GET /heroes/{id} | ✅ Stats cơ bản, abilities, talents nullable | ✅ 200 |
| GET /heroes/stats | ✅ Professional hoặc bracket 1–8 | ✅ 200 |
| GET /heroes/{id}/matchups | ✅ Games/wins/win_rate, phân trang | ✅ 200 |
| GET /heroes/{id}/items | ✅ Số đếm theo 4 giai đoạn professional | ✅ 200 |
| GET /constants/items | ✅ Catalog, tìm tên, phân trang | ✅ 200 |
| GET /heroes/{id}/rankings | ✅ Có cờ bật đợt B, mặc định 501 | ✅ 200 khi bật |
| GET /search type=hero | ✅ Tìm trong catalog | ✅ 200 |
| GET /search type=match | ✅ Gợi ý ID hợp lệ, verified=false | ✅ 200; không gọi upstream |
| GET /search type=player | ✅ Mapping, cache và xử lý lỗi | ✅ 200 với miracle |
| GET /search type=team/all | ✅ Adapter catalog teams, inject qua TeamSearchService | ✅ 200 với team=spirit và all=miracle |

Schema thực tế đã xác minh: heroStats, hero_abilities (có ability variants dạng array
và talent bổ sung), abilities, items, matchups, itemPopularity, rankings.
Không tự tạo tỷ lệ pick khi thiếu mẫu số; field không có nguồn trả null.

## Kết quả nghiệm thu backend phần 2

- [x] TypeScript strict, ESLint và 43/43 test backend đạt.
- [x] 12/12 smoke test HTTP với OpenDota thật đạt trong lần chạy cuối.
- [x] Search player đã xác nhận 200; team/all có adapter độc lập, không cần đợi module Pro Scene.
- [x] Router factories, schema runtime, cấu hình env và hướng dẫn bàn giao đầy đủ.

Adapter `modules/search/team-catalog.ts` chỉ đọc catalog `/teams`, không triển khai
nghiệp vụ Pro Scene của người 3. Người 3 có thể dùng lại adapter hoặc thay bằng service
đúng interface. Router vẫn trả 501 khi không được inject service, đúng contract.
Search upstream vẫn có thể chậm tùy truy vấn: đã quan sát timeout với spirit/type=all;
trường hợp đó trả 504, không trả kết quả thiếu hoặc mock. Smoke thành công không bảo đảm SLA upstream.

## Việc tích hợp ngoài mốc Backend API phần 2

- [ ] Người 1 ghép createRouter(deps) vào server chính và middleware core.
- [ ] Nhóm thống nhất dùng adapter tìm đội đã có hoặc thay bằng service người 3 khi ghép server chính.
- [x] Nối frontend Heroes/Search/Builds và thống kê rank; xem [phạm vi và hướng dẫn](PART2_FRONTEND.md).
- [x] Kiểm chứng luồng trình duyệt → backend → OpenDota cho Heroes, Builds và Search hero.
- [x] 10/10 E2E riêng phần 2, 1/1 E2E nguồn thật; Android Hermes export đạt. Xem [báo cáo kiểm thử](PART2_TEST_REPORT.md).
- [x] Hoàn tất xác nhận lượt bị ngắt: 5/5 E2E hồi quy chung đạt qua các lượt chạy, không còn bài hồi quy chờ kết quả.
- [ ] Kiểm thử Android/iOS trên thiết bị thật.

Hướng dẫn chạy và tích hợp: [backend/README.md](../backend/README.md).
Kiểm tra offline: `cd backend`, `npm.cmd run check` (typecheck, lint, tests).
Smoke online: `npm.cmd run smoke:part2` (có tiêu quota, sẽ fail nếu nguồn timeout).
