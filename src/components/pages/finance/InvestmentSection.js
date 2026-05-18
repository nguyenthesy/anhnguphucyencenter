"use client";
import { useState, useMemo } from "react";
import { createInvestment, updateInvestment, deleteInvestment } from "@/lib/firestore";
import { formatCurrency, formatDate, getToday } from "@/utils/formatters";

const emptyForm = { investorName: "", amount: "", date: getToday(), note: "" };
const PAGE_SIZE = 15;

export default function InvestmentSection({ investments, globalSearch, showToast }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filterInvestor, setFilterInvestor] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [errors, setErrors] = useState({});

  const searchTerm = (globalSearch || search).toLowerCase();

  const investorNames = useMemo(() => {
    const names = [...new Set(investments.map((i) => i.investorName).filter(Boolean))];
    return names.sort();
  }, [investments]);

  const filtered = useMemo(() => {
    let data = [...investments];
    if (searchTerm) {
      data = data.filter((r) =>
        (r.investorName || "").toLowerCase().includes(searchTerm) ||
        (r.note || "").toLowerCase().includes(searchTerm)
      );
    }
    if (filterInvestor !== "all") data = data.filter((r) => r.investorName === filterInvestor);
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
  }, [investments, searchTerm, filterInvestor, dateFrom, dateTo, sortField, sortDir]);

  const totalFiltered = filtered.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const investorSummary = useMemo(() => {
    const map = {};
    investments.forEach((inv) => {
      const name = inv.investorName || "Không rõ";
      map[name] = (map[name] || 0) + (Number(inv.amount) || 0);
    });
    return Object.entries(map).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [investments]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  const validate = () => {
    const errs = {};
    if (!form.investorName.trim()) errs.investorName = "Tên nhà đầu tư không được để trống";
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
        await updateInvestment(editing, data);
        showToast("Cập nhật vốn đầu tư thành công!");
      } else {
        await createInvestment(data);
        showToast("Thêm vốn đầu tư thành công!");
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
      investorName: item.investorName || "",
      amount: item.amount || "",
      date: item.date || getToday(),
      note: item.note || "",
    });
    setEditing(item.id);
    setErrors({});
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Bạn có chắc muốn xóa khoản đầu tư này?")) return;
    try { await deleteInvestment(id); showToast("Đã xóa khoản đầu tư!"); }
    catch (err) { showToast("Lỗi: " + err.message, "error"); }
  };

  return (
    <div>
      {/* Investor Summary Cards */}
      <div className="finance-overview-grid" style={{ marginBottom: 20 }}>
        <div className="finance-stat-card">
          <div className="finance-stat-card-bg" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }} />
          <div className="finance-stat-card-content">
            <div className="finance-stat-icon">🏦</div>
            <div className="finance-stat-label">Tổng vốn đầu tư</div>
            <div className="finance-stat-value">{formatCurrency(totalFiltered)}</div>
          </div>
        </div>
        {investorSummary.slice(0, 4).map((inv) => (
          <div key={inv.name} className="finance-stat-card">
            <div className="finance-stat-card-bg" style={{ background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" }} />
            <div className="finance-stat-card-content">
              <div className="finance-stat-icon">👤</div>
              <div className="finance-stat-label">{inv.name}</div>
              <div className="finance-stat-value">{formatCurrency(inv.total)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="btn-group" style={{ flexWrap: "wrap", gap: 8, flex: 1 }}>
          <div className="toolbar-search" style={{ minWidth: 0, flex: 1 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input placeholder="Tìm nhà đầu tư..." value={globalSearch || search} onChange={(e) => setSearch(e.target.value)} readOnly={!!globalSearch} />
          </div>
          <select className="form-select" style={{ width: "auto" }} value={filterInvestor} onChange={(e) => { setFilterInvestor(e.target.value); setCurrentPage(1); }}>
            <option value="all">Tất cả NĐT</option>
            {investorNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <input className="form-input" type="date" style={{ width: "auto" }} value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }} title="Từ ngày" />
          <input className="form-input" type="date" style={{ width: "auto" }} value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }} title="Đến ngày" />
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setEditing(null); setErrors({}); setShowModal(true); }}>+ Thêm vốn đầu tư</button>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th className="hide-mobile">#</th>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("date")}>Ngày {sortField === "date" ? (sortDir === "asc" ? "▲" : "▼") : ""}</th>
                  <th>Nhà đầu tư</th>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("amount")}>Số tiền {sortField === "amount" ? (sortDir === "asc" ? "▲" : "▼") : ""}</th>
                  <th className="hide-mobile">Ghi chú</th>
                  <th style={{ textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--text-light)" }}>Không có dữ liệu vốn đầu tư</td></tr>
                ) : paginated.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="hide-mobile">{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{formatDate(item.date)}</td>
                    <td style={{ fontWeight: 600 }}>{item.investorName}</td>
                    <td style={{ color: "var(--primary)", fontWeight: 700 }}>{formatCurrency(item.amount)}</td>
                    <td className="hide-mobile" style={{ fontSize: 12 }}>{item.note || "—"}</td>
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
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editing ? "Sửa vốn đầu tư" : "Thêm vốn đầu tư"}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Tên nhà đầu tư *</label>
                <input className={`form-input ${errors.investorName ? "form-error" : ""}`} value={form.investorName} onChange={(e) => setForm({ ...form, investorName: e.target.value })} placeholder="VD: Nguyễn Văn A" />
                {errors.investorName && <div className="form-error-text">{errors.investorName}</div>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Số tiền (VNĐ) *</label>
                  <input className={`form-input ${errors.amount ? "form-error" : ""}`} type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  {errors.amount && <div className="form-error-text">{errors.amount}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Ngày đầu tư *</label>
                  <input className={`form-input ${errors.date ? "form-error" : ""}`} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  {errors.date && <div className="form-error-text">{errors.date}</div>}
                </div>
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
