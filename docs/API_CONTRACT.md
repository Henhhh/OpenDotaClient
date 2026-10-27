# OpenDota Mobile — API contract v1

Ngày chốt: 27/10/2026. Đây là giao diện đích để ba người triển khai độc lập;
không phải xác nhận các endpoint backend đã tồn tại.
DTO chuẩn nằm tại [shared/api-contract.ts](../shared/api-contract.ts).
Thay đổi phá vỡ contract phải được cả ba thống nhất, cập nhật tài liệu và DTO trong cùng PR.

## 1. Quyền sở hữu và thứ tự bàn giao

| Người | Sở hữu | Thư mục backend dự kiến | FE phụ trách nối |
| --- | --- | --- | --- |
| 1 | Khung Express/TypeScript, validate Zod, response/error, Players, Matches, parse, ghép route | `src/core`, `src/modules/players`, `src/modules/matches` | players, matches, dữ liệu trận của builds |
| 2 — bạn | OpenDota client/cache, Heroes, Search, constants | `src/integrations/opendota`, `src/modules/heroes`, `src/modules/search`, `src/modules/constants` | heroes, search, dữ liệu hero/item của builds |
| 3 | Pro Scene, Steam auth, DB/migration, favorites/settings/notifications | `src/modules/pro`, `src/modules/auth`, `src/modules/me`, `src/database` | pro-scene, favorites, notifications, settings |

- Người 1 sở hữu bootstrap, router gốc, middleware và cấu hình build backend.
- Người 2 sở hữu transport upstream; người 1/3 không tạo HTTP client riêng.
- Người 3 sở hữu schema DB và middleware session; người 1 gắn middleware vào app.
- Mỗi người export `router` từ `src/modules/<module>/index.ts`; người 1 mount dưới `/api/v1`.
- Home dùng lại query Players/Heroes/Pro; người 1 ghép Home sau khi endpoint ổn định.
- Không thêm endpoint dashboard tổng hợp trong v1. Compare thuộc người 1; Search gọi service Teams của người 3.
- Đợt A: health + client + Players/Matches/Heroes/Search/Pro cơ bản.
- Đợt B: parse, hero rankings, Steam login, đồng bộ và thông báo trong app.
- Endpoint ghi B chưa triển khai phải trả `501 FEATURE_UNAVAILABLE`; không trả dữ liệu mẫu.

## 2. Quy ước HTTP và dữ liệu

- Base URL local: `http://localhost:3000/api/v1`; điện thoại dùng IP LAN của máy chạy backend.
- Production dùng HTTPS; FE đọc `EXPO_PUBLIC_API_BASE_URL`. API key upstream chỉ nằm backend.
- JSON UTF-8; tên field `snake_case`. DTO API độc lập với kiểu mock frontend.
- Mọi ID trên dây là chuỗi: `"17"`, `"8312547001"`. ID số chỉ nhận chuỗi chữ số dương, không dấu, không số mũ; giới hạn 20 ký tự. Job/notification ID opaque tối đa 128 ký tự.
- `account_id` là Steam account ID 32-bit, không phải SteamID64. `steam_id` giữ chuỗi SteamID64.
- Thời điểm dữ liệu trận: Unix giây UTC; `duration`, `game_time`, thời gian mua đồ: giây.
- `fetched_at`, `created_at`, `expires_at`, `read_at`: RFC3339 UTC (đuôi Z).
- Tỷ lệ trong [0,1]; không có mẫu thì `null`. `win_rate = wins / (wins + losses)`.
- `kda = (avg_kills + avg_assists) / max(avg_deaths, 1)` trên cùng tập trận.
- Dữ liệu không có trả `null`, không giả thành 0, MMR ước đoán, tên đội hoặc lịch giải.
- Mảng `[]` nghĩa là có dữ liệu nhưng không có phần tử; mảng `null` nghĩa là chưa có dữ liệu.
- `meta.unavailable_fields` liệt kê JSON Pointer tới trường thiếu nguồn, ví dụ `/data/abilities`.
- Các `number` phải hữu hạn. URL ảnh là URL HTTPS tuyệt đối hoặc null; style/màu sắc thuộc FE.
- Unknown query/body field, enum sai, query lặp hoặc JSON không hợp lệ: 400. Không ép giá trị sai về mặc định.
- Thành công đọc/sửa: 200; tạo parse job: 202; xóa idempotent: 204 không body.
- Các response JSON thành công luôn bọc `Success<T>`, kể cả danh sách.

