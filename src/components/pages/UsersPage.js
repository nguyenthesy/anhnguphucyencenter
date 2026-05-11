"use client";
import { useState, useEffect } from "react";
import { subscribe } from "@/lib/firestore";
import { register } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";

const ROLES = [
  { value: "admin", label: "Quản trị viên" },
  { value: "manager", label: "Quản lý" },
  { value: "teacher", label: "Giáo viên" },
  { value: "staff", label: "Nhân viên" },
];

export default function UsersPage() {
  const { userData } = useAuth();
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", displayName: "", role: "teacher" });
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsub = subscribe("users", setUsers);
    return () => unsub();
  }, []);

  const filtered = users.filter((u) =>
    !search ||
    (u.displayName || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreate = async () => {
    if (!form.email || !form.password || !form.displayName) {
      showToast("Vui lòng điền đầy đủ thông tin", "error");
      return;
    }
    try {
      await register(form.email, form.password, form.displayName, form.role);
      showToast("Tạo tài khoản thành công!");
      setShowModal(false);
      setForm({ email: "", password: "", displayName: "", role: "teacher" });
    } catch (err) {
      const msg = err.code === "auth/email-already-in-use"
        ? "Email đã được sử dụng"
        : err.code === "auth/weak-password"
        ? "Mật khẩu phải ít nhất 6 ký tự"
        : "Lỗi: " + err.message;
      showToast(msg, "error");
    }
  };

  if (userData?.role !== "admin") {
    return (
      <div className="card">
        <div className="card-body">
          <div className="empty-state">
            <p>🔒 Bạn không có quyền truy cập trang này</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input placeholder="Tìm tài khoản..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Tạo tài khoản
        </button>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>#</th><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Trạng thái</th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--text-light)" }}>Chưa có tài khoản</td></tr>
                ) : (
                  filtered.map((u, idx) => (
                    <tr key={u.id}>
                      <td style={{ color: "var(--text-light)" }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{u.displayName || "—"}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`badge ${u.role === "admin" ? "badge-danger" : u.role === "manager" ? "badge-warning" : u.role === "teacher" ? "badge-info" : "badge-neutral"}`}>
                          {ROLES.find((r) => r.value === u.role)?.label || u.role}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-success">{u.status === "active" ? "Hoạt động" : u.status || "Hoạt động"}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Tạo tài khoản mới</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Họ và tên *</label>
                <input className="form-input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Nguyễn Văn A" />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="user@edu-erp.vn" />
              </div>
              <div className="form-group">
                <label className="form-label">Mật khẩu *</label>
                <input className="form-input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Ít nhất 6 ký tự" />
              </div>
              <div className="form-group">
                <label className="form-label">Vai trò</label>
                <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleCreate}>Tạo tài khoản</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
