"use client";
import { useState, useMemo } from "react";
import { createExpense, updateExpense, deleteExpense } from "@/lib/firestore";
import { formatCurrency, formatDate, getToday } from "@/utils/formatters";

const CATEGORIES = [
  { value: "rent", label: "Thuê mặt bằng" },
  { value: "salary", label: "Lương" },
  { value: "marketing", label: "Marketing" },
  { value: "utilities", label: "Điện nước" },
  { value: "materials", label: "Vật tư / Tài liệu" },
  { value: "other", label: "Khác" },
];
const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));
const emptyForm = { title: "", amount: "", date: getToday(), recipient: "", category: "other", receiptUrl: "", note: "" };
const PAGE_SIZE = 15;

export default function ExpenseSection({ expenses, globalSearch, showToast }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [errors, setErrors] = useState({});

  const searchTerm = (globalSearch || search).toLowerCase();

  const filtered = useMemo(() => {
    let data = [...expenses];
    if (searchTerm) {
      data = data.filter((r) =>
        (r.title || "").toLowerCase().includes(searchTerm) ||
        (r.recipient || "").toLowerCase().includes(searchTerm) ||
        (r.note || "").toLowerCase().includes(searchTerm)
      );
    }
    if (filterCategory !== "all") data = data.filter((r) => r.category === filterCategory);
    if (dateFrom) data = data.filter((r) => r.date >= dateFrom);
    if (dateTo) data = data.filter((r) => r.date <= dateTo);
    data.sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (sortField === "amount") { va = Number(va) || 0; vb = Number(vb) || 0; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return data;
  }, [expenses, searchTerm, filterCategory, dateFrom, dateTo, sortField, sortDir]);

  const totalFiltered = filtered.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = "Tiêu đề không được để trống";
    if (!form.amount || Number(form.amount) <= 0) errs.amount = "Số tiền phải lớn hơn 0";
    if (!form.date) errs.date = "Ngày không được để trống";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      const data = { ...form, amount: Number(form.amount) };
      if (editing) {
        await updateExpense(editing, data);
        showToast("Cập nhật khoản chi thành công!");
      } else {
        await createExpense(data);
        showToast("Thêm khoản chi thành công!");
      }
      setShowModal(false);
      setEditing(null);
      setForm(emptyForm);
      setErrors({});
    } catch (err) {
      showToast("Lỗi: " + err.message, "error");
    }
  };

  const handleEdit = (item) => {
    setForm({
      title: item.title || "", amount: item.amount || "", date: item.date || getToday(),
      recipient: item.recipient || "", category: item.category || "other",
      receiptUrl: item.receiptUrl || "", note: item.note || "",
    });
    setEditing(item.id);
    setErrors({});
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Bạn có chắc muốn xóa khoản chi này?")) return;
    try { await deleteExpense(id); showToast("Đã xóa khoản chi!"); }
    catch (err) { showToast("Lỗi: " + err.message, "error"); }
  };

  return (
    <div>
      <div className="card stat-card" style={{ borderLeft: "4px solid var(--danger)", marginBottom: 20 }}>
        <div className="stat-label">Tổng khoản chi (đang lọc)</div>
        <div className="stat-value" style={{ color: "var(--danger)" }}>{formatCurrency(totalFiltered)}</div>
        <div className="stat-desc">{filtered.length} giao dịch</div>
      </div>

      <div className="toolbar">
        <div className="btn-group" style={{ flexWrap: "wrap", gap: 8, flex: 1 }}>
          <div className="toolbar-search" style={{ minWidth: 0, flex: 1 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input placeholder="Tìm tiêu đề, người nhận..." value={globalSearch || search} onChange={(e) => setSearch(e.target.value)} readOnly={!!globalSearch} />
          </div>
          <select className="form-select" style={{ width: "auto" }} value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}>
            <option value="all">Tất cả danh mục</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <input className="form-input" type="date" style={{ width: "auto" }} value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }} title="Từ ngày" />
          <input className="form-input" type="date" style={{ width: "auto" }} value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }} title="Đến ngày" />
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setEditing(null); setErrors({}); setShowModal(true); }}>+ Thêm khoản chi</button>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th className="hide-mobile">#</th>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("date")}>Ngày {sortField === "date" ? (sortDir === "asc" ? "▲" : "▼") : ""}</th>
                  <th>Tiêu đề</th>
                  <th className="hide-mobile">Người nhận</th>
                  <th>Danh mục</th>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("amount")}>Số tiền {sortField === "amount" ? (sortDir === "asc" ? "▲" : "▼") : ""}</th>
                  <th className="hide-mobile">Chứng từ</th>
                  <th style={{ textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: 40, color: "var(--text-light)" }}>Không có dữ liệu khoản chi</td></tr>
                ) : paginated.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="hide-mobile">{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{formatDate(item.date)}</td>
                    <td style={{ fontWeight: 600 }}>{item.title}</td>
                    <td className="hide-mobile">{item.recipient || "—"}</td>
                    <td><span className="badge badge-danger">{CATEGORY_MAP[item.category] || item.category}</span></td>
                    <td style={{ color: "var(--danger)", fontWeight: 700 }}>-{formatCurrency(item.amount)}</td>
                    <td className="hide-mobile">
                      {item.receiptUrl ? <a href={item.receiptUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost">📎 Xem</a> : "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="btn-group" style={{ justifyContent: "flex-end" }}>
                        <button className="btn btn-sm btn-ghost" onClick={() => handleEdit(item)}>✏️</button>
                        <button className="btn btn-sm btn-ghost" style={{ color: "var(--danger)" }} onClick={() => handleDelete(item.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="finance-pagination">
          <button className="btn btn-sm btn-outline" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>← Trước</button>
          <span className="finance-pagination-info">Trang {currentPage} / {totalPages}</span>
          <button className="btn btn-sm btn-outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Sau →</button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editing ? "Sửa khoản chi" : "Thêm khoản chi"}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Tiêu đề *</label>
                <input className={`form-input ${errors.title ? "form-error" : ""}`} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="VD: Tiền thuê mặt bằng T6" />
                {errors.title && <div className="form-error-text">{errors.title}</div>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Số tiền (VNĐ) *</label>
                  <input className={`form-input ${errors.amount ? "form-error" : ""}`} type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  {errors.amount && <div className="form-error-text">{errors.amount}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Ngày chi *</label>
                  <input className={`form-input ${errors.date ? "form-error" : ""}`} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  {errors.date && <div className="form-error-text">{errors.date}</div>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Người nhận</label>
                  <input className="form-input" value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} placeholder="Tên người nhận" />
                </div>
                <div className="form-group">
                  <label className="form-label">Danh mục</label>
                  <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">URL chứng từ / hóa đơn</label>
                <input className="form-input" value={form.receiptUrl} onChange={(e) => setForm({ ...form, receiptUrl: e.target.value })} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label className="form-label">Ghi chú</label>
                <textarea className="form-textarea" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Nội dung ghi chú..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSave}>{editing ? "Cập nhật" : "Thêm mới"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