```json
{
  "data": {"items": [], "limit": 20, "offset": 0, "has_more": false, "total": null},
  "meta": {"request_id": "req-123", "fetched_at": "2026-10-27T00:00:00Z", "source": "opendota", "stale": false, "unavailable_fields": []}
}
```

### Phân trang và lọc

- Ký hiệu `P` bên dưới = `limit` mặc định 20 (1–100), `offset` mặc định 0 (0–10000).
- Mỗi endpoint danh sách trả `Page<T>`. `total` chỉ có khi biết chính xác; không suy đoán.
- `has_more` dựa vào lấy thêm một phần tử hoặc metadata nguồn. Nếu nguồn hữu hạn, paginate trên snapshot cache.
- Filter trước, sort sau, paginate cuối. Cùng giá trị sort dùng ID tăng dần làm tie-break.
- Không lấy một trang upstream rồi lọc tại chỗ và tuyên bố đã lọc toàn bộ; thiếu khả năng lọc thì 501.
- `from` inclusive và `to` exclusive là Unix giây không âm, `from < to`.
- GET danh sách không có kết quả: 200 với `items: []`; GET chi tiết không tồn tại: 404.

### Lỗi chung

```json
{"error":{"code":"VALIDATION_ERROR","message":"Invalid query","details":[{"field":"limit","message":"Must be between 1 and 100"}],"retry_after_seconds":null},"request_id":"req-123"}
```

| HTTP | code | Ý nghĩa |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | Path/query/body sai |
| 401 / 403 | UNAUTHORIZED / FORBIDDEN | Thiếu phiên / không được truy cập |
| 404 | NOT_FOUND | Đối tượng không tồn tại |
| 409 | CONFLICT | Xung đột trạng thái |
| 429 | RATE_LIMITED | Hết quota local hoặc upstream; trả Retry-After |
| 502 / 504 | UPSTREAM_ERROR / UPSTREAM_TIMEOUT | Nguồn lỗi / timeout |
| 501 | FEATURE_UNAVAILABLE | Khả năng chưa hỗ trợ hoặc chưa xác minh nguồn |
| 500 | INTERNAL_ERROR | Lỗi nội bộ; không lộ stack, API key hoặc token |

Mọi response có `X-Request-Id`; giá trị trùng `meta.request_id` hoặc `request_id` của lỗi.

## 3. Người 1 — Players và Matches

Các route dưới đây public, ngoại trừ POST parse yêu cầu session (B).
`a` = account ID, `m` = match ID; mỗi tên trong `{}` là path parameter.

| Đợt | Method + path tương đối | Query / body | T trong Success<T> |
| --- | --- | --- | --- |
| A | GET `/health` | không | Health |
| A | GET `/players/{a}` | không | PlayerProfile |
| A | GET `/players/{a}/stats` | `scope=all_time\|recent` (mặc định all_time); recent cố định tối đa 20 trận mới nhất | PlayerStats |
| A | GET `/players/{a}/matches` | P; `hero_id`, `result=win\|loss`, `game_mode`, `lobby_type`, `from`, `to`; sort cố định start_time desc | Page<PlayerMatch> |
| A | GET `/players/{a}/heroes` | P; `sort=games\|win_rate` (games), desc | Page<PlayerHero> |
| A | GET `/players/{a}/peers` | P; sort games desc | Page<Peer> |
| B | GET `/players/{a}/rank-history` | P; sort time desc | Page<RankPoint> |
| B | GET `/players/compare` | `account_ids=ID1,ID2` đúng hai ID khác nhau; `scope=all_time\|recent` | PlayerComparison |
| A | GET `/matches/{m}` | không | MatchDetail |
| B | POST `/matches/{m}/parse` | body `{}`; session bắt buộc | ParseJob; HTTP 202 |
| B | GET `/parse-jobs/{job_id}` | session bắt buộc; chỉ người tạo | ParseJob |

