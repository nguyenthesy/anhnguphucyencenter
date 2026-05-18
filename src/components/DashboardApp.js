"use client";
import { useState } from "react";
import Sidebar from "./Sidebar";
import DashboardPage from "./pages/DashboardPage";
import StudentsPage from "./pages/StudentsPage";
import ClassesPage from "./pages/ClassesPage";
import SessionsPage from "./pages/SessionsPage";
import AttendancePage from "./pages/AttendancePage";
import UsersPage from "./pages/UsersPage";
import FinanceManagementPage from "./pages/finance/FinanceManagementPage";
import TeachersPage from "./pages/TeachersPage";

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const pageLabels = {
  dashboard: "Dashboard",
  students: "Quản lý Học viên",
  classes: "Quản lý Lớp học",
  sessions: "Buổi học",
  attendance: "Điểm danh",
  users: "Quản lý Tài khoản",
  finance: "Quản lý Tài chính",
  teachers: "Quản lý Giáo viên",
};

export default function DashboardApp() {
  const [activePage, setActivePage] = useState("dashboard");
  const [globalSearch, setGlobalSearch] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const handleNavigate = (page) => {
    setActivePage(page);
    closeSidebar();
  };

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <DashboardPage onNavigate={setActivePage} />;
      case "students":
        return <StudentsPage globalSearch={globalSearch} />;
      case "classes":
        return <ClassesPage globalSearch={globalSearch} />;
      case "sessions":
        return <SessionsPage globalSearch={globalSearch} />;
      case "attendance":
        return <AttendancePage globalSearch={globalSearch} />;
      case "users":
        return <UsersPage />;
      case "finance":
        return <FinanceManagementPage globalSearch={globalSearch} />;
      case "teachers":
        return <TeachersPage globalSearch={globalSearch} />;
      default:
        return <DashboardPage onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="app-layout">
      <div className={`sidebar-overlay ${isSidebarOpen ? "visible" : ""}`} onClick={closeSidebar} />
      <Sidebar activePage={activePage} onNavigate={handleNavigate} className={isSidebarOpen ? "mobile-open" : ""} />
      <main className="main-content">
        <header className="header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="mobile-menu-btn" onClick={toggleSidebar}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <h1 className="header-title">{pageLabels[activePage] || "Dashboard"}</h1>
          </div>
          <div className="header-search">
            <SearchIcon />
            <input
              type="text"
              placeholder="Tìm kiếm học viên, lớp học..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
            />
          </div>
        </header>
        <div className="page-content">{renderPage()}</div>
      </main>
    </div>
  );
}
