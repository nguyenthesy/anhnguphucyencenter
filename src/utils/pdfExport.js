import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Export bank statement as a professional PDF
 */
export function exportBankStatementPDF({
    transactions,
    dateFrom,
    dateTo,
    totalIncome,
    totalExpense,
    currentBalance,
}) {
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = margin;

    // ===== HEADER =====
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 42, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("ANH NGU QUOC TE PHUC YEN EDU", pageWidth / 2, 16, {
        align: "center",
    });

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("BAO CAO TAI CHINH", pageWidth / 2, 24, {
        align: "center",
    });

    doc.setFontSize(9);
    const fromLabel = dateFrom ? formatDateVN(dateFrom) : "---";
    const toLabel = dateTo ? formatDateVN(dateTo) : "---";
    doc.text(
        `Tu ngay: ${fromLabel}  -  Den ngay: ${toLabel}`,
        pageWidth / 2,
        32,
        { align: "center" },
    );

    const exportDate = new Date();
    doc.text(`Ngay xuat: ${formatDateTimeVN(exportDate)}`, pageWidth / 2, 38, {
        align: "center",
    });

    y = 50;

    // ===== FINANCIAL SUMMARY =====
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("TONG QUAN TAI CHINH", margin, y);
    y += 8;

    const boxWidth = (pageWidth - margin * 2 - 10) / 3;
    const boxes = [
        {
            label: "Tong thu",
            value: formatNum(totalIncome),
            color: [16, 185, 129],
        },
        {
            label: "Tong chi",
            value: formatNum(totalExpense),
            color: [239, 68, 68],
        },
        {
            label: "So du hien tai",
            value: formatNum(currentBalance),
            color: [79, 70, 229],
        },
    ];

    boxes.forEach((box, i) => {
        const x = margin + i * (boxWidth + 5);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, y, boxWidth, 20, 3, 3, "F");
        doc.setDrawColor(...box.color);
        doc.setLineWidth(0.5);
        doc.line(x, y, x, y + 20);

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(box.label, x + 4, y + 7);

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...box.color);
        doc.text(box.value, x + 4, y + 16);
    });

    y += 28;

    // ===== TRANSACTION TABLE =====
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("CHI TIET GIAO DICH", margin, y);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`(${transactions.length} giao dich)`, margin + 52, y);
    y += 6;

    const tableData = transactions.map((txn, idx) => [
        idx + 1,
        formatDateVN(txn.date),
        txn.type === "income" ? "THU" : "CHI",
        truncate(removeAccents(txn.description), 30),
        txn.type === "income" ? "+" + formatNum(txn.amount) : "",
        txn.type === "expense" ? "-" + formatNum(txn.amount) : "",
        formatNum(txn.balance),
    ]);

    autoTable(doc, {
        startY: y,
        head: [
            ["#", "Ngay", "Loai", "Noi dung", "Thu (+)", "Chi (-)", "So du"],
        ],
        body: tableData,
        theme: "grid",
        styles: {
            fontSize: 8,
            cellPadding: 3,
            font: "helvetica",
            textColor: [30, 41, 59],
            lineColor: [226, 232, 240],
            lineWidth: 0.2,
        },
        headStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: "bold",
            halign: "center",
        },
        columnStyles: {
            0: { halign: "center", cellWidth: 10 },
            1: { halign: "center", cellWidth: 22 },
            2: { halign: "center", cellWidth: 14 },
            3: { cellWidth: "auto" },
            4: { halign: "right", cellWidth: 28, textColor: [16, 185, 129] },
            5: { halign: "right", cellWidth: 28, textColor: [239, 68, 68] },
            6: { halign: "right", cellWidth: 28, fontStyle: "bold" },
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252],
        },
        margin: { left: margin, right: margin },
        didDrawPage: (data) => {
            // Footer on each page
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(
                `Trang ${data.pageNumber} / ${pageCount}`,
                pageWidth / 2,
                doc.internal.pageSize.getHeight() - 8,
                { align: "center" },
            );
            doc.text(
                "Trung tam Anh ngu Phuc Yen - Bao cao Tai chinh",
                margin,
                doc.internal.pageSize.getHeight() - 8,
            );
        },
    });

    // ===== SIGNATURE AREA =====
    const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : y) + 20;
    const pageH = doc.internal.pageSize.getHeight();

    // Tăng khoảng trống kiểm tra từ 40 lên 65 để tránh việc tên bị nhảy sang trang mới một mình
    if (finalY + 65 > pageH) {
        doc.addPage();
    }

    const sigY = finalY + 65 > pageH ? 30 : finalY;

    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");

    const col1X = margin + 20;
    const col2X = pageWidth - margin - 50;

    // 1. Tiêu đề chức vụ
    doc.text("Nguoi lap", col1X, sigY, { align: "center" });
    doc.text("Giam doc", col2X, sigY, { align: "center" });

    // 2. Hướng dẫn ký (In nghiêng, nhỏ hơn)
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("(Ky, ghi ro ho ten)", col1X, sigY + 6, { align: "center" });
    doc.text("(Ky, ghi ro ho ten)", col2X, sigY + 6, { align: "center" });

    // 3. Tên đầy đủ (Cách xuống một khoảng ~25mm để ký và IN ĐẬM)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text("NGUYEN THE SY", col1X, sigY + 30, { align: "center" });
    doc.text("TRAN HA THI", col2X, sigY + 30, { align: "center" });

    // Save
    const fileName = `SaoKe_TaiChinh_${dateFrom || "all"}_${dateTo || "all"}.pdf`;
    doc.save(fileName);
}

// ===== HELPERS =====
function formatDateVN(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function formatDateTimeVN(date) {
    const d = date instanceof Date ? date : new Date(date);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatNum(num) {
    if (!num && num !== 0) return "0";
    return new Intl.NumberFormat("vi-VN").format(num) + " d";
}

function truncate(str, max) {
    if (!str) return "";
    return str.length > max ? str.slice(0, max) + "..." : str;
}

function removeAccents(str) {
    if (!str) return "";
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D");
}
