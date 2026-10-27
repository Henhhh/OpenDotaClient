# Người 1 — Players & Matches API

Cập nhật 27/10/2026. API đã được ghép vào `backend/src/app.ts`, dùng DTO trong
`shared/api-contract.ts`, OpenDota client của Người 2 và session/parse store của Người 3.
Frontend đã nối các API này; xem [PART1_FRONTEND.md](PART1_FRONTEND.md).

## Endpoint

Tất cả đường dẫn dưới đây có tiền tố `/api/v1`. Response/error envelope, metadata,
ID dạng chuỗi và tỷ lệ 0..1 tuân theo [API_CONTRACT.md](API_CONTRACT.md).

| Method / đường dẫn | Chức năng / query |
| --- | --- |
| GET `/players/:account_id` | Hồ sơ, huy hiệu rank, thông tin công khai có sẵn |
| GET `/players/:account_id/stats` | `scope=all_time` (mặc định) hoặc `recent` (tối đa 20 trận) |
| GET `/players/:account_id/matches` | `hero_id`, `result=win\|loss`, `game_mode`, `lobby_type`, `from`, `to`, `limit`, `offset` |
| GET `/players/:account_id/heroes` | `sort=games\|win_rate`, `limit`, `offset`; chỉ hero đã chơi |
| GET `/players/:account_id/peers` | Người chơi cùng, `limit`, `offset` |
| GET `/players/:account_id/rank-history` | Lịch sử rank nguồn thật, `limit`, `offset`; 501 nếu không có dữ liệu khả dụng |
| GET `/players/compare` | `account_ids=ID1,ID2`, `scope=all_time\|recent`; đúng hai ID khác nhau, giữ thứ tự đầu vào |
| GET `/matches/:match_id` | Chi tiết trận và phân tích nếu đã parse |
| POST `/matches/:match_id/parse` | Body `{}`, session hợp lệ, trả 202 và ParseJob |
| GET `/parse-jobs/:job_id` | Chỉ người có quyền với job được đọc; 404 cho người khác |

Phân trang: `limit` mặc định 20, từ 1 đến 100; `offset` mặc định 0, tối đa 10000.
Ngày là Unix seconds: `from` bao gồm, `to` không bao gồm; nếu có cả hai thì `from < to`.
Query/body không thuộc contract trả 400. Router `/players/compare` đặt trước route ID.

## Ngữ nghĩa dữ liệu

- Lịch sử trận tải toàn bộ kết quả khớp bộ lọc upstream, sau đó lọc ngày, sắp xếp
  thời gian giảm dần/ID số tăng dần và phân trang. Không lọc ngày trên một trang đã cắt.
  Giữ quy tắc `significant` mặc định của OpenDota. Tài khoản có lịch sử lớn có thể chạm
  timeout upstream; API trả lỗi chuẩn, không thay bằng dữ liệu mẫu.
  Bản ghi history có `hero_id=0` (nguồn chưa gán hero) được nhận diện rồi loại trước
  phân trang và recent stats; không thay bằng hero khác. Tổng trang chỉ tính các bản
  ghi có hero hợp lệ. ID âm/sai định dạng vẫn là lỗi upstream. Các tổng all-time từ
  `/wl` và `/totals` giữ phạm vi nguồn riêng, có thể bao gồm tập khác lịch sử này.
- Hồ sơ vắng mặt trả 404. Nếu upstream xác nhận lịch sử riêng tư (`fh_unavailable`
  hoặc `is_public=false`), các endpoint thống kê/lịch sử trả 403. Không suy đoán public
  khi nguồn thiếu cờ: `is_public=null`.
- Recent stats dùng tối đa 20 trận mới nhất; thiếu metric trong mẫu thì trung bình
  metric đó là null. Kết quả thắng/thua chưa biết không được tính thành thua.
- All-time stats ghép `/wl` và `/totals`: `sample_size` là số mẫu kills; chỉ tính
  trung bình metric có cùng số mẫu. `matches` dùng số mẫu duration nếu có, nếu không
  dùng wins + losses. Các nguồn có thể có độ phủ khác nhau; win rate dùng wins + losses.
  KDA tính `(avg_kills + avg_assists) / max(avg_deaths, 1)`.
- Peers dùng `with_games`/`with_win` để đếm chơi cùng đội. Danh sách phân trang trên
  snapshot upstream trả về; endpoint peers của OpenDota có giới hạn nguồn riêng.
- Rank history dùng huy hiệu `rank_tier`; MMR chỉ lấy giá trị solo MMR cũ nếu nguồn
  cung cấp trực tiếp. Không quy đổi huy hiệu thành MMR. Trùng timestamp được chọn
  nhất quán, không nội suy. Không có điểm khả dụng trả 501.
- Match chưa parse vẫn trả 200 với thống kê cơ bản; phân tích chưa có là null.
  Inventory luôn 6 slot, backpack 3 slot; slot trống null. Account 0/4294967295
  hoặc không có account được biểu diễn null. Purchase time âm trước trận được giữ.
  Item key không tra được trong constants làm purchase history null thay vì bỏ mất giao dịch.
