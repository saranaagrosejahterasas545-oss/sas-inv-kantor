'use client';

import { useState, useEffect } from 'react';

export default function BukuServisPage() {
  const [dataTruk, setDataTruk] = useState([]);
  const [dataRiwayat, setDataRiwayat] = useState([]);
  const [dataBarang, setDataBarang] = useState([]); 
  const [loading, setLoading] = useState(true);

  // Filter State
  const [selectedTruk, setSelectedTruk] = useState('');
  const [filterBulan, setFilterBulan] = useState('');

  const fetchData = async () => {
    try {
      const response = await fetch('/api/sas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "GET_DATA" })
      });
      const result = await response.json();
      if (result.success) {
        setDataTruk(result.data.truk);
        setDataBarang(result.data.barang); 
        
        // Hanya ambil transaksi "KELUAR" untuk riwayat servis
        const riwayatKeluar = result.data.transaksi.filter(t => t.jenis === "KELUAR").reverse();
        setDataRiwayat(riwayatKeluar);
      }
    } catch (err) { alert("Gagal memuat data buku servis."); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // ================= LOGIKA FILTER DATA =================
  const riwayatTampil = dataRiwayat.filter(trx => {
    // 1. Filter Truk
    if (selectedTruk && trx.idTruk !== selectedTruk) return false;
    // 2. Filter Bulan (format: YYYY-MM)
    if (filterBulan && trx.waktu_raw) {
      const d = new Date(trx.waktu_raw);
      const trxBulan = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0');
      if (trxBulan !== filterBulan) return false;
    }
    return true;
  });

  const trukInfo = dataTruk.find(t => t.id === selectedTruk);

  // ================= HITUNG TOTAL BIAYA OTOMATIS =================
  const totalBiayaTampil = riwayatTampil.reduce((sum, trx) => sum + (Number(trx.total_biaya) || 0), 0);
  const totalItemGanti = riwayatTampil.reduce((sum, trx) => sum + (Number(trx.jumlah) || 0), 0);

  // Fungsi menerjemahkan format bulan menjadi teks cantik
  const getTeksPeriode = () => {
    if (!filterBulan) return "Semua Waktu";
    const [tahun, bulan] = filterBulan.split('-');
    const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return `${namaBulan[parseInt(bulan) - 1]} ${tahun}`;
  };

  if (loading) return <div style={{ padding: '20px' }}><h3>Memuat Buku Servis... ⏳</h3></div>;

  return (
    <div>
      <div className="print-hide">
        <h1 style={{ color: '#1798D1', marginBottom: '5px' }}>📖 Buku Servis Digital</h1>
        <p style={{ color: '#666', marginBottom: '20px' }}>Pantau dan cetak riwayat penggantian sparepart per kendaraan.</p>

        {/* KOTAK FILTER */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '15px', marginBottom: '25px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>Pilih Armada Truk:</label>
            <select value={selectedTruk} onChange={(e) => setSelectedTruk(e.target.value)}>
              <option value="">-- Tampilkan Semua Truk --</option>
              {dataTruk.map(t => <option key={t.id} value={t.id}>{t.nama} - {t.plat}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>Filter Waktu (Bulan):</label>
            <input type="month" value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => window.print()} style={{ background: '#555', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
              🖨️ Cetak Dokumen
            </button>
            <button onClick={() => { setSelectedTruk(''); setFilterBulan(''); }} style={{ background: '#F38C36', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
              🔄 Reset
            </button>
          </div>
        </div>
      </div>

      {/* ================= KARTU PROFIL & RINGKASAN BIAYA ================= */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', flexWrap: 'wrap' }}>
        
        {/* KARTU PROFIL TRUK (Hanya tampil jika ada truk yang dipilih) */}
        {trukInfo && (
          <div style={{ flex: 2, minWidth: '300px', background: 'linear-gradient(135deg, #1798D1, #0c76a6)', color: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h2 style={{ margin: '0 0 5px 0' }}>{trukInfo.nama}</h2>
            <p style={{ margin: 0, fontSize: '15px', opacity: 0.9 }}>Plat: <strong>{trukInfo.plat}</strong> | Sopir: <strong>{trukInfo.sopir}</strong></p>
            <div style={{ marginTop: '15px', display: 'inline-block', background: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>
              📍 Odo Terakhir: {Number(trukInfo.odo).toLocaleString('id-ID')} KM
            </div>
          </div>
        )}

        {/* KARTU TOTAL BIAYA (Otomatis menghitung dari data yang tampil) */}
        <div style={{ flex: 1, minWidth: '280px', background: '#fff', padding: '20px', borderRadius: '15px', borderLeft: '6px solid #ff4d4f', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h4 style={{ color: '#888', textTransform: 'uppercase', fontSize: '12px', margin: '0 0 5px 0' }}>
            Total Biaya Servis {trukInfo ? trukInfo.nama : '(Semua Armada)'}
          </h4>
          <h2 style={{ color: '#ff4d4f', fontSize: '28px', margin: '0 0 5px 0' }}>
            Rp {totalBiayaTampil.toLocaleString('id-ID')}
          </h2>
          <p style={{ color: '#555', fontSize: '14px', margin: 0 }}>
            Periode: <strong>{getTeksPeriode()}</strong> | Total: <strong>{totalItemGanti} Item</strong>
          </p>
        </div>

      </div>

      {/* ================= TABEL RIWAYAT ================= */}
      <div className="table-container">
        <div style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid #eee' }}>
          <h2 style={{ color: '#333', marginBottom: '5px', fontSize: '20px' }}>
            Laporan Riwayat Servis {trukInfo ? `- Armada: ${trukInfo.nama}` : '(Semua Armada)'}
          </h2>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Tanggal</th>
              {!trukInfo && <th>Nama Truk</th>} 
              <th>Sparepart / Barang</th>
              <th>Jumlah</th>
              <th>Odo Saat Ganti & Target</th>
              <th>Total Biaya</th>
            </tr>
          </thead>
          <tbody>
            {riwayatTampil.length > 0 ? (
              riwayatTampil.map((trx, index) => (
                <tr key={index}>
                  <td>{trx.waktu_str}</td>
                  {!trukInfo && <td>{trx.truk_nama}</td>}
                  <td><strong>{trx.barang_nama_asli}</strong></td>
                  <td>{trx.jumlah}</td>
                  
                  <td>
                    {trx.odo !== "-" ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: 'bold', color: '#333' }}>{Number(trx.odo).toLocaleString('id-ID')} KM</span>
                        {(() => {
                          const brg = dataBarang.find(b => b.nama === trx.barang_nama_asli || b.id === trx.idBarang);
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

                  <td>Rp {trx.total_biaya.toLocaleString('id-ID')}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={trukInfo ? "5" : "6"} style={{textAlign: 'center'}}>Tidak ada riwayat servis pada periode ini.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}