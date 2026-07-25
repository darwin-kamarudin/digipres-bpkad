import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ArrowLeftCircle, Fingerprint } from 'lucide-react';
import MobileHeader from './MobileHeader';
import { loadProfilePhoto } from '../../lib/localDb';
import { isBiometricAvailable, authenticateWithBiometric } from '../../lib/biometric';
import pkg from '../../../package.json';

export default function UserPengaturan({ user, settings, onLogout, biometricLoginEnabled, onSetBiometricLoginEnabled }) {
  const navigate = useNavigate();
  const [photoUrl, setPhotoUrl] = useState(null);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);

  // Muat foto profil dari IndexedDB (sama dengan yang diupload di Beranda)
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

  // Tombol toggle sidik jari hanya muncul kalau perangkat native & punya hardware biometrik
  useEffect(() => {
    isBiometricAvailable().then(setBioAvailable);
  }, []);

  const handleToggleBiometric = async (checked) => {
    if (bioBusy) return;
    setBioBusy(true);
    try {
      if (checked) {
        // Wajib verifikasi sidik jari dulu sebelum benar-benar mengaktifkan,
        // supaya yakin sidik jari pemilik akun yang terdaftar di perangkat ini.
        await authenticateWithBiometric('Aktifkan login sidik jari untuk aplikasi ini');
        await onSetBiometricLoginEnabled(true);
      } else {
        await onSetBiometricLoginEnabled(false);
      }
    } catch (err) {
      if (err?.code && err.code !== 'userCancel' && err.code !== 'appCancel') {
        alert('Verifikasi sidik jari gagal. Fitur tidak diaktifkan.');
      }
    } finally {
      setBioBusy(false);
    }
  };

  const handleLogout = () => {
    const confirmMessage = biometricLoginEnabled
      ? 'Yakin ingin keluar dari aplikasi? Login berikutnya cukup dengan sidik jari.'
      : 'Yakin ingin keluar dari aplikasi? Anda perlu login ulang dengan username & password.';
    if (!confirm(confirmMessage)) return;
    onLogout();
  };

  return (
    <div className="min-h-full bg-slate-50 flex flex-col font-sans safe-bottom">
      <MobileHeader title="Profil" onBack={() => navigate('/')} />

      <div className="max-w-md w-full mx-auto p-5 pt-8">

        <div className="bg-white border-2 border-red-600 rounded-2xl p-6 text-center mb-6">
          <div className="w-24 h-24 rounded-full border-4 border-red-600 bg-white flex items-center justify-center text-red-600 font-black text-3xl mx-auto mb-3 overflow-hidden">
            {photoUrl ? (
              <img src={photoUrl} alt="Foto Profil" className="w-full h-full object-cover" />
            ) : (
              user.nama.charAt(0)
            )}
          </div>
          <h2 className="font-black text-slate-800 uppercase">{user.nama}</h2>
          <p className="text-sm text-slate-500">NIP. {user.nip || '-'}</p>
          <p className="text-sm text-slate-500">Status: ASN {user.statusPegawai || '-'}</p>
          <p className="text-sm text-slate-500">Jabatan: {user.jabatan || '-'}</p>
          <p className="text-sm text-slate-500 uppercase">{settings?.opdName}</p>
        </div>

        {bioAvailable && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 flex items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className={`mt-0.5 p-2 rounded-lg flex-shrink-0 ${biometricLoginEnabled ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                <Fingerprint size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-800 text-sm">Login Sidik Jari</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {biometricLoginEnabled
                    ? 'Aktif — Anda bisa masuk tanpa username/password selama belum logout.'
                    : 'Aktifkan untuk masuk lebih cepat tanpa mengetik ulang username/password.'}
                </p>
              </div>
            </div>
            <label className={`relative inline-flex items-center flex-shrink-0 ${bioBusy ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                className="sr-only peer"
                checked={!!biometricLoginEnabled}
                disabled={bioBusy}
                onChange={(e) => handleToggleBiometric(e.target.checked)}
              />
              <div className="w-12 h-7 bg-gray-300 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>
        )}

        <p className="text-[11px] text-slate-400 text-center mb-6 px-4">
          {biometricLoginEnabled
            ? 'Login sidik jari aktif — setelah Logout, masuk berikutnya cukup dengan sidik jari tanpa perlu mengetik ulang username & password.'
            : 'Login sidik jari belum aktif. Aktifkan toggle di atas supaya setelah Logout, masuk berikutnya cukup dengan sidik jari — kalau tidak diaktifkan, Anda perlu login ulang dengan username & password.'}
        </p>

        <h1 className="text-center font-bold text-slate-700 mb-6">Keluar Aplikasi?</h1>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-700 active:bg-red-800 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all"
          >
            <LogOut size={20} /> Logout
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 bg-slate-200 active:bg-slate-300 text-slate-700 font-bold py-4 rounded-2xl active:scale-95 transition-all"
          >
            <ArrowLeftCircle size={20} /> Kembali
          </button>
        </div>

        {/* IDENTITAS APLIKASI */}
        <p className="text-[11px] text-slate-400 text-center leading-relaxed mt-8 px-2">
          <span className="font-bold text-slate-500">DigiPres</span> (Digital Presensi) adalah solusi presensi digital akurat dan responsif yang dikembangkan oleh <span className="font-semibold text-slate-500">Darwin Kamarudin</span>. Aplikasi ini dilengkapi fitur verifikasi biometrik wajah, validasi lokasi, dan anti-rekayasa GPS. Desain antarmuka (UI/UX) DigiPres mengadaptasi 80% tata letak Aplikasi Presensi Sistem Informasi Kepegawaian Nasional RI guna memberikan pengalaman pengguna yang familier dan standar.
        </p>
        <p className="text-[10px] text-slate-300 text-center mt-2 pb-2">
          Versi {pkg.version}
        </p>
      </div>
    </div>
  );
}
