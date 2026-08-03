import { doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { getCollectionPath } from './firebase';

// Logika "aksi cepat" admin untuk mencatatkan absensi/status seorang pegawai
// pada satu tanggal. Dipakai bersama oleh panel admin mobile
// (AdminMobileQuickStatusSheet) dan panel admin web (AdminQuickStatusModal)
// supaya perilakunya benar-benar identik di kedua tampilan.
//
// - "Hadir" membuat record attendance NYATA (adminInput:true) — pola yang sama
//   dengan absensi mandiri di UserAbsensi.jsx, hanya tanpa foto/GPS.
// - Izin/Sakit/Cuti/Dinas Luar memakai mekanisme statusLocks seperti
//   AdminManajemenAbsensi.jsx, dibatasi 1 hari (startDate = endDate).
export const saveQuickStatus = async ({ employee, date, session, statusKey, device = 'admin-web' }) => {
  if (statusKey === 'Hadir') {
    const docId = `${date}_${session}_${employee.id}`;
    await setDoc(doc(getCollectionPath('attendance'), docId), {
      userId: employee.id,
      userName: employee.nama,
      nama: employee.nama,
      nip: employee.nip || '',
      date,
      session,
      status: 'Hadir',
      statusApproval: 'approved',
      adminInput: true,
      timestamp: new Date().toISOString(),
      serverTimestamp: serverTimestamp(),
      device,
      location: null,
    });
    return;
  }

  await addDoc(getCollectionPath('statusLocks'), {
    userId: employee.id,
    userName: employee.nama,
    nip: employee.nip || '',
    status: statusKey,
    startDate: date,
    endDate: date,
    createdAt: serverTimestamp(),
  });
};
