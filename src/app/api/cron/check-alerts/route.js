import { NextResponse } from "next/server";
import { getDocs, collection, query, where, addDoc, serverTimestamp } from "firebase/firestore/lite";
import { getAuth, signInAnonymously } from "firebase/auth";
import { serverApp, serverDb as db } from "@/lib/firebase-server";
import { getToday, getDayOfWeek } from "@/utils/formatters";
import { sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

// Timezone Vietnam (UTC+7)
function getVietnamTime() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 3600000 * 7);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 0. Authenticate anonymously for server-side access using the same serverApp
    const auth = getAuth(serverApp);
    await signInAnonymously(auth);
    const vnNow = getVietnamTime();
    console.log("[CHECK-ALERTS] Authenticated anonymously");

    // Debug ENV
    console.log(`[CHECK-ALERTS] Project ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
    console.log(`[CHECK-ALERTS] Has API Key: ${!!process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`);

    // Format date as YYYY-MM-DD using Vietnam timezone components
    const year = vnNow.getFullYear();
    const month = String(vnNow.getMonth() + 1).padStart(2, "0");
    const day = String(vnNow.getDate()).padStart(2, "0");
    const todayStr = `${year}-${month}-${day}`;
    const dayIdx = vnNow.getDay();
    const currentTimeMinutes = vnNow.getHours() * 60 + vnNow.getMinutes();

    console.log(`[CHECK-ALERTS] Vietnam time: ${vnNow.toISOString()}`);
    console.log(`[CHECK-ALERTS] todayStr=${todayStr}, dayIdx=${dayIdx} (0=CN,1=T2,...), currentTime=${Math.floor(currentTimeMinutes/60)}:${String(currentTimeMinutes%60).padStart(2,"0")} (${currentTimeMinutes} mins)`);

    // 1. Fetch Classes for today
    const classesSnap = await getDocs(query(collection(db, "classes"), where("status", "==", "active")));
    const allActiveClasses = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const todayClasses = allActiveClasses.filter(c => (c.scheduleDays || []).includes(dayIdx));

    console.log(`[CHECK-ALERTS] Active classes: ${allActiveClasses.length}, Today's classes (dayIdx=${dayIdx}): ${todayClasses.length}`);
    todayClasses.forEach(c => {
      console.log(`[CHECK-ALERTS]   → ${c.name} | time: ${c.time} | teacher: ${c.teacher} | scheduleDays: [${c.scheduleDays}]`);
    });

    // 2. Fetch Sessions for today (to check completion status)
    const sessionsSnap = await getDocs(query(collection(db, "sessions"), where("date", "==", todayStr)));
    const todaySessions = sessionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`[CHECK-ALERTS] Sessions today (date=${todayStr}): ${todaySessions.length}`);

    // 3. Fetch Attendance for today (to check if anyone marked)
    const attendanceSnap = await getDocs(query(collection(db, "attendance"), where("date", "==", todayStr)));
    const todayAttendance = attendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`[CHECK-ALERTS] Attendance records today: ${todayAttendance.length}`);

    // 4. Fetch Alert Logs (prevent spam)
    const logsSnap = await getDocs(query(collection(db, "alert_logs"), where("date", "==", todayStr)));
    const sentAlerts = logsSnap.docs.map(doc => doc.data());
    console.log(`[CHECK-ALERTS] Alert logs today: ${sentAlerts.length}`);

    const results = [];

    for (const cls of todayClasses) {
      if (!cls.time) continue;

      // Parse "18:00 - 20:00"
      const timeParts = cls.time.split("-").map(t => t.trim());
      if (timeParts.length < 2) continue;

      const [startStr, endStr] = timeParts;
      const [startH, startM] = startStr.split(":").map(Number);
      const [endH, endM] = endStr.split(":").map(Number);

      if (isNaN(startH) || isNaN(endH)) continue;

      const startTimeMins = startH * 60 + (startM || 0);
      const endTimeMins = endH * 60 + (endM || 0);

      const session = todaySessions.find(s => s.classId === cls.id);

      // --- CHECK 1: NO ATTENDANCE (30 mins after start, up to 60 mins after end) ---
      const hasAttendance = todayAttendance.some(a => 
        a.classId === cls.id || (session && a.sessionId === session.id)
      );
      
      const alreadySentAttendance = sentAlerts.some(log => 
        log.classId === cls.id && log.type === "MISSING_ATTENDANCE"
      );

      console.log(`[CHECK-ALERTS] Class "${cls.name}": start=${startTimeMins}min, end=${endTimeMins}min, now=${currentTimeMinutes}min | hasAttendance=${hasAttendance} | session=${session ? session.id : "NONE"} | sessionStatus=${session?.status || "N/A"} | alreadySentAttendance=${alreadySentAttendance}`);

      // FIX: Alert from 30 mins after start to 60 mins after end (was wrongly capped at endTimeMins)
      if (!hasAttendance && currentTimeMinutes >= startTimeMins + 30 && currentTimeMinutes < endTimeMins + 60 && !alreadySentAttendance) {
        const msg = `⚠️ <b>CẢNH BÁO ĐIỂM DANH</b>\n━━━━━━━━━━━━━━━━━━\n📚 Lớp: <b>${cls.name}</b>\n👩‍🏫 GV: ${cls.teacher || "Chưa rõ"}\n⏰ Ca học: ${cls.time}\n📅 Ngày: ${todayStr}\n\n❌ Đã quá 30 phút bắt đầu nhưng chưa thấy điểm danh học sinh!`;
        
        await sendTelegramMessage(msg);
        await addDoc(collection(db, "alert_logs"), {
          classId: cls.id,
          type: "MISSING_ATTENDANCE",
          date: todayStr,
          timestamp: serverTimestamp()
        });
        results.push({ class: cls.name, alert: "attendance_missing" });
        console.log(`[CHECK-ALERTS] ✅ SENT attendance alert for "${cls.name}"`);
      } else {
        console.log(`[CHECK-ALERTS] ⏭️ Skipped attendance alert for "${cls.name}" - hasAttendance=${hasAttendance}, inTimeWindow=${currentTimeMinutes >= startTimeMins + 30 && currentTimeMinutes < endTimeMins + 60}, alreadySent=${alreadySentAttendance}`);
      }

      // --- CHECK 2: NOT COMPLETED (30 mins after end) ---
      const isCompleted = session?.status === "completed";
      const alreadySentCompletion = sentAlerts.some(log => 
        log.classId === cls.id && log.type === "MISSING_COMPLETION"
      );

      // Alert if it's 30 mins past end, but not too late (within 2.5 hours of end time)
      if (!isCompleted && currentTimeMinutes >= endTimeMins + 30 && currentTimeMinutes < endTimeMins + 150 && !alreadySentCompletion) {
        const msg = `⚠️ <b>CẢNH BÁO XÁC NHẬN</b>\n━━━━━━━━━━━━━━━━━━\n📚 Lớp: <b>${cls.name}</b>\n👩‍🏫 GV: ${cls.teacher || "Chưa rõ"}\n⏰ Ca học: ${cls.time}\n📅 Ngày: ${todayStr}\n\n❌ Đã quá 30 phút kết thúc nhưng giáo viên chưa xác nhận dạy xong!`;

        await sendTelegramMessage(msg);
        await addDoc(collection(db, "alert_logs"), {
          classId: cls.id,
          type: "MISSING_COMPLETION",
          date: todayStr,
          timestamp: serverTimestamp()
        });
        results.push({ class: cls.name, alert: "completion_missing" });
        console.log(`[CHECK-ALERTS] ✅ SENT completion alert for "${cls.name}"`);
      } else {
        console.log(`[CHECK-ALERTS] ⏭️ Skipped completion alert for "${cls.name}" - isCompleted=${isCompleted}, inTimeWindow=${currentTimeMinutes >= endTimeMins + 30 && currentTimeMinutes < endTimeMins + 150}, alreadySent=${alreadySentCompletion}`);
      }
    }

    console.log(`[CHECK-ALERTS] Done. Total alerts sent: ${results.length}`);
    return NextResponse.json({ success: true, date: todayStr, dayIdx, currentTimeMinutes, classesChecked: todayClasses.length, results });
  } catch (err) {
    console.error("Cron Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
