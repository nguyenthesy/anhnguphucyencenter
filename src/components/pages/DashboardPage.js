"use client";
import { useState, useEffect } from "react";
import { getStudents, getClasses, getSessions, subscribe } from "@/lib/firestore";
import { getToday, getDayOfWeek, formatDate, formatCurrency } from "@/utils/formatters";

export default function DashboardPage({ onNavigate }) {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const today = getToday();

  useEffect(() => {
    const u1 = subscribe("students", setStudents);
    const u2 = subscribe("sessions", setSessions);
    const u3 = subscribe("classes", setClasses);
    const u4 = subscribe("teachers", setTeachers);
    setLoading(false);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const activeStudents = students.filter((s) => s.status === "active");
  const activeClasses = classes.filter((c) => c.status === "active");
  const todaySessions = sessions.filter((s) => s.date === today);
  const todayDow = getDayOfWeek(new Date());

  const todayDowIdx = new Date().getDay();
  const scheduledClasses = classes.filter((c) => {
    if (!c.scheduleDays) return false;
    return c.scheduleDays.includes(todayDowIdx) && c.status === "active";
  });

  const combinedTodaySessions = [
    ...todaySessions.map(s => ({ ...s, isExisting: true })),
    ...scheduledClasses.filter(c => !todaySessions.some(s => s.classId === c.id)).map(c => ({
      id: `sched-${c.id}`,
      classId: c.id,
      className: c.name,
      teacherName: c.teacher,
      room: c.room,
      time: c.time,
      isExisting: false,
      status: "upcoming"
    }))
  ].sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  const todayStudentIds = new Set();
  todaySessions.forEach((s) => {
    if (s.studentIds) s.studentIds.forEach((id) => todayStudentIds.add(id));
  });
  scheduledClasses.forEach((c) => {
    if (c.studentIds) c.studentIds.forEach((id) => todayStudentIds.add(id));
    students.filter(s => s.className === c.name).forEach(s => todayStudentIds.add(s.id));
  });

  const todayStudents = students.filter((s) => todayStudentIds.has(s.id));
  const totalRevenue = students.reduce((sum, s) => sum + (Number(s.paidAmount) || 0), 0);
  const activeTeachers = teachers.filter(t => t.status === "active").length;
  const todayTeachers = [...new Set(combinedTodaySessions.map(s => s.teacherName))].filter(Boolean);

  if (loading) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card" onClick={() => onNavigate("students")} style={{ cursor: "pointer" }}>
          <div className="stat-icon purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          </div>
          <div className="stat-info">
            <div className="stat-label">Tổng học viên</div>
            <div className="stat-value">{students.length}</div>
            <div className="stat-change up">⬤ {activeStudents.length} đang học</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Doanh thu đã thu</div>
          <div className="stat-value" style={{ color: "var(--primary)" }}>{formatCurrency(totalRevenue)}</div>
          <div className="stat-desc">Tổng học phí thực nhận</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Giáo viên active</div>
          <div className="stat-value" style={{ color: "var(--warning)" }}>{activeTeachers}</div>
          <div className="stat-desc">Đội ngũ đang giảng dạy</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
          </div>
          <div className="stat-info">
            <div className="stat-label">Học viên hôm nay</div>
            <div className="stat-value">{todayStudents.length}</div>
            <div className="stat-change">{formatDate(new Date())}</div>
          </div>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid-2">
        {/* Today Sessions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📅 Buổi học hôm nay ({todayDow})</h3>
            <button className="btn btn-sm btn-outline" onClick={() => onNavigate("sessions")}>Xem tất cả</button>
          </div>
          <div className="card-body">
            {combinedTodaySessions.length === 0 ? (
              <div className="empty-state">
                <p>Chưa có buổi học nào hôm nay</p>
              </div>
            ) : (
              <div className="schedule-list">
                {combinedTodaySessions.map((session) => {
                  return (
                    <div className="schedule-item" key={session.id} style={{ opacity: session.isExisting ? 1 : 0.7 }}>
                      <div className="schedule-time">{session.time || "—"}</div>
                      <div className="schedule-dot" style={{ background: session.isExisting ? "#4f46e5" : "#94a3b8", border: session.isExisting ? "none" : "1px dashed #475569" }} />
                      <div className="schedule-details">
                        <div className="schedule-class-name">
                          {session.className || "—"}
                          {!session.isExisting && <span style={{ fontSize: 10, marginLeft: 6, opacity: 0.6, fontStyle: "italic" }}>(Lịch hẹn)</span>}
                        </div>
                        <div className="schedule-meta">
                          {session.teacherName || "—"} • {session.room || "—"}
                        </div>
                      </div>
                      <span className={`badge ${session.isExisting ? (session.status === "completed" ? "badge-success" : "badge-info") : "badge-neutral"}`}>
                        {session.isExisting ? (session.status === "completed" ? "Đã dạy" : "Sắp tới") : "Chưa dạy"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Today Students */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">👨‍🎓 Học viên học hôm nay</h3>
            <button className="btn btn-sm btn-outline" onClick={() => onNavigate("attendance")}>Điểm danh</button>
          </div>
          <div className="card-body">
            {todayStudents.length === 0 && todaySessions.length === 0 ? (
              <div className="empty-state">
                <p>Chưa có dữ liệu học viên hôm nay</p>
              </div>
            ) : (
              <div className="schedule-list">
                {todayStudents.slice(0, 8).map((s) => (
                  <div className="schedule-item" key={s.id}>
                    <div className="sidebar-avatar" style={{ width: 36, height: 36, fontSize: 14 }}>
                      {(s.fullName || "?").charAt(0)}
                    </div>
                    <div className="schedule-details">
                      <div className="schedule-class-name">{s.fullName}</div>
                      <div className="schedule-meta">{s.phone || ""} • {s.className || ""}</div>
                    </div>
                    <span className="badge badge-success">Có mặt</span>
                  </div>
                ))}
                {todayStudents.length > 8 && (
                  <div style={{ textAlign: "center", paddingTop: 8, color: "var(--text-secondary)", fontSize: 13 }}>
                    +{todayStudents.length - 8} học viên khác
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <h3 className="card-title">👨‍🏫 Giáo viên dạy hôm nay</h3>
          <button className="btn btn-sm btn-outline" onClick={() => onNavigate("teachers")}>Lịch chi tiết</button>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {todayTeachers.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-light)" }}>Không có lịch dạy hôm nay</div>
          ) : (
            <div className="table-wrapper">
              <table className="table-sm">
                <thead>
                  <tr><th>Giáo viên</th><th>Lớp phụ trách</th><th>Phòng</th><th>Giờ học</th></tr>
                </thead>
                <tbody>
                  {todayTeachers.map((tName, i) => {
                    const sessionsForTeacher = combinedTodaySessions.filter(s => s.teacherName === tName);
                    return sessionsForTeacher.map((s, j) => (
                      <tr key={`${i}-${j}`}>
                        <td style={{ fontWeight: 600 }}>{tName}</td>
                        <td>{s.className}</td>
                        <td>{s.room}</td>
                        <td style={{ color: "var(--primary)", fontWeight: 600 }}>{s.time}</td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Recent students */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <h3 className="card-title">🆕 Học viên mới nhất</h3>
          <button className="btn btn-sm btn-outline" onClick={() => onNavigate("students")}>Xem tất cả</button>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Họ và tên</th>
                  <th>Số điện thoại</th>
                  <th>Lớp</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--text-light)", padding: 32 }}>Chưa có học viên</td></tr>
                ) : (
                  students.slice(0, 5).map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.fullName}</td>
                      <td>{s.phone || "—"}</td>
                      <td>{s.className || "—"}</td>
                      <td>
                        <span className={`badge ${s.status === "active" ? "badge-success" : s.status === "reserved" ? "badge-warning" : "badge-neutral"}`}>
                          {s.status === "active" ? "Đang học" : s.status === "reserved" ? "Bảo lưu" : s.status || "—"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
