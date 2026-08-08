'use client';

import { useState, useEffect } from 'react';

export default function ArsipPage() {
  const [arsipTruk, setArsipTruk] = useState([]);
  const [arsipBarang, setArsipBarang] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "GET_DATA" })
      });
      const result = await response.json();
      if (result.success) {
        setArsipTruk(result.data.arsipTruk);
        setArsipBarang(result.data.arsipBarang);
      }
    } catch (err) { alert("Gagal memuat data arsip."); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleRestoreTruk = async (idTruk) => {
    if (!confirm(`Pulihkan Truk ${idTruk} kembali ke Master Data?`)) return;
    const username = localStorage.getItem('sas_user');
    try {
      const response = await fetch('/api/sas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "RESTORE_TRUK", id: idTruk, username })
      });
      const result = await response.json();
      alert(result.message);
      if (result.success) fetchData(); // Refresh data
    } catch (error) { alert("Sistem Error"); }
  };

  // FUNGSI BARU: Hapus Permanen Truk & Riwayatnya
  const handleHapusPermanenTruk = async (idTruk, namaTruk) => {
    // Peringatan ganda karena ini tindakan fatal
    if (!confirm(`PERINGATAN BAHAYA!\n\nAnda akan memusnahkan ${namaTruk} (ID: ${idTruk}) secara PERMANEN beserta SELURUH RIWAYAT TRANSAKSINYA.\n\nApakah Anda benar-benar yakin ingin menghapus data ini selamanya?`)) return;
    
    const username = localStorage.getItem('sas_user');
    try {
      const response = await fetch('/api/sas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "HAPUS_TRUK_PERMANEN", idTruk: idTruk, username })
      });
      const result = await response.json();
      alert(result.message);
      if (result.success) fetchData(); // Refresh data untuk menghilangkan baris dari tabel
    } catch (error) { alert("Sistem Error saat menghapus permanen"); }
  };

  const handleRestoreBarang = async (idBarang) => {
    if (!confirm(`Pulihkan Barang ${idBarang} kembali ke Master Data?`)) return;
    const username = localStorage.getItem('sas_user');
    try {
      const response = await fetch('/api/sas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "RESTORE_BARANG", id: idBarang, username })
      });
      const result = await response.json();
      alert(result.message);
      if (result.success) fetchData(); // Refresh data
    } catch (error) { alert("Sistem Error"); }
  };

  if (loading) return <div style={{ padding: '20px' }}><h3>Memeriksa Tong Sampah... ⏳</h3></div>;

  return (
    <div>
      <h1 style={{ color: '#1798D1', marginBottom: '5px' }}>🗑️ Arsip Data (Tong Sampah)</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>Data di bawah ini disembunyikan dari sistem utama karena berstatus Nonaktif.</p>

      {/* ARSIP TRUK */}
      <div className="table-container">
        <h3><span style={{color: '#888'}}>Arsip Truk</span></h3>
        <table className="data-table">
          <thead><tr><th>ID</th><th>Truk</th><th>Plat</th><th>Sopir</th><th>Aksi</th></tr></thead>
          <tbody>
            {arsipTruk.length > 0 ? arsipTruk.map(t => (
              <tr key={t.id}>
                <td>{t.id}</td><td><strong>{t.nama}</strong></td><td>{t.plat}</td><td>{t.sopir}</td>
                <td>
                  <button onClick={() => handleRestoreTruk(t.id)} style={{background:'#05CD99', color:'#fff', border:'none', padding:'8px 12px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold', marginRight: '10px'}}>♻️ Pulihkan</button>
                  {/* TOMBOL BARU: HAPUS PERMANEN */}
                  <button onClick={() => handleHapusPermanenTruk(t.id, t.nama)} style={{background:'#ef4444', color:'#fff', border:'none', padding:'8px 12px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>🔥 Hapus Permanen</button>
                </td>
              </tr>
            )) : <tr><td colSpan="5" style={{textAlign:'center'}}>Tong sampah truk kosong.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* ARSIP BARANG */}
      <div className="table-container">
        <h3><span style={{color: '#888'}}>Arsip Barang</span></h3>
        <table className="data-table">
          <thead><tr><th>ID</th><th>Barang</th><th>Harga Satuan</th><th>Sisa Stok</th><th>Aksi</th></tr></thead>
          <tbody>
            {arsipBarang.length > 0 ? arsipBarang.map(b => (
              <tr key={b.id}>
                <td>{b.id}</td><td><strong>{b.nama}</strong></td><td>Rp {b.harga.toLocaleString('id-ID')}</td><td>{b.stok}</td>
                <td><button onClick={() => handleRestoreBarang(b.id)} style={{background:'#05CD99', color:'#fff', border:'none', padding:'8px 12px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>♻️ Pulihkan</button></td>
              </tr>
            )) : <tr><td colSpan="5" style={{textAlign:'center'}}>Tong sampah barang kosong.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}