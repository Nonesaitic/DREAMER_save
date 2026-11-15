DREAMER - nghe nhạc local + tìm nhạc YouTube

TÍNH NĂNG
- Nhạc local: danh sách trong file.json (mp3 nằm ở thư mục mp3/, ảnh ở img/), đăng nhạc của bạn, playlist, mini-player.
- Tìm nhạc online: dùng YouTube Data API, phát bằng trình nhúng chính thức của YouTube (không tải hay tách tiếng).
- Giao diện kiểu app: hero "Continue" (bài nghe gần nhất), thanh tab dưới đáy, mini-player nổi, tông đen - xám - trắng, dùng chung cho điện thoại và máy tính.

CÀI ĐẶT TÌM NHẠC YOUTUBE
1. Tạo YouTube Data API v3 key trong Google Cloud Console.
2. Mở DREAMER, mở "Cài đặt DREAMER" dưới ô tìm kiếm, dán key, bấm "Lưu cài đặt".
3. Key lưu trong localStorage của trình duyệt. Nếu đưa web lên mạng, hãy giới hạn key theo tên miền (HTTP referrer).
4. Mỗi lượt tìm tốn 100 đơn vị quota; hạn mức mặc định 10.000 đơn vị mỗi ngày.

LƯU Ý
- Chưa có lyrics và chưa hỗ trợ Navidrome (bản README cũ có nhắc nhưng code không có).
- Chỉ dùng nhạc bạn sở hữu hoặc được phép phát.
- Tên file ảnh phải khớp chính xác với đường dẫn trong file.json và style.css (hiện dùng img/maxrez1.jpg).
