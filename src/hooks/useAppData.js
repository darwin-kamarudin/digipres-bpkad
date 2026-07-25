import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import {
  onSnapshot,
  addDoc,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { auth, getCollectionPath } from '../lib/firebase';
import { INITIAL_SETTINGS, formatLocalDate } from '../utils/helpers';
import { saveSession, loadSession, clearSession } from '../lib/localDb';
import { mergeAttendanceWithLocks } from '../utils/statistics';

export const useAppData = () => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [appUser, setAppUser] = useState(null);

  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]); // Optimasi: Hanya data bulan ini
  const [statusLocks, setStatusLocks] = useState([]); // Kunci status admin (Izin/Sakit/Cuti/DL) rentang tanggal
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [holidays, setHolidays] = useState([]);

  const [loading, setLoading] = useState(true);
  // Login sidik jari bersifat OPT-IN: hanya aktif kalau user secara eksplisit
  // menyalakannya di menu Pengaturan (session.biometricEnabled === true).
  // Setelah logout, sesi & flag ini selalu dihapus total -> wajib login manual lagi.
  const [biometricLoginEnabled, setBiometricLoginEnabledState] = useState(false);
  const autoLoginCheckedRef = useRef(false);

  // Cek lebih dini apakah ada sesi tersimpan DAN sudah diaktifkan login sidik jarinya
  // (dipakai LoginPage untuk menampilkan tombol "Login Sidik Jari" walau data pegawai
  // belum termuat).
  useEffect(() => {
    loadSession().then((session) => {
      if (session?.biometricEnabled) setBiometricLoginEnabledState(true);
    });
  }, []);

  // 1. Init Auth Firebase
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Login Error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => { 
        if (user) setFirebaseUser(user); 
    });
    return () => unsubscribe();
  }, []);

  // 2. TAHAP 1: Load Data Dasar (Sangat Ringan, Khusus untuk Halaman Login)
  useEffect(() => {
    if (!firebaseUser) return;

    // A. Pegawai (Dibutuhkan untuk mengecek username dan password saat login)
    const unsubEmp = onSnapshot(getCollectionPath('users'), async (snap) => {
      const emp = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(emp);
      // Loading dimatikan di sini agar halaman Login langsung muncul!
      setLoading(false);

      // Auto-login: begitu data pegawai pertama kali termuat, cek apakah ada
      // sesi tersimpan (IndexedDB) dari login sebelumnya, lalu validasi ulang
      // terhadap data pegawai terbaru sebelum otomatis masuk.
      if (!autoLoginCheckedRef.current) {
        autoLoginCheckedRef.current = true;
        const session = await loadSession();
        if (session) {
          const match = emp.find(u => u.id === session.id && u.username === session.username && u.password === session.password);
          if (match) {
            // session.loggedIn === false berarti pengguna sudah logout secara eksplisit
            // sebelumnya (tapi login sidik jari masih aktif) -> JANGAN auto-login diam-diam,
            // biarkan LoginPage tampil dan tunggu verifikasi sidik jari via handleBiometricLogin.
            // Sesi lama tanpa field ini (undefined) dianggap masih aktif (kompatibel ke belakang).
            if (session.loggedIn !== false) {
              setAppUser(match);
            }
          } else {
            clearSession();
            setBiometricLoginEnabledState(false);
          }
        }
      }
    }, (error) => console.error("Err Employees:", error));

    // B. Settings (Dibutuhkan untuk menampilkan nama instansi/logo di halaman login)
    const unsubSet = onSnapshot(getCollectionPath('settings'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (data.length > 0) setSettings(data[0]);
      else addDoc(getCollectionPath('settings'), INITIAL_SETTINGS);
    }, (error) => console.error("Err Settings:", error));

    return () => { 
      unsubEmp(); 
      unsubSet(); 
    };
  }, [firebaseUser]);

  // 3. TAHAP 2: Load Data Berat (HANYA Dieksekusi SETELAH User Berhasil Login)
  useEffect(() => {
    // Jika appUser masih null (belum login), hentikan proses eksekusi di sini
    if (!appUser) return; 

    // C. Attendance (OPTIMASI: Hanya Bulan Ini)
    const today = new Date();
    // Ambil tanggal 1 bulan ini
    const startOfMonth = formatLocalDate(new Date(today.getFullYear(), today.getMonth(), 1));
    
    const attendanceQuery = query(
      getCollectionPath('attendance'),
      where('date', '>=', startOfMonth)
    );

    const unsubAtt = onSnapshot(attendanceQuery, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sorting manual di client
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setAttendance(data);
    }, (error) => console.error("Err Attendance:", error));

    // D. Status Locks (Kunci status admin: Izin/Sakit/Cuti/DL untuk rentang tanggal)
    // Dipakai rekap untuk menetapkan status pegawai yang tidak absen mandiri.
    const unsubLocks = onSnapshot(getCollectionPath('statusLocks'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStatusLocks(data);
    }, (error) => console.error("Err StatusLocks:", error));

    // E. Holidays
    const unsubHol = onSnapshot(getCollectionPath('holidays'), (snap) => {
       setHolidays(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Err Holidays:", error));

    // Membersihkan listener ketika user logout
    return () => {
      unsubAtt();
      unsubLocks();
      unsubHol();
    };
  }, [appUser]); // <--- Hook ini sekarang bergantung pada status appUser (login)

  // --- Helper Fetch Manual (Untuk Rekapan Bulanan/Tahunan) ---
  // Mengembalikan attendance nyata pada rentang, DIGABUNG dengan record-semu dari
  // kunci status admin yang beririsan (absensi nyata menang). Dengan begitu komponen
  // rekap cukup memproses satu array seperti biasa tanpa tahu soal kunci.
  const fetchAttendanceByRange = async (startDate, endDate) => {
    try {
      const attQ = query(
        getCollectionPath('attendance'),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
      const attSnap = await getDocs(attQ);
      const attData = attSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Ambil kunci yang beririsan dengan rentang: endDate kunci >= startDate rentang,
      // lalu saring startDate kunci <= endDate rentang di klien.
      const lockQ = query(
        getCollectionPath('statusLocks'),
        where('endDate', '>=', startDate)
      );
      const lockSnap = await getDocs(lockQ);
      const lockData = lockSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(l => l.startDate <= endDate);

      return mergeAttendanceWithLocks(attData, lockData, startDate, endDate, holidays);
    } catch (error) {
      console.error("Error fetching range:", error);
      return [];
    }
  };

  const handleAppLogin = (username, password) => {
    const user = employees.find(u => u.username === username && u.password === password);
    if (user) {
      setAppUser(user);
      // Login manual SELALU mulai dari flag biometricEnabled=false —
      // pengguna harus menyalakannya lagi secara sadar lewat menu Pengaturan.
      saveSession({ ...user, biometricEnabled: false, loggedIn: true });
      setBiometricLoginEnabledState(false);
      return true;
    }
    return false;
  };

  // Dipakai tombol "Login Sidik Jari": setelah verifikasi biometrik native
  // berhasil, ambil kembali sesi tersimpan (bukan minta username/password lagi).
  const handleBiometricLogin = async () => {
    const session = await loadSession();
    if (!session?.biometricEnabled) return false;
    const match = employees.find(u => u.id === session.id && u.username === session.username && u.password === session.password);
    if (match) {
      // Tandai sesi aktif lagi (loggedIn:true) supaya kalau aplikasi ditutup-buka
      // tanpa logout eksplisit berikutnya, tetap auto-login seperti biasa.
      await saveSession({ ...session, loggedIn: true });
      setAppUser(match);
      return true;
    }
    clearSession();
    setBiometricLoginEnabledState(false);
    return false;
  };

  // Dipakai toggle "Aktifkan Login Sidik Jari" di menu Profil/Pengaturan.
  const setBiometricLoginEnabled = async (enabled) => {
    if (!appUser) return false;
    await saveSession({ ...appUser, biometricEnabled: enabled, loggedIn: true });
    setBiometricLoginEnabledState(enabled);
    return true;
  };

  // Logout: kalau login sidik jari SEDANG AKTIF, sesi & kredensial TETAP disimpan
  // (hanya ditandai loggedIn:false) supaya login berikutnya cukup pakai sidik jari
  // tanpa mengetik ulang username/password. Kalau biometrik tidak aktif, sesi
  // dihapus total seperti semula -> wajib login manual.
  const handleAppLogout = async () => {
    setAppUser(null);
    if (biometricLoginEnabled) {
      const session = await loadSession();
      if (session) await saveSession({ ...session, loggedIn: false });
    } else {
      clearSession();
      setBiometricLoginEnabledState(false);
    }
  };

  return {
    firebaseUser,
    appUser,
    employees,
    attendance,      // Data bulan ini (untuk dashboard & laporan harian)
    statusLocks,     // Kunci status admin (untuk rekap & status efektif)
    settings,
    holidays,
    loading,
    biometricLoginEnabled,
    handleAppLogin,
    handleAppLogout,
    handleBiometricLogin,
    setBiometricLoginEnabled,
    fetchAttendanceByRange
  };
};