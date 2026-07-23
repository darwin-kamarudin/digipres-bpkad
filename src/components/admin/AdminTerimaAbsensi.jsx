import React from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { updateDoc, doc } from 'firebase/firestore';
import { db, getCollectionPath } from '../../lib/firebase';
import { formatDateIndo } from '../../utils/helpers';

// TERIMA PROPS 'pendingAbsensi' (Bukan attendance lagi)
export default function AdminTerimaAbsensi({ employees, pendingAbsensi = [] }) {
  
  // Data sudah difilter 'pending' dari useAppData, kita urutkan lagi biar yang terbaru di atas
  const pendingList = [...pendingAbsensi].sort((a,b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

  const process = async (id, status) => {
     // Konfirmasi tindakan
     const actionText = status === 'approved' ? 'Menerima' : 'Menolak';
     if(!confirm(`Apakah Anda yakin ingin ${actionText} absensi ini?`)) return;
     
     try {
        await updateDoc(doc(getCollectionPath('attendance'), id), { statusApproval: status });
     } catch (error) {
        console.error("Gagal update status:", error);
        alert("Terjadi kesalahan saat memproses data.");
     }
  };

  return (
    <div className="bg-white p-6 rounded shadow-sm animate-in fade-in duration-300">
       <h2 className="text-xl font-bold mb-6 flex items-center text-slate-800">
         <CheckCircle className="mr-2 text-blue-600"/> Verifikasi Absensi Masuk
       </h2>
       
       {pendingList.length === 0 ? (
          <div className="text-center p-12 bg-slate-50 text-slate-500 rounded border-2 border-dashed flex flex-col items-center">
             <CheckCircle size={48} className="text-slate-300 mb-2"/>
             <p>Tidak ada absensi baru yang menunggu persetujuan.</p>
          </div>
       ) : (
          <div className="grid gap-4">
             {pendingList.map(log => (
                <div key={log.id} className="border p-4 rounded-lg bg-yellow-50 flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm hover:shadow-md transition-shadow">
                   <div className="mb-4 md:mb-0">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-lg text-slate-800">{log.userName}</div>
                        <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full font-bold uppercase">
                            {log.status}
                        </span>
                      </div>
                      
                      <div className="text-sm text-slate-600 mt-1 flex items-center gap-2">
                         <span className="text-slate-400">📅</span> 
                         <span>{formatDateIndo(log.date)}</span>
                         <span>•</span>
                         <span>Sesi {log.session}</span>
                      </div>
                      
                      <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                         <Clock size={12}/>
                         Dikirim: {log.timestamp ? new Date(log.timestamp).toLocaleString('id-ID') : '-'}
                      </div>
                   </div>
                   
                   <div className="flex gap-2 w-full md:w-auto">
                      <button 
                        onClick={()=>process(log.id, 'rejected')} 
                        className="flex-1 md:flex-none bg-white border border-red-200 text-red-600 px-4 py-2 rounded hover:bg-red-50 font-bold text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <XCircle size={16}/> Tolak
                      </button>
                      <button 
                        onClick={()=>process(log.id, 'approved')} 
                        className="flex-1 md:flex-none bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={16}/> Terima
                      </button>
                   </div>
                </div>
             ))}
          </div>
       )}
    </div>
  );
}