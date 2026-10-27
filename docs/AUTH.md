# Form Auth — email và mật khẩu
Cập nhật 28/10/2026. Tài liệu này thay thế hướng dẫn Steam/OpenID/native callback cũ.
Steam login, verifier, callback route, flow storage và script check:steam đã bị gỡ.
SteamID trong dữ liệu OpenDota và CDN artwork vẫn là dữ liệu upstream, không phải Auth.

## Chạy và dùng
Backend: Node 24, npm run dev trong backend; ENABLE_ACCOUNT_FEATURES=true.
Frontend: npm start trong frontend, reload Expo Go. Mở Settings → Create an account,
nhập tên, email, mật khẩu (6–128 ký tự) và xác nhận; hoặc Sign in nếu đã đăng ký.
Không cần trình duyệt Steam, VPN tới Steam, tài khoản Expo hay development build cho Auth.
Điện thoại vẫn phải truy cập được backend; EXPO_PUBLIC_API_BASE_URL dùng IP LAN.
Production bắt buộc HTTPS; HTTP LAN chỉ phục vụ phát triển trên mạng tin cậy.

## Danh tính và dữ liệu
- AppUser gồm user_id UUID, email (nullable cho tài khoản cũ chưa chuyển), name,
  dota_account_id nullable. Không dùng Dota account ID làm user ID hoặc thông tin đăng nhập.
- Dota account là lựa chọn xem dữ liệu công khai, không xác minh sở hữu. Hai user có thể
  chọn cùng Dota account nhưng favorites/settings/notifications/parse grants vẫn tách theo user_id.
- AccountPicker hoạt động cho cả khách và người đăng nhập; lựa chọn của user được lưu
  ở backend. Nếu chưa chọn, app dùng lựa chọn công khai trên thiết bị.
- Không có mật khẩu Steam, không có đăng nhập bằng Dota ID và không tự gộp dữ liệu
  chỉ vì hai tài khoản chọn cùng Dota ID.

## API contract
Tiền tố /api/v1; query/body strict, response/error envelope dùng chung.
Email trim/lowercase, tối đa 254 ký tự. Tên 2–80 ký tự. Password không trim, 6–128 ký tự,
tối đa 512 byte UTF-8. Lỗi validation 400, credential sai 401 chung cho email không tồn tại
và password sai, email trùng 409, quá nhiều yêu cầu 429.

| Method / endpoint | Body / quyền | Response |
| --- | --- | --- |
| POST /auth/register | {email,password,name,platform:web hoặc native} | 200 Session web / NativeSession native |
| POST /auth/login | {email,password,platform:web hoặc native} | 200 Session web / NativeSession native |
| GET /auth/session | Cookie/Bearer | 200 Session |
| POST /auth/logout | {}, session | 204, thu hồi token |
| POST /auth/credentials | {email,password,name}, session cũ chưa có email | 200 Session; giữ nguyên user_id |
| PATCH /auth/profile | {dota_account_id: ID hoặc null}, session | 200 Session |

Web register/login bắt buộc Origin thuộc WEB_ORIGINS; web không trả access token trong JSON.
Cookie HttpOnly, SameSite=Lax, Secure ở production. Native register/login không nhận
Origin/cookie của browser; token opaque chỉ trả native, lưu SecureStore.
Session hết hạn 7 ngày, token chỉ lưu hash ở SQLite, logout thu hồi ngay.
Các mutation có session kiểm transport và Origin như trước; không chấp nhận cookie lẫn Bearer.
Login thành công thay session cũ của cùng request. Cache dữ liệu cá nhân dùng user_id,
được hủy/xóa khi login/logout hoặc session hết hạn; mật khẩu không được lưu local.

## Mật khẩu và giới hạn
Scrypt async N=32768/r=8/p=1, salt ngẫu nhiên 16 byte, output 64 byte; so sánh constant-time.
Tối đa 4 tác vụ hash đồng thời/process. Tối đa 15 thao tác auth/IP và email trong 15 phút,
có Retry-After; limiter memory có giới hạn số key, không log password/token/email.
Reset limiter khi restart process; triển khai nhiều instance cần kho limiter dùng chung.
Chưa có email verification, SMTP hoặc quên/đổi mật khẩu. Không hiển thị các chức năng
này như đã triển khai. Email là định danh đăng nhập app, không phải bằng chứng sở hữu mailbox.

## Migration và tài khoản cũ
003-password-auth.sql giữ nguyên user_id và mọi khóa ngoại:
- Đổi tên cột legacy account_id thành identity_key; thêm email/password_hash/display_name
  và dota_account_id. User mới có identity_key app:UUID; Dota ID không unique.
- Không sửa migration 001/002 đã áp dụng, không reset database.
- Xóa bảng flow/nonce OpenID tạm thời vì callback đã bị gỡ; giữ users, sessions,
  settings, favorites, notifications, parse_jobs và parse_job_users.
- User cũ còn session hợp lệ có form Set up email sign-in trong Settings. Đặt email/password
  trước khi đăng xuất để tiếp tục truy cập dữ liệu cũ. Chỉ session hiện tại được gắn credential,
  không có API nhận Dota ID để lấy quyền tài khoản cũ.
- Nếu session cũ đã mất/hết hạn, đăng ký mới tạo user riêng; dữ liệu cũ vẫn được giữ nhưng
  chưa có luồng tự khôi phục/chuyển dữ liệu. Không tự gán quyền theo Dota account ID.

Trước migration local đã tạo SQLite backup nhất quán trong backend/data
(opendota.sqlite.before-form-auth-*.backup), thư mục này được Git ignore.
Migration local đã kiểm tra giữ nguyên số hàng users/sessions/favorites/settings/
notifications/parse_jobs và foreign_key_check không có lỗi. Không commit database/backup.
Hai backend cũ trên cổng 3000 đã được dừng; backend mới đã khởi động lại trên cổng này.

## File và kiểm thử
- backend/src/modules/auth/{index,service,password,session}.ts: API, hash và session.
- backend/src/database/migrations/003-password-auth.sql; session-store.ts.
- shared/api-contract.ts: AppUser, Session, LoginRequest, RegisterRequest.
- frontend/src/features/auth/{AccountGate,SessionProvider}.tsx: form và session.
- frontend/src/shared/auth/storage*: SecureStore native / HttpOnly web.
- frontend/src/features/players/components/AccountPicker.tsx: Dota preference riêng.
- backend/tests/form-auth.test.ts: auth HTTP, CSRF, duplicate/concurrency, rollback,
  password hashing, rate limit, isolation, legacy upgrade và migration từ schema v2.
- frontend/tests/part3.spec.mts: form validation, register/login/logout, refresh,
  favorites/settings/notifications và account isolation.

Backend check: 101/101 tại mốc thay Auth; typecheck/lint qua. Kết quả E2E/export cuối
được cập nhật ở PART3_PROGRESS.md. Chưa coi form Auth trên Android thật là đã kiểm chứng
chỉ từ web E2E hoặc export; người dùng cần reload Expo Go và thử form mới.

Tham chiếu: [Node crypto scrypt](https://nodejs.org/docs/latest-v24.x/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback).
