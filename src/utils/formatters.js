export function formatDate(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCurrency(amount) {
  if (!amount && amount !== 0) return "";
  const formatted = Math.round(amount).toLocaleString("vi-VN");
  return `${formatted} đ`;
}

export function getToday() {
  return new Date().toISOString().split("T")[0];
}

export function getDayOfWeek(date) {
  const days = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  const d = date instanceof Date ? date : new Date(date);
  return days[d.getDay()];
}

export function getStatusLabel(status) {
  const map = {
    active: "Đang học",
    inactive: "Nghỉ học",
    reserved: "Bảo lưu",
    waiting: "Chờ lớp",
    graduated: "Hoàn thành",
    present: "Có mặt",
    absent: "Vắng",
    late: "Đi trễ",
    excused: "Có phép",
  };
  return map[status] || status;
}

export function getStatusColor(status) {
  const map = {
    active: "#10b981",
    inactive: "#ef4444",
    reserved: "#f59e0b",
    waiting: "#6366f1",
    graduated: "#3b82f6",
    present: "#10b981",
    absent: "#ef4444",
    late: "#f59e0b",
    excused: "#6366f1",
  };
  return map[status] || "#64748b";
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function firebaseTimestampToDate(timestamp) {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
  return new Date(timestamp);
}

export function generateTransactionId(date, index) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const suffix = String(index).padStart(4, "0");
  return `TXN-${y}${m}${day}-${suffix}`;
}

export function formatCompactCurrency(amount) {
  if (!amount && amount !== 0) return "0đ";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1e9) return sign + (abs / 1e9).toFixed(1).replace(/\.0$/, "") + " tỷ";
  if (abs >= 1e6) return sign + (abs / 1e6).toFixed(1).replace(/\.0$/, "") + " tr";
  if (abs >= 1e3) return sign + (abs / 1e3).toFixed(0) + "K";
  return sign + abs.toLocaleString("vi-VN") + "đ";
}
