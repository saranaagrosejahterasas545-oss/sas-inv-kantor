'use client';

import { useState, useEffect } from 'react';

export default function LaporanPage() {
  const [dataTransaksi, setDataTransaksi] = useState([]);
  const [dataBarang, setDataBarang] = useState([]);
  const [loading, setLoading] = useState(true);

  // State untuk Filter & Mode Tampilan
  const [modeTampilan, setModeTampilan] = useState('transaksi'); // 'transaksi' atau 'rekap'
  const [filterWaktu, setFilterWaktu] = useState('semua');
  const [filterBulan, setFilterBulan] = useState('');
  const [filterJenis, setFilterJenis] = useState('semua');

  // STATE UNTUK PAGINATION (HALAMAN)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const fetchData = async () => {
    try {
      const response = await fetch('/api/sas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "GET_DATA" })
      });
      const result = await response.json();
      
      if (result.success) {
        setDataTransaksi(result.data.transaksi.reverse());
        setDataBarang(result.data.barang);
      }
    } catch (err) {
      alert("Gagal memuat data laporan dari server.");
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Kembalikan ke halaman 1 setiap kali filter atau mode diubah
  useEffect(() => {
    setCurrentPage(1);
  }, [filterWaktu, filterBulan, filterJenis, modeTampilan]);

  // ================= LOGIKA FILTER DATA =================
  const filteredData = dataTransaksi.filter(trx => {
    if (filterJenis !== 'semua') {
      if (filterJenis === 'OPNAME' && !trx.jenis.startsWith('OPNAME')) return false;
      if (filterJenis !== 'OPNAME' && trx.jenis !== filterJenis) return false;
    }

    if (filterWaktu !== 'semua') {
      if (!trx.waktu_raw) return true;
      const d = new Date(trx.waktu_raw);
      if (isNaN(d)) return true;
      const now = new Date();
      
      if (filterWaktu === 'minggu') {
        const lastWeek = new Date(); lastWeek.setDate(now.getDate() - 7);
        if (d < lastWeek) return false;
      } 
      else if (filterWaktu === 'bulan') {
        if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
      } 
      else if (filterWaktu === 'tahun') {
        if (d.getFullYear() !== now.getFullYear()) return false;
      } 
      else if (filterWaktu === 'bulan_pilih') {
        if (!filterBulan) return true;
        const [y, m] = filterBulan.split('-');
        if (d.getFullYear() !== parseInt(y) || d.getMonth() !== (parseInt(m) - 1)) return false;
      }
    }
    return true;
  });

  // ================= HITUNG RINGKASAN & REKAP BARANG =================
  let counterMasuk = {}; let totalQtyMasuk = 0; let totalNominalMasuk = 0;
  let counterKeluar = {}; let totalQtyKeluar = 0; let totalNominalKeluar = 0;
  
  // Objek khusus untuk Tampilan Rekap/Peringkat
  let rekapObj = {};

  filteredData.forEach(t => {
    const qty = Number(t.jumlah) || Number(t.qty) || 1; 
    const nominal = Number(t.total_biaya) || 0;
    const namaBarang = t.barang_nama || "Barang Tidak Diketahui";

    // Kumpulkan untuk tabel Rekap
    if (!rekapObj[namaBarang]) {
      rekapObj[namaBarang] = { nama: namaBarang, masuk: 0, keluar: 0, opname: 0, total_nominal: 0 };
    }
    rekapObj[namaBarang].total_nominal += nominal;

    if (t.jenis === 'MASUK') {
      totalQtyMasuk += qty;
      totalNominalMasuk += nominal;
      counterMasuk[namaBarang] = (counterMasuk[namaBarang] || 0) + qty;
      rekapObj[namaBarang].masuk += qty;
    } 
    else if (t.jenis === 'KELUAR') {
      totalQtyKeluar += qty;
      totalNominalKeluar += nominal;
      counterKeluar[namaBarang] = (counterKeluar[namaBarang] || 0) + qty;
      rekapObj[namaBarang].keluar += qty;
    }
    else if (t.jenis.startsWith('OPNAME')) {
      rekapObj[namaBarang].opname += qty;
    }
  });

  // Urutkan untuk Top 5 Kartu Atas
  const topMasuk = Object.entries(counterMasuk).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topKeluar = Object.entries(counterKeluar).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Urutkan untuk Tabel Peringkat (Rekap)
  const rekapArray = Object.values(rekapObj).sort((a, b) => {
    if (filterJenis === 'KELUAR') return b.keluar - a.keluar;
    if (filterJenis === 'MASUK') return b.masuk - a.masuk;
    return (b.keluar + b.masuk) - (a.keluar + a.masuk); 
  });

  // ================= LOGIKA PAGINATION DINAMIS =================
  const dataToPaginate = modeTampilan === 'transaksi' ? filteredData : rekapArray;
  const totalPages = Math.ceil(dataToPaginate.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = dataToPaginate.slice(indexOfFirstItem, indexOfLastItem);

  // ================= FUNGSI EXPORT EXCEL =================
  const handleExportExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (modeTampilan === 'transaksi') {
      csvContent += "ID Transaksi,Tanggal,Jenis,Armada Truk,Detail Barang,Odo (KM),Target Ganti Berikutnya (KM),Total Biaya (Rp)\n";
      filteredData.forEach(trx => {
        let targetKm = "-";
        if (trx.jenis === 'KELUAR' && trx.odo && trx.odo !== "-") {
          const brg = dataBarang.find(b => b.nama === trx.barang_nama || b.id === trx.idBarang);
          const batas = brg ? (Number(brg.batas_km) || 0) : 0;
          if (batas > 0) targetKm = Number(trx.odo) + batas;
        }

        const row = [ trx.id, `"${trx.waktu_str}"`, trx.jenis, `"${trx.truk_nama}"`, `"${trx.barang_nama}"`, trx.odo !== "-" ? trx.odo : "0", targetKm, trx.total_biaya ].join(",");
        csvContent += row + "\n";
      });
    } else {
      csvContent += "Nama Barang,Total Qty Masuk,Total Qty Keluar,Opname,Total Mutasi Uang (Rp)\n";
      rekapArray.forEach(r => {
        const row = [ `"${r.nama}"`, r.masuk, r.keluar, r.opname, r.total_nominal ].join(",");
        csvContent += row + "\n";
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_${modeTampilan.toUpperCase()}_SAS_${new Date().getTime()}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const getTeksPeriode = () => {
    if (filterWaktu === 'semua') return "Semua Waktu";
    if (filterWaktu === 'minggu') return "7 Hari Terakhir";
    if (filterWaktu === 'bulan') return "Bulan Ini";
    if (filterWaktu === 'tahun') return "Tahun Ini";
    if (filterWaktu === 'bulan_pilih' && filterBulan) {
      const [tahun, bulan] = filterBulan.split('-');
      const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      return `${namaBulan[parseInt(bulan) - 1]} ${tahun}`;
    }
    return "Semua Waktu";
  };

  const getTeksJenis = () => {
    if (filterJenis === 'semua') return "Semua Transaksi";
    if (filterJenis === 'MASUK') return "Barang Masuk (Restok)";
    if (filterJenis === 'KELUAR') return "Barang Keluar (Servis)";
    if (filterJenis === 'OPNAME') return "Stock Opname (Penyesuaian)";
    return filterJenis;
  };

  if (loading) return <div style={{ padding: '20px' }}><h3>Menyusun Laporan... ⏳</h3></div>;

  return (
    <div>
      <div className="print-hide">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h1 style={{ color: '#1798D1', marginBottom: '5px' }}>📊 Laporan & Analitik</h1>
            <p style={{ color: '#666', marginBottom: '20px' }}>Filter data transaksi dan ekspor ke Excel untuk laporan manajemen.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => window.print()} style={{ background: '#555', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              🖨️ Cetak
            </button>
            <button onClick={handleExportExcel} style={{ background: '#05CD99', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              📗 Download Excel
            </button>
          </div>
        </div>

        {/* KOTAK FILTER & MODE TAMPILAN */}
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#1798D1' }}>Tampilan Laporan:</label>
            <select value={modeTampilan} onChange={(e) => setModeTampilan(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #1798D1', fontWeight: 'bold', background: '#f0f9ff' }}>
              <option value="transaksi">📝 Detail Riwayat Transaksi</option>
              <option value="rekap">🏆 Peringkat Barang (Total Qty)</option>
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Filter Jangka Waktu:</label>
            <select value={filterWaktu} onChange={(e) => setFilterWaktu(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}>
              <option value="semua">Semua Waktu</option>
              <option value="minggu">7 Hari Terakhir</option>
              <option value="bulan">Bulan Ini</option>
              <option value="bulan_pilih">Pilih Bulan Tertentu...</option>
              <option value="tahun">Tahun Ini</option>
            </select>
            {filterWaktu === 'bulan_pilih' && <input type="month" value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #1798D1', marginTop: '10px' }} />}
          </div>

          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Filter Jenis Transaksi:</label>
            <select value={filterJenis} onChange={(e) => setFilterJenis(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}>
              <option value="semua">Semua Transaksi</option>
              <option value="MASUK">Barang Masuk (Restok)</option>
              <option value="KELUAR">Barang Keluar (Servis)</option>
              <option value="OPNAME">Stock Opname (Penyesuaian)</option>
            </select>
          </div>
        </div>
      </div>

      {/* KARTU RINGKASAN & TOP RANKING */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '25px' }}>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '15px', borderLeft: '6px solid #ff4d4f', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h4 style={{ color: '#888', textTransform: 'uppercase', fontSize: '12px', marginBottom: '5px' }}>Total Biaya Keluar (Servis)</h4>
          <h2 style={{ color: '#ff4d4f', fontSize: '26px', marginBottom: '5px' }}>Rp {totalNominalKeluar.toLocaleString('id-ID')}</h2>
          <p style={{ color: '#555', fontSize: '14px', marginBottom: '15px' }}>Total Qty Keluar: <strong>{totalQtyKeluar} Unit</strong></p>
          <h5 style={{ color: '#333', borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '10px' }}>📈 Top 5 Barang Paling Sering Keluar:</h5>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px' }}>
            {topKeluar.length > 0 ? topKeluar.map((item, i) => (
              <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #eee' }}>
                <span style={{ color: '#555' }}>{i+1}. {item[0]}</span>
                <strong style={{ color: '#ff4d4f' }}>{item[1]}x</strong>
              </li>
            )) : <li style={{ color: '#aaa' }}>Belum ada data</li>}
          </ul>
        </div>

        <div style={{ background: '#fff', padding: '20px', borderRadius: '15px', borderLeft: '6px solid #10b981', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h4 style={{ color: '#888', textTransform: 'uppercase', fontSize: '12px', marginBottom: '5px' }}>Total Nilai Masuk (Restok)</h4>
          <h2 style={{ color: '#10b981', fontSize: '26px', marginBottom: '5px' }}>Rp {totalNominalMasuk.toLocaleString('id-ID')}</h2>
          <p style={{ color: '#555', fontSize: '14px', marginBottom: '15px' }}>Total Qty Masuk: <strong>{totalQtyMasuk} Unit</strong></p>
          <h5 style={{ color: '#333', borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '10px' }}>📥 Top 5 Barang Paling Banyak Dibeli:</h5>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px' }}>
            {topMasuk.length > 0 ? topMasuk.map((item, i) => (
              <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #eee' }}>
                <span style={{ color: '#555' }}>{i+1}. {item[0]}</span>
                <strong style={{ color: '#10b981' }}>{item[1]} Unit</strong>
              </li>
            )) : <li style={{ color: '#aaa' }}>Belum ada data</li>}
          </ul>
        </div>
      </div>

      {/* TABEL DATA LAPORAN */}
      <div className="table-container">
        <div style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid #eee' }}>
          <h2 style={{ color: '#333', marginBottom: '5px', fontSize: '20px' }}>
            {modeTampilan === 'transaksi' ? "Laporan Riwayat Transaksi Gudang" : "Laporan Peringkat & Rekapitulasi Barang"}
          </h2>
          <p style={{ color: '#666', fontSize: '14px', fontWeight: '600' }}>
            Periode: <span style={{ color: '#F38C36' }}>{getTeksPeriode()}</span> | Jenis: <span style={{ color: '#1798D1' }}>{getTeksJenis()}</span>
          </p>
        </div>

        {modeTampilan === 'transaksi' ? (
          <table className="data-table">
            <thead>
              <tr><th>Kode Trx</th><th>Tanggal</th><th>Tujuan/Asal</th><th>Detail Barang (Qty)</th><th>KM Servis & Target</th><th>Total Biaya (Rp)</th><th className="print-hide">Bukti</th></tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? currentItems.map((trx, index) => {
                  let badgeColor = '#555'; let badgeBg = '#eee';
                  if (trx.jenis === 'MASUK') { badgeColor = '#155724'; badgeBg = '#d4edda'; }
                  else if (trx.jenis === 'KELUAR') { badgeColor = '#721c24'; badgeBg = '#f8d7da'; }
                  else if (trx.jenis.startsWith('OPNAME')) { badgeColor = '#004085'; badgeBg = '#cce5ff'; }

                  return (
                    <tr key={index}>
                      <td><span style={{ display: 'block', fontSize: '11px', color: '#888' }}>{trx.id}</span><span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', color: badgeColor, backgroundColor: badgeBg, marginTop: '5px' }}>{trx.jenis}</span></td>
                      <td>{trx.waktu_str}</td><td>{trx.truk_nama}</td><td><strong>{trx.barang_nama}</strong></td>
                      
                      {/* FITUR BARU: Menampilkan Estimasi ODO di Tabel */}
                      <td>
                        {trx.odo !== "-" ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontWeight: 'bold', color: '#333' }}>{Number(trx.odo).toLocaleString('id-ID')} KM</span>
                            {trx.jenis === 'KELUAR' && (() => {
                              const brg = dataBarang.find(b => b.nama === trx.barang_nama || b.id === trx.idBarang);
                              const batas = brg ? (Number(brg.batas_km) || 0) : 0;
                              if (batas > 0) {
                                return (
                                  <div style={{ fontSize: '11px', color: '#ea580c', background: '#fff7ed', padding: '3px 6px', borderRadius: '4px', border: '1px solid #fdba74', width: 'fit-content', whiteSpace: 'nowrap' }}>
                                    🎯 Ganti: <b>{(Number(trx.odo) + batas).toLocaleString('id-ID')} KM</b>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        ) : "-"}
                      </td>
                      
                      <td style={{ fontWeight: 'bold', color: '#444' }}>{trx.total_biaya.toLocaleString('id-ID')}</td>
                      <td className="print-hide">{trx.foto_url !== "-" ? ( <a href={trx.foto_url} target="_blank" rel="noopener noreferrer" style={{ background: '#e3f2fd', color: '#1798D1', padding: '5px 10px', borderRadius: '5px', textDecoration: 'none', fontSize: '12px', fontWeight: 'bold' }}>🖼️ Lihat</a>) : <span style={{ color: '#aaa' }}>-</span>}</td>
                    </tr>
                  );
                }) : ( <tr><td colSpan="7" style={{textAlign: 'center'}}>Tidak ada data transaksi.</td></tr> )}
            </tbody>
          </table>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{width: '50px'}}>No</th>
                <th>Nama Barang</th>
                <th style={{color: '#155724'}}>📥 Total Masuk</th>
                <th style={{color: '#721c24'}}>📤 Total Keluar</th>
                <th style={{color: '#004085'}}>📋 Opname</th>
                <th>Total Mutasi Uang (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? currentItems.map((item, index) => (
                <tr key={index}>
                  <td>{indexOfFirstItem + index + 1}</td>
                  <td><strong>{item.nama}</strong></td>
                  <td style={{fontWeight: 'bold', color: '#155724', fontSize: '15px'}}>{item.masuk}</td>
                  <td style={{fontWeight: 'bold', color: '#721c24', fontSize: '15px'}}>{item.keluar}</td>
                  <td style={{fontWeight: 'bold', color: '#004085'}}>{item.opname}</td>
                  <td style={{ fontWeight: 'bold', color: '#444' }}>{item.total_nominal.toLocaleString('id-ID')}</td>
                </tr>
              )) : (
                <tr><td colSpan="6" style={{textAlign: 'center'}}>Tidak ada data rekap barang.</td></tr>
              )}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="print-hide" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px', padding: '10px' }}>
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
              disabled={currentPage === 1}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #1798D1', background: currentPage === 1 ? '#f0f0f0' : '#fff', color: currentPage === 1 ? '#aaa' : '#1798D1', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
            >
              ⬅️ Sebelumnya
            </button>
            <span style={{ fontWeight: 'bold', color: '#555' }}>
              Halaman {currentPage} dari {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
              disabled={currentPage === totalPages}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #1798D1', background: currentPage === totalPages ? '#f0f0f0' : '#1798D1', color: currentPage === totalPages ? '#aaa' : '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
            >
              Selanjutnya ➡️
            </button>
          </div>
        )}
      </div>
    </div>
  );
}