Mount `/players/compare` trước `/players/{a}`. Nếu không có rank history, trả 501,
không nội suy MMR từ huy hiệu. Một số metric all_time không có nguồn thì null;
`sample_size` là số trận thực sự tính các metric trung bình, không phải tổng wins+losses.
`matches` là số trận trong scope; `wins/losses` chỉ đếm trận đã có kết quả.

Parse: lưu ánh xạ job ↔ match ↔ user. Khi đang có job cho cùng match, dùng lại job;
không retry POST tự động. Chỉ xác nhận completed sau khi dữ liệu parse thực sự có.
Không suy luận job biến mất ở upstream là thành công; nếu chưa xác định được trả unknown.
FE poll theo `poll_after_seconds` (ít nhất 5s), dừng ở completed/failed, dừng chờ sau 2 phút và cho phép kiểm tra lại.
GET match chưa parse vẫn 200, các trường phân tích là null. Item slots cố định 6,
backpack 3; item ID 0 upstream đổi thành null. Anonymous account giữ null.
Trận không tồn tại phải 404, không fallback trận mẫu. Upstream lỗi không đổi thành 404.

## 4. Người 2 — Heroes, Search và constants

Tất cả public. `h` = hero ID, `r` = resource.

| Đợt | Method + path | Query | T |
| --- | --- | --- | --- |
| A | GET `/heroes` | P; `q` (1–80 ký tự sau trim), `primary_attr=str\|agi\|int\|all`, `role`, `sort=name\|id` (name), `order=asc\|desc` (asc) | Page<Hero> |
| A | GET `/heroes/{h}` | không | HeroDetail |
| A | GET `/heroes/stats` | P; `bracket=1..8` hoặc bỏ; `sort=win_rate\|picks` (picks), desc | Page<HeroStats> |
| A | GET `/heroes/{h}/matchups` | P; sort games desc | Page<HeroMatchup> |
| A | GET `/heroes/{h}/items` | không | ItemPopularity |
| B | GET `/heroes/{h}/rankings` | P; score desc | Page<HeroRanking> |
| A | GET `/constants/items` | P; `q` 1–80; sort item_id asc theo số | Page<Item> |
| A | GET `/search` | `q` bắt buộc 2–80; `type=all\|player\|hero\|team\|match` (all); `limit` 1–20 (5), áp dụng riêng từng nhóm | SearchResults |

Mount `/heroes/stats` trước `/heroes/{h}`. `primary_attr=all` nghĩa Universal;
bỏ query nghĩa mọi thuộc tính. `role` dùng đúng giá trị trong Hero.roles, so khớp không phân biệt hoa thường.
Hero không có trong catalog: 404. Hero có nhưng chưa có stats: không đưa vào danh sách stats;
không tạo dòng zero giả. `hero_id` trong stats vẫn tham chiếu catalog.

- Stats không bracket dùng thống kê professional; bracket 1–8 dùng bucket tương ứng upstream, không tự gom bucket thiếu.
- `wins/picks` cùng tập dữ liệu; `win_rate = wins/picks`. `pick_rate = picks/sample_matches` chỉ khi biết mẫu số trận của cùng tập; không dùng tổng picks của mọi hero làm mẫu số.
- Item popularity là số đếm trong trận professional, không phải tỷ lệ thắng hoặc build khuyến nghị.
- Search player lấy nguồn OpenDota; hero lấy catalog; team lấy service/cache Teams của người 3.
- Search số chỉ tạo `{match_id, verified:false}` khi chuỗi hợp lệ; chỉ GET match mới xác minh tồn tại.
- Search không offset; đây là gợi ý giới hạn, không cam kết tìm hết. Không trả player/hero/team giả khi không có kết quả.
- Nếu một nguồn search lỗi, toàn request trả lỗi chuẩn; không trả nhóm rỗng gây hiểu nhầm không có kết quả.
- Skill build tối ưu, tier list và biến động meta không được cam kết ở v1. Build theo trận dùng purchases/ability_upgrades từ người 1.
- Abilities/talents dùng constants đã xác minh cấu trúc; thiếu mapping trả null và khai báo unavailable_fields.

