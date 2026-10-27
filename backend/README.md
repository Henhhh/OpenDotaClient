# Backend — nền chung phần 2

Đã có OpenDota transport và router Heroes, constants, Search. Express host `part2-dev.ts`
chỉ để người 2 kiểm thử riêng; người 1 ghép router vào server chính.
Yêu cầu Node.js >=24; Node chạy trực tiếp TypeScript bằng type stripping.

```powershell
cd D:\mobi\OpenDotaClient\backend
npm.cmd ci
npm.cmd run check
```

Copy `.env.example` thành `.env` nếu cần cấu hình. Tiến trình server sau này cần
load env trước lần gọi `getOpenDotaClient()` đầu tiên (ví dụ `node --env-file=.env ...`).
Không commit `.env`. API key chỉ dùng ở backend; không dùng biến `EXPO_PUBLIC_*` cho key.

## Bàn giao cho người 1 và 3

```ts
import { getOpenDotaClient, UpstreamError } from './src/integrations/opendota/index.ts';

const client = getOpenDotaClient(); // transport singleton
// Mỗi module tự định nghĩa Zod schema cho upstream.
const result = await client.getWithMeta('/heroes', {}, {
  validate: value => heroesUpstreamSchema.parse(value),
});
// result.data là dữ liệu upstream đã validate, chưa phải wire DTO của app.
// Map sang shared/api-contract.ts trong service của module.
// meta.fetched_at = result.fetched_at; meta.stale = false.
// cache_hit chỉ dùng nội bộ, không thêm vào Meta của contract.
```

- `get<T>(path, query?, options?)`: trả dữ liệu; generic T không runtime validate.
- `getWithMeta<T>(...)`: thêm `fetched_at`, `cache_hit`. Dùng hàm này khi tạo Meta HTTP.
- `options.validate`: parser đồng bộ, ví dụ `value => schema.parse(value)`; lỗi parser thành `invalid_response`. Chỉ cache khi đã validate.
- Cache giữ raw JSON đã qua parser, từng caller vẫn parse độc lập; không chia sẻ object mutable.
- `ttl_seconds: 0` tắt cache. Không validate vẫn được transport/dedup nhưng không cache.
- `options.signal` hủy chờ riêng caller; không hủy request đang dùng chung. Transport tự giới hạn 20s.
- `post<T>(path, body?)`: không cache, không retry; caller validate response trước dùng.
- `UpstreamError` không chứa URL/body/key; core người 1 map theo bảng dưới.

| kind | HTTP backend | code |
| --- | --- | --- |
| not_found | 404 | NOT_FOUND |
| rate_limited | 429 | RATE_LIMITED |
| timeout | 504 | UPSTREAM_TIMEOUT |
| unavailable / invalid_response | 502 | UPSTREAM_ERROR |

Chuyển `retry_after_seconds` sang body và Retry-After nếu có; không đổi lỗi thành mảng rỗng.
Lỗi input nội bộ (`Invalid OpenDota path/query`) là lỗi lập trình, không phải lỗi 404 từ nguồn.

## Cấu hình và giới hạn

| Biến | Mặc định |
| --- | --- |
| OPENDOTA_API_KEY | không có |
| OPENDOTA_REQUESTS_PER_MINUTE | 30 |
| OPENDOTA_REQUESTS_PER_DAY | 900 |
| OPENDOTA_CONCURRENCY | 2 |

Budget rolling 60s/24h, đếm mọi HTTP attempt kể cả retry. Queue tối đa 50,
cache tối đa 500 entry (LRU), TTL theo contract. Vượt quota trả lỗi ngay;
queue concurrency chờ trong deadline. Khi upstream 429, chặn request tiếp theo
theo Retry-After (fallback 60s). Không có tự gọi mạng khi import module.

GET retry tối đa một lần cho lỗi mạng/502/503/504; jitter 250–750ms.
Timeout mỗi attempt 8s; tổng 20s gồm queue, body JSON và delay retry.
Không retry POST/400/404/429/JSON sai/timeout. Redirect bị chặn để không lộ key.
URL cố định OpenDota, path chỉ cho các segment chữ/số/gạch dưới/gạch ngang.

In-memory quota/cache dùng cho **một process demo**. Trước khi scale nhiều instance,
cần cache và quota tập trung. Middleware hạn chế request theo IP/user thuộc core người 1,
không nằm trong limiter upstream này.

## Kiểm thử

