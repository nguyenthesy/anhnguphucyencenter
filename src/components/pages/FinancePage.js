"use client";
import { useState, useEffect } from "react";
import { subscribe, createPayment, updateStudent } from "@/lib/firestore";
import { formatCurrency, formatDate, getToday } from "@/utils/formatters";

export default function FinancePage({ globalSearch }) {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterClass, setFilterClass] = useState("all");
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ studentId: "", amount: 0, date: getToday(), note: "" });

  useEffect(() => {
    const u1 = subscribe("students", setStudents);
    const u2 = subscribe("classes", setClasses);
    const u3 = subscribe("payments", setPayments);
    return () => { u1(); u2(); u3(); };
  }, []);

  const searchTerm = (globalSearch || search).toLowerCase();
  const filteredPayments = payments.filter(p => {
    const pDate = new Date(p.date);
    const m = pDate.getMonth() + 1;
    const y = pDate.getFullYear();
    const matchMonth = filterMonth === "all" || m === parseInt(filterMonth);
    const matchYear = y === parseInt(filterYear);
    const student = students.find(s => s.id === p.studentId);
    const matchClass = filterClass === "all" || (student && student.className === filterClass);
    const matchSearch = !searchTerm || (student && student.fullName.toLowerCase().includes(searchTerm));
    return matchMonth && matchYear && matchClass && matchSearch;
  });

  const monthRevenue = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  
  const totalRevenue = students.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
  const totalDebt = students.reduce((sum, s) => sum + ((s.totalFee || 0) - (s.paidAmount || 0)), 0);
  
  const filteredStudents = students.filter(s => {
    const matchSearch = !searchTerm || 
      s.fullName.toLowerCase().includes(searchTerm) ||
      (s.className || "").toLowerCase().includes(searchTerm);
    const matchClass = filterClass === "all" || s.className === filterClass;
    return matchSearch && matchClass;
  }).sort((a, b) => ((b.totalFee || 0) - (b.paidAmount || 0)) - ((a.totalFee || 0) - (a.paidAmount || 0)));

  const handleRecordPayment = async () => {
    if (!payForm.studentId || !payForm.amount) return;
    try {
      await createPayment(payForm);
      const student = students.find(s => s.id === payForm.studentId);
      if (student) {
        const newPaid = (student.paidAmount || 0) + parseInt(payForm.amount);
        const total = student.totalFee || 0;
        await updateStudent(student.id, {
          paidAmount: newPaid,
          paymentStatus: newPaid >= total && total > 0 ? "paid" : newPaid > 0 ? "partial" : "unpaid"
        });
      }
      setShowPayModal(false);
      setPayForm({ studentId: "", amount: 0, date: getToday(), note: "" });
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };

  return (
    <div>
      <div className="grid-3">
        <div className="card stat-card" style={{ borderLeft: "4px solid var(--success)" }}>
          <div className="stat-label">Doanh thu tháng {filterMonth === "all" ? "" : filterMonth}/{filterYear}</div>
          <div className="stat-value" style={{ color: "var(--success)" }}>{formatCurrency(monthRevenue)}</div>
          <div className="stat-desc">Tổng tiền thực tế đã thu trong kỳ này</div>
        </div>
        <div className="card stat-card" style={{ borderLeft: "4px solid var(--danger)" }}>
          <div className="stat-label">Tổng nợ học phí hiện tại</div>
          <div className="stat-value" style={{ color: "var(--danger)" }}>{formatCurrency(totalDebt)}</div>
          <div className="stat-desc">Số tiền học viên đang còn nợ</div>
        </div>
        <div className="card stat-card" style={{ borderLeft: "4px solid var(--primary)" }}>
          <div className="stat-label">Tổng đã thu (Lũy kế)</div>
          <div className="stat-value" style={{ color: "var(--primary)" }}>{formatCurrency(totalRevenue)}</div>
          <div className="stat-desc">Tổng doanh thu từ trước đến nay</div>
        </div>
      </div>

      <div className="toolbar" style={{ marginTop: 24 }}>
        <div className="btn-group" style={{ flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Bộ lọc:</span>
            <select className="form-select" style={{ width: 100 }} value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
              <option value="all">Tất cả tháng</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
              ))}
            </select>
            <select className="form-select" style={{ width: 100 }} value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>Năm {y}</option>)}
            </select>
            <select className="form-select" style={{ width: 150 }} value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
              <option value="all">Tất cả lớp</option>
              {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="toolbar-search" style={{ minWidth: 200 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input placeholder="Tìm học viên..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={() => setShowPayModal(true)}>+ Ghi nhận đóng phí</button>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🧾 Lịch sử thu tiền (Tháng {filterMonth}/{filterYear})</h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table className="table-sm">
                <thead>
                  <tr><th>Ngày</th><th>Học viên</th><th>Số tiền</th><th>Ghi chú</th></tr>
                </thead>
                <tbody>
                  {filteredPayments.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: "center", padding: 20 }}>Không có giao dịch</td></tr>
                  ) : (
                    filteredPayments.map(p => (
                      <tr key={p.id}>
                        <td>{formatDate(p.date)}</td>
                        <td style={{ fontWeight: 600 }}>{students.find(s => s.id === p.studentId)?.fullName || "—"}</td>
                        <td style={{ color: "var(--success)", fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
                        <td style={{ fontSize: 12 }}>{p.note}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">⚠️ Học viên chưa hoàn thành phí</h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table className="table-sm">
                <thead>
                  <tr><th>Học viên</th><th>Lớp</th><th>Còn nợ</th></tr>
                </thead>
                <tbody>
                  {filteredStudents.filter(s => (s.totalFee || 0) - (s.paidAmount || 0) > 0).length === 0 ? (
                    <tr><td colSpan={3} style={{ textAlign: "center", padding: 20 }}>Đã thu đủ 100%</td></tr>
                  ) : (
                    filteredStudents.filter(s => (s.totalFee || 0) - (s.paidAmount || 0) > 0).slice(0, 10).map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600 }}>{s.fullName}</td>
                        <td>{s.className}</td>
                        <td style={{ color: "var(--danger)", fontWeight: 600 }}>{formatCurrency((s.totalFee || 0) - (s.paidAmount || 0))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showPayModal && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h3 className="modal-title">Ghi nhận đóng phí</h3>
              <button className="modal-close" onClick={() => setShowPayModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Chọn học viên *</label>
                <select className="form-select" value={payForm.studentId} onChange={(e) => {
                  const s = students.find(st => st.id === e.target.value);
                  setPayForm({ ...payForm, studentId: e.target.value, amount: (s?.totalFee || 0) - (s?.paidAmount || 0) });
                }}>
                  <option value="">— Chọn học viên —</option>
                  {students.sort((a, b) => a.fullName.localeCompare(b.fullName)).map(s => (
                    <option key={s.id} value={s.id}>{s.fullName} ({s.className || "Không lớp"})</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Số tiền thu (VNĐ) *</label>
                  <input className="form-input" type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Ngày thu</label>
                  <input className="form-input" type="date" value={payForm.date} onChange={(e) => setPayForm({ ...payForm, date: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Ghi chú / Nội dung</label>
                <textarea className="form-textarea" placeholder="Vd: Đóng học phí tháng 5" value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowPayModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleRecordPayment}>Xác nhận thu tiền</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