## 5. Người 3 — Pro Scene và tài khoản

Các endpoint `/pro/*` public.

| Đợt | Method + path | Query | T |
| --- | --- | --- | --- |
| A | GET `/pro/matches` | P; `league_id`, `team_id`; start_time desc | Page<MatchSummary> |
| A | GET `/pro/teams` | P; `q` 1–80; `sort=rating\|win_rate\|matches` (rating), desc | Page<Team> |
| A | GET `/pro/teams/{t}` | không | Team |
| A | GET `/pro/teams/{t}/matches` | P; start_time desc | Page<MatchSummary> |
| A | GET `/pro/teams/{t}/players` | P; account_id asc theo số | Page<ProPlayer> |
| A | GET `/pro/players` | P; `q` 1–80, `team_id`; account_id asc theo số | Page<ProPlayer> |
| A | GET `/pro/leagues` | P; `q` 1–80; league_id desc theo số | Page<League> |
| A | GET `/pro/leagues/{l}` | không | League |
| A | GET `/pro/leagues/{l}/matches` | P; start_time desc | Page<MatchSummary> |
| A | GET `/pro/leagues/{l}/teams` | P; team_id asc theo số | Page<Team> |
| B | GET `/pro/live` | P; live_id asc | Page<LiveMatch> hoặc 501 nếu chưa có nguồn ổn định |

League thiếu ngày/prize/status trả null; không suy lịch giải từ tên. Team win rate tính
`wins/(wins+losses)`, sort matches dùng wins+losses; thiếu dữ liệu sort xếp cuối.
Không suy game thắng thành tỷ số series Bo3/Bo5. Rankings đội dùng `/pro/teams?sort=rating`;
rankings người chơi theo hero dùng endpoint người 2. Không có bảng MMR toàn cầu trong v1.
Live polling FE ít nhất 30s khi màn hình foreground; không cam kết realtime hoặc lịch upcoming.

### Auth B — Steam OpenID + session

| Method + path | Input / auth | Kết quả |
| --- | --- | --- |
| POST `/auth/steam/start` | `{redirect_uri, platform:"web"\|"native"}`; public | Success<LoginStart> |
| GET `/auth/steam/callback` | Steam OpenID query; chỉ callback server kiểm chứng | 302 tới redirect đã lưu với `code` và `state` |
| POST `/auth/exchange` | `{code,state}`; public; code một lần | web: Success<Session> + cookie; native: Success<{session:Session,access_token:string}> |
| GET `/auth/session` | session bắt buộc | Success<Session> |
| POST `/auth/logout` | session bắt buộc; body `{}` | 204, thu hồi session |

Người 3 lưu state ngẫu nhiên, redirect allowlist và hạn start 10 phút. Kiểm chứng callback
với Steam, nonce/replay và state. Code callback opaque một lần, hết hạn 60s; không gửi token qua URL.
Session server-side opaque hết hạn 7 ngày, logout thu hồi ngay. Web dùng cookie HttpOnly,
Secure ở production, SameSite=Lax; native dùng Bearer access_token và lưu bằng secure storage.
Web mutation kiểm Origin theo allowlist, chỉ nhận JSON; CORS credentials chỉ origin được phép.
Không nhận account_id từ FE để quyết định chủ sở hữu. Không ghi token/code vào log.
Sai/hết hạn code/state trả 401; redirect không allowlist trả 400.
Đây là thiết kế nội bộ; cần kiểm thử luồng Steam/native riêng trước khi bật B.

### Dữ liệu cá nhân B — tất cả bắt buộc session

