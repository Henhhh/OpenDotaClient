# Người 3 — Backend API và chức năng

Triển khai theo [API_CONTRACT.md](API_CONTRACT.md), wire DTO giữ nguyên trong `shared/api-contract.ts`.

## Chạy backend tích hợp

```powershell
cd D:\Study\Project\OpenDotaClient\backend
npm ci
Copy-Item .env.example .env   # Chỉ làm nếu chưa có .env
npm run db:migrate
npm run dev
```

Server mặc định `http://127.0.0.1:3000/api/v1`; cho điện thoại trong LAN thì cấu hình HOST/IP và callback tương ứng.
`src/app.ts` export createApp, mount modules Người 2 + Người 3 với **một instance client**.
`src/server.ts` là entrypoint dùng chung; `part2-dev.ts` tiếp tục phục vụ kiểm thử cũ của Người 2.
Người 1 ghép Players/Matches vào createApp hoặc tái sử dụng các router factory trong server chính.

## API đã có

| Nhóm | Routes | Ghi chú |
| --- | --- | --- |
| Teams | GET `/pro/teams`, `/pro/teams/{id}`, `/pro/teams/{id}/players`, `/pro/teams/{id}/matches` | Filter/sort/pagination; lịch sử roster không bị gán thành đội hiện tại |
| Players | GET `/pro/players` | Tên, team_id; ID đội upstream=0 thành null; không suy fantasy_role thành lane |
| Leagues | GET `/pro/leagues`, `/pro/leagues/{id}`, `/pro/leagues/{id}/teams`, `/pro/leagues/{id}/matches` | Ngày, prize, status thiếu thì null |
| Matches | GET `/pro/matches` | Filter team/league; sort start_time desc; không gán game thắng thành tỷ số series |
| Live | GET `/pro/live` | 501 FEATURE_UNAVAILABLE theo phạm vi v1; chưa cam kết nguồn live ổn định |
| Steam auth | POST `/auth/steam/start`, GET `/auth/steam/callback`, POST `/auth/exchange` | Cần bật account features và cấu hình redirect |
| Session | GET `/auth/session`, POST `/auth/logout` | Phiên 7 ngày; cookie web/Bearer native; logout thu hồi ngay |
| Favorites | GET `/me/favorites`, PUT/DELETE `/me/favorites/{kind}/{id}` | Unique theo user/kind/id; PUT giữ created_at cũ |
| Settings | GET/PATCH `/me/settings` | Strict body, merge fields, không reset field bỏ qua |
| Notifications | GET `/me/notifications`, PATCH `/me/notifications/{id}`, POST `/me/notifications/read-all` | Unread=true/false; owner isolation; cutoff read-all trước JSON parser |

GET list dùng Page<T>, error/envelope/request ID theo contract. Unknown/repeated query hoặc JSON hỏng là 400.
`/pro/teams` và Search dùng chung namespace cache các trang teams để tránh tốn quota hai lần.
Catalog đầy đủ có thể cần nhiều trang; ngân sách/deadline không đủ thì trả 429/504, không trả một catalog thiếu.

`/pro/matches` không filter dùng **snapshot các trận gần nhất do /proMatches cung cấp**;
`total=null`, has_more tính trong snapshot đó, không phải endpoint duyệt toàn bộ lịch sử professional.
Team/league filter sử dụng snapshot endpoint team/league trước khi lọc và phân trang.
DTO bắt buộc game_mode/lobby_type; nếu upstream list thiếu, chỉ enrich các trận trên trang trả về qua `/matches/{id}`.
Enrichment chịu cùng quota/deadline; không giả giá trị game_mode/lobby_type để tránh gọi nguồn.

## Bật và kiểm chứng đăng nhập Steam

Trong `.env`:

```dotenv
ENABLE_ACCOUNT_FEATURES=true
PUBLIC_BASE_URL=http://localhost:3000
WEB_ORIGINS=http://localhost:8081,http://127.0.0.1:8081
AUTH_WEB_REDIRECTS=http://localhost:8081/auth/callback
AUTH_NATIVE_REDIRECTS=opendota://auth/callback
```

`PUBLIC_BASE_URL` chỉ origin của backend. Steam return_to được server tạo thành `/api/v1/auth/steam/callback?state=...`.
Redirect URI phải trùng hoàn toàn allowlist; không wildcard, query, fragment hoặc credentials.
Production phải HTTPS (`NODE_ENV=production`), cookie Secure + HttpOnly + SameSite=Lax.
OpenID không cần Steam Web API key; OpenDota key nếu dùng vẫn chỉ nằm backend.

1. FE POST start với `{redirect_uri, platform}` và giữ state nhận được trước khi mở authorization_url.
2. Web request gửi `credentials: include` và Origin hợp lệ; backend đặt cookie login flow HttpOnly 10 phút.
3. Steam callback được xác minh bằng POST check_authentication tới **endpoint Steam cố định**.
   Kiểm namespace, op_endpoint, signed fields, claimed_id/identity, return_to, nonce mới trong ±5 phút và nonce chưa dùng.
