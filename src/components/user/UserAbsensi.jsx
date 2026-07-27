import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Lock, CheckCircle, RefreshCw, Camera, ChevronLeft, Home, MapPin, ShieldAlert, Smartphone, SwitchCamera } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getCollectionPath } from '../../lib/firebase';
import { getTodayString, formatDateIndo, fetchServerTime, adjustTimezone, getDeviceType } from '../../utils/helpers';
import { getCurrentPosition, findNearestGeoFence, isNativePlatform } from '../../lib/geolocation';
import { startCamera, capturePhoto, stopCamera, flipCamera } from '../../lib/camera';

// Menentukan sesi absensi (Pagi/Siang/Sore) berdasarkan jam berjalan & jendela waktu di settings
const determineSession = (time, settings) => {
  const timeStr = time.toTimeString().slice(0, 5);
  if (timeStr >= (settings?.jamMasukAwal || '06:00') && timeStr <= (settings?.batasAbsenPagi || '10:00')) return 'Pagi';
  if (timeStr >= (settings?.jamSiangAwal || '13:00') && timeStr <= (settings?.batasAbsenSiang || '14:00')) return 'Siang';
  if (timeStr >= (settings?.jamPulangAwal || '16:00') && timeStr <= (settings?.batasAbsenSore || '18:00')) return 'Sore';
  // Fallback heuristik jika di luar semua jendela waktu
  const h = time.getHours();
  if (h < 11) return 'Pagi';
  if (h < 15) return 'Siang';
  return 'Sore';
};

