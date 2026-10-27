# Người 3 — nối frontend với backend

Ngày cập nhật: 27/10/2026. Dùng API contract v1 hiện có, không đổi DTO.

## Đã nối

| Màn hình | Nguồn dữ liệu / chức năng |
| --- | --- |
| Pro Scene | Matches, Teams, Players, Tournaments dùng `/pro/*`, có phân trang, tìm kiếm/sort được backend hỗ trợ |
| Team / League | Chi tiết, roster, teams tham gia và kết quả trận; giữ ID chuỗi trên wire |
| Rankings / Live | Teams rating và hero rankings; bỏ bảng MMR giả. Live 501 hiển thị chưa hỗ trợ |
| Home | Preview kết quả pro và tournaments từ API; không còn mock live scores trong preview |
| Settings / Account | Steam start/callback/exchange, kiểm tra session, sign out; đọc settings và cập nhật in-app notifications |
| Favorites | Theo session; favorite/remove ở chi tiết hero/player/team; dữ liệu local giữ riêng, nhập lên account bằng nút chủ động |
| Notifications | Yêu cầu session, đọc danh sách/phân trang, lọc unread/read, đánh dấu đã đọc/read-all, đi đến target; badge Home từ server |

Các phần Players/Matches của Người 1 vẫn dùng màn mẫu hiện có. Card kết quả Pro chưa mở chi tiết trận mẫu,
để tránh trình bày một trận mẫu như dữ liệu thật của trận đang chọn. Có thể mở team/league thật từ Pro Scene.
Màn player được giữ cho Người 1 tích hợp tiếp; favorite player theo account vẫn gọi API Người 3.

Theme/light và giao diện tiếng Việt chưa triển khai ở frontend; chỉ hiển thị preference đang lưu,
không bật lựa chọn giao diện chưa có hiệu lực. Hiện tại UI là dark/English.

## Chạy web để kiểm tra Steam

Backend:

```powershell
cd D:\Study\Project\OpenDotaClient\backend
# Nếu chưa có .env, copy từ .env.example.
npm run db:migrate
npm run dev
```

`.env` backend cần:

```dotenv
ENABLE_ACCOUNT_FEATURES=true
PUBLIC_BASE_URL=http://localhost:3000
WEB_ORIGINS=http://localhost:8081,http://127.0.0.1:8081
AUTH_WEB_REDIRECTS=http://localhost:8081/auth/callback
AUTH_NATIVE_REDIRECTS=opendota://auth/callback
```

Frontend:

```powershell
cd D:\Study\Project\OpenDotaClient\frontend
npm ci
npx expo start --web --clear
```

Frontend `.env`: `EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1`.
Mở **http://localhost:8081/settings**, chọn **Sign in with Steam** và tự xác thực trên Steam.
Nếu đổi host/IP/port, cập nhật cả allowlist, PUBLIC_BASE_URL, frontend API URL và redirect đúng host đang mở.
Web session dùng cookie HttpOnly, không ghi token vào localStorage/AsyncStorage.
State đăng nhập lưu sessionStorage trước khi điều hướng; callback so với giá trị đã lưu rồi mới exchange.
Callback xóa code/state khỏi URL trước khi exchange. Khi hosting bản SPA cần rewrite `/auth/callback` về index.html
và đặt Referrer-Policy: no-referrer cho trang callback.

## Android / iOS

Đã thêm `expo-secure-store` bằng `expo install` đúng SDK 58 và config plugin trong app.json.
Access token và pending flow dùng SecureStore; không dùng AsyncStorage để lưu token.
Native mở `WebBrowser.openAuthSessionAsync`, callback mặc định **opendota://auth/callback** theo scheme app.
Đổi callback bằng `EXPO_PUBLIC_AUTH_REDIRECT_URI`, đồng thời sửa AUTH_NATIVE_REDIRECTS backend.
Luồng native cần development build có scheme `opendota`; Expo Go không đăng ký custom scheme này.
Backend API URL trên điện thoại phải dùng IP LAN/HTTPS có thể truy cập, không dùng localhost của điện thoại.
Chưa kiểm chứng trên thiết bị thật; export Android chỉ kiểm tra bundle/module và không tạo APK.

## Cache và dữ liệu cá nhân

Query account có account_id trong key; khi login/logout hoặc session hết hạn sẽ hủy/xóa cache tài khoản.
Request `/auth/*` và `/me/*` gửi cookie web hoặc Bearer native; các query public không gửi credentials.
HTTP 204 được xử lý không parse JSON. Lỗi mạng, lỗi API, session thiếu/hết hạn và feature 501 có UI tương ứng.
Không lấy mock notification làm notification thật, không tự nhập favorites sample vào account.
Import local favorites là thao tác PUT idempotent do người dùng chọn; lỗi giữa chừng có thể thử lại.
Favorite player chưa có endpoint profile thật thì hiển thị ID; không giả tên người chơi.

## Kiểm thử

```powershell
npm run typecheck
npm run lint
npm run test:part3
npm run test:e2e -- --timeout 180000
npm run build:web
npx expo export --platform android --output-dir dist-native
```

`tests/part3.spec.mts` chạy browser qua router Express/SQLite thật trong memory, sử dụng upstream fixture
và **chỉ trong test** thay verifier Steam. Kiểm Pro tabs/pagination/details, callback/cookie session,
favorites persistence, preferences persistence, notifications/read-all, đổi account không lộ cache và callback sai state.
Không phải đăng nhập Steam thật. Backend runtime vẫn dùng xác minh Steam thật và không có auth bypass flag.

Phần chưa xác minh: tài khoản Steam thật, điện thoại thật và tích hợp Players/Matches Người 1.
Live, push notification, poller kết quả trận/favorite vẫn theo các giới hạn ghi trong PART3_API.md.
