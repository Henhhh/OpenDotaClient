# Checklist thiết bị thật — phần 2

Trạng thái hiện tại: **chưa thực hiện**. ADB không có trong PATH nhưng được tìm thấy
trong Android SDK chuẩn; `adb devices -l` đã chạy và danh sách thiết bị rỗng.
Chưa có Android/emulator kết nối để chạy app; chưa kiểm thử iOS. Browser viewport
và export Hermes không thay thế kiểm thử thiết bị.

Ghi model, OS, bản Expo Go/development build, commit/build, API base URL và ngày chạy
khi thực hiện. Cách kết nối LAN trong [PART2_FRONTEND.md](PART2_FRONTEND.md).

| Tình huống | Android | iOS |
| --- | --- | --- |
| App mở qua Expo Go/development build tương thích, font/ảnh và safe area đúng | ⬜ | ⬜ |
| Heroes grid/list không tràn, cuộn mượt, lọc/reset/load more đúng | ⬜ | ⬜ |
| Hero detail/abilities/talents, Statistics, Matchups và Players hoạt động | ⬜ | ⬜ |
| Rankings tắt trả thông báo, bật hiển thị và tải thêm | ⬜ | ⬜ |
| Builds hiển thị item/count thực, thiếu dữ liệu không crash | ⬜ | ⬜ |
| Search gõ nhanh/đổi category, bàn phím không che nội dung và chọn kết quả được | ⬜ | ⬜ |
| Pull-to-refresh tải lại API, favorite/history còn sau khi đóng/mở app | ⬜ | ⬜ |
| Tắt mạng rồi bật lại, thông báo lỗi và Retry khôi phục được | ⬜ | ⬜ |
| Backend timeout/429/501 hiển thị thông báo phù hợp, không fallback sample | ⬜ | ⬜ |
| Nút Back/gesture quay lại đúng màn; background/resume không mất thao tác | ⬜ | ⬜ |
| Chuyển Wi-Fi/mobile data xử lý lỗi kết nối LAN rõ ràng | ⬜ | ⬜ |

Chụp ảnh/video và ghi lỗi thực tế; chỉ tích ô sau khi chạy trên thiết bị tương ứng.
