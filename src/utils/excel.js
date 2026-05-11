import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/**
 * Export data to Excel file
 * @param {Array} data - Array of objects to export
 * @param {string} fileName - Name of the output file
 * @param {string} sheetName - Name of the worksheet
 * @param {Array} columns - Column definitions [{key, header, width}]
 */
export function exportToExcel(data, fileName, sheetName = "Sheet1", columns = null) {
  let exportData;

  if (columns) {
    exportData = data.map((row) => {
      const obj = {};
      columns.forEach((col) => {
        obj[col.header] = row[col.key] ?? "";
      });
      return obj;
    });
  } else {
    exportData = data;
  }

  const ws = XLSX.utils.json_to_sheet(exportData);

  // Set column widths
  if (columns) {
    ws["!cols"] = columns.map((col) => ({ wch: col.width || 15 }));
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  saveAs(blob, `${fileName}.xlsx`);
}

/**
 * Import Excel file and return data as array of objects
 * @param {File} file - The Excel file to import
 * @returns {Promise<Array>} Array of objects
 */
export function importFromExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(ws);
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Student export columns
export const studentColumns = [
  { key: "fullName", header: "Họ và tên", width: 25 },
  { key: "phone", header: "Số điện thoại", width: 15 },
  { key: "parentPhone", header: "SĐT Phụ huynh", width: 15 },
  { key: "email", header: "Email", width: 25 },
  { key: "dob", header: "Ngày sinh", width: 12 },
  { key: "address", header: "Địa chỉ", width: 30 },
  { key: "className", header: "Lớp", width: 15 },
  { key: "status", header: "Trạng thái", width: 12 },
  { key: "notes", header: "Ghi chú", width: 20 },
];

// Student import field mapping (Vietnamese header -> English key)
export const studentFieldMap = {
  "Họ và tên": "fullName",
  "Ho va ten": "fullName",
  "Số điện thoại": "phone",
  "So dien thoai": "phone",
  "SĐT Phụ huynh": "parentPhone",
  "SDT Phu huynh": "parentPhone",
  "Email": "email",
  "Ngày sinh": "dob",
  "Ngay sinh": "dob",
  "Địa chỉ": "address",
  "Dia chi": "address",
  "Lớp": "className",
  "Lop": "className",
  "Trạng thái": "status",
  "Trang thai": "status",
  "Ghi chú": "notes",
  "Ghi chu": "notes",
};

export function mapImportedStudents(rawData) {
  return rawData.map((row) => {
    const mapped = {};
    Object.entries(row).forEach(([key, value]) => {
      const mappedKey = studentFieldMap[key.trim()] || key;
      mapped[mappedKey] = value;
    });
    return mapped;
  });
}

// Attendance export columns
export const attendanceColumns = [
  { key: "studentName", header: "Học viên", width: 25 },
  { key: "className", header: "Lớp", width: 15 },
  { key: "date", header: "Ngày", width: 12 },
  { key: "time", header: "Giờ", width: 10 },
  { key: "status", header: "Trạng thái", width: 12 },
  { key: "note", header: "Ghi chú", width: 20 },
];
