# OpenDota Mobile

Auth đã chuyển sang đăng ký/đăng nhập email + mật khẩu trong Settings, dùng được trên
Expo Go; không mở Steam hay dùng callback. Xem [AUTH.md](../docs/AUTH.md).
Tài khoản app độc lập với Dota account ID được chọn để xem dữ liệu công khai.

## Cập nhật tích hợp phần 2

Heroes, Hero detail, HeroRanks, Search và Builds đã dùng backend API phần 2.
Các mô tả dữ liệu mẫu bên dưới chỉ còn áp dụng cho phần chưa được tích hợp.
Xem [hướng dẫn chạy web/điện thoại, phạm vi và kiểm thử](../docs/PART2_FRONTEND.md).
Đặt `EXPO_PUBLIC_API_BASE_URL` trong `.env.local` nếu backend không ở localhost:3000.
Kiểm thử phần 2: `npm.cmd run test:part2`; [báo cáo và giới hạn kiểm chứng](../docs/PART2_TEST_REPORT.md).

Bản web dùng chế độ SPA (`web.output: single`), phù hợp app mobile và tránh lỗi SSR incremental của Metro trong môi trường hiện tại.

Frontend React Native + Expo SDK 58 + TypeScript, chuyển từ hai bản Figma Make/React web được cung cấp. Giao diện dùng component native, không nhúng website vào WebView.

## Chạy

```powershell
cd D:\Study\Project\OpenDotaClient\frontend
npm install
npx expo start --go
```

Nhấn `w` để mở bản web hoặc kết nối điện thoại qua Expo Go tương thích với SDK của project. Với điện thoại không hỗ trợ SDK 58, cần development build phù hợp; chưa kiểm thử trên thiết bị iOS/Android thật.

Nếu đang mở Metro từ trước khi đổi cấu trúc route, dừng phiên đó rồi chạy `npx expo start --go --clear`. Chỉ chạy một Metro cho checkout này để tránh hai tiến trình cùng ghi `.expo/types/router.d.ts`.

## Cấu trúc theo feature

`src/app` chứa route Expo Router. UI của mỗi route nằm trong `src/features`.

```text
src/
├── app/                 # Route và layout (5 tab chính + màn chi tiết)
├── core/                # Screen dispatcher/header và catalog TanStack Query
├── features/
│   ├── home/            # Dashboard
│   ├── matches/         # Lịch sử, bộ lọc và chi tiết trận
│   ├── heroes/          # Danh sách, chi tiết và thống kê hero
│   ├── builds/          # Item, skill build và dữ liệu trang bị
│   ├── players/         # Profile, player và so sánh người chơi
│   ├── pro-scene/       # Pro, live, rankings, team và league
│   ├── search/          # Tìm kiếm
│   ├── notifications/   # Thông báo
│   ├── favorites/       # Danh sách yêu thích
│   └── settings/        # Cài đặt
└── shared/
    ├── assets/          # Mapping ảnh hero đóng gói
    ├── navigation/      # Hàm điều hướng và kiểu Route
    ├── state/           # AppState/AsyncStorage dùng chung
    ├── theme/           # Màu sắc và styles dùng chung
    ├── types/           # Kiểu dữ liệu domain
    ├── ui/              # Button, Card, Sheet, biểu đồ, icon…
    └── utils/           # Format, URL ảnh, dữ liệu giả lập
```

Mỗi feature chỉ tạo thư mục cần dùng: `screens` (màn hình), `components` (UI riêng), `data` (dữ liệu mẫu), `logic` (xử lý). UI hiện dùng dữ liệu mẫu; lớp API chưa được sử dụng đã được dọn bỏ.

`src/app/(tabs)` là nhóm route đang hoạt động, quản lý năm màn chính và giữ trạng thái khi chuyển tab. Thanh tab mặc định được ẩn vì app hiển thị thanh điều hướng riêng trong `src/app/_layout.tsx`.

Ví dụ: route `src/app/match.tsx` → `src/core/Screen.tsx` → `src/features/matches/screens/MatchDetailScreen.tsx`. Sửa bộ lọc tại `features/matches/logic/matchFilters.ts`, sửa dòng trận tại `features/matches/components/MatchRow.tsx`.

Profile và Player dùng chung `features/players/screens/ProfileScreen.tsx`. Các component như `MatchRow`, `LiveCard`, `PlayerHeroList` thuộc feature sở hữu và được Home tái sử dụng. UI chung trong `shared` không import màn hình feature; `core` ghép các feature với route.

Ảnh hero nằm trong `assets/heroes`; kiểm thử luồng nằm trong `tests/mobile.spec.ts`.

## Các luồng đã chuyển

Home; lịch sử trận và bộ lọc result/date/hero/lane/party/parsed; hero grid/list và thống kê rank dạng tier/table; bốn tab Pro Scene; năm tab Profile; search; notifications; live preview; rankings; favorites; compare; chi tiết player/hero/match/team/league và builds. Favorites, lịch sử tìm và trạng thái thông báo được lưu bằng AsyncStorage. Refresh tải lại nguồn dữ liệu mẫu qua TanStack Query.

## Phạm vi dữ liệu

Đây vẫn là frontend mẫu như source gốc. Không có kết nối backend thật, Steam sign-in, replay parsing thật, push notification hoặc live feed. Nút Watch mở trang Dota Watch. Match ID bất kỳ hiển thị bản mẫu có nhãn, không xác nhận dữ liệu trận thật. 127 ảnh hero được đóng gói trong `assets/heroes` để giao diện chính không phụ thuộc tốc độ CDN. Ảnh item/ability/rank vẫn tải từ CDN.

Các ảnh người dùng gửi là tham chiếu bố cục; component được viết lại cho native nên không phải bản sao từng pixel của DOM/CSS. Màn Settings hiện cung cấp tài khoản mẫu, thư viện và dọn dữ liệu; các tùy chọn theme sáng/ngôn ngữ/notification scheduling của bản web chưa nối vào native. Giữ dark theme theo các ảnh đã cung cấp.

## Kiểm tra

```powershell
npm run typecheck
npm run lint
npm run test:e2e
npm run build:web
npx expo export --platform android --output-dir dist-native
```

E2E dùng Microsoft Edge headless, tự mở Metro ở cổng 8081 nếu chưa chạy. Các ảnh kiểm tra nằm trong `test-results/`, không đưa vào Git. Export Android kiểm tra đóng gói JavaScript/native dependencies; không tạo APK và không thay thế chạy thử trên điện thoại.
