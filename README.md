# MUON NOI

Muon Noi is a decentralized-first social infrastructure built for permanence, privacy, and integrity.

Không trung tâm. Không thao túng thuật toán. Không theo dõi người dùng.

---

## 1. Tầm nhìn

Muon Noi không phải mạng xã hội giải trí.

Muon Noi là một lớp hạ tầng xã hội:

- Quyền sở hữu tiếng nói thuộc về người dùng
- Lịch sử không bị xóa, chỉ có thể ẩn
- Không quảng cáo hành vi
- Không thao túng feed
- Không thu thập dữ liệu không cần thiết

---

## 2. Kiến trúc hệ thống

Hiện tại:

Cloudflare Pages (UI)
→ Static SPA
→ Security headers nghiêm ngặt
→ No external CDN
→ No tracking
→ No analytics

Tương lai:

Cloudflare Workers (API)
Cloudflare D1 (database)
Rate limiting
Bot protection
Turnstile
Decentralized data roadmap

---

## 3. Cấu trúc Repository
muonnoi/
├── LICENSE
├── SECURITY.md
├── README.md
├── docs/
│   ├── anti-abuse.md
│   ├── architecture.md
│   └── roadmap.md
├── apps/
│   ├── web/
│   │   ├── index.html
│   │   ├── 404.html
│   │   ├── _headers
│   │   ├── _redirects
│   │   ├── assets/
│   │   ├── legal/
│   │   └── .well-known/
│   └── worker/ (future API layer)
---

## 4. Nguyên tắc kỹ thuật

Muon Noi tuân thủ các nguyên tắc:

- No inline script
- Strict CSP
- No third-party tracking
- No external JS libraries
- No CDN dependency
- Local-first UI shell
- Privacy-first architecture

---

## 5. Bảo mật

- Security headers nghiêm ngặt
- CSP khóa script/style/img/font
- No eval
- No unsafe-inline
- Anti abuse policy công khai
- security.txt theo chuẩn internet

Xem thêm:  
SECURITY.md  
docs/anti-abuse.md

---

## 6. Triết lý sản phẩm

Muon Noi không tối ưu dopamine.

- Không infinite scroll gây nghiện
- Không thuật toán thao túng
- Không “engagement bait”
- Không bán attention

Muon Noi ưu tiên:

- Tư duy dài hạn
- Lưu trữ lịch sử cá nhân
- Giao tiếp có chủ quyền
- Hệ sinh thái phân tán

---

## 7. Pháp lý

Các tài liệu công bố:

- Điều khoản sử dụng
- Chính sách quyền riêng tư
- Chính sách chống lạm dụng
- Chính sách bảo mật

Xem tại:  
/apps/web/legal/

---

## 8. Giấy phép

Dự án sử dụng MIT License trừ khi có thông báo khác.

Xem LICENSE.

---

## 9. Định hướng dài hạn

Muon Noi sẽ phát triển:

- Identity layer
- Permanent archive layer
- Trust verification layer
- Decentralized node layer
- Diaspora connection layer

Không phải một ứng dụng.
Mà là một lớp hạ tầng xã hội.

---

## 10. Trạng thái hiện tại

Giai đoạn:
UI shell hoàn chỉnh
Security locked
Legal public
Ready for API layer

---

## 11. Liên hệ

Website: https://muonnoi.org  
App: https://app.muonnoi.org  
Security: security@muonnoi.org  
Legal: legal@muonnoi.org  

---

Muon Noi  
No Center. No Control. Just People.
