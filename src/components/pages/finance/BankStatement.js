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

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

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

  const handleCopyAsImage = async () => {
    const element = document.getElementById("report-preview-container");
    if (!element) return;

    setIsCopying(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          // Remove ALL stylesheets to avoid oklch() color parsing errors.
          // The preview container uses 100% inline styles with hex colors,
          // so external/internal CSS is not needed and causes crashes.
          const styles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
          styles.forEach((el) => el.remove());
        },
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob })
          ]);
          // alert("📋 Đã sao chép ảnh báo cáo tài chính vào bộ nhớ đệm thành công!\nBạn có thể dán (Ctrl+V) để gửi ngay qua Zalo, Messenger, Facebook, v.v.");
        } catch (err) {
          console.error("Clipboard write failed:", err);
          // Fallback: auto-download the image
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `BaoCaoTaiChinh_${dateFrom || "all"}_${dateTo || "all"}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          alert("⚠️ Trình duyệt chặn quyền ghi Clipboard.\nĐã tự động tải ảnh báo cáo tài chính (.png) về máy của bạn!");
        } finally {
          setIsCopying(false);
        }
      }, "image/png");
    } catch (err) {
      console.error(err);
      setIsCopying(false);
      alert("Đã xảy ra lỗi khi kết xuất ảnh báo cáo: " + err.message);
    }
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
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setIsPreviewOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            👁️ Xem & Copy ảnh
          </button>
          <button className="btn btn-primary finance-pdf-btn" onClick={handleExportPDF} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            📄 Xuất PDF
          </button>
        </div>
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

      {/* PDF PREVIEW & COPY IMAGE MODAL */}
      {isPreviewOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.6)",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          zIndex: 9999,
          padding: "20px",
          overflowY: "auto",
          backdropFilter: "blur(4px)"
        }} onClick={() => setIsPreviewOpen(false)}>
          <div style={{
            backgroundColor: "#f1f5f9",
            borderRadius: "12px",
            width: "860px",
            maxWidth: "100%",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            display: "flex",
            flexDirection: "column",
            animation: "modalFadeIn 0.2s ease-out"
          }} onClick={(e) => e.stopPropagation()}>

            {/* Modal Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 24px",
              borderBottom: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
              borderTopLeftRadius: "12px",
              borderTopRightRadius: "12px"
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>👁️ Xem trước & Sao chép ảnh báo cáo</h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Toàn bộ giao dịch sau khi lọc sẽ hiển thị bên dưới</span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleCopyAsImage}
                  disabled={isCopying}
                  style={{
                    backgroundColor: "var(--success, #10b981)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 16px",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "opacity 0.2s"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.opacity = "0.9"}
                  onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
                >
                  {isCopying ? "⏳ Đang tạo ảnh..." : "📋 Sao chép ảnh (Zalo/Messenger)"}
                </button>
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  style={{
                    backgroundColor: "#e2e8f0",
                    color: "#475569",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 16px",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer"
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>

            {/* Modal Body / Preview Canvas */}
            <div style={{
              padding: "24px",
              display: "flex",
              justifyContent: "center",
              backgroundColor: "#f8fafc",
              maxHeight: "70vh",
              overflowY: "auto"
            }}>
              {/* Actual A4 Page Layout for html2canvas */}
              <div id="report-preview-container" style={{
                width: "760px",
                backgroundColor: "#ffffff",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                padding: "36px",
                fontFamily: "Arial, Helvetica, sans-serif",
                color: "#1e293b",
                display: "flex",
                flexDirection: "column",
                boxSizing: "border-box"
              }}>
                {/* Header */}
                <div style={{
                  backgroundColor: "#0f172a",
                  color: "#ffffff",
                  padding: "20px",
                  borderRadius: "6px",
                  textAlign: "center",
                  marginBottom: "24px"
                }}>
                  <h2 style={{ margin: "0 0 6px 0", fontSize: "20px", fontWeight: 800, letterSpacing: "0.5px" }}>ANH NGỮ QUỐC TẾ PHÚC YÊN EDU</h2>
                  <p style={{ margin: "0 0 6px 0", fontSize: "12px", fontWeight: 600, color: "#94a3b8" }}>BÁO CÁO TÀI CHÍNH</p>
                  <div style={{ fontSize: "10px", color: "#cbd5e1" }}>
                    Từ ngày: {dateFrom ? formatDate(dateFrom) : "---"}  -  Đến ngày: {dateTo ? formatDate(dateTo) : "---"}
                  </div>
                  <div style={{ fontSize: "10px", color: "#cbd5e1", marginTop: "4px" }}>
                    Ngày xuất: {new Date().toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                  </div>
                </div>

                {/* Financial Summary */}
                <h4 style={{ margin: "0 0 8px 0", fontSize: "11px", fontWeight: 700, color: "#1e293b", textTransform: "uppercase" }}>TỔNG QUAN TÀI CHÍNH</h4>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "10px",
                  marginBottom: "24px"
                }}>
                  <div style={{
                    backgroundColor: "#f8fafc",
                    borderLeft: "4px solid #10b981",
                    borderRadius: "4px",
                    padding: "8px 12px",
                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)"
                  }}>
                    <span style={{ fontSize: "9px", color: "#64748b", fontWeight: 600 }}>Tổng thu</span>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#10b981", marginTop: "2px", whiteSpace: "nowrap" }}>{formatCurrency(filteredTotalIncome)}</div>
                  </div>
                  <div style={{
                    backgroundColor: "#f8fafc",
                    borderLeft: "4px solid #ef4444",
                    borderRadius: "4px",
                    padding: "8px 12px",
                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)"
                  }}>
                    <span style={{ fontSize: "9px", color: "#64748b", fontWeight: 600 }}>Tổng chi</span>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#ef4444", marginTop: "2px", whiteSpace: "nowrap" }}>{formatCurrency(filteredTotalExpense)}</div>
                  </div>
                  <div style={{
                    backgroundColor: "#f8fafc",
                    borderLeft: "4px solid #4f46e5",
                    borderRadius: "4px",
                    padding: "8px 12px",
                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)"
                  }}>
                    <span style={{ fontSize: "9px", color: "#64748b", fontWeight: 600 }}>Số dư hiện tại</span>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#4f46e5", marginTop: "2px", whiteSpace: "nowrap" }}>{formatCurrency(financials.currentBalance)}</div>
                  </div>
                </div>

                {/* Table Data */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                  <h4 style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: "#1e293b", textTransform: "uppercase" }}>CHI TIẾT GIAO DỊCH</h4>
                  <span style={{ fontSize: "9px", color: "#64748b", fontWeight: 500 }}>({filtered.length} giao dịch)</span>
                </div>
                <table style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "9px",
                  marginBottom: "28px"
                }}>
                  <thead>
                    <tr style={{ backgroundColor: "#0f172a", color: "#ffffff" }}>
                      <th style={{ padding: "6px 8px", border: "1px solid #cbd5e1", textAlign: "center", width: "30px" }}>#</th>
                      <th style={{ padding: "6px 8px", border: "1px solid #cbd5e1", textAlign: "center", width: "70px" }}>Ngày</th>
                      <th style={{ padding: "6px 8px", border: "1px solid #cbd5e1", textAlign: "center", width: "40px" }}>Loại</th>
                      <th style={{ padding: "6px 8px", border: "1px solid #cbd5e1", textAlign: "left" }}>Nội dung</th>
                      <th style={{ padding: "6px 8px", border: "1px solid #cbd5e1", textAlign: "right", width: "105px" }}>Thu (+)</th>
                      <th style={{ padding: "6px 8px", border: "1px solid #cbd5e1", textAlign: "right", width: "105px" }}>Chi (-)</th>
                      <th style={{ padding: "6px 8px", border: "1px solid #cbd5e1", textAlign: "right", width: "115px" }}>Số dư</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: "20px", fontStyle: "italic", textAlign: "center", color: "#64748b" }}>Không có giao dịch</td>
                      </tr>
                    ) : filtered.map((txn, idx) => (
                      <tr key={txn.id} style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                        <td style={{ padding: "5px 8px", border: "1px solid #e2e8f0", textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                        <td style={{ padding: "5px 8px", border: "1px solid #e2e8f0", textAlign: "center", fontWeight: 500, whiteSpace: "nowrap" }}>{formatDate(txn.date)}</td>
                        <td style={{ padding: "5px 8px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                          <span style={{
                            padding: "2px 4px",
                            borderRadius: "3px",
                            fontSize: "8px",
                            fontWeight: 700,
                            backgroundColor: txn.type === "income" ? "#d1fae5" : "#fee2e2",
                            color: txn.type === "income" ? "#065f46" : "#991b1b"
                          }}>
                            {txn.type === "income" ? "THU" : "CHI"}
                          </span>
                        </td>
                        <td style={{ padding: "5px 8px", border: "1px solid #e2e8f0", fontWeight: 600 }}>{txn.description}</td>
                        <td style={{ padding: "5px 8px", border: "1px solid #e2e8f0", textAlign: "right", color: "#10b981", fontWeight: 600, whiteSpace: "nowrap" }}>
                          {txn.type === "income" ? "+" + formatCurrency(txn.amount) : ""}
                        </td>
                        <td style={{ padding: "5px 8px", border: "1px solid #e2e8f0", textAlign: "right", color: "#ef4444", fontWeight: 600, whiteSpace: "nowrap" }}>
                          {txn.type === "expense" ? "-" + formatCurrency(txn.amount) : ""}
                        </td>
                        <td style={{ padding: "5px 8px", border: "1px solid #e2e8f0", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>
                          {formatCurrency(txn.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Signatures */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "auto",
                  paddingTop: "20px",
                  fontSize: "9px"
                }}>
                  <div style={{ textAlign: "center", width: "200px" }}>
                    <span style={{ fontWeight: 700 }}>Người lập</span>
                    <br />
                    <span style={{ fontSize: "8px", color: "#94a3b8", fontStyle: "italic" }}>(Ký, ghi rõ họ tên)</span>
                    <div style={{ height: "50px" }}></div>
                    <span style={{ fontWeight: 700, textTransform: "uppercase" }}>NGUYỄN THẾ SỸ</span>
                  </div>
                  <div style={{ textAlign: "center", width: "200px" }}>
                    <span style={{ fontWeight: 700 }}>Chủ hộ kinh doanh</span>
                    <br />
                    <span style={{ fontSize: "8px", color: "#94a3b8", fontStyle: "italic" }}>(Ký, ghi rõ họ tên)</span>
                    <div style={{ height: "50px" }}></div>
                    <span style={{ fontWeight: 700, textTransform: "uppercase" }}>TRẦN HÀ THI</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
