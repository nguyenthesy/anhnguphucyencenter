import "./globals.css";

export const metadata = {
  title: "Phúc Yên Center | Quản lý Trung tâm Tiếng Anh",
  description: "Hệ thống quản lý Trung tâm Anh Ngữ Phúc Yên Center - Học viên, Lớp học, Điểm danh, Tài chính",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
