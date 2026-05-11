"use client";
import { useState, useEffect } from "react";
import { subscribe, createTeacher, updateTeacher, deleteTeacher } from "@/lib/firestore";
import { formatDate, getToday, getDayOfWeek } from "@/utils/formatters";

const emptyTeacher = { fullName: "", phone: "", email: "", subjects: "", status: "active", notes: "" };

export default function TeachersPage({ globalSearch }) {
  const [teachers, setTeachers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeTab, setActiveTab] = useState("list");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyTeacher);
  const [toast, setToast] = useState(null);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [selectedTeacherId, setSelectedTeacherId] = useState("all");
  const [selectedStatTeacher, setSelectedStatTeacher] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const u1 = subscribe("teachers", setTeachers);
    const u2 = subscribe("sessions", setSessions);
    return () => { u1(); u2(); };
  }, []);

  const searchTerm = (globalSearch || search).toLowerCase();
  const filteredTeachers = teachers.filter(t => 
    !searchTerm || 
    t.fullName.toLowerCase().includes(searchTerm) ||
    (t.email || "").toLowerCase().includes(searchTerm) ||
    (t.subjects || "").toLowerCase().includes(searchTerm)
  );

  const teacherSessions = sessions.filter(s => {
    const sDate = new Date(s.date);
    const m = sDate.getMonth() + 1;
    const y = sDate.getFullYear();
    const matchTime = (filterMonth === "all" || m === parseInt(filterMonth)) && y === parseInt(filterYear);
    const matchTeacher = selectedTeacherId === "all" || s.teacherName === teachers.find(t => t.id === selectedTeacherId)?.fullName;
    return matchTime && matchTeacher;
  }).sort((a, b) => b.date.localeCompare(a.date));

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) return;
    try {
      if (editing) {
        const oldTeacher = teachers.find(t => t.id === editing);
        await updateTeacher(editing, form, oldTeacher?.fullName);
        showToast("Cập nhật giáo viên thành công!");
      } else {
        await createTeacher(form);
        showToast("Thêm giáo viên thành công!");
      }
      setShowModal(false);
    } catch (err) {
      showToast("Lỗi: " + err.message, "error");
    }
  };

  return (
    <div>
      <div className="tabs" style={{ marginBottom: 24, borderBottom: "1px solid var(--border)" }}>
        <button className={`tab-item ${activeTab === "list" ? "active" : ""}`} onClick={() => setActiveTab("list")}>👨‍🏫 DS giáo viên</button>
        <button className={`tab-item ${activeTab === "schedule" ? "active" : ""}`} onClick={() => setActiveTab("schedule")}>📅 Lịch dạy</button>
        <button className={`tab-item ${activeTab === "stats" ? "active" : ""}`} onClick={() => setActiveTab("stats")}>📊 Thống kê</button>
      </div>

      {activeTab === "list" ? (
        <>
          <div className="toolbar">
            <div className="toolbar-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input 
                placeholder="Tìm giáo viên..." 
                disabled={!!globalSearch} 
                value={globalSearch || search} 
                onChange={(e) => setSearch(e.target.value)} 
                readOnly={!!globalSearch} 
              />
            </div>
            <button className="btn btn-primary" onClick={() => { setForm(emptyTeacher); setEditing(null); setShowModal(true); }}>+ Thêm giáo viên</button>
          </div>

          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr><th className="hide-mobile">#</th><th>Họ và tên</th><th>Số điện thoại</th><th className="hide-mobile">Email</th><th className="hide-mobile">Môn dạy</th><th>Trạng thái</th><th style={{ textAlign: "right" }}>Thao tác</th></tr>
                  </thead>
                  <tbody>
                    {filteredTeachers.map((t, i) => (
                      <tr key={t.id}>
                        <td className="hide-mobile">{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{t.fullName}</td>
                        <td>{t.phone || "—"}</td>
                        <td className="hide-mobile">{t.email || "—"}</td>
                        <td className="hide-mobile">{t.subjects || "—"}</td>
                        <td>
                          <span className={`badge ${t.status === "active" ? "badge-success" : "badge-neutral"}`}>
                            {t.status === "active" ? "Đang dạy" : "Nghỉ"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div className="btn-group" style={{ justifyContent: "flex-end" }}>
                            <button className="btn btn-sm btn-ghost" onClick={() => { setForm(t); setEditing(t.id); setShowModal(true); }}>✏️</button>
                            <button className="btn btn-sm btn-ghost" style={{ color: "var(--danger)" }} onClick={async () => { if(confirm("Xóa giáo viên?")) await deleteTeacher(t.id); }}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : activeTab === "schedule" ? (
        <>
          <div className="toolbar">
            <div className="btn-group" style={{ flexWrap: "wrap", gap: 8 }}>
              <select className="form-select" style={{ width: "auto", minWidth: 0 }} value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)}>
                <option value="all">Tất cả GV</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
              </select>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <select className="form-select" style={{ width: "auto", minWidth: 0 }} value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                  {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1}>Tháng {i+1}</option>)}
                </select>
                <select className="form-select" style={{ width: "auto", minWidth: 0 }} value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>Năm {y}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">📅 Chi tiết lịch dạy - Tháng {filterMonth}/{filterYear}</h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr><th>Ngày</th><th>Thứ</th><th>Giờ</th><th>Lớp</th><th>Phòng</th><th>Giáo viên</th><th>Trạng thái</th></tr>
                  </thead>
                  <tbody>
                    {teacherSessions.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: "center", padding: 40 }}>Không có lịch dạy trong tháng này</td></tr>
                    ) : (
                      teacherSessions.map((s, i) => (
                        <tr key={s.id}>
                          <td>{formatDate(s.date)}</td>
                          <td>{getDayOfWeek(s.date)}</td>
                          <td style={{ fontWeight: 600, color: "var(--primary)" }}>{s.time}</td>
                          <td style={{ fontWeight: 600 }}>{s.className}</td>
                          <td>{s.room}</td>
                          <td>{s.teacherName}</td>
                          <td>
                            <span className={`badge ${s.status === "completed" ? "badge-success" : "badge-info"}`}>
                              {s.status === "completed" ? "Đã dạy" : "Sắp tới"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="toolbar">
            <div className="btn-group" style={{ flexWrap: "wrap", gap: 8 }}>
              <select className="form-select" style={{ width: "auto", minWidth: 0 }} value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                <option value="all">Cả năm</option>
                {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1}>Tháng {i+1}</option>)}
              </select>
              <select className="form-select" style={{ width: "auto", minWidth: 0 }} value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>Năm {y}</option>)}
              </select>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">📊 Thống kê số buổi dạy - {filterMonth === "all" ? `Năm ${filterYear}` : `Tháng ${filterMonth}/${filterYear}`}</h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr><th>#</th><th>Giáo viên</th><th>Số buổi đã dạy</th><th>Số buổi sắp tới</th><th>Tổng cộng</th></tr>
                  </thead>
                  <tbody>
                    {teachers.map((t, idx) => {
                      const tSessions = sessions.filter(s => {
                        const sDate = new Date(s.date);
                        const m = sDate.getMonth() + 1;
                        const y = sDate.getFullYear();
                        const matchTime = (filterMonth === "all" || m === parseInt(filterMonth)) && y === parseInt(filterYear);
                        return matchTime && s.teacherName === t.fullName;
                      });
                      const done = tSessions.filter(s => s.status === "completed").length;
                      const upcoming = tSessions.filter(s => s.status === "upcoming").length;
                      
                      return (
                        <tr key={t.id} onClick={() => setSelectedStatTeacher({ teacher: t, sessions: tSessions })} style={{ cursor: "pointer" }}>
                          <td>{idx + 1}</td>
                          <td style={{ fontWeight: 600, color: "var(--primary)" }}>{t.fullName} 🔍</td>
                          <td style={{ color: "var(--success)", fontWeight: 600 }}>{done}</td>
                          <td style={{ color: "var(--info)" }}>{upcoming}</td>
                          <td style={{ fontWeight: 700 }}>{done + upcoming}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) }

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editing ? "Sửa giáo viên" : "Thêm giáo viên"}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Họ và tên *</label>
                <input className="form-input" value={form.fullName} onChange={(e) => setForm({...form, fullName: e.target.value})} placeholder="Nguyễn Thị A" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Số điện thoại</label>
                  <input className="form-input" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} placeholder="098..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Email (để nhận thông báo)</label>
                  <input className="form-input" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="gv@example.com" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Môn dạy / Chuyên môn</label>
                <input className="form-input" value={form.subjects} onChange={(e) => setForm({...form, subjects: e.target.value})} placeholder="IELTS, TOEIC..." />
              </div>
              <div className="form-group">
                <label className="form-label">Trạng thái</label>
                <select className="form-select" value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
                  <option value="active">Đang dạy</option>
                  <option value="inactive">Nghỉ</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSave}>Lưu lại</button>
            </div>
          </div>
        </div>
      )}

      {selectedStatTeacher && (
        <div className="modal-overlay" onClick={() => setSelectedStatTeacher(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3 className="modal-title">Chi tiết buổi dạy: {selectedStatTeacher.teacher.fullName}</h3>
              <button className="modal-close" onClick={() => setSelectedStatTeacher(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 16, fontSize: 14 }}>
                Thời gian: <strong>{filterMonth === "all" ? `Năm ${filterYear}` : `Tháng ${filterMonth}/${filterYear}`}</strong>
              </div>
              <div className="table-wrapper" style={{ maxHeight: 400, overflowY: "auto" }}>
                <table className="table-sm">
                  <thead>
                    <tr><th>Ngày</th><th>Thứ</th><th>Lớp</th><th>Giờ</th><th>Trạng thái</th></tr>
                  </thead>
                  <tbody>
                    {selectedStatTeacher.sessions.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: "center", padding: 20 }}>Chưa có dữ liệu buổi dạy</td></tr>
                    ) : (
                      selectedStatTeacher.sessions.map(s => (
                        <tr key={s.id}>
                          <td>{formatDate(s.date)}</td>
                          <td>{getDayOfWeek(s.date)}</td>
                          <td style={{ fontWeight: 600 }}>{s.className}</td>
                          <td>{s.time}</td>
                          <td>
                            <span className={`badge ${s.status === "completed" ? "badge-success" : "badge-info"}`}>
                              {s.status === "completed" ? "Đã dạy" : "Sắp tới"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setSelectedStatTeacher(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