- Dữ liệu upstream được kiểm schema trước cache. Metadata dùng thời điểm cũ nhất
  của các nguồn tham gia; trường không khả dụng được liệt kê theo helper core.

## Parse và session

Mặc định `ENABLE_MATCH_PARSE=false`: hai endpoint parse trả 501. Để bật cần cấu hình
account features/session đầy đủ theo [PART3_API.md](PART3_API.md), đồng thời đặt:

```dotenv
ENABLE_ACCOUNT_FEATURES=true
ENABLE_MATCH_PARSE=true
```

Khi bật, thiếu session trả 401. Không có chế độ đăng nhập giả trong API production.
Steam thật hiện tạm hoãn theo yêu cầu; `.env` local chưa được bật parse trong đợt này.

1. Kiểm tra trận bằng GET không cache trước khi reserve job. Store reserve nguyên tử,
   cấp quyền cho người yêu cầu và dùng lại job đang active của cùng trận.
2. Trận đã parse trả job completed ngay, không gửi POST upstream. Job mới gửi đúng
   một POST `/request/:match_id`; không tự retry POST.
3. Nếu timeout/mất phản hồi/ACK sai định dạng, giữ job `unknown` vì upstream có thể
   đã nhận. Yêu cầu lại dùng job này, không gửi trùng. Từ chối chắc chắn (ví dụ 429)
   chuyển failed; chỉ một yêu cầu mới chủ động mới tạo lần gửi tiếp theo.
4. GET job kiểm quyền trước khi gọi upstream, hạn chế poll 5 giây/job trong process.
   Việc xác minh match và đọc trạng thái upstream đều bỏ cache. Queue job biến mất
   hoặc báo completed chưa đủ bằng chứng: chỉ completed khi match có parsed version.
5. Trạng thái được lưu SQLite; upstream job ID không lộ ra DTO. Khi completed, người
   gọi nhận notification parse-ready có khóa chống trùng. Người cùng được cấp quyền
   nhận khi họ đọc job completed; chưa có worker nền phát notification cho mọi người.

Frontend cần tuân `poll_after_seconds`, dừng chờ chủ động sau 2 phút theo contract,
cho xem lại trạng thái unknown thay vì tự gửi lại POST. Backend không tự đánh dấu failed
chỉ vì quá thời gian chờ giao diện. Response parse có `Cache-Control: no-store`.

## File và kiểm thử

| File/folder | Vai trò |
| --- | --- |
| `backend/src/modules/players/` | Router, validation, profile/stats/history/heroes/peers/rank/compare |
| `backend/src/modules/matches/schemas.ts` | Schema dữ liệu trận từ OpenDota |
| `backend/src/modules/matches/service.ts` | Chi tiết trận, thiết bị, phân tích và kiểm parsed version |
| `backend/src/modules/matches/parse-service.ts` | Submit/poll, chống gửi trùng và chuyển trạng thái |
| `backend/src/modules/parse-jobs/` | API đọc job có session và kiểm quyền |
| `backend/tests/part1-api.test.ts` | 24 kiểm thử nghiệp vụ/HTTP bằng upstream fixture |
| `backend/scripts/smoke-part1.ts` | Smoke GET với OpenDota thật, DB memory và cổng tạm |

Chạy từ `D:\Study\Project\OpenDotaClient\backend`:

```powershell
npm.cmd run check
npm.cmd run build
npm.cmd run smoke:build
npm.cmd run smoke:part1
```

Kết quả mới nhất: toàn backend **98/98 tests qua**, typecheck/lint qua; build và smoke
server JavaScript/SQLite/health qua; frontend typecheck qua. Test bao gồm filter trước
phân trang, null/private/404, schema lỗi, upstream 429/timeout, inventory, parse đồng thời,
phân quyền, ACK không chắc chắn, polling và notification chống trùng.

Smoke nguồn thật trước đây gặp 502 ở history. Ngày 27/10, tái hiện được: trong 9.874
bản ghi có 2 hàng `hero_id=0` làm validator từ chối cả danh sách. Đã xử lý riêng trường
hợp này và thêm kiểm thử hồi quy. Chạy lại smoke nguồn thật qua profile, recent/all-time
stats, matches, heroes, peers và match detail/inventory; rank history trả 501 đúng khi
nguồn không có dữ liệu. Chưa gửi parse POST thật. Steam web login/refresh đã được người
dùng xác nhận riêng; Steam native chưa xác minh. Lệnh smoke chỉ GET, không tạo parse
job hoặc ghi DB persistent.

Nguồn tham chiếu: [OpenDota API](https://api.opendota.com/api),
[API implementation](https://github.com/odota/core/blob/master/svc/api/api.ts),
[queue implementation](https://github.com/odota/core/blob/master/svc/store/queue.ts).
