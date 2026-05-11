"use client";
import { useState, useEffect } from "react";
import { subscribe, createClass, updateClass, deleteClass } from "@/lib/firestore";
import { formatCurrency } from "@/utils/formatters";

const DAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const emptyClass = {
  name: "", teacher: "", room: "", time: "", maxStudents: 20,
  scheduleDays: [], status: "active", notes: "", studentIds: [],
  feePerSession: 0, totalSessions: 0, totalCourseFee: 0,
};

export default function ClassesPage({ globalSearch }) {
  const [classes, setClasses] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyClass);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    const u1 = subscribe("classes", setClasses);
    const u2 = subscribe("teachers", setTeachers);
    return () => { u1(); u2(); };
  }, []);

  const searchTerm = (globalSearch || search).toLowerCase();
  const filtered = classes.filter((c) =>
    !searchTerm ||
    (c.name || "").toLowerCase().includes(searchTerm) ||
    (c.teacher || "").toLowerCase().includes(searchTerm) ||
    (c.room || "").toLowerCase().includes(searchTerm)
  );

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openAdd = () => { setForm(emptyClass); setEditing(null); setShowModal(true); };
  const openEdit = (c) => { setForm({ ...emptyClass, ...c }); setEditing(c.id); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      if (editing) {
        await updateClass(editing, form);
        showToast("Cập nhật lớp thành công!");
      } else {
        await createClass(form);
        showToast("Tạo lớp mới thành công!");
      }
      setShowModal(false);
    } catch (err) {
      showToast("Lỗi: " + err.message, "error");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteClass(id);
      setConfirmDelete(null);
      showToast("Đã xóa lớp học!");
    } catch (err) {
      showToast("Lỗi: " + err.message, "error");
    }
  };

  const toggleDay = (dayIdx) => {
    const days = form.scheduleDays || [];
    setForm({
      ...form,
      scheduleDays: days.includes(dayIdx) ? days.filter((d) => d !== dayIdx) : [...days, dayIdx].sort(),
    });
  };

  const formatDays = (days) => {
    if (!days || days.length === 0) return "—";
    return days.map((d) => DAYS[d]).join(", ");
  };

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input placeholder="Tìm lớp, giáo viên, phòng..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Tạo lớp mới
        </button>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tên lớp</th>
                  <th>Giáo viên</th>
                  <th>Giờ học</th>
                  <th>Lịch học</th>
                  <th>Học phí/buổi</th>
                  <th>Số buổi</th>
                  <th>Tổng học phí</th>
                  <th>Sĩ số</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={11} style={{ textAlign: "center", padding: 40, color: "var(--text-light)" }}>
                    {search ? "Không tìm thấy lớp học" : "Chưa có lớp học. Nhấn \"Tạo lớp mới\" để bắt đầu."}
                  </td></tr>
                ) : (
                  filtered.map((c, idx) => (
                    <tr key={c.id}>
                      <td style={{ color: "var(--text-light)" }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>{c.teacher || "—"}</td>
                      <td>{c.time || "—"}</td>
                      <td>{formatDays(c.scheduleDays)}</td>
                      <td style={{ color: "var(--primary)", fontWeight: 600 }}>{c.feePerSession ? formatCurrency(c.feePerSession) : "—"}</td>
                      <td>{c.totalSessions || "—"}</td>
                      <td style={{ fontWeight: 600 }}>{c.totalCourseFee ? formatCurrency(c.totalCourseFee) : "—"}</td>
                      <td>{(c.studentIds?.length || 0)}/{c.maxStudents || 20}</td>
                      <td>
                        <span className={`badge ${c.status === "active" ? "badge-success" : "badge-neutral"}`}>
                          {c.status === "active" ? "Hoạt động" : "Đã đóng"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div className="btn-group" style={{ justifyContent: "flex-end" }}>
                          <button className="btn btn-sm btn-ghost" onClick={() => openEdit(c)}>✏️</button>
                          <button className="btn btn-sm btn-ghost" onClick={() => setConfirmDelete(c.id)} style={{ color: "var(--danger)" }}>🗑️</button>
                        </div>
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
              <h3 className="modal-title">{editing ? "Sửa lớp học" : "Tạo lớp mới"}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Tên lớp *</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="IELTS 6.0 - Lớp A" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Giáo viên mặc định *</label>
                  <select className="form-select" value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })}>
                    <option value="">— Chọn giáo viên —</option>
                    {teachers.filter(t => t.status === "active").map(t => (
                      <option key={t.id} value={t.fullName}>{t.fullName}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Phòng học</label>
                  <input className="form-input" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="P.201" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Giờ học</label>
                  <input className="form-input" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} placeholder="18:00 - 19:30" />
                </div>
                <div className="form-group">
                  <label className="form-label">Sĩ số tối đa</label>
                  <input className="form-input" type="number" value={form.maxStudents} onChange={(e) => setForm({ ...form, maxStudents: parseInt(e.target.value) || 20 })} />
                </div>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", margin: "8px 0 16px", paddingTop: 16 }}>
                <label className="form-label" style={{ color: "var(--primary)", fontSize: 14 }}>💰 Cấu hình học phí</label>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Học phí / buổi (VNĐ)</label>
                  <input className="form-input" type="number" value={form.feePerSession || ""} onChange={(e) => {
                    const fee = parseInt(e.target.value) || 0;
                    setForm({ ...form, feePerSession: fee, totalCourseFee: fee * (form.totalSessions || 0) });
                  }} placeholder="150000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Tổng số buổi</label>
                  <input className="form-input" type="number" value={form.totalSessions || ""} onChange={(e) => {
                    const sessions = parseInt(e.target.value) || 0;
                    setForm({ ...form, totalSessions: sessions, totalCourseFee: (form.feePerSession || 0) * sessions });
                  }} placeholder="24" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Tổng học phí khóa (tự tính)</label>
                <input className="form-input" type="number" value={form.totalCourseFee || ""} onChange={(e) => setForm({ ...form, totalCourseFee: parseInt(e.target.value) || 0 })} style={{ fontWeight: 700, color: "var(--primary)" }} />
                {form.totalCourseFee > 0 && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>= {formatCurrency(form.totalCourseFee)}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Lịch học (chọn ngày)</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {DAYS.map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`btn btn-sm ${(form.scheduleDays || []).includes(i) ? "btn-primary" : "btn-outline"}`}
                      onClick={() => toggleDay(i)}
                      style={{ minWidth: 44 }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Trạng thái</label>
                <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Đã đóng</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Ghi chú</label>
                <textarea className="form-textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSave}>{editing ? "Cập nhật" : "Tạo lớp"}</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 className="modal-title">Xác nhận xóa</h3>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}>✕</button>
            </div>
            <div className="modal-body"><p>Bạn có chắc chắn muốn xóa lớp học này?</p></div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setConfirmDelete(null)}>Hủy</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete)}>Xóa</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
