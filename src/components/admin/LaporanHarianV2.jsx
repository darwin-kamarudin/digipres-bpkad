import React from 'react';

// "Format BKPSDMA" (v2): satu tabel gabungan (identitas OPD, ringkasan angka,
// lalu rincian nama per status). TTD-nya ditangani oleh LaporanHarianDocument.jsx
// (di luar komponen ini), berbeda dengan v1 yang mengurus TTD-nya sendiri.
export default function LaporanHarianV2({
  settings, session, counts,
  hadirList, sakitList, izinList, cutiList, dlList, alpaList,
}) {
  return (
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
                    <li key={emp.id} className="font-medium text-red-600">
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
            <td colSpan="2" className="border border-black p-2 font-bold text-center uppercase bg-gray-50">
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
  );
}