export default function UserAbsensi({ user, attendance, holidays, settings }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ date: '', session: '', status: 'Hadir', workMode: 'WFO' });
  const [done, setDone] = useState(false);
  const [canAbsen, setCanAbsen] = useState(false);
  const [blockMessage, setBlockMessage] = useState('');
  const [loadingTime, setLoadingTime] = useState(true);
  const [serverTime, setServerTime] = useState(null);

  // Validasi Geo Lokasi (Geofencing) — kini divalidasi SAAT PENGIRIMAN, bukan lagi
  // sebagai gerbang sebelum kamera dibuka. geoState hanya untuk menampilkan hasil
  // validasi (mis. di luar radius / GPS mati) setelah user menekan "Kirim".
  const [geoState, setGeoState] = useState({ status: 'idle', message: '' });
  const [submitting, setSubmitting] = useState(false);
  // Posisi GPS hasil warm-up di latar belakang (memicu izin lokasi lebih awal).
  const geoWarmRef = useRef(null);

  // Fitur Kamera (native camera-preview via src/lib/camera.js, fallback getUserMedia di web)
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [facing, setFacing] = useState('front'); // 'front' (depan) | 'back' (belakang)
  const facingRef = useRef('front');
  const native = isNativePlatform();

  const beginCamera = (f = facingRef.current) => {
    startCamera({ videoEl: videoRef.current, facing: f }).catch((err) => {
      console.error('Gagal mengakses kamera: ', err);
    });
  };

  // Ganti kamera depan <-> belakang (hanya saat preview aktif & belum ambil foto).
  const toggleCamera = async () => {
    const next = facing === 'front' ? 'back' : 'front';
    setFacing(next);
    facingRef.current = next;
    try {
      await flipCamera({ videoEl: videoRef.current, facing: next });
    } catch (err) {
      console.error('Gagal mengganti kamera: ', err);
    }
  };

  const endCamera = () => {
    stopCamera({ videoEl: videoRef.current }).catch(() => {});
  };

  // 1. Fetch Waktu Server saat komponen dimuat
  useEffect(() => {
    const initTime = async () => {
       setLoadingTime(true);
       const rawTime = await fetchServerTime();
       const adjustedTime = adjustTimezone(rawTime, settings?.zonaWaktu);
       
       setServerTime(adjustedTime);

       const sess = determineSession(adjustedTime, settings);

       setForm(prev => ({ ...prev, date: getTodayString(adjustedTime), session: sess }));
       setLoadingTime(false);
    };
    initTime();
  }, [settings]);

  // 2. Validasi Logika Absensi
  useEffect(() => {
    if (!serverTime || !form.date) return;

    const todayDate = new Date(form.date);
    const dayNum = todayDate.getDay();
    const isWeekend = dayNum === 0 || dayNum === 6; 
    const holiday = holidays.find(h => h.date === form.date);

    if (isWeekend) {
        setCanAbsen(false);
        setBlockMessage("Hari ini adalah hari libur akhir pekan.");
        return;
    }

    if (holiday) {
        setCanAbsen(false);
        setBlockMessage(`Libur nasional: ${holiday.desc}`);
        return;
    }

    setBlockMessage(''); 
    
    const checkTimeDynamic = () => {
        const timeStr = serverTime.toTimeString().slice(0, 5);
        const startPagi = settings?.jamMasukAwal || "06:00";
        const endPagi = settings?.batasAbsenPagi || "10:00";
        const startSiang = settings?.jamSiangAwal || "13:00";
        const endSiang = settings?.batasAbsenSiang || "14:00";
        const startSore = settings?.jamPulangAwal || "16:00";
        const endSore = settings?.batasAbsenSore || "18:00";

        if (form.session === 'Pagi') return timeStr >= startPagi && timeStr <= endPagi;
        else if (form.session === 'Siang') return timeStr >= startSiang && timeStr <= endSiang;
        else if (form.session === 'Sore') return timeStr >= startSore && timeStr <= endSore;
        return false;
    };

    const isAvailable = checkTimeDynamic();
    setCanAbsen(isAvailable);

  }, [form.session, form.date, holidays, serverTime, settings, done]);

  // 3. Cek apakah user sudah absen hari ini
  useEffect(() => {
     if (!form.date || !form.session) return;
     const exists = attendance.find(l => l.userId === user.id && l.date === form.date && l.session === form.session);
     setDone(!!exists);
  }, [form.date, form.session, attendance, user.id]);

  // 4. Buka kamera SEGERA saat sesi absensi tersedia (tanpa menunggu GPS).
  //    GPS diprefetch di latar belakang (memicu izin lokasi lebih awal & meng-cache
  //    posisi) dan baru DIVALIDASI saat user menekan "Kirim" (lihat submit()).
  useEffect(() => {
    const active = !done && canAbsen && !blockMessage;

    if (!active) {
      endCamera();
      setGeoState({ status: 'idle', message: '' });
      return;
    }

    let cancelled = false;
    beginCamera();

    // Warm-up GPS di latar belakang bila geofence aktif.
    const geoLocations = settings?.geoLocations || [];
    const geoActive = settings?.geoFenceEnabled && geoLocations.length > 0;
    if (geoActive) {
      getCurrentPosition()
        .then((pos) => { if (!cancelled) geoWarmRef.current = pos; })
        .catch(() => { /* diabaikan; validasi sebenarnya dilakukan saat submit */ });
    }

    return () => { cancelled = true; endCamera(); };
  }, [canAbsen, done, blockMessage, settings]);

  // Bersihkan kamera saat unmount
  useEffect(() => {
      return () => endCamera();
  }, []);

  const takePhoto = async (e) => {
    e.preventDefault();
    try {
      const dataUrl = await capturePhoto({ videoEl: videoRef.current, canvasEl: canvasRef.current });
      if (dataUrl) {
        setPhoto(dataUrl);
        endCamera();
      }
    } catch (err) {
      console.error('Gagal mengambil foto: ', err);
      alert('Gagal mengambil foto. Coba lagi.');
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    beginCamera();
  };

  const submit = async (e) => {
     e.preventDefault();
     if (!photo) return alert("Silakan ambil foto biometrik wajah Anda terlebih dahulu!");
     if (submitting) return;

     setSubmitting(true);
     setGeoState({ status: 'checking', message: '' });

     // --- VALIDASI GPS SAAT PENGIRIMAN ---
     // Jika di luar radius / GPS mati / lokasi palsu -> absensi DIBATALKAN,
     // foto tetap dipertahankan agar user bisa pindah lokasi & kirim ulang.
     let location = null;
     try {
        const geoLocations = settings?.geoLocations || [];
        const geoActive = settings?.geoFenceEnabled && geoLocations.length > 0;

        if (geoActive) {
           const pos = await getCurrentPosition();

           if (pos.mockSuspected) {
              setGeoState({
                 status: 'mock',
                 message: 'Absensi dibatalkan. Terdeteksi indikasi lokasi palsu (fake/mock GPS). Nonaktifkan aplikasi fake GPS terlebih dahulu, lalu kirim ulang.',
              });
              setSubmitting(false);
              return;
           }

           const nearest = findNearestGeoFence(pos.lat, pos.lng, geoLocations);
           const withinFence = nearest && nearest.distance <= nearest.radius;

           if (!withinFence) {
              setGeoState({
                 status: 'blocked',
                 message: nearest
                    ? `Absensi dibatalkan. Anda berada di luar radius lokasi. Jarak ke titik terdekat "${nearest.name}" sekitar ${Math.round(nearest.distance)} meter (radius diizinkan ${nearest.radius} meter). Mendekatlah ke lokasi lalu kirim ulang.`
                    : 'Absensi dibatalkan. Belum ada titik lokasi absensi yang dikonfigurasi oleh admin.',
              });
              setSubmitting(false);
              return;
           }

           location = pos;
        }
     } catch (err) {
        console.error('[UserAbsensi] Gagal validasi GPS saat submit:', err);
        const isServicesOff = err?.code === 'LOCATION_SERVICES_DISABLED';
        const isPermission = err?.code === 'PERMISSION_DENIED' || err?.code === 1;
        let message = 'Absensi dibatalkan. Gagal mendapatkan lokasi GPS. Aktifkan GPS & pastikan sinyal memadai, lalu kirim ulang.';
        if (isServicesOff) {
           message = 'Absensi dibatalkan. GPS/Location Services sedang MATI. Aktifkan GPS lewat Pengaturan > Lokasi, lalu kirim ulang.';
        } else if (isPermission) {
           message = 'Absensi dibatalkan. Izin akses lokasi ditolak. Aktifkan izin GPS/lokasi, lalu kirim ulang.';
        }
        setGeoState({ status: 'error', message });
        setSubmitting(false);
        return;
     }

     // --- LOLOS VALIDASI -> KIRIM OTOMATIS ---
     try {
        // ID deterministik: 1 sesi = 1 dokumen. Absensi mandiri MENIMPA kunci status
        // admin (jika ada) -> otomatis berubah jadi Hadir (buka kunci).
        const docId = `${form.date}_${form.session}_${user.id}`;
        await setDoc(doc(getCollectionPath('attendance'), docId), {
            ...form,
            status: 'Hadir', // Pegawai hanya bisa menandai kehadiran (Hadir)
            userId: user.id,
            userName: user.nama,
            nama: user.nama,
            nip: user.nip || '',
            photoData: photo, // Menyimpan Base64
            statusApproval: 'approved', // Absensi tercatat otomatis, tanpa verifikasi admin
            adminInput: false,
            timestamp: new Date().toISOString(),
            serverTimestamp: serverTimestamp(),
            device: getDeviceType(),
            connectionStatus: navigator.onLine ? 'online' : 'offline',
            location: location ? { lat: location.lat, lng: location.lng, accuracy: location.accuracy } : null,
        });
        setGeoState({ status: 'idle', message: '' });
        alert('Absensi berhasil dikirim.');
        setPhoto(null);
     } catch (error) {
        console.error(error);
        alert('Gagal mengirim absensi. Periksa koneksi internet.');
     } finally {
        setSubmitting(false);
     }
  };

  // Mode Aplikasi: jika admin mewajibkan absensi lewat aplikasi mobile, blokir akses via browser/web view.
  // Ini adalah lapisan pertahanan kedua (kalau ada yang membuka URL ini langsung) —
  // jalur normalnya sudah dicegat lebih dulu oleh MobileOnlyModal di UserHome.jsx.
  if (settings?.mobileOnlyAbsensi && !isNativePlatform()) {
    return (
      <div className="flex flex-col min-h-full items-center justify-center text-center p-8 safe-top">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-5">
          <Smartphone size={40} className="text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Absensi Hanya Bisa Dilakukan Menggunakan Aplikasi</h2>
        <p className="text-sm text-slate-500 max-w-xs">
          Instansi Anda mewajibkan absensi lewat aplikasi mobile resmi. Silakan unduh &amp; buka aplikasinya untuk melakukan absensi.
        </p>
        {settings?.androidDownloadUrl && (
          <a
            href={settings.androidDownloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full max-w-xs mt-8 flex items-center justify-center gap-2 bg-red-700 active:bg-red-800 text-white font-bold py-3.5 rounded-xl shadow-lg transition-colors"
          >
            <Smartphone size={18} /> Download Aplikasi (Android)
          </a>
        )}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full max-w-xs mt-4 flex items-center justify-center gap-2 bg-slate-100 active:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition-colors"
        >
          <Home size={18} /> Kembali ke Beranda
        </button>
      </div>
    );
  }

  if (loadingTime) return (
      <div className="flex h-full items-center justify-center p-10 text-center safe-top">
          <div>
            <RefreshCw className="animate-spin mx-auto text-blue-600 mb-2"/>
            <p className="text-slate-500">Sinkronisasi Waktu Server...</p>
          </div>
      </div>
  );

  const showCamera = !done && canAbsen && !blockMessage;
  const showPanelBack = !showCamera;

  return (
    <div className="camera-screen flex flex-col flex-1 min-h-full bg-slate-900 overflow-hidden relative safe-top">

      {/* BAGIAN KAMERA (Hanya Tampil Jika Bisa Absen & Lolos Validasi Lokasi) */}
      {showCamera && (
        <div className="camera-stage relative flex-1 min-h-0 bg-slate-900 flex flex-col items-center justify-center overflow-hidden">
            {/* Kamera depan dicerminkan (efek selfie); kamera belakang tampil apa adanya. */}
            {!photo ? (
                // Native: preview kamera dirender di lapisan native di belakang webview,
                // jadi area ini dibiarkan transparan. Web: pakai <video> getUserMedia.
                native ? (
                  <div className="absolute inset-0" />
                ) : (
                  <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover absolute inset-0 transform ${facing === 'front' ? 'scale-x-[-1]' : ''}`}></video>
                )
            ) : (
                <img src={photo} alt="Biometrik" className={`w-full h-full object-cover absolute inset-0 transform ${facing === 'front' ? 'scale-x-[-1]' : ''}`} />
            )}
            <canvas ref={canvasRef} width="300" height="400" className="hidden"></canvas>

            {/* Tombol Kembali (Overlay) */}
            <button
                type="button"
                onClick={() => navigate('/')}
                aria-label="Kembali ke Beranda"
                className="absolute left-4 z-20 w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white active:bg-black/60 transition-colors"
                style={{ top: 'max(1rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))' }}
            >
                <ChevronLeft size={26} />
            </button>

            {/* Tombol Ganti Kamera (depan/belakang) — hanya sebelum foto diambil */}
            {!photo && (
                <button
                    type="button"
                    onClick={toggleCamera}
                    aria-label="Ganti kamera depan/belakang"
                    className="absolute right-4 z-20 flex items-center gap-1.5 px-3 h-11 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs font-bold active:bg-black/60 transition-colors"
                    style={{ top: 'max(1rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))' }}
                >
                    <SwitchCamera size={20} />
                    {facing === 'front' ? 'Depan' : 'Belakang'}
                </button>
            )}

            {/* Guide Face */}
            {!photo && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-56 h-72 border-2 border-dashed border-white/60 rounded-[40%] animate-pulse"></div>
                    <p className="absolute bottom-6 text-white text-xs font-bold drop-shadow-md bg-black/50 px-3 py-1 rounded-full">Posisikan wajah Anda di dalam area</p>
                </div>
            )}
            {/* Tombol shutter/kontrol dipindahkan ke panel bawah (card absensi). */}
        </div>
      )}

      {/* PANEL FORM & NOTIFIKASI */}
      <div
        className={`bg-white px-6 ${showCamera ? 'shrink-0 rounded-t-3xl -mt-6 relative z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.15)] pt-5' : 'h-full flex-1 pt-10'}`}
        style={showCamera ? { paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.75rem)' } : { paddingBottom: '1.5rem' }}
      >
          <div className={`text-center relative ${showCamera ? 'mb-4' : 'mb-6'}`}>
              {showPanelBack && (
                <button
                    type="button"
                    onClick={() => navigate('/')}
                    aria-label="Kembali ke Beranda"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full active:bg-slate-100 text-slate-600 transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
              )}
              <h2 className="text-xl font-bold text-slate-800">Absensi Sesi {form.session}</h2>
              <p className="text-xs text-slate-500 mt-1">{formatDateIndo(form.date)} • {serverTime?.toLocaleTimeString('id-ID')}</p>
          </div>

          {blockMessage && !done && (
            <div className="mb-4 bg-red-100 text-red-700 p-4 rounded text-center border border-red-200">
                <AlertTriangle className="mx-auto mb-2" size={32} />
                <p className="font-bold text-sm">{blockMessage}</p>
            </div>
          )}

          {!canAbsen && !done && !blockMessage && (
            <div className="mb-4 bg-yellow-100 text-yellow-800 p-4 rounded-xl text-center border border-yellow-200">
              <Lock size={32} className="mx-auto mb-2 text-yellow-600"/>
              <span className="font-bold block text-lg mb-1">Absensi Ditutup</span>
              <span className="text-sm">Pagi: {settings?.jamMasukAwal || '06:00'}-{settings?.batasAbsenPagi || '10:00'} | Siang: {settings?.jamSiangAwal || '13:00'}-{settings?.batasAbsenSiang || '14:00'} | Sore: {settings?.jamPulangAwal || '16:00'}-{settings?.batasAbsenSore || '18:00'}</span>
            </div>
          )}

          {showCamera && geoState.status === 'checking' && (
            <div className="mb-4 bg-blue-50 text-blue-700 p-4 rounded-xl text-center border border-blue-200">
              <RefreshCw size={28} className="mx-auto mb-2 animate-spin"/>
              <p className="font-bold text-sm">Memvalidasi lokasi GPS & mengirim absensi...</p>
            </div>
          )}

          {showCamera && geoState.status === 'blocked' && (
            <div className="mb-4 bg-orange-100 text-orange-800 p-4 rounded-xl text-center border border-orange-200">
              <MapPin size={32} className="mx-auto mb-2 text-orange-600"/>
              <span className="font-bold block text-lg mb-1">Di Luar Radius Lokasi</span>
              <p className="text-sm">{geoState.message}</p>
            </div>
          )}

          {showCamera && geoState.status === 'mock' && (
            <div className="mb-4 bg-red-100 text-red-800 p-4 rounded-xl text-center border border-red-300">
              <ShieldAlert size={32} className="mx-auto mb-2 text-red-600"/>
              <span className="font-bold block text-lg mb-1">Lokasi Palsu Terdeteksi</span>
              <p className="text-sm">{geoState.message}</p>
            </div>
          )}

          {showCamera && geoState.status === 'error' && (
            <div className="mb-4 bg-yellow-100 text-yellow-800 p-4 rounded-xl text-center border border-yellow-200">
              <AlertTriangle size={32} className="mx-auto mb-2 text-yellow-600"/>
              <p className="font-bold text-sm">{geoState.message}</p>
            </div>
          )}

          {done ? (
              <div className="text-center p-8 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle size={56} className="text-green-600 mx-auto mb-3"/>
                <p className="text-lg font-bold text-green-800">Absensi Selesai</p>
                <p className="text-sm mt-1 text-green-700">Anda sudah absen {form.session} hari ini.</p>
              </div>
          ) : null}

          {showPanelBack && (
              <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-slate-100 active:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition-colors"
              >
                  <Home size={18} /> Kembali ke Beranda
              </button>
          )}

          {!done && (
              <form onSubmit={submit} className="space-y-4">
                {showCamera && (
                    <>
                    <div>
                        <label className="font-bold block mb-1 text-sm text-slate-600">Mode Kerja</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={()=>setForm({...form, workMode: 'WFO'})} className={`p-3 rounded-xl font-bold text-sm transition-all ${form.workMode === 'WFO' ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 text-slate-500'}`}>WFO</button>
                            <button type="button" onClick={()=>setForm({...form, workMode: 'WFH'})} className={`p-3 rounded-xl font-bold text-sm transition-all ${form.workMode === 'WFH' ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 text-slate-500'}`}>WFH</button>
                        </div>
                    </div>
                    </>
                )}

                {/* Belum ada foto -> tombol AMBIL FOTO (dipindahkan ke baris bawah). */}
                {showCamera && !photo && (
                    <button
                        type="button"
                        onClick={takePhoto}
                        className="w-full text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 bg-blue-600 active:bg-blue-700 active:scale-95">
                        <Camera size={20}/> AMBIL FOTO
                    </button>
                )}

                {/* Sudah ada foto -> Foto Ulang + Kirim (validasi GPS saat submit). */}
                {showCamera && photo && (
                    <div className="space-y-2">
                        <button disabled={submitting} className={`w-full text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2
                            ${!submitting ? 'bg-blue-600 active:bg-blue-700 active:scale-95' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                            {submitting ? <RefreshCw size={20} className="animate-spin"/> : <Camera size={20}/>}
                            {submitting ? 'MEMVALIDASI GPS...' : 'KIRIM ABSENSI SEKARANG'}
                        </button>
                        <button
                            type="button"
                            onClick={retakePhoto}
                            disabled={submitting}
                            className="w-full flex items-center justify-center gap-2 bg-slate-100 active:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
                            <RefreshCw size={16} /> Foto Ulang
                        </button>
                    </div>
                )}
              </form>
          )}
      </div>
    </div>
  );
}