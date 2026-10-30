# my-love-fe

Bộ khung Angular 22 standalone, TypeScript strict và Tailwind CSS 4.
Trang demo Angular đã được thay bằng trang khởi đầu tối giản. Chưa tích hợp backend hoặc API.

## Yêu cầu

- Node.js tương thích Angular CLI: `^22.22.3`, `^24.15.0` hoặc `>=26.0.0`.
- npm theo `packageManager` trong `package.json` (hiện tại `11.19.1`).

## Chạy dự án

```bash
npm ci
npm start
```

Mở `http://localhost:4200/`. Mã nguồn thay đổi sẽ tự động được tải lại.

## Kiểm tra và build

```bash
npm run format:check
npm run typecheck
npm run test:ci
npm run build
```

Dùng `npm run format` để định dạng mã nguồn; `npm test` để chạy test ở chế độ watch.
Build production nằm trong `dist/my-love-fe/browser/`.
Dự án chưa cấu hình ESLint hoặc SonarQube; `format:check` chỉ kiểm tra định dạng.

## Cấu trúc

- `src/app/app.ts`, `app.html`, `app.css`: component gốc và giao diện khởi đầu.
- `src/app/app.routes.ts`: khai báo route khi thêm trang mới.
- `src/app/app.config.ts`: cấu hình provider cấp ứng dụng.
- `src/styles.css`: Tailwind CSS và style toàn cục.
- `public/`: tài nguyên tĩnh.

Thêm component bằng `npm run ng -- generate component ten-component`.
Giữ component standalone và đặt test cạnh mã nguồn tương ứng.