| Method + path | Query/body | T / status |
| --- | --- | --- |
| GET `/me/favorites` | P; `kind=hero\|player\|team` tùy chọn; created_at desc | Page<Favorite> |
| PUT `/me/favorites/{kind}/{entity_id}` | `{}`; validate kind và ID, không cần gọi nguồn để xác nhận entity | Favorite |
| DELETE `/me/favorites/{kind}/{entity_id}` | không | 204 kể cả chưa tồn tại |
| GET `/me/settings` | không | Settings |
| PATCH `/me/settings` | object có ít nhất một field trong Settings | Settings đầy đủ sau cập nhật |
| GET `/me/notifications` | P; `unread=true\|false` tùy chọn; created_at desc | Page<Notification> |
| PATCH `/me/notifications/{notification_id}` | `{read:true}` | Notification |
| POST `/me/notifications/read-all` | `{}` | ReadResult |

PUT favorite idempotent, unique `(user_id,kind,entity_id)`; giữ created_at cũ nếu đã tồn tại.
Settings mặc định `{theme:"dark",language:"en",in_app_notifications:true}`.
PATCH settings merge field, không reset field bỏ qua. Read-all chỉ tác động thông báo
đã tồn tại tại thời điểm bắt đầu request; updated là số chuyển từ unread sang read.
Notification của user khác trả 404. Chỉ server tạo notification từ sự kiện thật,
deduplicate bằng event key + user. Chưa có sự kiện trả danh sách rỗng.
Không có push token, lịch push hoặc WebSocket trong v1.

## 6. OpenDota client dùng chung — người 2 bàn giao trước

Giao diện nội bộ (không phải endpoint HTTP):

```ts
interface OpenDotaClient {
  get<T>(path: string, query: UpstreamQuery | undefined,
    options: UpstreamGetOptions<T>): Promise<UpstreamResult<T>>;
  post<T>(path: string, body: Record<string, unknown> | undefined,
    options: UpstreamPostOptions<T>): Promise<UpstreamResult<T>>;
}
```

Triển khai nền chung phần 2: [backend/README.md](../backend/README.md).
GET bổ sung option `validate` (parser runtime) và hàm `getWithMeta` để giữ
`fetched_at` của nguồn. Không truyền parser thì không cache; module vẫn sở hữu
schema upstream và mapping DTO. POST response do module tự validate.

- Base cố định `https://api.opendota.com/api`. Path chỉ tương đối; chặn URL tuyệt đối/host tùy ý.
- Client lo transport; module sở hữu schema Zod upstream và mapping DTO. Generic T không thay thế runtime validation.
- UpstreamError có `kind=not_found|rate_limited|timeout|unavailable|invalid_response`, `retry_after_seconds` nullable, `status` nullable. Core map sang lỗi HTTP ở mục 2.
- Timeout mỗi lần 8s; tổng request backend 20s. Retry GET tối đa 1 lần cho lỗi mạng/502/503/504, jitter 250–750ms nếu còn deadline. Không retry POST, 400/404/429.
- Deduplicate GET đang chạy theo path + query chuẩn hóa; cache chỉ dữ liệu validated thành công; không cache token, 429 hoặc lỗi 5xx.
- TTL: constants 24h, heroes/stats/matchups/items/rankings 1h, profile/teams/leagues 5 phút, matches/search 60s, live 30s, parse job không cache.
- Cache shared mặc định in-memory một instance khi demo; nếu scale nhiều process phải dùng quota/cache chung.
- Giới hạn upstream lấy từ env `OPENDOTA_REQUESTS_PER_MINUTE`, `OPENDOTA_REQUESTS_PER_DAY`, `OPENDOTA_CONCURRENCY`; mặc định bảo thủ 30/phút, 900/ngày, concurrency 2. Đây là ngân sách nội bộ, không phải công bố quota của OpenDota.
- Queue tối đa 50 request, quá giới hạn hoặc quá deadline trả 429/504; tôn trọng Retry-After upstream. Không ghi API key vào cache key/log/response.
- Không serve stale trong A: meta.stale luôn false; fetched_at giữ thời điểm fetch thực, không cập nhật khi cache hit. Nếu bổ sung stale sau này phải quy định tuổi tối đa.
- Core giới hạn local: public 60 request/phút/IP; parse 2 request/phút/user. Các mức này là cấu hình ứng dụng.

