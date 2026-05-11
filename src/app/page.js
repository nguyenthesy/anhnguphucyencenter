"use client";
import { useState } from "react";
import { login, register } from "@/lib/auth";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import DashboardApp from "@/components/DashboardApp";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password, name, "admin");
      } else {
        await login(email, password);
      }
    } catch (err) {
      console.error("Auth error:", err.code, err.message);
      const msg = err.code === "auth/invalid-credential"
        ? "Email hoặc mật khẩu không đúng"
        : err.code === "auth/email-already-in-use"
        ? "Email đã được sử dụng"
        : err.code === "auth/weak-password"
        ? "Mật khẩu phải có ít nhất 6 ký tự"
        : err.code === "auth/invalid-email"
        ? "Email không hợp lệ"
        : err.code === "auth/configuration-not-found"
        ? "Firebase chưa bật Email/Password Authentication. Vào Firebase Console → Authentication → Sign-in method → Bật Email/Password"
        : err.code === "auth/admin-restricted-operation"
        ? "Firebase chưa bật Email/Password Authentication"
        : `Lỗi: ${err.code || err.message}`;
      setError(msg);
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">P</div>
          <h1>Phúc Yên Center</h1>
          <p>Hệ thống Quản lý Anh Ngữ</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label">Họ và tên</label>
              <input
                type="text"
                className="form-input"
                placeholder="Nhập họ và tên"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="admin@edu-erp.vn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={loading}
          >
            {loading ? "Đang xử lý..." : isRegister ? "Tạo tài khoản Admin" : "Đăng nhập"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button
            className="btn btn-ghost"
            onClick={() => { setIsRegister(!isRegister); setError(""); }}
            style={{ fontSize: 13 }}
          >
            {isRegister ? "← Quay lại Đăng nhập" : "Tạo tài khoản Admin mới →"}
          </button>
        </div>
        <div className="login-footer" style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: "var(--text-light)" }}>
          <p>© 2026 Bản quyền thuộc bởi Nguyễn Thế Sỹ 1368</p>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="login-page">
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;
  return <DashboardApp />;
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
