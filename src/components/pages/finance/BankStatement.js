"use client";
import { useState, useMemo } from "react";
import { formatCurrency, formatDate, generateTransactionId } from "@/utils/formatters";
import { exportBankStatementPDF } from "@/utils/pdfExport";

const INCOME_CAT = { tuition: "Học phí", materials: "Giáo trình", other: "Thu khác" };
const EXPENSE_CAT = { rent: "Thuê MB", salary: "Lương", marketing: "Marketing", utilities: "Điện nước", materials: "Vật tư", other: "Chi khác" };
const PAGE_SIZE = 20;

export default function BankStatement({ incomes, expenses, investments, financials, globalSearch }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const searchTerm = (globalSearch || search).toLowerCase();

  const allTransactions = useMemo(() => {
    const txns = [];

    incomes.forEach((r) => {
      txns.push({
        id: r.id,
        date: r.date,
        type: "income",
        description: r.source || "Khoản thu",
        category: INCOME_CAT[r.category] || r.category || "Thu",
        amount: Number(r.amount) || 0,
        payer: r.payer || "",
        note: r.note || "",
      });
    });

    expenses.forEach((r) => {
      txns.push({
        id: r.id,
        date: r.date,
        type: "expense",
        description: r.title || "Khoản chi",
        category: EXPENSE_CAT[r.category] || r.category || "Chi",
        amount: Number(r.amount) || 0,
        recipient: r.recipient || "",
        note: r.note || "",
      });
    });

    // Sort oldest to newest for balance calculation
    txns.sort((a, b) => {
      if (a.date < b.date) return -1;
      if (a.date > b.date) return 1;
      return a.type === "income" ? -1 : 1;
    });

    // Calculate running balance
    const totalInvestment = investments.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    let balance = totalInvestment;

    txns.forEach((t, idx) => {
      if (t.type === "income") balance += t.amount;
      else balance -= t.amount;
      t.balance = balance;
      t.txnId = generateTransactionId(t.date, idx + 1);
    });

    return txns;
  }, [incomes, expenses, investments]);

  const filtered = useMemo(() => {
    let data = [...allTransactions];

    if (searchTerm) {
      data = data.filter((t) =>
        t.description.toLowerCase().includes(searchTerm) ||
        t.category.toLowerCase().includes(searchTerm) ||
        (t.payer || "").toLowerCase().includes(searchTerm) ||
        (t.recipient || "").toLowerCase().includes(searchTerm) ||
        t.txnId.toLowerCase().includes(searchTerm)
      );
    }
    if (filterType !== "all") data = data.filter((t) => t.type === filterType);
    if (filterCategory !== "all") data = data.filter((t) => t.category === filterCategory);
    if (dateFrom) data = data.filter((t) => t.date >= dateFrom);
    if (dateTo) data = data.filter((t) => t.date <= dateTo);

    // Display newest first
    data.reverse();
    return data;
  }, [allTransactions, searchTerm, filterType, filterCategory, dateFrom, dateTo]);

  const filteredTotalIncome = filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const filteredTotalExpense = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const allCategories = useMemo(() => {
    const cats = new Set();
    allTransactions.forEach((t) => cats.add(t.category));
    return [...cats].sort();
  }, [allTransactions]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleExportPDF = () => {
    exportBankStatementPDF({
      transactions: filtered,
      dateFrom,
      dateTo,
      totalIncome: filteredTotalIncome,
      totalExpense: filteredTotalExpense,
      currentBalance: financials.currentBalance,
    });
  };

  return (
    <div>
      {/* Summary Bar */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div className="card stat-card" style={{ borderLeft: "4px solid var(--success)" }}>
          <div className="stat-label">Tổng thu (đang lọc)</div>
          <div className="stat-value" style={{ color: "var(--success)", fontSize: 22 }}>{formatCurrency(filteredTotalIncome)}</div>
        </div>
        <div className="card stat-card" style={{ borderLeft: "4px solid var(--danger)" }}>
          <div className="stat-label">Tổng chi (đang lọc)</div>
          <div className="stat-value" style={{ color: "var(--danger)", fontSize: 22 }}>{formatCurrency(filteredTotalExpense)}</div>
        </div>
        <div className="card stat-card" style={{ borderLeft: "4px solid var(--primary)" }}>
          <div className="stat-label">Số dư hiện tại</div>
          <div className="stat-value" style={{ color: "var(--primary)", fontSize: 22 }}>{formatCurrency(financials.currentBalance)}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="btn-group" style={{ flexWrap: "wrap", gap: 8, flex: 1 }}>
          <div className="toolbar-search" style={{ minWidth: 0, flex: 1 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input placeholder="Tìm mã GD, nội dung..." value={globalSearch || search} onChange={(e) => setSearch(e.target.value)} readOnly={!!globalSearch} />
          </div>
          <select className="form-select" style={{ width: "auto" }} value={filterType} onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}>
            <option value="all">Tất cả loại</option>
            <option value="income">Khoản thu</option>
            <option value="expense">Khoản chi</option>
          </select>
          <select className="form-select" style={{ width: "auto" }} value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}>
            <option value="all">Tất cả danh mục</option>
            {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="form-input" type="date" style={{ width: "auto" }} value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }} title="Từ ngày" />
          <input className="form-input" type="date" style={{ width: "auto" }} value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }} title="Đến ngày" />
        </div>
        <button className="btn btn-primary finance-pdf-btn" onClick={handleExportPDF}>
          📄 Xuất PDF
        </button>
      </div>

      {/* Bank Statement Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📋 Nhật ký Sao kê Tài chính</h3>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{filtered.length} giao dịch</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="bank-statement-table">
              <thead>
                <tr>
                  <th className="hide-mobile">Mã GD</th>
                  <th>Ngày</th>
                  <th>Loại</th>
                  <th>Nội dung</th>
                  <th className="hide-mobile">Danh mục</th>
                  <th style={{ textAlign: "right" }}>Thu (+)</th>
                  <th style={{ textAlign: "right" }}>Chi (-)</th>
                  <th style={{ textAlign: "right" }}>Số dư</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: 40, color: "var(--text-light)" }}>Không có giao dịch</td></tr>
                ) : paginated.map((txn) => (
                  <tr key={txn.id} className={`bs-row-${txn.type}`}>
                    <td className="hide-mobile" style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-light)" }}>{txn.txnId}</td>
                    <td style={{ whiteSpace: "nowrap", fontWeight: 500 }}>{formatDate(txn.date)}</td>
                    <td>
                      <span className={`badge ${txn.type === "income" ? "badge-success" : "badge-danger"}`}>
                        {txn.type === "income" ? "THU" : "CHI"}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {txn.description}
                    </td>
                    <td className="hide-mobile">
                      <span className="badge badge-neutral">{txn.category}</span>
                    </td>
                    <td style={{ textAlign: "right", color: "var(--success)", fontWeight: 600 }}>
                      {txn.type === "income" ? "+" + formatCurrency(txn.amount) : ""}
                    </td>
                    <td style={{ textAlign: "right", color: "var(--danger)", fontWeight: 600 }}>
                      {txn.type === "expense" ? "-" + formatCurrency(txn.amount) : ""}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: txn.balance >= 0 ? "var(--text)" : "var(--danger)" }}>
                      {formatCurrency(txn.balance)}
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
    </div>
  );
}
