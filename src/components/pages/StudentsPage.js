"use client";
import { useState, useEffect, useRef } from "react";
import { subscribe, createStudent, updateStudent, deleteStudent } from "@/lib/firestore";
import { exportToExcel, importFromExcel, studentColumns, mapImportedStudents } from "@/utils/excel";
import { getStatusLabel, getStatusColor, formatCurrency } from "@/utils/formatters";

const STATUSES = [
  { value: "active", label: "Đang học" },
  { value: "reserved", label: "Bảo lưu" },
  { value: "waiting", label: "Chờ lớp" },
  { value: "graduated", label: "Hoàn thành" },
  { value: "inactive", label: "Nghỉ học" },
];

const PAYMENT_STATUSES = [
  { value: "unpaid", label: "Chưa đóng", badge: "badge-danger" },
  { value: "partial", label: "Đóng 1 phần", badge: "badge-warning" },
  { value: "paid", label: "Đã đóng đủ", badge: "badge-success" },
];

const emptyStudent = {
  fullName: "", phone: "", parentPhone: "", email: "", dob: "",
  address: "", className: "", status: "active", notes: "",
  totalFee: 0, paidAmount: 0, paymentStatus: "unpaid",
};

export default function StudentsPage({ globalSearch }) {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyStudent);
  const [toast, setToast] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    const u1 = subscribe("students", setStudents);
    const u2 = subscribe("classes", setClasses);
    return () => { u1(); u2(); };
  }, []);

  const searchTerm = (globalSearch || search).toLowerCase();
  const filtered = students.filter((s) => {
    const matchSearch =
      !searchTerm ||
      (s.fullName || "").toLowerCase().includes(searchTerm) ||
      (s.phone || "").includes(searchTerm) ||
      (s.parentPhone || "").includes(searchTerm) ||
      (s.email || "").toLowerCase().includes(searchTerm) ||
      (s.className || "").toLowerCase().includes(searchTerm);
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openAdd = () => {
    setForm(emptyStudent);
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (s) => {
    setForm({ ...emptyStudent, ...s });
    setEditing(s.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) return;
    try {
      if (editing) {
        await updateStudent(editing, form);
        showToast("Cập nhật thành công!");
      } else {
        await createStudent(form);
        showToast("Thêm học viên thành công!");
      }
      setShowModal(false);
    } catch (err) {
      showToast("Lỗi: " + err.message, "error");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteStudent(id);
      setConfirmDelete(null);
      showToast("Đã xóa học viên!");
    } catch (err) {
      showToast("Lỗi: " + err.message, "error");
    }
  };

  const handleExport = () => {
    const data = filtered.map((s) => ({
      ...s,
      status: getStatusLabel(s.status),
    }));
    exportToExcel(data, "danh_sach_hoc_vien", "Học viên", studentColumns);
    showToast("Xuất Excel thành công!");
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const raw = await importFromExcel(file);
      const mapped = mapImportedStudents(raw);
      let count = 0;
      for (const s of mapped) {
        if (s.fullName) {
          await createStudent({
            ...emptyStudent,
            ...s,
            status: s.status || "active",
          });
          count++;
        }
      }
      showToast(`Nhập ${count} học viên thành công!`);
    } catch (err) {
      showToast("Lỗi nhập file: " + err.message, "error");
    }
    e.target.value = "";
  };

  const updateField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  return (
    <div>
      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            placeholder="Tìm theo tên, SĐT, email, lớp..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="btn-group">
          <select
            className="form-select"
            style={{ width: "auto", padding: "8px 12px", fontSize: 13 }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          <div className="file-input-wrapper">
            <button className="btn btn-outline">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Nhập Excel
            </button>
            <input type="file" accept=".xlsx,.xls" onChange={handleImport} ref={fileRef} />
          </div>

          <button className="btn btn-outline" onClick={handleExport}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Xuất Excel
          </button>

          <button className="btn btn-primary" onClick={openAdd}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Thêm học viên
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th className="hide-mobile">#</th>
                  <th>Họ và tên</th>
                  <th>SĐT</th>
                  <th>Lớp</th>
                  <th className="hide-mobile">Học phí</th>
                  <th className="hide-mobile">Đã đóng</th>
                  <th className="hide-mobile">Còn nợ</th>
                  <th className="hide-mobile">TT thanh toán</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: "center", padding: 40, color: "var(--text-light)" }}>
                    {searchTerm ? "Không tìm thấy học viên phù hợp" : "Chưa có học viên. Nhấn \"Thêm học viên\" để bắt đầu."}
                  </td></tr>
                ) : (
                  filtered.map((s, idx) => (
                    <tr key={s.id}>
                      <td className="hide-mobile" style={{ color: "var(--text-light)" }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{s.fullName}</td>
                      <td>{s.phone || "—"}</td>
                      <td>{s.className || "—"}</td>
                      <td className="hide-mobile">{s.totalFee ? formatCurrency(s.totalFee) : "—"}</td>
                      <td className="hide-mobile" style={{ color: "var(--success)" }}>{s.paidAmount ? formatCurrency(s.paidAmount) : "—"}</td>
                      <td className="hide-mobile" style={{ color: (s.totalFee || 0) - (s.paidAmount || 0) > 0 ? "var(--danger)" : "var(--success)", fontWeight: 600 }}>
                        {s.totalFee ? formatCurrency((s.totalFee || 0) - (s.paidAmount || 0)) : "—"}
                      </td>
                      <td className="hide-mobile">
                        {(() => {
                          const ps = s.paymentStatus || "unpaid";
                          const info = PAYMENT_STATUSES.find(p => p.value === ps) || PAYMENT_STATUSES[0];
                          return <span className={`badge ${info.badge}`}>{info.label}</span>;
                        })()}
                      </td>
                      <td>
                        <span className={`badge`} style={{
                          background: getStatusColor(s.status) + "1a",
                          color: getStatusColor(s.status),
                        }}>
                          {getStatusLabel(s.status)}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div className="btn-group" style={{ justifyContent: "flex-end" }}>
                          <button className="btn btn-sm btn-ghost" onClick={() => openEdit(s)} title="Sửa">✏️</button>
                          <button className="btn btn-sm btn-ghost" onClick={() => setConfirmDelete(s.id)} title="Xóa" style={{ color: "var(--danger)" }}>🗑️</button>
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

      <div style={{ marginTop: 12, fontSize: 13, color: "var(--text-secondary)" }}>
        Hiển thị {filtered.length} / {students.length} học viên
      </div>

      {/* Modal Add/Edit */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editing ? "Sửa học viên" : "Thêm học viên mới"}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Họ và tên *</label>
                <input className="form-input" value={form.fullName} onChange={(e) => updateField("fullName", e.target.value)} placeholder="Nguyễn Văn A" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Số điện thoại</label>
                  <input className="form-input" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="0901234567" />
                </div>
                <div className="form-group">
                  <label className="form-label">SĐT Phụ huynh</label>
                  <input className="form-input" value={form.parentPhone} onChange={(e) => updateField("parentPhone", e.target.value)} placeholder="0907654321" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="email@example.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Ngày sinh</label>
                  <input className="form-input" type="date" value={form.dob} onChange={(e) => updateField("dob", e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Lớp</label>
                  {classes.length > 0 ? (
                    <select className="form-select" value={form.className} onChange={(e) => {
                      const cls = classes.find(c => c.name === e.target.value);
                      updateField("className", e.target.value);
                      if (cls && cls.totalCourseFee) {
                        updateField("totalFee", cls.totalCourseFee);
                      }
                    }}>
                      <option value="">— Chọn lớp —</option>
                      {classes.map(c => <option key={c.id} value={c.name}>{c.name} {c.totalCourseFee ? `(${formatCurrency(c.totalCourseFee)})` : ""}</option>)}
                    </select>
                  ) : (
                    <input className="form-input" value={form.className} onChange={(e) => updateField("className", e.target.value)} placeholder="IELTS 6.0 - T3/5" />
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Trạng thái</label>
                  <select className="form-select" value={form.status} onChange={(e) => updateField("status", e.target.value)}>
                    {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", margin: "8px 0 16px", paddingTop: 16 }}>
                <label className="form-label" style={{ color: "var(--primary)", fontSize: 14 }}>💰 Học phí & Thanh toán</label>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tổng học phí khóa (VNĐ)</label>
                  <input className="form-input" type="number" value={form.totalFee || ""} onChange={(e) => {
                    const fee = parseInt(e.target.value) || 0;
                    const paid = form.paidAmount || 0;
                    updateField("totalFee", fee);
                    setTimeout(() => updateField("paymentStatus", paid >= fee && fee > 0 ? "paid" : paid > 0 ? "partial" : "unpaid"), 0);
                  }} placeholder="3600000" />
                  {form.totalFee > 0 && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>= {formatCurrency(form.totalFee)}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Số tiền đã đóng (VNĐ)</label>
                  <input className="form-input" type="number" value={form.paidAmount || ""} onChange={(e) => {
                    const paid = parseInt(e.target.value) || 0;
                    const total = form.totalFee || 0;
                    updateField("paidAmount", paid);
                    setTimeout(() => updateField("paymentStatus", paid >= total && total > 0 ? "paid" : paid > 0 ? "partial" : "unpaid"), 0);
                  }} placeholder="2000000" />
                  {form.paidAmount > 0 && <div style={{ fontSize: 12, color: "var(--success)", marginTop: 4 }}>= {formatCurrency(form.paidAmount)}</div>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Còn nợ</label>
                  <div style={{ padding: "10px 14px", background: "var(--bg-input)", borderRadius: 8, fontWeight: 700, color: (form.totalFee || 0) - (form.paidAmount || 0) > 0 ? "var(--danger)" : "var(--success)" }}>
                    {formatCurrency((form.totalFee || 0) - (form.paidAmount || 0))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Trạng thái thanh toán</label>
                  <select className="form-select" value={form.paymentStatus || "unpaid"} onChange={(e) => updateField("paymentStatus", e.target.value)}>
                    {PAYMENT_STATUSES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Địa chỉ</label>
                <input className="form-input" value={form.address} onChange={(e) => updateField("address", e.target.value)} placeholder="123 Nguyễn Huệ, Q1, TP.HCM" />
              </div>
              <div className="form-group">
                <label className="form-label">Ghi chú</label>
                <textarea className="form-textarea" value={form.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder="Ghi chú thêm..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSave}>{editing ? "Cập nhật" : "Thêm mới"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 className="modal-title">Xác nhận xóa</h3>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p>Bạn có chắc chắn muốn xóa học viên này? Hành động không thể hoàn tác.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setConfirmDelete(null)}>Hủy</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete)}>Xóa</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
