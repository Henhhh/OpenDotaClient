# Người 1 — nền chung backend

Cập nhật 27/10/2026. Tài liệu này mô tả core/khởi động/build theo API contract v1.
API nghiệp vụ Players/Matches và parse đã được triển khai tiếp tại [PART1_API.md](PART1_API.md).

## Thành phần bàn giao

| File | Vai trò |
| --- | --- |
| `backend/src/core/http.ts` | ApiError, success/error envelope, query/body validation, ID/account ID/date range, phân trang, metadata null |
| `backend/src/core/middleware.ts` | Request ID, deadline/abort, CORS, JSON parser, kiểm deadline sau parse và fallback 404 |
| `backend/src/core/config.ts` | Đọc/kiểm env một chỗ cho server; PORT/HOST, DB path, origins, feature flags/auth |
| `backend/src/core/health.ts` | GET `/api/v1/health`, độc lập OpenDota/Steam |
| `backend/src/app.ts` | Ghép middleware và router cả ba người, bao gồm Players/Matches/parse |
| `backend/src/server.ts` | Một entrypoint dùng chung cho dev và JS build; quản lý listener và shutdown |
| `backend/tsconfig.build.json`, `scripts/build.mjs` | Emit ESM JavaScript, shared DTO và copy SQL migrations |
| `backend/scripts/smoke-build.mjs` | Chạy server JS đã build ở cổng tạm với DB memory, kiểm health và đóng child process |

Toàn bộ module hiện có import helper trực tiếp từ core. `modules/part2/http.ts` giữ re-export
để tương thích test/consumer cũ, bảo đảm ApiError cùng một class. Không tạo HTTP client/session store mới:
OpenDota client của Người 2 và SessionStore/ParseJobStore của Người 3 được dùng lại.
`part2-dev.ts` vẫn là host development riêng của Người 2, nhưng dùng middleware core cho request ID/deadline/CORS.

## Quy ước dùng cho Players/Matches

```ts
import { Router } from 'express';
import { endpoint, query, pagination, accountId, empty, body } from '../../core/http.ts';
// const router = Router(); export function createRouter(deps) { ...; return router; }
// router.get('/:id', endpoint(async (req, context) => {
//   const id = accountId.parse(req.params.id);
//   query(req, empty);
//   return service.profile(id, context);
// }));
```

Mỗi service trả `{data, fetched_at, source}`. Luôn truyền `context.deadline_ms` và `context.signal`
vào client upstream; không tạo lại deadline mỗi call. ID số trên wire vẫn là chuỗi.
`accountId` kiểm canonical uint32; `numericId` hỗ trợ ID dài tối đa 20 chữ số; `opaqueId` riêng cho job/notification.
`dateRange` cho phép from/to riêng lẻ, khi có cả hai yêu cầu from < to; không nhận số mũ/leading zero hoặc số mất độ chính xác.
Query lặp bị 400, schema query/body phải `.strict()`. `body(req,schema)` còn yêu cầu Content-Type JSON.
Gắn `requireSession` Người 3 cho parse khi bật; lấy user từ principal và truyền vào ParseJobStore,
không nhận user_id từ frontend. Thứ tự compare/stats/static route trước route ID theo contract.

## HTTP lifecycle

- Core tạo request ID mới; header X-Request-Id trùng meta/request_id. Không tin request ID từ client.
- Một deadline 20 giây từ lúc request vào app; abort signal khi timeout hoặc client ngắt kết nối.
- Endpoint trả 504 ngay cả khi một handler async không xử lý signal; service vẫn phải tôn trọng signal để dừng công việc.
- Abort không tự hoàn tác tác vụ ghi đã hoàn thành; module nghiệp vụ chịu trách nhiệm transaction/idempotency.
- JSON body tối đa 32 KiB; JSON hỏng/quá lớn và charset/encoding không hỗ trợ trả envelope 400.
- CORS chỉ trả origin trong allowlist, có credentials cho app chính; preflight bị từ chối dùng envelope 403.
- Unknown route 404; lỗi nội bộ 500 không lộ stack/message gốc. Lỗi upstream map 404/429/502/504.
- Mọi 429 có Retry-After số nguyên >=1, mặc định 60 giây khi thiếu thông tin.
- unavailable_fields dùng JSON Pointer đúng escaping và vị trí phần tử mảng.
- Read-all notifications vẫn chụp boundary trước body parser, giữ quy tắc của Người 3.

## Chạy và build

```powershell
cd D:\Study\Project\OpenDotaClient\backend
npm ci
npm run check
npm run test:part1
npm run build
npm run smoke:build
npm start
```

Dev vẫn dùng `npm run dev`. `.env` được nạp trước khi tạo OpenDota client.
`loadConfig()` từ chối enum/flag/port sai; WEB_ORIGINS là origin HTTP(S) đầy đủ không dấu `/` cuối.
PORT=0 được hỗ trợ cho kiểm thử cổng tạm. Auth vẫn chỉ bật bằng ENABLE_ACCOUNT_FEATURES=true,
và production auth yêu cầu PUBLIC_BASE_URL HTTPS. Các giá trị ví dụ ở backend/.env.example giữ nguyên.

Build tạo:

```text
backend/dist/
├── backend/src/server.js
├── backend/src/core/...
├── backend/src/database/migrations/*.sql
└── shared/api-contract.js
```

Compiler rewrite import `.ts` thành `.js`, không cần TypeScript runtime khi `npm start`.
Build chỉ dọn thư mục generated `backend/dist`, không đụng database/env/source. Dist được Git ignore.
Triển khai cần giữ cấu trúc dist này và cài runtime dependencies express/zod ở backend; build không bundle node_modules.
Smoke dùng port tạm và DB memory; không dừng server hiện có, không gọi upstream/Steam.

## Kết quả và giới hạn

9 bài mới kiểm config/validation, health/404, body/query/null pointers, lỗi/429, CORS,
deadline với handler không phản hồi, fallback endpoint độc lập và client disconnect.
Tại mốc nền chung, toàn backend **74/74 tests** qua; typecheck, lint, build và smoke JS/SQL/health thành công.
Kết quả mới nhất sau triển khai nghiệp vụ được ghi ở [PART1_PROGRESS.md](PART1_PROGRESS.md).
Không tái xác minh Steam vì phần này đã được người dùng tạm hoãn.

Nguồn kỹ thuật: [TypeScript rewriteRelativeImportExtensions](https://www.typescriptlang.org/tsconfig/rewriteRelativeImportExtensions.html),
[Node 24 HTTP](https://nodejs.org/docs/latest-v24.x/api/http.html).
