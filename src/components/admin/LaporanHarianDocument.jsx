import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatDateIndo, formatDateNoWeekday, DEFAULT_LOGO_URL } from '../../utils/helpers';

// Badan dokumen Laporan Absensi Harian (kop surat, tabel rekap, tanda tangan).
// Diekstrak dari AdminLaporanHarian.jsx supaya bisa dipakai bersama oleh versi
// web dan versi mobile-native (AdminMobileLaporanHarian.jsx) tanpa duplikasi
// logika cetak/format dokumen resmi ini.
export default function LaporanHarianDocument({
  settings, date, session, isNonEffective, holidayData,
  printTemplate, showSignature, counts,
  hadirList, sakitList, izinList, cutiList, dlList, alpaList, listTidakHadir,
}) {
  return (
    <div className="bg-white p-10 rounded shadow-lg print:shadow-none print:w-full print:p-0">
      {/* KOP SURAT */}
      <div className="flex border-b-4 border-double border-black pb-4 mb-6 items-center justify-center relative">
        <img src={settings.logoUrl || DEFAULT_LOGO_URL} className="h-20 absolute left-0" alt="Logo" />
        <div className="text-center px-20">
          <h3 className="text-xl font-bold uppercase">{settings.parentAgency}</h3>
          <h1 className="text-xl font-bold uppercase">{settings.opdName}</h1>
          <p className="text-sm italic">{settings.address}</p>
        </div>
      </div>

      {/* JUDUL */}
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold underline uppercase">Laporan Absensi Harian</h2>
        <p className="font-medium">Hari/Tanggal: {formatDateIndo(date)} - Sesi {session}</p>
      </div>

      {/* KONDISIONAL TAMPILAN BERDASARKAN HARI LIBUR/WEEKEND */}
      {isNonEffective ? (
        <div className="border-2 border-dashed border-red-400 bg-red-50 p-12 rounded-lg text-center my-8">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-red-700 uppercase mb-2">
            {holidayData ? "INFORMASI HARI LIBUR NASIONAL / CUTI BERSAMA" : "HARI NON-EFEKTIF (LIBUR AKHIR PEKAN)"}
          </h3>
          <p className="text-lg font-medium text-slate-700">
            {holidayData ? `Keterangan: ${holidayData.desc}` : "Tidak Ada Data Absensi untuk Hari Minggu dan Hari Sabtu karena merupakan hari Non-Efektif."}
          </p>
          <p className="text-sm text-slate-500 mt-2 italic">(Sistem tidak mencatat absensi pada hari ini)</p>
        </div>
      ) : (
        <>
          {/* KONTEN TABEL JIKA BUKAN HARI LIBUR */}
          {printTemplate === 'v1' && (
            <>
              <div className="grid grid-cols-2 gap-8 mb-6 text-sm">
                <div className="border border-black p-4">
                  <h3 className="font-bold border-b border-black mb-2 pb-1">Statistik Kehadiran</h3>
                  <div className="flex justify-between mb-1"><span>Jumlah</span> <span className="font-bold">{counts.TotalPegawai} Orang</span></div>
                  <div className="flex justify-between mb-1"><span>Kurang</span> <span className="font-bold">{counts.TotalKurang} Orang</span></div>

                  <div className="flex justify-between mb-1"><span>Hadir</span> <span>{counts.Hadir} Orang</span></div>
                  <div className="flex justify-between mt-2 pt-2 border-t border-dotted border-black font-bold">
                    <span>Total Efektif</span> <span>{counts.Hadir} Orang</span>
                  </div>
                </div>
                <div className="border border-black p-4">
                  <h3 className="font-bold border-b border-black mb-2 pb-1">Keterangan</h3>
                  <div className="flex justify-between mb-1"><span>Tugas / Dinas Luar / Perjalanan Dinas</span> <span>{counts.DL} Orang</span></div>
                  <div className="flex justify-between mb-1"><span>Izin</span> <span>{counts.Izin} Orang</span></div>
                  <div className="flex justify-between mb-1"><span>Sakit</span> <span>{counts.Sakit} Orang</span></div>
                  <div className="flex justify-between mb-1"><span>Cuti</span> <span>{counts.Cuti} Orang</span></div>
                  <div className="flex justify-between mb-1 font-bold text-red-600 print:text-black"><span>Tanpa Keterangan</span> <span>{counts.Alpa} Orang</span></div>
                  <div className="flex justify-between mt-2 pt-2 border-t border-dotted border-black font-bold">
                    <span>Total Tidak Hadir</span> <span>{counts.TotalKurang} Orang</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold mb-2 text-sm uppercase underline">Rincian dan Keterangan:</h3>
                <table className="w-full border-collapse border border-black text-sm">
                  <thead>
                    <tr className="bg-gray-100 print:bg-transparent">
                      <th className="border border-black p-2 w-12">No</th>
                      <th className="border border-black p-2 text-left">Nama Pegawai</th>
                      <th className="border border-black p-2 text-left">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listTidakHadir.length > 0 ? (
                      listTidakHadir.map((emp, i) => {
                        let displayStatus = emp.status;
                        let cellClass = "border border-black p-2";

                        if (emp.status === 'Alpa (Tanpa Ket.)') {
                          cellClass += " font-bold text-red-600";
                        } else if (emp.status === 'Dinas Luar') {
                          displayStatus = 'Dinas Luar (Perjalanan Dinas)';
                        }

                        return (
                          <tr key={emp.id}>
                            <td className="border border-black p-2 text-center">{i + 1}</td>
                            <td className="border border-black p-2 font-bold">{emp.nama}</td>
                            <td className={cellClass}>{displayStatus}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan="3" className="border border-black p-4 text-center italic">Nihil (Semua Pegawai Hadir)</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {printTemplate === 'v2' && (
            <div className="text-sm">
              <table className="w-full border-collapse border border-black">
                <tbody>
                  <tr>
                    <td className="border border-black p-2 font-bold w-1/3 align-top">OPD</td>
                    <td className="border border-black p-2 font-bold align-top uppercase">{settings.opdName}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2 font-bold align-top">JUMLAH</td>
                    <td className="border border-black p-2 font-bold align-top">{counts.TotalPegawai} Orang</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2 font-bold align-top">KURANG</td>
                    <td className="border border-black p-2 font-bold align-top">{counts.TotalKurang} Orang</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2 font-bold align-top">HADIR</td>
                    <td className="border border-black p-2 font-bold align-top">{counts.Hadir} Orang</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2 font-bold align-top">KETERANGAN</td>
                    <td className="border border-black p-2 align-top">
                      <div className="flex flex-col gap-1">
                        <div><b>TUGAS</b> :  {counts.DL}  ORANG</div>
                        <div><b>IZIN</b> :  {counts.Izin}  ORANG</div>
                        <div><b>CUTI</b> :  {counts.Cuti}  ORANG</div>
                        <div><b>SAKIT</b> :  {counts.Sakit}  ORANG</div>
                        <div><b>TANPA KETERANGAN</b> : {counts.Alpa}  ORANG</div>
                      </div>
                    </td>
                  </tr>

                  {/* --- BARIS DETAIL NAMA PEGAWAI --- */}

                  {/* 1. TANPA KETERANGAN (Alpa) */}
                  <tr>
                    <td className="border border-black p-2 font-bold align-top">TANPA KETERANGAN</td>
                    <td className="border border-black p-2 align-top">
                      {alpaList.length > 0 ? (
                        <ol className="list-decimal list-inside pl-1 m-0">
                          {alpaList.map(emp => (
                            <li key={emp.id} className="font-medium text-red-600 print:text-black">
                              {emp.nama}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <span className="italic text-gray-500">- Nihil -</span>
                      )}
                    </td>
                  </tr>

                  {/* BARIS HEADER 'HADIR' (MERGED) & ISI 3 KOLOM */}
                  <tr>
                    <td colSpan="2" className="border border-black p-2 font-bold text-center uppercase bg-gray-50 print:bg-transparent">
                      JUMLAH PEGAWAI EFEKTIF HARI INI: HADIR APEL {session}
                    </td>
                  </tr>

                  <tr>
                    <td colSpan="2" className="border border-black p-2 align-top">
                      {hadirList.length > 0 ? (
                        (() => {
                          const total = hadirList.length;
                          const partSize = Math.ceil(total / 3);

                          const col1 = hadirList.slice(0, partSize);
                          const col2 = hadirList.slice(partSize, partSize * 2);
                          const col3 = hadirList.slice(partSize * 2);

                          return (
                            <div className="grid grid-cols-3 gap-x-4">
                              <ol className="list-decimal list-inside pl-1 m-0" start={1}>
                                {col1.map(emp => (
                                  <li key={emp.id} className="font-medium text-slate-800">
                                    {emp.nama}
                                  </li>
                                ))}
                              </ol>

                              <ol className="list-decimal list-inside pl-1 m-0" start={partSize + 1}>
                                {col2.map(emp => (
                                  <li key={emp.id} className="font-medium text-slate-800">
                                    {emp.nama}
                                  </li>
                                ))}
                              </ol>

                              <ol className="list-decimal list-inside pl-1 m-0" start={(partSize * 2) + 1}>
                                {col3.map(emp => (
                                  <li key={emp.id} className="font-medium text-slate-800">
                                    {emp.nama}
                                  </li>
                                ))}
                              </ol>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="text-center italic text-gray-500">- Nihil -</div>
                      )}
                    </td>
                  </tr>

                  {/* 2. TUGAS / DL */}
                  <tr>
                    <td className="border border-black p-2 font-bold align-top">TUGAS / DINAS LUAR / PERJALANAN DINAS</td>
                    <td className="border border-black p-2 align-top">
                      {dlList.length > 0 ? (
                        <ol className="list-decimal list-inside pl-1 m-0">
                          {dlList.map(emp => (
                            <li key={emp.id} className="font-medium">
                              {emp.nama}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <span className="italic text-gray-500">- Nihil -</span>
                      )}
                    </td>
                  </tr>

                  {/* 3. IZIN */}
                  <tr>
                    <td className="border border-black p-2 font-bold align-top">IZIN</td>
                    <td className="border border-black p-2 align-top">
                      {izinList.length > 0 ? (
                        <ol className="list-decimal list-inside pl-1 m-0">
                          {izinList.map(emp => (
                            <li key={emp.id} className="font-medium">
                              {emp.nama}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <span className="italic text-gray-500">- Nihil -</span>
                      )}
                    </td>
                  </tr>

                  {/* 4. SAKIT */}
                  <tr>
                    <td className="border border-black p-2 font-bold align-top">SAKIT</td>
                    <td className="border border-black p-2 align-top">
                      {sakitList.length > 0 ? (
                        <ol className="list-decimal list-inside pl-1 m-0">
                          {sakitList.map(emp => (
                            <li key={emp.id} className="font-medium">
                              {emp.nama}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <span className="italic text-gray-500">- Nihil -</span>
                      )}
                    </td>
                  </tr>

                  {/* 5. CUTI */}
                  <tr>
                    <td className="border border-black p-2 font-bold align-top">CUTI</td>
                    <td className="border border-black p-2 align-top">
                      {cutiList.length > 0 ? (
                        <ol className="list-decimal list-inside pl-1 m-0">
                          {cutiList.map(emp => (
                            <li key={emp.id} className="font-medium">
                              {emp.nama}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <span className="italic text-gray-500">- Nihil -</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* TANDA TANGAN (KONDISIONAL) */}
      {showSignature && (
        <div className="mt-4 flex justify-end text-center">
          <div className="min-w-[200px] w-auto px-4">
            <p className="mb-4">{settings.titimangsa || 'Bobong'}, {formatDateNoWeekday(date)}</p>

            <p>Mengetahui,</p>
            <p>{settings.kepalaJabatan || `Kepala ${settings.opdName}`}</p>

            <br /><br /><br /><br />

            <p className="font-bold underline whitespace-nowrap">{settings.kepalaName || '_________________________'}</p>
            <p>NIP. {settings.kepalaNip || '..............................'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
