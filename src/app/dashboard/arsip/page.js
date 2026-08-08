'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

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
    } catch (err) { 
      Swal.fire({ title: 'Error!', text: 'Gagal memuat data arsip.', icon: 'error', confirmButtonColor: '#ef4444' }); 
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // ================= TRUK =================
  const handleRestoreTruk = async (idTruk, namaTruk) => {
    Swal.fire({
      title: 'Pulihkan Truk?',
      text: `Kembalikan ${namaTruk} (ID: ${idTruk}) ke Master Data Utama?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#05CD99',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Pulihkan!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const username = localStorage.getItem('sas_user');
        try {
          const response = await fetch('/api/sas', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: "RESTORE_TRUK", id: idTruk, username })
          });
          const res = await response.json();
          if (res.success) {
            Swal.fire('Berhasil!', res.message, 'success');
            fetchData();
          } else {
            Swal.fire('Gagal!', res.message, 'error');
          }
        } catch (error) { Swal.fire('Error!', 'Sistem Error saat memulihkan', 'error'); }
      }
    });
  };

  const handleHapusPermanenTruk = async (idTruk, namaTruk) => {
    Swal.fire({
      title: 'PERINGATAN BAHAYA!',
      html: `Anda akan memusnahkan <b>${namaTruk}</b> (ID: ${idTruk}) secara PERMANEN beserta <b>SELURUH RIWAYAT TRANSAKSINYA</b>.<br><br>Data ini tidak bisa dikembalikan lagi!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Musnahkan Total!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const username = localStorage.getItem('sas_user');
        try {
          Swal.fire({ title: 'Memusnahkan Data...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
          const response = await fetch('/api/sas', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: "HAPUS_TRUK_PERMANEN", idTruk: idTruk, username })
          });
          const res = await response.json();
          if (res.success) {
            Swal.fire('Terhapus!', res.message, 'success');
            fetchData();
          } else {
            Swal.fire('Gagal!', res.message, 'error');
          }
        } catch (error) { Swal.fire('Error!', 'Sistem Error saat menghapus permanen', 'error'); }
      }
    });
  };

  // ================= BARANG =================
  const handleRestoreBarang = async (idBarang, namaBarang) => {
    Swal.fire({
      title: 'Pulihkan Barang?',
      text: `Kembalikan ${namaBarang} (ID: ${idBarang}) ke Master Data Utama?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#05CD99',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Pulihkan!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const username = localStorage.getItem('sas_user');
        try {
          const response = await fetch('/api/sas', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: "RESTORE_BARANG", id: idBarang, username })
          });
          const res = await response.json();
          if (res.success) {
            Swal.fire('Berhasil!', res.message, 'success');
            fetchData();
          } else {
            Swal.fire('Gagal!', res.message, 'error');
          }
        } catch (error) { Swal.fire('Error!', 'Sistem Error saat memulihkan', 'error'); }
      }
    });
  };

  const handleHapusPermanenBarang = async (idBarang, namaBarang) => {
    Swal.fire({
      title: 'PERINGATAN BAHAYA!',
      html: `Anda akan memusnahkan <b>${namaBarang}</b> (ID: ${idBarang}) secara PERMANEN beserta <b>SELURUH RIWAYAT TRANSAKSINYA</b>.<br><br>Data ini tidak bisa dikembalikan lagi!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Musnahkan Total!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const username = localStorage.getItem('sas_user');
        try {
          Swal.fire({ title: 'Memusnahkan Data...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
          const response = await fetch('/api/sas', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: "HAPUS_BARANG_PERMANEN", idBarang: idBarang, username })
          });
          const res = await response.json();
          if (res.success) {
            Swal.fire('Terhapus!', res.message, 'success');
            fetchData();
          } else {
            Swal.fire('Gagal!', res.message, 'error');
          }
        } catch (error) { Swal.fire('Error!', 'Sistem Error saat menghapus permanen', 'error'); }
      }
    });
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
                  <button onClick={() => handleRestoreTruk(t.id, t.nama)} style={{background:'#05CD99', color:'#fff', border:'none', padding:'8px 12px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold', marginRight: '10px'}}>♻️ Pulihkan</button>
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
                <td>
                  <button onClick={() => handleRestoreBarang(b.id, b.nama)} style={{background:'#05CD99', color:'#fff', border:'none', padding:'8px 12px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold', marginRight: '10px'}}>♻️ Pulihkan</button>
                  <button onClick={() => handleHapusPermanenBarang(b.id, b.nama)} style={{background:'#ef4444', color:'#fff', border:'none', padding:'8px 12px', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>🔥 Hapus Permanen</button>
                </td>
              </tr>
            )) : <tr><td colSpan="5" style={{textAlign:'center'}}>Tong sampah barang kosong.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}