"use client";
import { useState, useEffect } from "react";
import { subscribe, createAttendance, updateAttendance, createSession, updateSession } from "@/lib/firestore";
import { getToday, getDayOfWeek, formatDate, getStatusLabel, getStatusColor } from "@/utils/formatters";
import { exportToExcel, attendanceColumns } from "@/utils/excel";

export default function AttendancePage({ globalSearch }) {
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [filterDate, setFilterDate] = useState(getToday());
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    const u1 = subscribe("sessions", setSessions);
    const u2 = subscribe("students", setStudents);
    const u3 = subscribe("attendance", setAttendance);
    const u4 = subscribe("classes", setClasses);
    const u5 = subscribe("teachers", setTeachers);
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, []);

  const todaySessions = sessions
    .filter((s) => s.date === filterDate)
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  const dayIdx = new Date(filterDate).getDay(); // 0:CN, 1:T2...
  const scheduledClasses = classes.filter(c => 
    c.status === "active" && 
    (c.scheduleDays || []).includes(dayIdx) &&
    !todaySessions.some(s => s.classId === c.id)
  );

  const allDisplaySessions = [
    ...todaySessions.map(s => ({ ...s, isExisting: true })),
    ...scheduledClasses.map(c => ({
      id: `sched-${c.id}`,
      classId: c.id,
      className: c.name,
      teacherName: c.teacher,
      room: c.room,
      time: c.time,
      date: filterDate,
      isExisting: false
    }))
  ].sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  const sessionAttendance = selectedSession
    ? attendance.filter((a) => a.sessionId === selectedSession.id)
    : [];

  const searchTerm = (globalSearch || search).toLowerCase();
  const sessionStudents = students.filter((s) => {
    if (!selectedSession) return false;
    const matchClass =
      s.className === selectedSession.className ||
      (selectedSession.studentIds && selectedSession.studentIds.includes(s.id));
    const matchSearch = !searchTerm ||
      (s.fullName || "").toLowerCase().includes(searchTerm);
    return matchClass && s.status === "active" && matchSearch;
  });

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const markAttendance = async (studentId, studentName, status) => {
    if (!selectedSession) return;
    
    let currentSession = selectedSession;
    
    // If it's a scheduled item (not in DB yet), create it first
    if (!selectedSession.isExisting) {
      try {
        const newId = await createSession({
          classId: selectedSession.classId,
          className: selectedSession.className,
          teacherName: selectedSession.teacherName,
          room: selectedSession.room,
          time: selectedSession.time,
          date: selectedSession.date,
          status: "upcoming"
        });
        currentSession = { ...selectedSession, id: newId, isExisting: true };
        setSelectedSession(currentSession);
      } catch (err) {
        showToast("Lỗi khởi tạo buổi học: " + err.message, "error");
        return;
      }
    }

    const existing = attendance.find((a) => a.sessionId === currentSession.id && a.studentId === studentId);
    try {
      if (existing) {
        await updateAttendance(existing.id, { status });
      } else {
        await createAttendance({
          sessionId: currentSession.id,
          classId: currentSession.classId || "",
          className: currentSession.className || "",
          studentId,
          studentName,
          date: currentSession.date,
          time: currentSession.time || "",
          status,
          note: "",
        });
      }
    } catch (err) {
      showToast("Lỗi: " + err.message, "error");
    }
  };

  const changeSessionTeacher = async (teacherName) => {
    if (!selectedSession || !selectedSession.isExisting) return;
    try {
      await updateSession(selectedSession.id, { teacherName });
      setSelectedSession({ ...selectedSession, teacherName });
      showToast("Đã cập nhật giáo viên dạy!");
    } catch (err) {
      showToast("Lỗi: " + err.message, "error");
    }
  };

  const completeSession = async () => {
    if (!selectedSession || !selectedSession.isExisting) return;
    try {
      await updateSession(selectedSession.id, { status: "completed" });
      setSelectedSession({ ...selectedSession, status: "completed" });
      showToast("Đã xác nhận hoàn thành buổi dạy!");
    } catch (err) {
      showToast("Lỗi: " + err.message, "error");
    }
  };

  const getStudentStatus = (studentId) => {
    const record = sessionAttendance.find((a) => a.studentId === studentId);
    return record?.status || null;
  };

  const handleExport = () => {
    const data = sessionAttendance.map((a) => ({
      ...a,
      status: getStatusLabel(a.status),
    }));
    exportToExcel(data, `diem_danh_${filterDate}`, "Điểm danh", attendanceColumns);
    showToast("Xuất Excel thành công!");
  };

  const markAllPresent = async () => {
    for (const s of sessionStudents) {
      if (!getStudentStatus(s.id)) {
        await markAttendance(s.id, s.fullName, "present");
      }
    }
    showToast("Đã điểm danh tất cả có mặt!");
  };

  const goDay = (offset) => {
    const d = new Date(filterDate);
    d.setDate(d.getDate() + offset);
    setFilterDate(d.toISOString().split("T")[0]);
    setSelectedSession(null);
  };

  const presentCount = sessionAttendance.filter((a) => a.status === "present").length;
  const absentCount = sessionAttendance.filter((a) => a.status === "absent").length;

  return (
    <div>
      {/* Date navigation */}
      <div className="toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-sm btn-outline" onClick={() => goDay(-1)}>←</button>
          <input type="date" className="form-input" style={{ width: "auto", minWidth: 0 }} value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setSelectedSession(null); }} />
          <button className="btn btn-sm btn-outline" onClick={() => goDay(1)}>→</button>
          <button className="btn btn-sm btn-ghost" onClick={() => { setFilterDate(getToday()); setSelectedSession(null); }}>Hôm nay</button>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            {getDayOfWeek(filterDate)}
          </span>
        </div>
      </div>

      <div className="grid-2">
        {/* Sessions list */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📅 Buổi học — {formatDate(filterDate)}</h3>
          </div>
          <div className="card-body" style={{ padding: 8 }}>
            {allDisplaySessions.length === 0 ? (
              <div className="empty-state"><p>Không có lịch học ngày này</p></div>
            ) : (
              <div className="schedule-list">
                {allDisplaySessions.map((s) => {
                  const isSelected = selectedSession?.id === s.id;
                  const sAtt = attendance.filter((a) => a.sessionId === s.id);
                  return (
                    <div
                      key={s.id}
                      className="schedule-item"
                      onClick={() => setSelectedSession(s)}
                      style={{
                        cursor: "pointer",
                        background: isSelected ? "rgba(79,70,229,0.08)" : undefined,
                        borderLeft: isSelected ? "3px solid var(--primary)" : s.isExisting ? "3px solid transparent" : "3px dashed var(--text-light)",
                        opacity: s.isExisting ? 1 : 0.7
                      }}
                    >
                      <div className="schedule-time">{s.time || "—"}</div>
                      <div className="schedule-details">
                        <div className="schedule-class-name">
                          {s.className || "—"}
                          {!s.isExisting && <span style={{ fontSize: 10, marginLeft: 8, color: "var(--text-light)", fontStyle: "italic" }}>(Lịch hẹn)</span>}
                        </div>
                        <div className="schedule-meta">
                          {s.teacherName || "—"} • {s.room || "—"}
                          {s.isExisting && sAtt.length > 0 && ` • ${sAtt.filter((a) => a.status === "present").length}/${sAtt.length} có mặt`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Attendance panel */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              {selectedSession ? `✅ Điểm danh: ${selectedSession.className}` : "✅ Chọn buổi học để điểm danh"}
            </h3>
            {selectedSession && (
              <div className="btn-group" style={{ flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12 }}>GV dạy:</span>
                  <select 
                    className="form-select" 
                    style={{ width: "auto", height: 32, fontSize: 12, padding: "0 8px" }}
                    value={selectedSession.teacherName}
                    onChange={(e) => changeSessionTeacher(e.target.value)}
                  >
                    <option value={selectedSession.teacherName}>{selectedSession.teacherName}</option>
                    {teachers.filter(t => t.fullName !== selectedSession.teacherName).map(t => (
                      <option key={t.id} value={t.fullName}>{t.fullName}</option>
                    ))}
                  </select>
                </div>
                {selectedSession.status !== "completed" && (
                  <button className="btn btn-sm btn-primary" onClick={completeSession}>Xác nhận dạy xong</button>
                )}
                <button className="btn btn-sm btn-success" onClick={markAllPresent}>Tất cả có mặt</button>
                <button className="btn btn-sm btn-outline" onClick={handleExport}>📥 Excel</button>
              </div>
            )}
          </div>
          <div className="card-body">
            {!selectedSession ? (
              <div className="empty-state"><p>← Chọn một buổi học bên trái</p></div>
            ) : (
              <>
                {/* Stats */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ display: "flex", gap: 12 }}>
                    <span className="badge badge-success">Có mặt: {presentCount}</span>
                    <span className="badge badge-danger">Vắng: {absentCount}</span>
                    <span className="badge badge-neutral">Tổng: {sessionStudents.length}</span>
                  </div>
                  {selectedSession.status === "completed" && (
                    <span className="badge badge-success" style={{ padding: "6px 12px" }}>✓ Đã hoàn thành</span>
                  )}
                </div>

                {/* Search */}
                <div className="toolbar-search" style={{ maxWidth: "100%", marginBottom: 16 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input placeholder="Tìm học viên..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>

                {sessionStudents.length === 0 ? (
                  <div className="empty-state">
                    <p>Không có học viên nào trong lớp này.<br />Hãy đảm bảo trường "Lớp" của học viên trùng với tên lớp của buổi học.</p>
                  </div>
                ) : (
                  <div className="attendance-grid" style={{ gridTemplateColumns: "1fr" }}>
                    {sessionStudents.map((s) => {
                      const currentStatus = getStudentStatus(s.id);
                      return (
                        <div className="attendance-card" key={s.id}>
                          <div className="attendance-avatar">{(s.fullName || "?").charAt(0)}</div>
                          <div className="attendance-info">
                            <div className="attendance-name">{s.fullName}</div>
                            <div className="attendance-class">{s.phone || ""}</div>
                          </div>
                          <div className="attendance-actions">
                            <button
                              className={`att-btn present ${currentStatus === "present" ? "active" : ""}`}
                              onClick={() => markAttendance(s.id, s.fullName, "present")}
                              title="Có mặt"
                            >✓</button>
                            <button
                              className={`att-btn late ${currentStatus === "late" ? "active" : ""}`}
                              onClick={() => markAttendance(s.id, s.fullName, "late")}
                              title="Đi trễ"
                            >⏱</button>
                            <button
                              className={`att-btn absent ${currentStatus === "absent" ? "active" : ""}`}
                              onClick={() => markAttendance(s.id, s.fullName, "absent")}
                              title="Vắng"
                            >✗</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
