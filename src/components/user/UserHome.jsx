import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Printer, UserCircle, Wifi, WifiOff, Calendar, Clock3, ScanFace, Lock, Camera, MapPinCheck, BarChart3 } from 'lucide-react';
import { getTodayString, formatDateIndo, SESSION_LABELS } from '../../utils/helpers';
import { isNativePlatform, getCurrentPosition, isWithinAnyGeoFence } from '../../lib/geolocation';
import { loadProfilePhoto, saveProfilePhoto, loadLastLocationPing, saveLastLocationPing } from '../../lib/localDb';
import { computeJamKerja } from '../../utils/jamKerja';
import MobileOnlyModal from './MobileOnlyModal';

const withSeconds = (hhmm) => (hhmm ? `${hhmm}:00` : '00:00:00');

export default function UserHome({ user, attendance, settings }) {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [lastPing, setLastPing] = useState(null);
  const [showMobileOnlyModal, setShowMobileOnlyModal] = useState(false);
  const fileInputRef = useRef(null);

  // Jam Kerja yang belum di-checkout ("sedang berjalan") ikut berdetak tiap menit.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Sampel GPS oportunis: setiap Beranda dibuka/kembali aktif, kalau posisi saat ini
  // ternyata di dalam radius kantor, simpan sebagai "terakhir terdeteksi di kantor"
  // hari ini. Dipakai computeJamKerja() sebagai perkiraan jam pulang otomatis kalau
  // pegawai lupa/tidak sempat checkout mandiri. Gagal diam-diam (tidak mengganggu UI).
  useEffect(() => {
    let cancelled = false;
    const sample = async () => {
      try {
        if (!settings?.geoFenceEnabled || !(settings?.geoLocations?.length)) return;
        const pos = await getCurrentPosition();
        if (cancelled) return;
        if (isWithinAnyGeoFence(pos.lat, pos.lng, settings.geoLocations)) {
          const ping = { date: getTodayString(), timestamp: new Date().toISOString() };
          await saveLastLocationPing(user.id, ping);
          if (!cancelled) setLastPing(ping);
        }
      } catch {
        // GPS mati/izin ditolak/dsb -> abaikan, ini cuma sampling latar belakang.
      }
    };
    sample();
    const onVisible = () => { if (document.visibilityState === 'visible') sample(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', onVisible); };
  }, [user.id, settings?.geoFenceEnabled, settings?.geoLocations]);

  // Muat ping tersimpan (kalau ada) saat komponen pertama kali dipasang.
  useEffect(() => {
    loadLastLocationPing(user.id).then((p) => { if (p) setLastPing(p); });
  }, [user.id]);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Muat foto profil dari IndexedDB (tersimpan di perangkat, tidak pernah ke Firebase)
  useEffect(() => {
    let objectUrl;
    loadProfilePhoto(user.id).then((blob) => {
      if (blob) {
        objectUrl = URL.createObjectURL(blob);
        setPhotoUrl(objectUrl);
      }
    });
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [user.id]);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      await saveProfilePhoto(user.id, file);
      setPhotoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan foto profil di perangkat.');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const today = getTodayString();
  const todaysLogs = attendance.filter(l => l.userId === user.id && l.date === today);

  const findLog = (session) => todaysLogs.find(l => l.session === session);
  const checkInLog = findLog('Pagi');
  const dayInLog = findLog('Siang');
  const checkOutLog = findLog('Sore');

  const formatJam = (log) => log?.timestamp
    ? new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '00:00:00';

  const { value: jamKerja, note: jamKerjaNote } = computeJamKerja({ checkInLog, checkOutLog, lastPing, now, settings });
  const mobileOnlyBlocked = settings?.mobileOnlyAbsensi && !isNativePlatform();

  const jadwal = [
    { label: SESSION_LABELS.Pagi, target: withSeconds(settings?.jamMasukAwal), window: `${withSeconds(settings?.jamMasukAwal)} - ${withSeconds(settings?.batasAbsenPagi)}` },
    { label: SESSION_LABELS.Siang, target: withSeconds(settings?.jamSiangAwal), window: `${withSeconds(settings?.jamSiangAwal)} - ${withSeconds(settings?.batasAbsenSiang)}` },
    { label: SESSION_LABELS.Sore, target: withSeconds(settings?.jamPulangAwal), window: `${withSeconds(settings?.jamPulangAwal)} - ${withSeconds(settings?.batasAbsenSore)}` },
  ];

  return (
    <div className="min-h-full bg-slate-50 flex flex-col font-sans safe-top">
      <div className="flex-1 max-w-md w-full mx-auto p-5 pb-28">

        {/* PROFIL */}
        <div className="flex items-start gap-4 mb-6">
          <div className="relative flex-shrink-0">
            <div className="w-28 h-28 rounded-full border-4 border-red-600 bg-white flex items-center justify-center text-red-600 font-black text-4xl overflow-hidden">
              {photoUrl ? (
                <img src={photoUrl} alt="Foto Profil" className="w-full h-full object-cover" />
              ) : (
                user.nama.charAt(0)
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              aria-label="Ubah Foto Profil"
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-red-700 border-2 border-white text-white flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
            >
              <Camera size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h1 className="text-lg font-black text-slate-800 uppercase leading-tight break-words">{user.nama}</h1>
            <p className="text-sm text-slate-600">NIP. {user.nip || '-'}</p>
            <p className="text-sm text-slate-600 uppercase leading-snug">{settings?.opdName}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-sm font-semibold ${isOnline ? 'text-green-600' : 'text-red-500'}`}>{isOnline ? 'Online' : 'Offline'}</span>
              {isOnline ? <Wifi size={16} className="text-slate-500" /> : <WifiOff size={16} className="text-red-400" />}
            </div>
          </div>
        </div>

        {/* TANGGAL */}
        <div className="flex items-center justify-center gap-2 mb-6 text-slate-700 font-bold">
          <Calendar size={18} />
          <span>{formatDateIndo(today)}</span>
        </div>

        {/* 5 TOMBOL AKSI */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          <button onClick={() => navigate('/riwayat-absensi')} className="bg-red-700 active:bg-red-800 active:scale-95 transition-all text-white rounded-2xl p-2.5 shadow-lg flex flex-col items-center gap-1.5">
            <History size={20} />
            <span className="font-bold text-[10px]">Riwayat</span>
          </button>
          <button onClick={() => navigate('/status-lokasi')} className="bg-red-700 active:bg-red-800 active:scale-95 transition-all text-white rounded-2xl p-2.5 shadow-lg flex flex-col items-center gap-1.5">
            <MapPinCheck size={20} />
            <span className="font-bold text-[10px]">Status</span>
          </button>
          <button onClick={() => navigate('/statistik-absensi')} className="bg-red-700 active:bg-red-800 active:scale-95 transition-all text-white rounded-2xl p-2.5 shadow-lg flex flex-col items-center gap-1.5">
            <BarChart3 size={20} />
            <span className="font-bold text-[10px]">Statistik</span>
          </button>
          <button onClick={() => navigate('/laporan-bulanan')} className="bg-red-700 active:bg-red-800 active:scale-95 transition-all text-white rounded-2xl p-2.5 shadow-lg flex flex-col items-center gap-1.5">
            <Printer size={20} />
            <span className="font-bold text-[10px]">Cetak</span>
          </button>
          <button onClick={() => navigate('/pengaturan')} className="bg-red-700 active:bg-red-800 active:scale-95 transition-all text-white rounded-2xl p-2.5 shadow-lg flex flex-col items-center gap-1.5">
            <UserCircle size={20} />
            <span className="font-bold text-[10px]">Profil</span>
          </button>
        </div>

        {/* CARD JAM ABSEN HARI INI */}
        <div className="border-2 border-red-600 rounded-2xl p-5 mb-6 bg-white">
          <div className="grid grid-cols-3 text-center gap-2">
            <div>
              <p className="text-sm text-slate-600">Check In:</p>
              <p className="font-bold text-slate-800">{formatJam(checkInLog)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Day In:</p>
              <p className="font-bold text-slate-800">{formatJam(dayInLog)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Check Out:</p>
              <p className="font-bold text-slate-800">{formatJam(checkOutLog)}</p>
            </div>
          </div>
          <p className="text-center font-bold text-slate-800 mt-4">Jam Kerja: {jamKerja} jam</p>
          {jamKerjaNote && (
            <p className="text-center text-[11px] text-amber-600 font-semibold mt-1">({jamKerjaNote})</p>
          )}
        </div>

        {/* CARD JADWAL JAM KANTOR */}
        <div className="border-2 border-red-600 rounded-2xl p-5 bg-white">
          <h3 className="text-center font-bold text-slate-800 mb-4">Jadwal Jam Kantor</h3>
          <div className="space-y-4">
            {jadwal.map((j) => (
              <div key={j.label} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Clock3 size={26} className="text-slate-800 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-slate-600">{j.label}</p>
                    <p className="font-bold text-slate-800">{j.target}</p>
                  </div>
                </div>
                <span className="text-sm text-slate-500 whitespace-nowrap">({j.window})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TOMBOL PRESENSI (STICKY BOTTOM) — sticky (bukan fixed) supaya tetap
          terkunci mengikuti lebar frame mobile (max-w-md) yang di-set di App.jsx,
          bukan lebar penuh browser saat diakses dari desktop. */}
      <div className="sticky bottom-0 z-10 safe-bottom">
        <div className="max-w-md mx-auto flex flex-col items-center pb-4 pt-2 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent">
          <button
            onClick={() => mobileOnlyBlocked ? setShowMobileOnlyModal(true) : navigate('/absensi-mandiri')}
            className="w-24 h-24 rounded-full border-4 border-red-700 bg-white flex items-center justify-center text-red-700 shadow-xl active:scale-95 transition-transform mb-[-1px] relative z-10"
          >
            {mobileOnlyBlocked ? <Lock size={36} /> : <ScanFace size={40} />}
          </button>
          <div className="w-full bg-red-700 text-white text-center font-black text-lg py-4 rounded-t-2xl pt-8 -mt-8">
            {mobileOnlyBlocked ? 'Wajib App Mobile' : 'Presensi'}
          </div>
        </div>
      </div>

      <MobileOnlyModal
        open={showMobileOnlyModal}
        onClose={() => setShowMobileOnlyModal(false)}
        downloadUrl={settings?.androidDownloadUrl}
      />
    </div>
  );
}
