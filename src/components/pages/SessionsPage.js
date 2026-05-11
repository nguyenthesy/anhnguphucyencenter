"use client";
import { useState, useEffect } from "react";
import { subscribe, createSession, updateSession, deleteSession } from "@/lib/firestore";
import { getToday, getDayOfWeek, formatDate } from "@/utils/formatters";
import { exportToExcel } from "@/utils/excel";

const emptySession = {
  classId: "", className: "", teacherName: "", room: "",
  date: getToday(), time: "", status: "upcoming", notes: "",
};

export default function SessionsPage({ globalSearch }) {
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filterDate, setFilterDate] = useState(getToday());
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySession);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    const u1 = subscribe("sessions", setSessions);
    const u2 = subscribe("classes", setClasses);
    const u3 = subscribe("teachers", setTeachers);
    return () => { u1(); u2(); u3(); };
  }, []);

  const searchTerm = (globalSearch || search).toLowerCase();
  const filtered = sessions
    .filter((s) => {
      const matchDate = !filterDate || s.date === filterDate;
      const matchSearch = !searchTerm ||
        (s.className || "").toLowerCase().includes(searchTerm) ||
        (s.teacherName || "").toLowerCase().includes(searchTerm);
      return matchDate && matchSearch;
    })
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openAdd = () => { setForm({ ...emptySession, date: filterDate }); setEditing(null); setShowModal(true); };
  const openEdit = (s) => { setForm({ ...emptySession, ...s }); setEditing(s.id); setShowModal(true); };

  const handleSave = async () => {
    if (!form.className?.trim() && !form.classId) return;
    try {
      if (form.classId) {
        const cls = classes.find((c) => c.id === form.classId);
        if (cls) {
          form.className = cls.name;
          form.teacherName = form.teacherName || cls.teacher;
          form.room = form.room || cls.room;
        }
      }
      if (editing) {
        await updateSession(editing, form);
        showToast("Cập nhật buổi học thành công!");
      } else {
        await createSession(form);
        showToast("Tạo buổi học thành công!");
      }
      setShowModal(false);
    } catch (err) {
      showToast("Lỗi: " + err.message, "error");
    }
  };

  const handleDelete = async (id) => {
    await deleteSession(id);
    showToast("Đã xóa buổi học!");
  };

  const handleExport = () => {
    const data = filtered.map((s) => ({
      className: s.className,
      teacherName: s.teacherName,
      room: s.room,
      date: s.date,
      time: s.time,
      status: s.status === "completed" ? "Đã dạy" : "Sắp tới",
      notes: s.notes,
    }));
    exportToExcel(data, `buoi_hoc_${filterDate}`, "Buổi học", [
      { key: "className", header: "Lớp", width: 20 },
      { key: "teacherName", header: "Giáo viên", width: 20 },
      { key: "room", header: "Phòng", width: 10 },
      { key: "date", header: "Ngày", width: 12 },
      { key: "time", header: "Giờ", width: 12 },
      { key: "status", header: "Trạng thái", width: 12 },
      { key: "notes", header: "Ghi chú", width: 20 },
    ]);
    showToast("Xuất Excel thành công!");
  };

  const goDay = (offset) => {
    const d = new Date(filterDate);
    d.setDate(d.getDate() + offset);
    setFilterDate(d.toISOString().split("T")[0]);
  };

  return (
    <div>
      <div className="toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="btn btn-sm btn-outline" onClick={() => goDay(-1)}>←</button>
          <input type="date" className="form-input" style={{ width: "auto" }} value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
          <button className="btn btn-sm btn-outline" onClick={() => goDay(1)}>→</button>
          <button className="btn btn-sm btn-ghost" onClick={() => setFilterDate(getToday())}>Hôm nay</button>
          <span style={{ fontSize: 13, color: "var(--text-secondary)", marginLeft: 8 }}>
            {getDayOfWeek(filterDate)} — {filtered.length} buổi
          </span>
        </div>
        <div className="btn-group">
          <div className="toolbar-search" style={{ maxWidth: 240 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input placeholder="Tìm lớp, GV..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-outline" onClick={handleExport}>📥 Xuất Excel</button>
          <button className="btn btn-primary" onClick={openAdd}>+ Thêm buổi học</button>
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>#</th><th>Giờ</th><th>Lớp</th><th>Giáo viên</th><th>Phòng</th><th>Trạng thái</th><th>Ghi chú</th><th style={{ textAlign: "right" }}>Thao tác</th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: 40, color: "var(--text-light)" }}>Không có buổi học ngày {formatDate(filterDate)}</td></tr>
                ) : (
                  filtered.map((s, idx) => (
                    <tr key={s.id}>
                      <td style={{ color: "var(--text-light)" }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600, color: "var(--primary)" }}>{s.time || "—"}</td>
                      <td style={{ fontWeight: 600 }}>{s.className || "—"}</td>
                      <td>{s.teacherName || "—"}</td>
                      <td>{s.room || "—"}</td>
                      <td>
                        <span className={`badge ${s.status === "completed" ? "badge-success" : "badge-info"}`}>
                          {s.status === "completed" ? "Đã dạy" : "Sắp tới"}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-secondary)", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.notes || ""}</td>
                      <td style={{ textAlign: "right" }}>
                        <div className="btn-group" style={{ justifyContent: "flex-end" }}>
                          <button className="btn btn-sm btn-ghost" onClick={() => openEdit(s)}>✏️</button>
                          <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(s.id)} style={{ color: "var(--danger)" }}>🗑️</button>
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
              <h3 className="modal-title">{editing ? "Sửa buổi học" : "Thêm buổi học"}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Lớp *</label>
                {classes.length > 0 ? (
                  <select className="form-select" value={form.classId} onChange={(e) => {
                    const cls = classes.find((c) => c.id === e.target.value);
                    setForm({ ...form, classId: e.target.value, className: cls?.name || "", teacherName: cls?.teacher || form.teacherName, room: cls?.room || form.room, time: cls?.time || form.time });
                  }}>
                    <option value="">— Chọn lớp —</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                ) : (
                  <input className="form-input" value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} placeholder="Tên lớp" />
                )}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Ngày</label>
                  <input className="form-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Giờ</label>
                  <input className="form-input" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} placeholder="18:00 - 19:30" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Giáo viên</label>
                  <select className="form-select" value={form.teacherName} onChange={(e) => setForm({ ...form, teacherName: e.target.value })}>
                    <option value="">— Chọn giáo viên —</option>
                    {teachers.filter(t => t.status === "active").map(t => (
                      <option key={t.id} value={t.fullName}>{t.fullName}</option>
                    ))}
                    {form.teacherName && !teachers.some(t => t.fullName === form.teacherName) && (
                      <option value={form.teacherName}>{form.teacherName}</option>
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Phòng</label>
                  <input className="form-input" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Trạng thái</label>
                <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="upcoming">Sắp tới</option>
                  <option value="completed">Đã dạy</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Ghi chú</label>
                <textarea className="form-textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSave}>{editing ? "Cập nhật" : "Tạo buổi học"}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