`npm.cmd run check`: TypeScript strict và Node test runner; tests dùng fake fetch,
không tiêu quota OpenDota. Kiểm cache/TTL/eviction, schema, dedup/cancellation,
retry, HTTP errors, deadline, quota, queue, redirect và bảo vệ key.
Kết quả nghiệm thu API nguồn thật nằm trong `docs/PART2_PROGRESS.md` ở thư mục gốc.

## Tiến độ phần 2

- [x] Contract và DTO chung.
- [x] Client GET/POST, timeout, retry và lỗi chuẩn.
- [x] Cache sau runtime validation, fetched_at, dedup và cancellation.
- [x] Quota/phút/ngày, concurrency, queue và Retry-After.
- [x] Env mẫu, singleton, hướng dẫn người 1/3 tích hợp.
- [x] Kiểm thử transport bằng fake fetch.
- [x] Heroes, stats, matchup, item popularity, items constants HTTP API.
- [x] Search hero/player/match ID; điểm tiêm TeamSearchService.
- [x] Hero rankings có cờ bật riêng cho đợt B.
- [x] Adapter tìm đội theo catalog OpenDota; host phần 2 đã inject TeamSearchService.
- [x] 43/43 test offline và 12/12 smoke test HTTP nguồn thật đạt.
- [ ] Tích hợp frontend với API thật.

## Chạy API phần 2

```powershell
npm.cmd run dev:part2
```

Host mặc định `http://127.0.0.1:3000/api/v1`, chỉ bind loopback để kiểm thử local.
Có CORS dev allowlist qua DEV_WEB_ORIGINS; HOST cho phép chọn địa chỉ bind khi thử điện thoại.
Chưa có core auth/rate limit theo IP của người 1. Không coi đây là server production.

```http
GET /api/v1/heroes?primary_attr=agi&limit=20&offset=0
GET /api/v1/heroes/1
GET /api/v1/heroes/stats?bracket=7
GET /api/v1/heroes/1/matchups
GET /api/v1/heroes/1/items
GET /api/v1/constants/items?q=blink
GET /api/v1/search?q=antimage&type=hero
GET /api/v1/search?q=miracle&type=player
GET /api/v1/search?q=8312547001&type=match
```

`ENABLE_HERO_RANKINGS=true` bật `/heroes/1/rankings`; mặc định trả 501.
Stats pick_rate/sample_matches trả null vì upstream không cung cấp mẫu số cùng tập.
Abilities dạng variant được gộp theo key không trùng; talents chỉ map cặp cấp 10/15/20/25
khi đủ hai tên tại mỗi cấp; không gán các talent bổ sung thành cặp giả.

### Người 1 ghép router

```ts
import { contractClient } from './src/integrations/opendota/index.ts';
import { createRouter as heroes } from './src/modules/heroes/index.ts';
import { createRouter as constants } from './src/modules/constants/index.ts';
import { createRouter as search } from './src/modules/search/index.ts';
import { createTeamCatalogSearch } from './src/modules/search/team-catalog.ts';
const client = contractClient(); // đúng shared.OpenDotaClient (data + fetched_at)
const teamSearchService = createTeamCatalogSearch(client); // hoặc service do người 3 cung cấp
app.use('/api/v1/heroes', heroes({ client }));
app.use('/api/v1/constants', constants({ client }));
app.use('/api/v1/search', search({ client, teams: teamSearchService }));
```

Core có thể gắn `res.locals.request_id`, `res.locals.deadline_ms` trước router.
Nếu chưa có, router tự tạo request ID/deadline 20s. `modules/part2/http.ts` là helper
module/host demo; khi tích hợp giữ envelope/lỗi giống contract hoặc thay bằng core tương đương.
`contractClient()` bắt buộc validator, cache_namespace, TTL và deadline tuyệt đối;
transport cũ vẫn giữ API tương thích cho code đã có. GET cache namespace đổi khi schema đổi.

### Kiểm tra dữ liệu thật

```powershell
npm.cmd run smoke:part2
```

Lệnh này mở server local tạm thời, gọi HTTP endpoint với OpenDota thật, rồi đóng server.
Có tiêu quota upstream; không chạy tự động trong `npm test`. Search player có thể trả
504 nếu OpenDota mất hơn 8 giây; vẫn giữ timeout theo contract, không thay bằng mock.
Host phần 2 đã inject adapter catalog teams, vì vậy Search team/all dùng được ngay.
Nếu server chính không inject TeamSearchService, hai kiểu này vẫn trả 501 đúng contract.
Adapter chỉ tìm trên catalog đầy đủ, theo tên/tag và sort ID số trước khi giới hạn;
không thay thế các API Pro Scene người 3 phụ trách.
