> Cập nhật 28/10/2026: Steam đã được thay bằng form email/password. Auth hiện hành và migration xem [AUTH.md](AUTH.md); các mục Steam bên dưới chỉ ghi lại mốc kiểm thử cũ.

# Người 1 — tích hợp frontend Players & Matches

Cập nhật 27/10/2026. Home, Profile/Player, Matches, Match Detail, Compare và inventory
trong Build đã dùng API contract v1. Các màn này không lấy thống kê mẫu khi API lỗi.

## Chạy thử

Hai terminal PowerShell:

```powershell
cd D:\Study\Project\OpenDotaClient\backend
npm.cmd run dev
```

```powershell
cd D:\Study\Project\OpenDotaClient\frontend
npm.cmd run web
```

`frontend/.env` dùng `EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1` khi chạy
trên cùng máy. Backend cần cho phép origin frontend qua `WEB_ORIGINS` như hướng dẫn
[PART1_FOUNDATION.md](PART1_FOUNDATION.md). Thiết bị/emulator cần địa chỉ backend phù hợp,
không dùng localhost của điện thoại để trỏ về máy tính.

Khách có thể nhập **account ID 32-bit** ở Home/Profile/Matches. Account công khai
`311360822` là lựa chọn ban đầu để duyệt nguồn thật, không phải tài khoản đã xác thực
của người dùng. Lựa chọn lưu trên thiết bị, được dùng chung giữa các tab. Khi có session,
ba tab dùng `session.user.account_id`; xem người khác qua Search/Peers mở route Player.
Steam ID 64-bit được hiển thị riêng nếu API cung cấp.

## Chức năng đã nối

| Màn | Dữ liệu và hành vi |
| --- | --- |
| Home | Profile, all-time/recent stats, performance, recent matches, most played heroes; refresh API |
| Profile/Player | Overview, Matches, Heroes, Peers, Statistics, rank history; favorite player |
| Matches | Lookup ID, phân trang 20 trận, lọc result/ngày/hero/mode bằng backend; đổi bộ lọc tạo lại danh sách |
| Match Detail | Kết quả, scoreboard, anonymous player, draft, gold/XP advantage, inventory, purchase timeline, ability upgrade IDs |
| Compare | Nhập đúng hai account khác nhau, all-time/recent, giữ thứ tự hai người |
| Build có match ID | Lấy inventory/purchases của player slot từ Match Detail; giữ phần hero item popularity riêng |
| Điểm điều hướng | Search, Peers và thẻ pro match mở màn chi tiết dùng API |

ID trận giữ chuỗi xuyên suốt lookup/route/query; không chuyển qua JavaScript Number.
Tên/artwork hero dùng catalog tĩnh, không sinh thống kê. Hero ID ngoài catalog hiện
`Hero ID` và artwork placeholder, không thay bằng hero khác.

Mỗi khối có loading/error/retry/empty. Số liệu không có hiện `—` hoặc giải thích thiếu
dữ liệu; không quy null thành 0/thua. Không dựng MMR hoặc đường biểu đồ từ dữ liệu giả.
Performance chỉ vẽ metric khi toàn bộ trang gần nhất có giá trị, tránh nối các điểm thiếu.
Rank history không có nguồn hiển thị trạng thái unavailable.

API v1 chưa có role distribution, date-specific totals, recent hero sort, damage trend,
historical meta movers, objectives/teamfight events hoặc bộ lọc lane/party/parsed-only.
UI nêu rõ giới hạn và chỉ cung cấp lựa chọn backend hỗ trợ. Unranked lọc lobby type 0;
không tự loại Turbo trên trang đã tải. Xem [PART1_API.md](PART1_API.md) về phạm vi nguồn.

## Parse

- Cần session; khách được dẫn sang Settings. Parse mặc định vẫn tắt ở backend;
  khi chưa bật, giao diện hiển thị 501. Steam web đã được người dùng xác nhận login/refresh;
  Steam native chưa kiểm. Expo Go chặn sign-in và giải thích cần development build.
- POST parse chỉ chạy sau thao tác người dùng, `retry=false`. Cookie web hoặc Bearer
  native được gửi qua client chung; public GET không gửi credential.
- Lưu job theo match/account trong query cache, poll ít nhất 5 giây theo backend,
  dừng tự động sau 2 phút hoặc khi completed/failed/lỗi. Có nút kiểm tra lại trạng thái.
- Unknown không được coi là thành công và không tự submit lại. Backend giữ reservation
  để thao tác yêu cầu lại sau lỗi submit không tạo POST upstream trùng.
- Completed làm mới dữ liệu Người 1 và notification queries. Đăng xuất/xóa session
  hủy account queries; job của tài khoản cũ không được dùng cho tài khoản khác.
- Không còn thao tác ghi `parsed` local để giả lập parse thành công.

## File liên quan

| File/folder | Vai trò |
| --- | --- |
| `frontend/src/features/players/api/queries.ts` | Query/pagination, validation ID; cache key `part1` |
| `frontend/src/features/players/components/AccountPicker.tsx` | Account hiện tại, nhập và đồng bộ account đã lưu |
| `frontend/src/features/players/components/` | ProfileHeader, RecentForm, Performance, PlayerHeroList |
| `frontend/src/features/players/screens/` | Profile và Compare |
| `frontend/src/features/matches/screens/` | Lịch sử trận và chi tiết trận |
| `frontend/src/features/matches/components/` | MatchRow, MatchInventory, ParsePanel |
| `frontend/src/core/Screen.tsx` | Route giữ ID chuỗi, refresh API, bỏ chặn bằng catalog mẫu |
| `frontend/src/shared/api/client.ts` | Credential cho parse POST và parse job GET |
| `frontend/tests/fixtures/part1.mts` | Router/backend SQLite thật với OpenDota fixture |
| `frontend/tests/part1.spec.mts` | 7 E2E Người 1 |

Các module fixture cũ vẫn tồn tại cho những consumer cũ; luồng Người 1 đã nối không gọi
chúng để lấy profile/match/statistics. Không xóa dữ liệu local sẵn có của người dùng.

## Kiểm thử

```powershell
cd D:\Study\Project\OpenDotaClient\frontend
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:part1
npm.cmd run test:e2e
npm.cmd run build:web
node node_modules/expo/bin/cli export --platform android --output-dir dist-android
```

E2E: **25 passed, 1 optional live test skipped**, gồm 7 bài mới Người 1. Kiểm tra account
switch/persistence/refresh, profile tabs, phân trang + bộ lọc, ID > Number.MAX_SAFE_INTEGER,
private/404/empty/upstream failure, Compare, inventory, session parse, unknown + giới hạn
polling và disabled parse. Các test tích hợp dùng router và DB memory thật với OpenDota
fixture; không gọi parse hoặc Steam thật. Smoke nguồn thật còn giới hạn đã ghi ở PART1_API.
Layout được kiểm tra ở 360px; screenshot cục bộ `frontend/test-results/part1-home-360.png`
được Git ignore. E2E mobile chuyển sang `.mts` để dùng backend ESM/SQLite.

Frontend typecheck/lint, export web và export Android đều qua. Backend check chạy lại
đạt **98/98 tests** sau sửa history `hero_id=0`; E2E dùng fixture không được tính là xác
minh nguồn thật. Smoke GET OpenDota thật mới nhất đã qua như ghi trong PART1_API.

Export không thay thế chạy app trên thiết bị. Vẫn cần xác minh Steam, parse nguồn thật
và thiết bị/emulator khi điều kiện mạng/thiết bị cho phép.
