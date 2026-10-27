# Báo cáo kiểm thử phần 2

## Kết quả của đợt kiểm thử này

| Hạng mục | Kết quả | Bằng chứng/lệnh chạy |
| --- | --- | --- |
| Backend TypeScript + ESLint | ✅ Đạt | `cd backend; npm.cmd run check` |
| Backend unit/integration HTTP | ✅ 43/43 test | `backend/tests/opendota.test.ts`, `backend/tests/part2-api.test.ts` |
| API smoke với OpenDota thật | ✅ 12/12 HTTP 200 | `cd backend; npm.cmd run smoke:part2` |
| Frontend TypeScript + ESLint | ✅ Đạt | `npm.cmd run typecheck`, `npm.cmd run lint` |
| E2E riêng phần 2, backend fixture | ✅ 10/10 test | `cd frontend; npm.cmd run test:part2` |
| E2E hồi quy chung | ✅ 5/5 test, xác nhận qua hai lượt chạy | 2 bài đầu đạt; 3 bài profile/pro, favorite persistence, narrow layouts chạy riêng đều đạt |
| E2E trình duyệt → backend → OpenDota | ✅ 1/1 test | `LIVE_PART2_API=1`, `tests/part2-live.spec.ts` |
| Android JS/Hermes export | ✅ Đạt, 1695 modules | `node node_modules/expo/bin/cli export --platform android --output-dir dist-native` |
| Chạy app trên Android/iOS thật | ⬜ Chưa thực hiện | Đã tìm thấy ADB trong Android SDK; `adb devices -l` trả danh sách rỗng |

Không cộng số test fixture với smoke để suy ra phần trăm tính năng đã kiểm thử.
Smoke thành công là kết quả ở lần chạy này, không phải cam kết SLA của OpenDota.

### Kết luận lượt kiểm thử bị ngắt

Đã lấy kết quả tiến trình còn chạy: ba bài hồi quy sau khi tách đạt 3/3,
exit code 0; `frontend/test-results/.last-run.json` có status=passed và failedTests=[].
Hai bài hồi quy đầu đã đạt ở lượt trước. Do đó cả năm bài hồi quy hiện có kết quả đạt,
không khẳng định đã chạy tất cả trong một lệnh duy nhất.

Bài route smoke ghé 12 màn liên tiếp được cấp ngân sách tổng 180s, mỗi navigation
vẫn giới hạn 20s. Bài gom profile/pro/favorites/layout trước đây chạm 90s đã được tách
thành ba bài độc lập, giữ nguyên assertions và không thêm auto-retry để che lỗi.
Không cần chạy lại các bộ đã đạt khi không có thay đổi mã ứng dụng.

## Phạm vi đã kiểm tra

Backend:

- Cache/TTL/eviction, runtime schema, namespace và fetched_at; chống GET trùng, hủy riêng caller và deadline.
- Retry GET, không retry POST/404/429/JSON sai; timeout, quota phút/ngày, queue/concurrency, Retry-After.
- URL cố định, chặn path/query injection, không lộ key; dev CORS allowlist và preflight.
- Hero catalog/detail/stats, matchup, item popularity, items, rankings, Search các loại và nguồn tổng hợp.
- ID 20 chữ số không mất độ chính xác, leading zero sai, Unicode 2/80/81 code point.
- Pagination không trùng hàng trên fixture ổn định, numeric ID sort và null rate xếp cuối.
- Schema sai, wins vượt games, rankings sai hero, abilities thiếu và error envelope/request ID.

Frontend:

- Detail, abilities/talents thiếu, statistics, matchups, item mapping và rankings chưa bật.
- API timeout/retry, mất mạng/khôi phục, empty không fallback mẫu.
- Search gọi đúng category, xóa kết quả cũ khi input đổi và điều hướng giữ ID.
- Catalog/load more/reset filter; rankings tải thêm và avatar null.
- Builds theo trận không tạo inventory giả; abilities/talents thiếu không crash.
- Các màn Heroes, HeroDetail, HeroRanks, Builds, Search không tràn ngang tại viewport 320/768.
- Nguồn thật: Heroes → Anti-Mage → Builds/item counts; Search hero Storm Spirit.

## Cách chạy lại

Offline:

```powershell
cd D:\mobi\OpenDotaClient\backend
npm.cmd run check
cd ..\frontend
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:part2
```

Online API: `cd backend`, `npm.cmd run smoke:part2`.
Online E2E: mở backend bằng `npm.cmd run dev:part2`, rồi terminal frontend:

```powershell
$env:LIVE_PART2_API='1'
npm.cmd run test:e2e -- tests/part2-live.spec.ts
Remove-Item Env:LIVE_PART2_API
```

Playwright tự mở/reuse Expo web cổng 8081; API mặc định cổng 3000.
Trace và screenshot khi test fail nằm trong `frontend/test-results`, không commit.
Live test được tắt mặc định trong suite offline để không phụ thuộc mạng/quota.

## Giới hạn còn lại

Android export chỉ kiểm tra bundle, không tạo APK và không xác nhận hành vi native.
Viewport mobile không kiểm tra bàn phím native, safe area thiết bị, gesture Back,
background/resume hoặc hiệu năng điện thoại. Checklist chưa thực hiện nằm tại
[PART2_DEVICE_CHECKLIST.md](PART2_DEVICE_CHECKLIST.md).

Server chính và các API Players/Matches/Pro Scene vẫn cần kiểm thử tích hợp sau khi
người 1/3 ghép; kết quả này không chứng nhận các module ngoài phần 2.
