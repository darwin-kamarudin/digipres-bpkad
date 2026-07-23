import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, MapPinOff, CheckCircle2, RefreshCw, AlertTriangle, ShieldOff } from 'lucide-react';
import { getCurrentPosition, findNearestGeoFence } from '../../lib/geolocation';
import MobileHeader from './MobileHeader';

// Kumpulan status pemeriksaan lokasi beserta tampilannya (ikon, warna, pesan formal)
const STATUS_META = {
  checking: {
    icon: RefreshCw,
    spin: true,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    title: 'Memeriksa Status Lokasi...',
  },
  gps_off: {
    icon: MapPinOff,
    color: 'text-red-700 bg-red-50 border-red-300',
    title: 'GPS Tidak Aktif',
  },
  permission_denied: {
    icon: ShieldOff,
    color: 'text-orange-700 bg-orange-50 border-orange-300',
    title: 'Izin Lokasi Ditolak',
  },
  error: {
    icon: AlertTriangle,
    color: 'text-yellow-700 bg-yellow-50 border-yellow-300',
    title: 'Gagal Memeriksa Lokasi',
  },
  disabled: {
    icon: MapPin,
    color: 'text-slate-600 bg-slate-50 border-slate-300',
    title: 'Validasi Lokasi Tidak Diaktifkan',
  },
  inside: {
    icon: CheckCircle2,
    color: 'text-green-700 bg-green-50 border-green-300',
    title: 'Di Dalam Jangkauan',
  },
  outside: {
    icon: MapPinOff,
    color: 'text-red-700 bg-red-50 border-red-300',
    title: 'Di Luar Jangkauan',
  },
};

export default function UserStatusLokasi({ settings }) {
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'checking', message: '', detail: null });

  const runCheck = useCallback(async () => {
    setState({ status: 'checking', message: 'Memeriksa status GPS dan radius lokasi absensi Anda...', detail: null });

    const geoLocations = settings?.geoLocations || [];
    const geoActive = settings?.geoFenceEnabled && geoLocations.length > 0;

    let pos;
    try {
      pos = await getCurrentPosition();
    } catch (err) {
      console.error('[UserStatusLokasi] Gagal ambil lokasi:', err);
      if (err?.code === 'LOCATION_SERVICES_DISABLED') {
        setState({
          status: 'gps_off',
          message: 'Location Services (GPS) pada perangkat Anda sedang TIDAK AKTIF. Mohon aktifkan GPS melalui Pengaturan perangkat, kemudian periksa kembali status lokasi.',
          detail: null,
        });
      } else if (err?.code === 'PERMISSION_DENIED' || err?.code === 1) {
        setState({
          status: 'permission_denied',
          message: 'Aplikasi belum memiliki izin untuk mengakses lokasi perangkat. Mohon aktifkan izin lokasi untuk aplikasi ini melalui Pengaturan perangkat.',
          detail: null,
        });
      } else {
        setState({
          status: 'error',
          message: 'Gagal mendapatkan lokasi GPS. Pastikan sinyal GPS memadai (usahakan berada di area terbuka), lalu coba periksa kembali.',
          detail: null,
        });
      }
      return;
    }

    if (!geoActive) {
      setState({
        status: 'disabled',
        message: 'Validasi lokasi absensi belum diaktifkan oleh admin untuk instansi Anda. Absensi dapat dilakukan tanpa pembatasan radius lokasi.',
        detail: pos,
      });
      return;
    }

    const nearest = findNearestGeoFence(pos.lat, pos.lng, geoLocations);
    const withinFence = nearest && nearest.distance <= nearest.radius;

    if (withinFence) {
      setState({
        status: 'inside',
        message: `Anda berada DI DALAM radius lokasi absensi "${nearest.name}" (sekitar ${Math.round(nearest.distance)} meter dari titik pusat). Anda dapat melakukan absensi dari posisi ini.`,
        detail: { pos, nearest },
      });
    } else {
      setState({
        status: 'outside',
        message: nearest
          ? `Anda berada DI LUAR jangkauan radius lokasi absensi. Titik terdekat "${nearest.name}" berjarak sekitar ${Math.round(nearest.distance)} meter, melebihi radius yang diizinkan (${nearest.radius} meter). Mohon mendekat ke lokasi kantor untuk dapat melakukan absensi.`
          : 'Belum ada titik lokasi absensi yang dikonfigurasi oleh admin.',
        detail: { pos, nearest },
      });
    }
  }, [settings]);

  useEffect(() => { runCheck(); }, [runCheck]);

  const meta = STATUS_META[state.status];
  const Icon = meta.icon;

  return (
    <div className="min-h-full bg-slate-50 flex flex-col font-sans safe-bottom">
      <MobileHeader title="Status Lokasi Absensi" onBack={() => navigate('/')} />

      <div className="max-w-md w-full mx-auto p-5">
        <div className={`border-2 rounded-2xl p-6 text-center ${meta.color}`}>
          <Icon size={48} className={`mx-auto mb-3 ${meta.spin ? 'animate-spin' : ''}`} />
          <h2 className="font-black text-lg mb-2">{meta.title}</h2>
          <p className="text-sm leading-relaxed">{state.message}</p>
        </div>

        {state.detail?.pos && (
          <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-4 text-sm space-y-2">
            <h3 className="font-bold text-slate-700 text-xs uppercase mb-2">Detail Pemeriksaan</h3>
            <div className="flex justify-between">
              <span className="text-slate-500">Koordinat</span>
              <span className="font-mono text-slate-800">{state.detail.pos.lat.toFixed(6)}, {state.detail.pos.lng.toFixed(6)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Akurasi</span>
              <span className="font-mono text-slate-800">± {Math.round(state.detail.pos.accuracy)} meter</span>
            </div>
            {state.detail.nearest && (
              <div className="flex justify-between">
                <span className="text-slate-500">Titik Terdekat</span>
                <span className="font-bold text-slate-800 text-right">{state.detail.nearest.name}</span>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={runCheck}
          disabled={state.status === 'checking'}
          className="w-full mt-5 flex items-center justify-center gap-2 bg-red-700 active:bg-red-800 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={state.status === 'checking' ? 'animate-spin' : ''} />
          Periksa Ulang
        </button>
      </div>
    </div>
  );
}