4. Callback tạo code một lần hạn 60 giây rồi redirect về URI đã lưu với code/state; URL không chứa session token.
5. FE so state với giá trị đã giữ. POST exchange: web phải có cookie flow + Origin đúng; native gửi code/state từ flow đã bắt đầu.
6. Web nhận Session JSON và cookie; native nhận Session + access_token. Native cần secure storage ở bước nối FE.
7. GET session và thử mutation me; POST logout `{}` rồi GET session phải 401.

Consume code, tạo user/session và thông báo đăng nhập nằm trong cùng transaction; rollback nếu bất kỳ bước DB nào lỗi.
User chỉ được tạo từ SteamID đã kiểm chứng; không có endpoint đăng nhập bằng account_id do FE chọn.
Session.user hiện có account_id đã xác minh, các thông tin hiển thị/rank còn null; FE có thể gọi profile của Người 1 để hiển thị thêm.
Không bật account features thì các route Auth/Me trả 501; khi bật mà thiếu session thì route bảo vệ trả 401.

**Chưa xác minh đăng nhập thật bằng tài khoản Steam trong trình duyệt/native.** Test auth tự động dùng verifier/Steam response giả lập có chủ đích;
runtime `server.ts` dùng verifier thật và không có flag bỏ qua xác minh. FE callback hiện chưa được triển khai trong lượt backend này.
Không đánh dấu Steam end-to-end hoặc mobile auth hoàn thành chỉ từ các test này.

### Chẩn đoán Steam verification unavailable

Nếu callback trả 502 UPSTREAM_ERROR / Steam verification unavailable, chạy `npm run check:steam` từ backend.
Đây là kiểm tra kết nối POST ẩn danh, không phải xác thực tài khoản. Có thể trình duyệt truy cập Steam được
nhưng process Node không có cùng đường mạng/VPN/proxy. Ngày 27/10, kiểm tra local đã thấy kết nối Steam timeout
cả trong và ngoài sandbox, trong khi OpenDota vẫn truy cập được; chưa hoàn thành xác minh Steam thật.
Thử mạng hoặc VPN toàn máy được phép sử dụng, rồi chạy lại check trước khi bắt đầu login mới từ Settings.
Không reload callback cũ: flow/nonce/code có hạn và có cơ chế chống phát lại.
Nếu có proxy tin cậy của bạn, Node 24 hỗ trợ HTTPS_PROXY + NODE_USE_ENV_PROXY=1;
đặt NO_PROXY=localhost,127.0.0.1 để giữ request local đi thẳng. Không ghi thông tin proxy có mật khẩu vào Git/log.
Tham khảo [Node.js proxy configuration](https://nodejs.org/learn/http/enterprise-network-configuration).

## Thông báo từ sự kiện

Đăng nhập thành công tạo system notification thực từ server, deduplicate theo session.
`foundation.me.notify(user_id,event_key,event)` là hàm nội bộ cho các module khác; không có POST public để tạo nội dung thông báo.
Tôn trọng in_app_notifications=false. Event key/user unique; không tự copy dữ liệu mẫu của frontend vào database.
Thông báo kết quả trận/favorite cần Người 1 hoặc tác vụ đồng bộ gọi producer từ sự kiện thật; chưa có poller tự động theo dõi mọi trận.
Read-all chỉ đọc đến row boundary chụp lúc request vào app, nên sự kiện mới đến khi body còn đang tải vẫn unread.
Khi ghép router Me vào host khác, host phải chụp `store.notificationBoundary()` trước body parser vào `res.locals.notification_boundary` cho read-all.

## Database và kiểm thử

Migration 002 thêm auth_flows/openid_nonces; migration 001 giữ checksum cũ.
Không xóa database/migration cũ để nâng cấp. Server dọn session/flow hết hạn mỗi phút; token, state và code được lưu dạng hash.
DB ignore khỏi Git; SQL cần copy theo module khi build. Core vẫn dùng các helper part2 hiện có và có thể được Người 1 chuẩn hóa sau.

```powershell
npm run check
npm run test:part3
npm run smoke:part3
```

Smoke gọi OpenDota thật, tiêu thụ quota (catalog teams hiện cần khoảng 23 request); không gọi Steam đăng nhập hoặc ghi dữ liệu tài khoản.
Test tự động kiểm schema, null/empty/not-found, timeout/429, CORS, idempotency, owner isolation, auth expiry/replay và rollback.

Nguồn đối chiếu: [OpenDota OpenAPI](https://api.opendota.com/api),
[Steam OpenID](https://steamcommunity.com/dev#community),
[OpenID 2.0 — verifying assertions](https://openid.net/specs/openid-authentication-2_0.html#verification).
