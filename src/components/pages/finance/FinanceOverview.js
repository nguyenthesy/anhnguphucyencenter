"use client";
import { useMemo } from "react";
import { formatCurrency, formatCompactCurrency } from "@/utils/formatters";

const MONTHS_VI = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"];

export default function FinanceOverview({ financials, incomes, expenses, investments }) {
  const {
    totalInvestment, totalIncome, totalExpense, netProfit, currentBalance,
    incomeThisMonth, expenseThisMonth, incomeTrend, expenseTrend,
  } = financials;

  const monthlyData = useMemo(() => {
    const year = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, i) => {
      const mIncome = incomes
        .filter((r) => { const d = new Date(r.date); return d.getMonth() === i && d.getFullYear() === year; })
        .reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const mExpense = expenses
        .filter((r) => { const d = new Date(r.date); return d.getMonth() === i && d.getFullYear() === year; })
        .reduce((s, r) => s + (Number(r.amount) || 0), 0);
      return { month: MONTHS_VI[i], income: mIncome, expense: mExpense };
    });
  }, [incomes, expenses]);

  const maxValue = useMemo(() => {
    return Math.max(...monthlyData.map((d) => Math.max(d.income, d.expense)), 1);
  }, [monthlyData]);

  const topInvestors = useMemo(() => {
    const map = {};
    investments.forEach((inv) => {
      const name = inv.investorName || "Không rõ";
      map[name] = (map[name] || 0) + (Number(inv.amount) || 0);
    });
    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [investments]);

  const cards = [
    {
      label: "Tổng vốn đầu tư",
      value: totalInvestment,
      icon: "🏦",
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      trend: null,
    },
    {
      label: "Tổng doanh thu",
      value: totalIncome,
      icon: "💰",
      gradient: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
      trend: incomeTrend,
      trendLabel: "so với tháng trước",
    },
    {
      label: "Tổng chi phí",
      value: totalExpense,
      icon: "💸",
      gradient: "linear-gradient(135deg, #eb3349 0%, #f45c43 100%)",
      trend: expenseTrend,
      trendLabel: "so với tháng trước",
      trendInvert: true,
    },
    {
      label: "Lợi nhuận ròng",
      value: netProfit,
      icon: "📈",
      gradient: netProfit >= 0
        ? "linear-gradient(135deg, #0cebeb 0%, #20e3b2 50%, #29ffc6 100%)"
        : "linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%)",
      trend: null,
    },
    {
      label: "Số dư hiện tại",
      value: currentBalance,
      icon: "🏧",
      gradient: currentBalance >= 0
        ? "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
        : "linear-gradient(135deg, #f5af19 0%, #f12711 100%)",
      trend: null,
    },
  ];

  return (
    <div>
      {/* Overview Cards */}
      <div className="finance-overview-grid">
        {cards.map((card) => (
          <div key={card.label} className="finance-stat-card">
            <div className="finance-stat-card-bg" style={{ background: card.gradient }} />
            <div className="finance-stat-card-content">
              <div className="finance-stat-icon">{card.icon}</div>
              <div className="finance-stat-label">{card.label}</div>
              <div className="finance-stat-value">
                {formatCurrency(card.value)}
              </div>
              {card.trend !== null && card.trend !== undefined && (
                <div className={`finance-stat-trend ${
                  card.trendInvert
                    ? (card.trend > 0 ? "down" : "up")
                    : (card.trend >= 0 ? "up" : "down")
                }`}>
                  {card.trend >= 0 ? "▲" : "▼"} {Math.abs(card.trend)}% {card.trendLabel}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Monthly Chart + Top Investors */}
      <div className="grid-2" style={{ marginTop: 24 }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📊 Thu chi theo tháng — {new Date().getFullYear()}</h3>
          </div>
          <div className="card-body">
            <div className="finance-chart">
              {monthlyData.map((d, i) => (
                <div key={i} className="finance-chart-col">
                  <div className="finance-chart-bars">
                    <div
                      className="finance-chart-bar income"
                      style={{ height: `${(d.income / maxValue) * 100}%` }}
                      title={`Thu: ${formatCurrency(d.income)}`}
                    />
                    <div
                      className="finance-chart-bar expense"
                      style={{ height: `${(d.expense / maxValue) * 100}%` }}
                      title={`Chi: ${formatCurrency(d.expense)}`}
                    />
                  </div>
                  <div className="finance-chart-label">{d.month}</div>
                </div>
              ))}
            </div>
            <div className="finance-chart-legend">
              <span><span className="legend-dot income" /> Thu</span>
              <span><span className="legend-dot expense" /> Chi</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🏦 Top nhà đầu tư</h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {topInvestors.length === 0 ? (
              <div className="empty-state"><p>Chưa có dữ liệu đầu tư</p></div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr><th>#</th><th>Nhà đầu tư</th><th>Tổng vốn góp</th><th>Tỷ lệ</th></tr>
                  </thead>
                  <tbody>
                    {topInvestors.map((inv, idx) => (
                      <tr key={inv.name}>
                        <td>{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>{inv.name}</td>
                        <td style={{ color: "var(--primary)", fontWeight: 600 }}>{formatCurrency(inv.total)}</td>
                        <td>
                          <div className="finance-progress-bar">
                            <div
                              className="finance-progress-fill"
                              style={{ width: `${totalInvestment > 0 ? (inv.total / totalInvestment * 100) : 0}%` }}
                            />
                            <span>{totalInvestment > 0 ? ((inv.total / totalInvestment) * 100).toFixed(1) : 0}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid-3" style={{ marginTop: 24 }}>
        <div className="card">
          <div className="card-body" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💰</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>Thu tháng này</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--success)" }}>
              {formatCompactCurrency(incomeThisMonth)}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💸</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>Chi tháng này</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--danger)" }}>
              {formatCompactCurrency(expenseThisMonth)}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>Lãi/Lỗ tháng này</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: (incomeThisMonth - expenseThisMonth) >= 0 ? "var(--success)" : "var(--danger)" }}>
              {formatCompactCurrency(incomeThisMonth - expenseThisMonth)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
