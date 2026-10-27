# Người 3 — nền chung

Ngày cập nhật: 27/10/2026. Áp dụng API contract v1; không đổi wire DTO.
Tài liệu này mô tả nền ban đầu; backend API/chức năng đã bổ sung ở [PART3_API.md](PART3_API.md).

## Phạm vi đã bàn giao

| Thành phần | File | Người dùng lại |
| --- | --- | --- |
| TeamSearchService | `backend/src/modules/pro/team-search.ts` | Người 2: Search; Người 3: Pro |
| SQLite migration runner | `backend/src/database/index.ts`, `migrations/001-foundation.sql` | Người 1: bootstrap; Người 3: dữ liệu cá nhân |
| SessionStore | `backend/src/database/session-store.ts` | Người 3: auth/logout |
| requireSession + sessionPrincipal | `backend/src/modules/auth/session.ts` | Người 1: parse; Người 3: auth/me |
| ParseJobStore | `backend/src/database/parse-job-store.ts` | Người 1: parse service |
| Factory ghép dependencies | `backend/src/part3-foundation.ts` | Người 1: app chính |

Không có server thứ ba. Không tự mount route, không tự tạo phiên khi khởi động.
Export cũ `modules/search/team-catalog.ts` vẫn hoạt động và chuyển sang service Pro để không làm hỏng Người 2.

## Database và migration

Dùng SQLite tích hợp trong Node 24, phù hợp demo một backend/một máy. Không thêm package runtime.
Các bảng: users, sessions, settings, favorites, notifications, parse_jobs, parse_job_users và schema_migrations.
ID lưu TEXT; foreign keys bật; unique favorites theo user/kind/entity, notification theo user/event key.
Settings mặc định dark/en/notifications=true. Các bảng favorites/settings/notifications mới là nền lưu trữ, chưa có CRUD API.

```powershell
cd D:\Study\Project\OpenDotaClient\backend
npm ci
npm run db:migrate
npm run check
```

`DATABASE_PATH=./data/opendota.sqlite` trong `.env` (đường dẫn tương đối với cwd backend).
Migration tự chạy khi mở DB, chạy lại không xóa dữ liệu; dùng transaction và checksum để từ chối sửa migration đã áp dụng.
Thêm migration phiên bản mới và đăng ký runner khi thay schema; không sửa file 001 của database đang sử dụng.
Không có reset/seed tài khoản giả. DB, WAL và SHM được Git ignore. Đóng connection qua `close()` khi server shutdown.
Khi build JS phải copy thư mục SQL `database/migrations` cạnh module database; cấu hình build chung thuộc Người 1.
SQLite chạy đồng bộ; chưa xác nhận tải lớn hoặc deploy nhiều máy, cần đánh giá/chuyển store khi mở rộng.

## Cách ghép vào app của Người 1

```ts
import { createPart3Foundation } from './part3-foundation.ts';
import { sessionPrincipal } from './modules/auth/session.ts';

// client là cùng instance OpenDotaClient mà Heroes/Search đang dùng.
const part3 = createPart3Foundation({
  client,
  databasePath: process.env.DATABASE_PATH ?? './data/opendota.sqlite',
  allowedWebOrigins: ['http://localhost:8081'],
});
// Truyền part3.teams vào createRouter của Search.
// Truyền part3.parseJobs vào service parse của Người 1.
// app.use('/api/v1/me', part3.requireSession, meRouter);
// Trong handler: const principal = sessionPrincipal(res);
// Khi shutdown: part3.close();
```

Ví dụ tích hợp, không phải khẳng định meRouter/parse API đã có. Core vẫn sở hữu request ID,
JSON parser giới hạn body, kiểm JSON hỏng, CORS credentials đúng origin, response/error và router gốc.
Middleware hiện tái sử dụng ApiError từ helper Người 2; khi Người 1 bàn giao core thống nhất thì chuyển import cùng PR.

## Quy tắc session

- Session opaque ngẫu nhiên 32 byte, server chỉ lưu SHA-256 token; hết hạn tuyệt đối 7 ngày.
- `createForVerifiedAccount(account_id, platform)` là hàm nội bộ, **chỉ gọi sau khi đã kiểm chứng Steam**.
  Không tạo endpoint nhận account_id từ FE để gọi hàm này. Hàm không tự xác minh Steam.
- `resolve` kiểm hạn và trả principal; `revoke` thu hồi ngay; `pruneExpired` dành cho tác vụ dọn định kỳ.
- Web dùng cookie `opendota_session`; native dùng Bearer. Không dùng chéo platform hoặc gửi cả hai.
- `sessionCookieOptions(production)` cung cấp HttpOnly, SameSite=Lax, path=/ và Secure khi production.
  Auth handler tương lai chịu trách nhiệm set/clear cookie, bảo đảm production bật Secure và HTTPS.
- Cookie mutation yêu cầu Origin đúng allowlist và Content-Type JSON; native mutation cũng yêu cầu JSON.
- Principal nằm ở `res.locals.principal`, lấy qua `sessionPrincipal(res)`. Không tin owner từ query/body.
- Middleware ném lỗi về error handler hiện có. Route chưa bật vẫn 501 theo contract; mount middleware khi bật route.

Mốc nền ban đầu chưa có OpenID/flow; bước backend tiếp theo đã thêm start/callback/exchange,
nonce/state và one-time code qua migration 002. Xem PART3_API.md để bật endpoint và kiểm chứng Steam thật.

## ParseJobStore

- `reserve` dùng BEGIN IMMEDIATE và partial unique index: chỉ một job active/match; active gồm queued/processing/unknown.
- User phải tồn tại. Reserve đồng thời cấp quyền user vào job; user chưa được cấp quyền nhận null từ getForUser.
- Completed/failed cho phép lần reserve sau tạo job mới; không mở lại job terminal bằng update.
- Job upstream lưu riêng, không có trong DTO; không cho ghi đè sang upstream ID khác.
- Poll tối thiểu 5 giây. Không suy unknown thành completed; Người 1 xác minh kết quả với upstream.
- Reserve chỉ giải quyết đặt chỗ và quyền. Người 1 phải chỉ gửi POST upstream khi created=true,
  không tự retry POST, và xử lý crash sau reserve/trước khi lưu upstream ID bằng unknown/reconciliation.
- Schema/store không tự gửi parse request và không bảo đảm upstream exactly-once.

## TeamSearchService

Dùng client/cache/quota/deadline của Người 2. Runtime validate từng trang, duyệt `/teams?page=...`
cho đến trang dưới 1000 phần tử; chỉ filter/sort/limit sau khi có catalog đầy đủ. Search tên/tag không phân biệt hoa thường,
sort ID theo số. fetched_at là thời điểm cũ nhất trong các trang; field thiếu là null.
Từ chối trang đầy lặp hoặc quá 100 trang, timeout/quota/lỗi nguồn trả lỗi, không trả kết quả một phần.
Đọc catalog lớn có thể vượt quota/deadline và trả lỗi; không tăng quota mặc định để che vấn đề này.

Tham khảo nguồn: [OpenDota OpenAPI](https://api.opendota.com/api) và
[Node 24 SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html).
Test transport dùng fixture; smoke Pro thực tế đã bổ sung ở PART3_API.md. Steam thật còn cần kiểm chứng thủ công.

## Tiêu chí kiểm thử

`npm run test:part3` kiểm migration/persistence, phiên giả/hết hạn/logout, cookie/Bearer/Origin,
parse reserve hai connection, isolation theo user, rollback, job upstream riêng, phân trang teams và cancellation.
`npm run check` còn chạy toàn bộ regression của client và API Người 2.
