# Tích hợp frontend phần 2

## Đã nối API

- Heroes: grid/list, tìm tên, lọc thuộc tính/vai trò upstream, favorites cục bộ trên các trang đã tải, tải thêm.
- Hero detail: thuộc tính cơ bản, abilities/talents, thống kê professional, matchups có tải thêm.
- Hero rank statistics: bracket 1–8, sắp xếp win rate/pick count; không tạo tier list hoặc pick rate giả.
- Hero player rankings: hiển thị score, tải thêm; thông báo chưa hỗ trợ nếu backend chưa bật cờ B.
- Builds: item popularity theo giai đoạn + danh mục item thật; abilities/talents từ hero API.
- Search: debounce 400ms, lựa chọn all/player/hero/team/match, lịch sử cục bộ, giữ ID string khi điều hướng.
- Loading, empty, lỗi API, retry, query cache theo mọi filter/page và refresh nhóm query phần 2.

Không fallback dữ liệu mẫu khi API lỗi. Home, Matches, Profile và Pro Scene vẫn thuộc
các phần chưa tích hợp. Search/rankings có thông báo trước khi mở các màn chi tiết đó.
Build theo trận không hiển thị inventory/purchase timeline mẫu; cần API Matches của người 1.
Favorite tiếp tục lưu AsyncStorage cục bộ; không tự đồng bộ lên backend.

## Chạy web trên máy

Terminal backend:

```powershell
cd D:\mobi\OpenDotaClient\backend
npm.cmd run dev:part2
```

Terminal frontend:

```powershell
cd D:\mobi\OpenDotaClient\frontend
npm.cmd start -- --web
```

Mặc định frontend gọi `http://localhost:3000/api/v1`. Nếu dùng server chính, tạo
`frontend/.env.local` từ `.env.example`, sửa `EXPO_PUBLIC_API_BASE_URL`, rồi reload app.
Không đưa API key vào frontend. Backend demo cho phép CORS từ localhost/127.0.0.1:8081;
origin khác cấu hình bằng `DEV_WEB_ORIGINS` (danh sách cách nhau dấu phẩy).

## Điện thoại thật / Android emulator

- Điện thoại: đặt `EXPO_PUBLIC_API_BASE_URL=http://<IP-LAN-máy-tính>:3000/api/v1`.
- Backend `.env`: `HOST=0.0.0.0`; máy tính và điện thoại cùng mạng, cổng 3000 truy cập được.
- Android emulator thường dùng `http://10.0.2.2:3000/api/v1`.
- Đừng dùng localhost trên điện thoại vì nó trỏ vào chính điện thoại.
- Rankings cần `ENABLE_HERO_RANKINGS=true` phía backend; nếu chưa bật, UI báo chưa hỗ trợ.

Chưa xác nhận trên thiết bị Android/iOS thật; các kết quả E2E là browser web ở viewport mobile.

## Kiểm chứng

- Typecheck, ESLint frontend và build web.
- E2E regression + fixtures DTO: danh sách/filter, detail, abilities thiếu, statistics,
  matchups, item mapping, rankings 501, API timeout/retry, empty không fallback, Search và pagination.
- E2E nguồn thật: browser → backend → OpenDota, Heroes → Anti-Mage → Builds, Search Storm Spirit.
- Backend: 43 test tự động, typecheck và lint đạt; E2E riêng phần 2 có 10 test và 1 live test đạt.
- Báo cáo mới nhất và giới hạn thiết bị: [PART2_TEST_REPORT.md](PART2_TEST_REPORT.md).
- Hồi quy chung: 5/5 bài đã có kết quả đạt (gồm lượt chạy lại sau khi tách bài quá dài).

```powershell
cd frontend
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:e2e
npm.cmd run build:web
```

Test live không bật trong suite offline; mở backend trước, rồi:

```powershell
$env:LIVE_PART2_API='1'
npm.cmd run test:e2e -- tests/part2-live.spec.ts
Remove-Item Env:LIVE_PART2_API
```

## File chính

| File/thư mục | Vai trò |
| --- | --- |
| frontend/src/shared/api/client.ts | Base URL, fetch, timeout, lỗi và kiểu DTO shared |
| frontend/src/features/heroes/api/queries.ts | TanStack queries, phân trang và catalog |
| frontend/src/features/heroes/screens | Các màn Heroes, HeroDetail, HeroRanks dùng DTO thật |
| frontend/src/features/search/screens/SearchScreen.tsx | Search API, debounce và điều hướng |
| frontend/src/features/builds/screens/BuildScreen.tsx | Popularity, items, abilities và talents |
| frontend/src/core/Screen.tsx | Refresh query phần 2 |
| backend/src/part2-dev.ts | CORS allowlist và host cấu hình cho demo |
