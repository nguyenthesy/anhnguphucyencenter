import { NextResponse } from "next/server";
import { getDocs, collection, query, where } from "firebase/firestore/lite";
import { serverDb as db } from "@/lib/firebase-server";
import { getToday, getDayOfWeek } from "@/utils/formatters";

// Hướng dẫn: Bạn cần cài đặt thư viện 'resend' hoặc 'nodemailer' để gửi mail thực tế.
// npm install resend

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  // Bảo mật: Chỉ cho phép cron job gọi API này
  if (key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = getToday();
    const dayIdx = new Date(today).getDay();

    // 1. Lấy danh sách tất cả giáo viên có email
    const teachersSnap = await getDocs(collection(db, "teachers"));
    const teachers = teachersSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(t => t.email && t.status === "active");

    // 2. Lấy danh sách lớp học có lịch dạy hôm nay
    const classesSnap = await getDocs(query(collection(db, "classes"), where("status", "==", "active")));
    const classes = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const results = [];

    for (const teacher of teachers) {
      // Lọc các lớp của giáo viên này trong ngày hôm nay
      const todayClasses = classes.filter(c => 
        c.teacher === teacher.fullName && 
        (c.scheduleDays || []).includes(dayIdx)
      );

      if (todayClasses.length > 0) {
        // Logic gửi mail (giả lập)
        const emailBody = `
          Chào ${teacher.fullName},
          Đây là lịch dạy của bạn ngày hôm nay (${getDayOfWeek(today)} - ${today}):
          ${todayClasses.map(c => `- Lớp: ${c.name} | Giờ: ${c.time} | Phòng: ${c.room}`).join("\n")}
          
          Chúc bạn một ngày làm việc hiệu quả!
        `;

        // Ghi log hoặc gọi service gửi mail thực tế ở đây
        console.log(`Sending email to ${teacher.email}...`);
        console.log(emailBody);
        
        results.push({ teacher: teacher.fullName, status: "sent" });
      }
    }

    return NextResponse.json({ success: true, processed: results });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