## 7. Nguồn dữ liệu và phạm vi xác minh

Tham khảo [OpenDota API chính thức](https://docs.opendota.com/) và
[dotaconstants](https://github.com/odota/dotaconstants).
Đã đối chiếu danh mục tài liệu; chưa smoke test upstream bằng request thật trong lần chốt này.
Đường dẫn backend là thiết kế riêng; không yêu cầu FE gọi trực tiếp các đường upstream.

| Nhóm backend | Nguồn upstream dự kiến |
| --- | --- |
| Players / matches | `/players/{account_id}`, các subresource wl/matches/recentMatches/heroes/peers/totals; `/matches/{match_id}` |
| Parse | POST `/request/{match_id}`, GET `/request/{jobId}`; người 1 xác minh lifecycle trước bật B |
| Hero catalog/detail | `/heroes`, `/heroStats`, constants có version/nguồn rõ ràng |
| Hero stats | `/heroStats`; chỉ số nào thiếu phải null |
| Hero matchup/items | `/heroes/{hero_id}/matchups`, `/heroes/{hero_id}/itemPopularity` |
| Hero rankings | `/rankings?hero_id=...` |
| Search player | `/search?q=...`; hero/team tìm trong catalog/cache |
| Pro | `/proMatches`, `/teams`, `/teams/{team_id}` và subresource, `/proPlayers`, `/leagues` và subresource |
| Live / rank history | `/live`, `/players/{account_id}/ratings` là ứng viên; xác minh coverage và mapping trước bật |
| Auth/personal | Steam OpenID và database ứng dụng; không lấy từ OpenDota |

Không cam kết tất cả filter nội bộ được upstream hỗ trợ trực tiếp. Chủ module phải
chứng minh query hoặc cách aggregate đầy đủ trước khi đánh dấu endpoint hoàn thành.

## 8. Tích hợp và tiêu chí nghiệm thu

1. Người 1 tạo core + health và map lỗi; người 2 tạo client + fixture test; người 3 export service tìm team và router Pro.
2. Mỗi người implement module của mình, import DTO từ shared, không sửa wire schema riêng.
3. FE thêm adapter API → view model. Mock dùng ID number, avatarHero, region/màu giả và nhiều field bắt buộc; không ép DTO thật thành kiểu mock bằng type assertion.
4. Dùng ID string trong query keys và navigation mới; nếu adapter phải đổi number thì kiểm Number.isSafeInteger. Dữ liệu thiếu phải có UI trạng thái thiếu dữ liệu.
5. Query keys chứa mọi filter/sort/page; mutation invalidates đúng nhóm; favorites local không upload tự động trước khi người dùng chọn đồng bộ.
6. Mỗi endpoint bàn giao ví dụ request/response và kiểm thử runtime: success, input sai, empty, missing/null, not found, upstream timeout/429. Endpoint session thêm 401 và truy cập chéo user.
7. Pagination kiểm tra không lặp/mất hàng trên snapshot ổn định; parse/auth/favorite kiểm tra replay/idempotency theo quy định.
8. Chạy typecheck, lint và test module; FE kiểm tra một luồng thật end-to-end cho mỗi nhóm. Không gọi dữ liệu mock là nghiệm thu API.

Ví dụ bàn giao đầu tiên cho bạn:

```http
GET /api/v1/heroes?primary_attr=agi&limit=20&offset=0
GET /api/v1/heroes/1
GET /api/v1/heroes/stats?bracket=7&limit=20
GET /api/v1/heroes/1/matchups
GET /api/v1/heroes/1/items
GET /api/v1/search?q=miracle&type=player&limit=5
```

Contract này chốt phạm vi và kiểu dữ liệu v1. Không cần ba người đợi toàn bộ backend
xong mới nối FE; có thể dùng fixture đúng DTO cho phần người khác chưa bàn giao,
nhưng fixture chỉ bật rõ ràng trong chế độ development.

## 9. Chốt bàn giao v1 — 27/10/2026

Phần này giải quyết các điểm giao nhau; khi khác mô tả tổng quát phía trên thì áp dụng phần này.
API v1 là đích triển khai, chưa phải danh sách endpoint đã chạy. Không tự đổi path, DTO,
enum hoặc envelope; thay đổi phải cập nhật tài liệu và DTO trong cùng PR, có cả ba người thống nhất.

### 9.1. Bàn giao nền trước khi triển khai module

| Người | Bàn giao đầu tiên | Người nhận |
| --- | --- | --- |
| 1 | Express app, router gốc, request ID, validate strict, success/error helpers, health, scripts và cấu hình backend | 2 và 3 |
| 2 | Một instance OpenDotaClient; UpstreamError; fixture transport test; catalog Heroes | 1 và 3 |
| 3 | TeamSearchService; ở đợt B thêm requireSession, DB migration và SessionStore/ParseJobStore | 2 nhận tìm team; 1 nhận middleware và kho parse |

Người 1 tạo backend/package.json, tsconfig, lockfile và .env.example; người 2/3 gửi nhu cầu
thư viện/config để người 1 ghép. Không tạo ba backend độc lập. Mỗi module export router
qua index.ts; dependency truyền vào qua factory createRouter(deps), không import app/bootstrap.
Thư mục shared nằm ngoài backend: người 1 cấu hình build bao gồm DTO dùng chung và xác nhận
import chạy được cả khi dev lẫn khi chạy JavaScript đã build.

### 9.2. Hợp đồng nội bộ bắt buộc

Các interface OpenDotaClient, UpstreamResult, TeamSearchService, SessionPrincipal và ParseJobStore
nằm cuối shared/api-contract.ts; chúng không phải JSON DTO gửi cho frontend.

- Mọi request upstream phải truyền validate(raw): T. Module dùng schema runtime của mình;
  client gọi validator trước khi cache. Validator throw được chuyển thành invalid_response/502.
- Client trả data + fetched_at, không trả raw token/header. Cache hit giữ fetched_at ban đầu.
  validate, TTL và cache_namespace là bắt buộc ở GET. Namespace phải đổi khi schema đổi;
  cache key gồm namespace + path + query chuẩn hóa. POST không cache/retry.
- deadline_ms là mốc tuyệt đối Date.now() + 20000 do core tạo một lần cho request;
  mọi call, queue và retry cùng chia sẻ deadline này. Mỗi lần fetch tối đa 8 giây.
- Request bị hủy không hủy GET dùng chung của người gọi khác; từng caller ngừng đợi riêng.
- TeamSearchService.search nhận q đã trim và limit 1–20, trả Team[] và fetched_at;
  tìm tên/tag không phân biệt hoa thường trên catalog teams đầy đủ đã cache, sort team_id tăng theo số.
  Chưa bàn giao service thì type=team/all trả 501; type=hero/player/match vẫn dùng riêng được.
- requireSession do người 3 tạo: xác minh cookie/Bearer và gắn SessionPrincipal;
  người 1 không tự giải mã token hay tin user_id do frontend gửi.
- ParseJobStore do người 3 triển khai transaction/unique để reserve theo match_id;
  người 1 sở hữu gọi parse, mapping trạng thái và kiểm quyền. Reserve trả job hiện hữu
  đồng thời thêm quyền cho người yêu cầu; mỗi người chỉ GET job đã được cấp quyền.
  Không trả job của người khác nếu chưa cấp quyền. Parse chưa có store thì trả 501.

### 9.3. Quy tắc còn thiếu cần thống nhất

- ID số canonical: regex ^[1-9][0-9]{0,19}$; riêng account_id giới hạn 1..4294967295.
  Không chấp nhận leading zero. ID opaque được kiểm tra riêng, không áp regex ID số.
- ID sort theo số dùng BigInt hoặc so độ dài rồi lexical, không Number; opaque sort lexical.
  Giá trị sort null luôn cuối ở cả asc/desc. Favorite tie-break kind rồi entity_id;
  notification tie-break notification_id; rank-history time trùng thì giữ một điểm đã chuẩn hóa.
- q: trim, kiểm độ dài Unicode code point; tìm hero/item/team bằng contains không phân biệt hoa thường.
  Search chỉ gọi nguồn của type được yêu cầu; các nhóm không được yêu cầu trả [] và match=null.
- /players/compare giữ thứ tự account_ids đầu vào; scope mặc định all_time.
  /heroes/stats bracket bỏ qua thì DTO bracket=null. Các field nullable luôn xuất hiện, không bỏ key.
- from/to được phép gửi riêng; chỉ kiểm from < to khi có cả hai. Các trường lọc số
  game_mode/lobby_type là số nguyên không âm; không diễn giải giá trị chưa biết thành mặc định.
- SearchResults là object gợi ý, ItemPopularity là object các giai đoạn; không bọc Page thêm.
- Route tĩnh phải được mount trước route tham số: compare, stats, live và read-all.
- Mọi endpoint đợt B chưa bật trả 501 FEATURE_UNAVAILABLE, kể cả GET; khi đã bật,
  endpoint bảo vệ phải trả 401 nếu thiếu session. Không dùng 404 hoặc mock để che tính năng thiếu.
- Response health dùng source=aggregate; thời điểm response là fetched_at. Một nguồn dùng
  fetched_at của nguồn; aggregate nhiều nguồn dùng thời điểm cũ nhất của dữ liệu cấu thành.
  unavailable_fields dùng JSON Pointer vào toàn response, gồm /data/items/0/... nếu cần.
- 429 luôn có Retry-After dạng số giây nguyên >=1; khi chưa biết upstream retry time dùng 60 giây.
- LoginStart có state để frontend giữ và so callback. Web exchange ràng buộc với cookie
  flow HttpOnly do start tạo; native dùng state frontend đã giữ. Không chỉ so hai giá trị từ URL.
- GET /me/notifications?unread=false chỉ trả đã đọc; bỏ unread trả cả hai.
- Purchase.time và LiveMatch.game_time có thể âm khi trước khi trận bắt đầu.
  Không áp quy tắc timestamp không âm cho hai duration tương đối này.

### 9.4. Phạm vi frontend v1

| Có giao diện nhưng ngoài cam kết dữ liệu thật v1 | Cách xử lý khi nối API |
| --- | --- |
| Bộ lọc lane/party/parsed trong lịch sử trận | Ẩn/disable khi dùng API v1; không gửi query không có trong contract |
| Tier list, biến động meta, build tối ưu | Ghi rõ chưa hỗ trợ; không biến số mẫu thành số thật |
| Live, rank history, parse | Chỉ bật sau khi endpoint B được xác minh |
| Favorites/thông báo mẫu đang lưu local | Không tự upload; chỉ đồng bộ khi người dùng chọn |
| Dark/light/system, vi/en | Chỉ bật lựa chọn khi frontend đã xử lý tương ứng |

### 9.5. Điều kiện đánh dấu hoàn thành và thứ tự ghép

1. Ghép core/health, client và Teams search trước; fixture chỉ bật trong development rõ ràng.
2. Ghép đợt A theo từng module, sau đó adapter frontend; chưa bật các tính năng B.
3. Mỗi người bàn giao request/response mẫu, env cần dùng, schema runtime và test
   success/empty/null/invalid/not-found/timeout/429; ghi rõ endpoint còn 501.
4. Chạy typecheck, lint, test backend/module; frontend chạy E2E với API thật cho mỗi nhóm.
5. Đợt B chỉ bật sau migration, session và kiểm thử quyền, idempotency/replay tương ứng.
6. Người 1 ghép cuối và cập nhật bảng tiến độ dựa trên kết quả chạy; việc chốt contract
   không được đánh dấu là đã triển khai backend hoặc đã kiểm thử upstream.
