"use client";
import { useState, useEffect, useMemo } from "react";
import { subscribe } from "@/lib/firestore";
import FinanceOverview from "./FinanceOverview";
import IncomeSection from "./IncomeSection";
import ExpenseSection from "./ExpenseSection";
import InvestmentSection from "./InvestmentSection";
import BankStatement from "./BankStatement";
import TuitionSection from "./TuitionSection";

const TABS = [
  { key: "overview", label: "📊 Tổng quan", icon: "📊" },
  { key: "income", label: "💰 Khoản thu", icon: "💰" },
  { key: "expense", label: "💸 Khoản chi", icon: "💸" },
  { key: "investment", label: "🏦 Vốn đầu tư", icon: "🏦" },
  { key: "statement", label: "📋 Sao kê", icon: "📋" },
  { key: "tuition", label: "🎓 Học phí", icon: "🎓" },
];

export default function FinanceManagementPage({ globalSearch }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [investments, setInvestments] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const unsubs = [
      subscribe("investments", setInvestments),
      subscribe("incomes", setIncomes),
      subscribe("expenses", setExpenses),
      subscribe("students", setStudents),
      subscribe("classes", setClasses),
      subscribe("payments", setPayments),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const financials = useMemo(() => {
    const totalInvestment = investments.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const totalIncome = incomes.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const totalExpense = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const netProfit = totalIncome - totalExpense;
    const currentBalance = totalInvestment + totalIncome - totalExpense;

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    const incomeThisMonth = incomes
      .filter((i) => { const d = new Date(i.date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; })
      .reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const incomeLastMonth = incomes
      .filter((i) => { const d = new Date(i.date); return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear; })
      .reduce((s, i) => s + (Number(i.amount) || 0), 0);

    const expenseThisMonth = expenses
      .filter((e) => { const d = new Date(e.date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; })
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const expenseLastMonth = expenses
      .filter((e) => { const d = new Date(e.date); return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear; })
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const incomeTrend = incomeLastMonth > 0
      ? (((incomeThisMonth - incomeLastMonth) / incomeLastMonth) * 100).toFixed(1)
      : incomeThisMonth > 0 ? 100 : 0;
    const expenseTrend = expenseLastMonth > 0
      ? (((expenseThisMonth - expenseLastMonth) / expenseLastMonth) * 100).toFixed(1)
      : expenseThisMonth > 0 ? 100 : 0;

    return {
      totalInvestment, totalIncome, totalExpense, netProfit, currentBalance,
      incomeThisMonth, incomeLastMonth, expenseThisMonth, expenseLastMonth,
      incomeTrend: Number(incomeTrend), expenseTrend: Number(expenseTrend),
    };
  }, [investments, incomes, expenses]);

  const renderTab = () => {
    switch (activeTab) {
      case "overview":
        return (
          <FinanceOverview
            financials={financials}
            incomes={incomes}
            expenses={expenses}
            investments={investments}
          />
        );
      case "income":
        return <IncomeSection incomes={incomes} globalSearch={globalSearch} showToast={showToast} />;
      case "expense":
        return <ExpenseSection expenses={expenses} globalSearch={globalSearch} showToast={showToast} />;
      case "investment":
        return <InvestmentSection investments={investments} globalSearch={globalSearch} showToast={showToast} />;
      case "statement":
        return (
          <BankStatement
            incomes={incomes}
            expenses={expenses}
            investments={investments}
            financials={financials}
            globalSearch={globalSearch}
          />
        );
      case "tuition":
        return (
          <TuitionSection
            students={students}
            classes={classes}
            payments={payments}
            globalSearch={globalSearch}
            showToast={showToast}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="finance-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tab-item ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {renderTab()}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
