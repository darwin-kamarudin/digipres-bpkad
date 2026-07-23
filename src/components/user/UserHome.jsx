import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Printer, Settings, Wifi, WifiOff, Calendar, Clock3, ScanFace, Lock, Camera, MapPinCheck } from 'lucide-react';
import { getTodayString, formatDateIndo, calcJamKerja, SESSION_LABELS } from '../../utils/helpers';
import { isNativePlatform } from '../../lib/geolocation';
import { loadProfilePhoto, saveProfilePhoto } from '../../lib/localDb';

const withSeconds = (hhmm) => (hhmm ? `${hhmm}:00` : '00:00:00');

export default function UserHome({ user, attendance, settings }) {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

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

  const jamKerja = calcJamKerja(checkInLog?.timestamp, checkOutLog?.timestamp);
  const mobileOnlyBlocked = settings?.mobileOnlyAbsensi && !isNativePlatform();

  const jadwal = [
    { label: SESSION_LABELS.Pagi, target: withSeconds(settings?.jamMasukAwal), window: `${withSeconds(settings?.jamMasukAwal)} - ${withSeconds(settings?.batasAbsenPagi)}` },
    { label: SESSION_LABELS.Siang, target: withSeconds(settings?.jamSiangAwal), window: `${withSeconds(settings?.jamSiangAwal)} - ${withSeconds(settings?.batasAbsenSiang)}` },
    { label: SESSION_LABELS.Sore, target: withSeconds(settings?.jamPulangAwal), window: `${withSeconds(settings?.jamPulangAwal)} - ${withSeconds(settings?.batasAbsenSore)}` },
  ];

  return (
    <div className="min-h-full bg-slate-50 flex flex-col font-sans safe-top">
      <div className="flex-1 max-w-md w-full mx-auto p-5 pb-28">

        {/* LOGO */}
        <div className="flex justify-end mb-4">
          <span className="text-lg font-black tracking-tight">
            <span className="text-red-600">Digi</span><span className="text-amber-500">Pres</span>
          </span>
        </div>

        {/* PROFIL */}
        <div className="flex items-start gap-4 mb-6">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full border-4 border-red-600 bg-white flex items-center justify-center text-red-600 font-black text-3xl overflow-hidden">
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
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-red-700 border-2 border-white text-white flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
            >
              <Camera size={14} />
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
            <p className="text-sm text-slate-600">{user.nip || '-'}</p>
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

        {/* 4 TOMBOL AKSI */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <button onClick={() => navigate('/riwayat-absensi')} className="bg-red-700 active:bg-red-800 active:scale-95 transition-all text-white rounded-2xl p-3 shadow-lg flex flex-col items-center gap-2">
            <History size={22} />
            <span className="font-bold text-[11px]">Riwayat</span>
          </button>
          <button onClick={() => navigate('/status-lokasi')} className="bg-red-700 active:bg-red-800 active:scale-95 transition-all text-white rounded-2xl p-3 shadow-lg flex flex-col items-center gap-2">
            <MapPinCheck size={22} />
            <span className="font-bold text-[11px]">Status</span>
          </button>
          <button onClick={() => navigate('/laporan-bulanan')} className="bg-red-700 active:bg-red-800 active:scale-95 transition-all text-white rounded-2xl p-3 shadow-lg flex flex-col items-center gap-2">
            <Printer size={22} />
            <span className="font-bold text-[11px]">Cetak</span>
          </button>
          <button onClick={() => navigate('/pengaturan')} className="bg-red-700 active:bg-red-800 active:scale-95 transition-all text-white rounded-2xl p-3 shadow-lg flex flex-col items-center gap-2">
            <Settings size={22} />
            <span className="font-bold text-[11px]">Pengaturan</span>
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
          <p className="text-center font-bold text-slate-800 mt-4">Jam Kerja: {jamKerja}</p>
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

      {/* TOMBOL PRESENSI (FIXED BOTTOM) */}
      <div className="fixed bottom-0 left-0 right-0 safe-bottom">
        <div className="max-w-md mx-auto flex flex-col items-center pb-4 pt-2 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent">
          <button
            onClick={() => navigate('/absensi-mandiri')}
            className="w-24 h-24 rounded-full border-4 border-red-700 bg-white flex items-center justify-center text-red-700 shadow-xl active:scale-95 transition-transform mb-[-1px] relative z-10"
          >
            {mobileOnlyBlocked ? <Lock size={36} /> : <ScanFace size={40} />}
          </button>
          <div className="w-full bg-red-700 text-white text-center font-black text-lg py-4 rounded-t-2xl pt-8 -mt-8">
            {mobileOnlyBlocked ? 'Wajib App Mobile' : 'Presensi'}
          </div>
        </div>
      </div>
    </div>
  );
}
