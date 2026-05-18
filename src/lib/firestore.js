import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";

// ==================== GENERIC CRUD ====================

export async function getAll(collectionName) {
  const snap = await getDocs(collection(db, collectionName));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getById(collectionName, id) {
  const snap = await getDoc(doc(db, collectionName, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function create(collectionName, data) {
  const docRef = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function update(collectionName, id, data) {
  await updateDoc(doc(db, collectionName, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function remove(collectionName, id) {
  await deleteDoc(doc(db, collectionName, id));
}

export async function setDocument(collectionName, id, data) {
  await setDoc(doc(db, collectionName, id), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// ==================== QUERY HELPERS ====================

export async function getWhere(collectionName, field, operator, value) {
  const q = query(collection(db, collectionName), where(field, operator, value));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAllOrdered(collectionName, orderField, direction = "asc") {
  const q = query(collection(db, collectionName), orderBy(orderField, direction));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ==================== REALTIME LISTENER ====================

export function subscribe(collectionName, callback) {
  return onSnapshot(collection(db, collectionName), (snap) => {
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(data);
  });
}

export function subscribeWhere(collectionName, field, operator, value, callback) {
  const q = query(collection(db, collectionName), where(field, operator, value));
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(data);
  });
}

// ==================== STUDENTS ====================

export async function getStudents() {
  return getAllOrdered("students", "fullName", "asc");
}

export async function createStudent(data) {
  return create("students", { ...data, status: data.status || "active" });
}

export async function updateStudent(id, data) {
  return update("students", id, data);
}

export async function deleteStudent(id) {
  return remove("students", id);
}

// ==================== CLASSES ====================

export async function getClasses() {
  return getAllOrdered("classes", "name", "asc");
}

export async function createClass(data) {
  return create("classes", { ...data, status: data.status || "active" });
}

export async function updateClass(id, data) {
  return update("classes", id, data);
}

export async function deleteClass(id) {
  return remove("classes", id);
}

// ==================== SESSIONS (BUỔI HỌC) ====================

export async function getSessions() {
  return getAllOrdered("sessions", "date", "desc");
}

export async function getSessionsByDate(date) {
  return getWhere("sessions", "date", "==", date);
}

export async function createSession(data) {
  return create("sessions", data);
}

export async function updateSession(id, data) {
  return update("sessions", id, data);
}

export async function deleteSession(id) {
  return remove("sessions", id);
}

// ==================== ATTENDANCE (ĐIỂM DANH) ====================

export async function getAttendance(sessionId) {
  return getWhere("attendance", "sessionId", "==", sessionId);
}

export async function createAttendance(data) {
  return create("attendance", data);
}

export async function updateAttendance(id, data) {
  return update("attendance", id, data);
}

export async function batchCreateAttendance(records) {
  const promises = records.map((r) => create("attendance", r));
  return Promise.all(promises);
}

// ==================== USERS ====================

export async function getUsers() {
  return getAll("users");
}

export async function getUserByUid(uid) {
  return getById("users", uid);
}

export async function createUser(uid, data) {
  return setDocument("users", uid, data);
}

export async function updateUser(uid, data) {
  return update("users", uid, data);
}

// ==================== PAYMENTS (HÓA ĐƠN) ====================

export async function getPayments() {
  return getAllOrdered("payments", "date", "desc");
}

export async function createPayment(data) {
  return create("payments", {
    ...data,
    date: data.date || new Date().toISOString().split("T")[0],
  });
}

export async function deletePayment(id) {
  return remove("payments", id);
}

// ==================== TEACHERS (GIÁO VIÊN) ====================

export async function getTeachers() {
  return getAllOrdered("teachers", "fullName", "asc");
}

export async function createTeacher(data) {
  return create("teachers", { ...data, status: data.status || "active" });
}

export async function updateTeacher(id, data, oldName = null) {
  await update("teachers", id, data);
  
  // Nếu đổi tên, cần cập nhật các collection liên quan
  if (oldName && data.fullName && oldName !== data.fullName) {
    const { getDocs, collection, query, where, writeBatch, db } = await import("firebase/firestore");
    const { db: firestoreDb } = await import("./firebase");
    
    const batch = writeBatch(firestoreDb);
    
    // 1. Cập nhật trong Classes
    const qClasses = query(collection(firestoreDb, "classes"), where("teacher", "==", oldName));
    const snapClasses = await getDocs(qClasses);
    snapClasses.forEach(doc => {
      batch.update(doc.ref, { teacher: data.fullName });
    });
    
    // 2. Cập nhật trong Sessions
    const qSessions = query(collection(firestoreDb, "sessions"), where("teacherName", "==", oldName));
    const snapSessions = await getDocs(qSessions);
    snapSessions.forEach(doc => {
      batch.update(doc.ref, { teacherName: data.fullName });
    });
    
    await batch.commit();
  }
}

export async function deleteTeacher(id) {
  return remove("teachers", id);
}

// ==================== INVESTMENTS (VỐN ĐẦU TƯ) ====================

export async function getInvestments() {
  return getAllOrdered("investments", "date", "desc");
}

export async function createInvestment(data) {
  return create("investments", {
    ...data,
    date: data.date || new Date().toISOString().split("T")[0],
  });
}

export async function updateInvestment(id, data) {
  return update("investments", id, data);
}

export async function deleteInvestment(id) {
  return remove("investments", id);
}

// ==================== INCOMES (KHOẢN THU) ====================

export async function getIncomes() {
  return getAllOrdered("incomes", "date", "desc");
}

export async function createIncome(data) {
  return create("incomes", {
    ...data,
    date: data.date || new Date().toISOString().split("T")[0],
  });
}

export async function updateIncome(id, data) {
  return update("incomes", id, data);
}

export async function deleteIncome(id) {
  return remove("incomes", id);
}

// ==================== EXPENSES (KHOẢN CHI) ====================

export async function getExpenses() {
  return getAllOrdered("expenses", "date", "desc");
}

export async function createExpense(data) {
  return create("expenses", {
    ...data,
    date: data.date || new Date().toISOString().split("T")[0],
  });
}

export async function updateExpense(id, data) {
  return update("expenses", id, data);
}

export async function deleteExpense(id) {
  return remove("expenses", id);
}
