'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function MasterDataPage() {
  const [role, setRole] = useState('');
  const [dataTruk, setDataTruk] = useState([]);
  const [dataBarang, setDataBarang] = useState([]);
  const [dataRiwayat, setDataRiwayat] = useState([]); // STATE BARU: Untuk menghitung Masuk/Keluar
  const [loading, setLoading] = useState(true);
  const [prosesLoading, setProsesLoading] = useState(false);

  // State Pencarian & Filter
  const [searchTruk, setSearchTruk] = useState('');
  const [searchBarang, setSearchBarang] = useState('');
  const [selectedAbjad, setSelectedAbjad] = useState('SEMUA');
  const [filterBulan, setFilterBulan] = useState(''); // STATE BARU: Filter Bulan untuk Master Barang

  // State Modal Tambah
  const [showModalTruk, setShowModalTruk] = useState(false);
  const [formTruk, setFormTruk] = useState({ nama: '', plat: '', sopir: '', odo: '', merek: '' });
  const [showModalBarang, setShowModalBarang] = useState(false);
  const [formBarang, setFormBarang] = useState({ nama: '', batas_km: '', stok: '', harga: '', tanggal: '' });

  // State Modal Edit
  const [showEditTruk, setShowEditTruk] = useState(false);
  const [editTruk, setEditTruk] = useState({ id: '', nama: '', plat: '', sopir: '', odo: '', merek: '' });
  const [showEditBarang, setShowEditBarang] = useState(false);
  const [editBarang, setEditBarang] = useState({ id: '', nama: '', batas_km: '', stok: '', harga: '' });

  const daftarAbjad = ['SEMUA', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), '0-9'];

  useEffect(() => { 
    setRole(localStorage.getItem('sas_role') || '');
    fetchData(); 
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // KEMBALI MENGGUNAKAN GET_DATA AGAR BISA MENGHITUNG KARTU STOK
        body: JSON.stringify({ action: "GET_DATA" }) 
      });
      const result = await response.json();
      if (result.success) {
        setDataTruk(result.data.truk);
        setDataBarang(result.data.barang);
        setDataRiwayat(result.data.transaksi || []); // Simpan riwayat transaksi
      }
    } catch (err) { 
      Swal.fire('Oops!', 'Gagal memuat data dari server.', 'error'); 
    }
    setLoading(false);
  };

  const filteredTruk = dataTruk.filter(t => 
    t.nama.toLowerCase().includes(searchTruk.toLowerCase()) || t.plat.toLowerCase().includes(searchTruk.toLowerCase())
  );
  
  const filteredBarang = dataBarang
    .filter(b => {
      const matchText = b.nama.toLowerCase().includes(searchBarang.toLowerCase()) || b.id.toLowerCase().includes(searchBarang.toLowerCase());
      if (!matchText) return false;
      if (selectedAbjad === 'SEMUA') return true;
      const firstChar = b.nama.trim().charAt(0).toUpperCase();
      if (selectedAbjad === '0-9') return /^[0-9]/.test(firstChar);
      return firstChar === selectedAbjad;
    })
    .sort((a, b) => a.nama.localeCompare(b.nama));

  // ================= CRUD TRUK =================
  const handleSimpanTruk = async (e) => {
    e.preventDefault(); setProsesLoading(true);
    const username = localStorage.getItem('sas_user');
    try {
      const response = await fetch('/api/sas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: "TAMBAH_TRUK", ...formTruk, username }) });
      const result = await response.json();
      if (result.success) { Swal.fire({ title: 'Berhasil!', text: result.message, icon: 'success', timer: 2000, showConfirmButton: false }); setShowModalTruk(false); setFormTruk({ nama: '', plat: '', sopir: '', odo: '', merek: '' }); fetchData(); } else Swal.fire('Gagal!', result.message, 'error');
    } catch (error) { Swal.fire('Sistem Error', 'Terjadi kesalahan.', 'error'); } setProsesLoading(false);
  };
  const handleUpdateTruk = async (e) => {
    e.preventDefault(); setProsesLoading(true);
    const username = localStorage.getItem('sas_user');
    try {
      const response = await fetch('/api/sas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: "EDIT_TRUK", ...editTruk, username }) });
      const result = await response.json();
      if (result.success) { Swal.fire({ title: 'Tersimpan!', text: result.message, icon: 'success', timer: 1500, showConfirmButton: false }); setShowEditTruk(false); fetchData(); } else Swal.fire('Gagal!', result.message, 'error');
    } catch (error) { Swal.fire('Sistem Error', 'Terjadi kesalahan.', 'error'); } setProsesLoading(false);
  };
  const handleHapusTruk = async (id) => {
    const confirmBox = await Swal.fire({ title: 'Yakin buang ke Arsip?', text: `Truk ${id} akan disembunyikan!`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ff4d4f', cancelButtonColor: '#888', confirmButtonText: 'Ya, Buang!', cancelButtonText: 'Batal' });
    if (confirmBox.isConfirmed) {
      const username = localStorage.getItem('sas_user');
      try { const response = await fetch('/api/sas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: "HAPUS_TRUK", id, username }) }); const result = await response.json();
        if (result.success) { Swal.fire('Dihapus!', 'Data dipindahkan ke Arsip.', 'success'); fetchData(); } else { Swal.fire('Gagal!', result.message, 'error'); }
      } catch (error) { Swal.fire('Sistem Error', 'Terjadi kesalahan.', 'error'); }
    }
  };

  // ================= CRUD BARANG =================
  const handleSimpanBarang = async (e) => {
    e.preventDefault(); setProsesLoading(true);
    const username = localStorage.getItem('sas_user');
    const hargaBersih = parseInt(String(formBarang.harga).replace(/\./g, ''), 10) || 0;
    try {
      const response = await fetch('/api/sas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: "TAMBAH_BARANG", ...formBarang, harga: hargaBersih, username }) });
      const result = await response.json();
      if (result.success) { Swal.fire({ title: 'Berhasil!', text: result.message, icon: 'success', timer: 2000, showConfirmButton: false }); setShowModalBarang(false); setFormBarang({ nama: '', batas_km: '', stok: '', harga: '', tanggal: '' }); fetchData(); } else Swal.fire('Gagal!', result.message, 'error');
    } catch (error) { Swal.fire('Sistem Error', 'Terjadi kesalahan.', 'error'); } setProsesLoading(false);
  };
  const handleUpdateBarang = async (e) => {
    e.preventDefault(); setProsesLoading(true);
    const username = localStorage.getItem('sas_user');
    const hargaBersih = parseInt(String(editBarang.harga).replace(/\./g, ''), 10) || 0;
    try {
      const response = await fetch('/api/sas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: "EDIT_BARANG", ...editBarang, harga: hargaBersih, username }) });
      const result = await response.json();
      if (result.success) { Swal.fire({ title: 'Tersimpan!', text: result.message, icon: 'success', timer: 1500, showConfirmButton: false }); setShowEditBarang(false); fetchData(); } else Swal.fire('Gagal!', result.message, 'error');
    } catch (error) { Swal.fire('Sistem Error', 'Terjadi kesalahan.', 'error'); } setProsesLoading(false);
  };
  const handleHapusBarang = async (id) => {
    const confirmBox = await Swal.fire({ title: 'Yakin buang ke Arsip?', text: `Barang ${id} akan disembunyikan!`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ff4d4f', cancelButtonColor: '#888', confirmButtonText: 'Ya, Buang!', cancelButtonText: 'Batal' });
    if (confirmBox.isConfirmed) {
      const username = localStorage.getItem('sas_user');
      try { const response = await fetch('/api/sas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: "HAPUS_BARANG", id, username }) }); const result = await response.json();
        if (result.success) { Swal.fire('Dihapus!', 'Data dipindahkan ke Arsip.', 'success'); fetchData(); } else { Swal.fire('Gagal!', result.message, 'error'); }
      } catch (error) { Swal.fire('Sistem Error', 'Terjadi kesalahan.', 'error'); }
    }
  };

  if (loading) return <div style={{ padding: '20px' }}><h3>Memuat Data Gudang... ⏳</h3></div>;

  return (
    <div>
      <h1 style={{ color: '#1798D1', marginBottom: '20px' }}>📦 Master Data</h1>

      {/* ---------------- TRUK ---------------- */}
      <div className="table-container" style={{ marginBottom: '35px' }}>
        <div className="header-table" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h3>Daftar Armada Truk</h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input type="text" placeholder="🔍 Cari Truk / Plat..." value={searchTruk} onChange={(e) => setSearchTruk(e.target.value)} style={{ padding: '8px 12px', borderRadius: '5px', border: '1px solid #ccc' }} />
            {role === 'Manager' && <button className="btn-add" onClick={() => setShowModalTruk(true)}>+ Tambah Truk</button>}
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>ID</th><th>Merek / Tipe</th><th>Nama Truk</th><th>Plat Nomor</th><th>Sopir</th><th>Odo Terakhir</th><th>Aksi</th></tr>
          </thead>
          <tbody>
            {filteredTruk.map((truk) => (
              <tr key={truk.id}>
                <td>{truk.id}</td>
                <td><span style={{background: '#f1f5f9', color: '#334155', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold'}}>{truk.merek || '-'}</span></td>
                <td><strong>{truk.nama}</strong></td><td>{truk.plat}</td><td>{truk.sopir}</td><td>{truk.odo.toLocaleString('id-ID')} KM</td>
                <td>
                  {role === 'Manager' ? (
                    <div style={{display:'flex', gap:'5px'}}>
                      <button onClick={() => { setEditTruk(truk); setShowEditTruk(true); }} style={{background:'#F38C36', color:'#fff', border:'none', padding:'6px 10px', borderRadius:'5px', cursor:'pointer'}}>✏️ Edit</button>
                      <button onClick={() => handleHapusTruk(truk.id)} style={{background:'#ff4d4f', color:'#fff', border:'none', padding:'6px 10px', borderRadius:'5px', cursor:'pointer'}}>🗑️ Hapus</button>
                    </div>
                  ) : <span style={{color:'#aaa', fontSize:'12px'}}>Dibatasi</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---------------- BARANG (KARTU STOK) ---------------- */}
      <div className="table-container">
        
        <div className="header-table" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0 }}>Daftar Inventory Barang (Kartu Stok)</h3>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* FITUR BARU: FILTER BULAN */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#f8fafc', padding: '5px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>📅 Filter QTY:</label>
              <select value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px' }}>
                <option value="">Semua Waktu (Total)</option>
                <option value="2026-08">Agustus 2026</option>
                <option value="2026-09">September 2026</option>
                <option value="2026-10">Oktober 2026</option>
                <option value="2026-11">November 2026</option>
                <option value="2026-12">Desember 2026</option>
              </select>
            </div>

            <input type="text" placeholder="🔍 Cari Barang..." value={searchBarang} onChange={(e) => setSearchBarang(e.target.value)} style={{ padding: '8px 12px', borderRadius: '5px', border: '1px solid #ccc', minWidth: '180px' }} />
            {role === 'Manager' && <button className="btn-add" onClick={() => setShowModalBarang(true)}>+ Tambah Barang</button>}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', padding: '12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '15px', border: '1px solid #e2e8f0' }}>
          {daftarAbjad.map((huruf) => {
            const isActive = selectedAbjad === huruf;
            return (
              <button key={huruf} onClick={() => setSelectedAbjad(huruf)} style={{ padding: huruf === 'SEMUA' ? '5px 12px' : '5px 9px', borderRadius: '6px', border: isActive ? '1px solid #1798D1' : '1px solid #cbd5e1', background: isActive ? '#1798D1' : '#ffffff', color: isActive ? '#ffffff' : '#334155', fontWeight: isActive ? 'bold' : 'normal', fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s ease' }}>
                {huruf}
              </button>
            );
          })}
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nama Barang</th>
              <th style={{ backgroundColor: '#ecfdf5', color: '#047857' }}>Masuk (In)</th>
              <th style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>Keluar (Out)</th>
              <th style={{ backgroundColor: '#f8fafc' }}>Sisa Gudang Aktual</th>
              <th>Harga Satuan</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredBarang.map((barang) => {
              
              // MENGHITUNG BARANG MASUK & KELUAR BERDASARKAN FILTER BULAN
              let qtyMasuk = 0;
              let qtyKeluar = 0;

              dataRiwayat.forEach(trx => {
                // Pastikan barangnya cocok
                if (trx.idBarang === barang.id) {
                  // Cek apakah bulan transaksi sesuai dengan filter
                  let matchBulan = true;
                  if (filterBulan && trx.waktu_raw) {
                    const d = new Date(trx.waktu_raw);
                    const trxBulan = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0');
                    if (trxBulan !== filterBulan) matchBulan = false;
                  }

                  // Jika bulan cocok (atau tidak ada filter bulan), jumlahkan
                  if (matchBulan) {
                    const jenis = String(trx.jenis).toUpperCase().trim();
                    if (jenis === 'MASUK') qtyMasuk += Number(trx.jumlah);
                    if (jenis === 'KELUAR') qtyKeluar += Number(trx.jumlah);
                  }
                }
              });

              return (
                <tr key={barang.id}>
                  <td>{barang.id}</td>
                  <td>
                    <strong>{barang.nama}</strong><br/>
                    <span style={{ fontSize: '10px', color: '#888' }}>Batas: {barang.batas_km > 0 ? `${barang.batas_km.toLocaleString('id-ID')} KM` : '-'}</span>
                  </td>
                  
                  <td style={{ color: '#059669', fontWeight: 'bold', fontSize: '15px' }}>
                    {qtyMasuk > 0 ? `+ ${qtyMasuk}` : '-'}
                  </td>
                  <td style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '15px' }}>
                    {qtyKeluar > 0 ? `- ${qtyKeluar}` : '-'}
                  </td>
                  
                  <td style={{ backgroundColor: '#f8fafc' }}>
                    <span style={{ color: barang.stok <= 5 ? 'red' : 'green', fontWeight: '900', fontSize: '16px' }}>{barang.stok}</span>
                  </td>
                  
                  <td>Rp {barang.harga.toLocaleString('id-ID')}</td>
                  
                  <td>
                    {role === 'Manager' ? (
                      <div style={{display:'flex', gap:'5px'}}>
                        <button onClick={() => { setEditBarang({...barang, harga: barang.harga ? barang.harga.toLocaleString('id-ID') : ''}); setShowEditBarang(true); }} style={{background:'#F38C36', color:'#fff', border:'none', padding:'6px 10px', borderRadius:'5px', cursor:'pointer'}}>✏️ Edit</button>
                        <button onClick={() => handleHapusBarang(barang.id)} style={{background:'#ff4d4f', color:'#fff', border:'none', padding:'6px 10px', borderRadius:'5px', cursor:'pointer'}}>🗑️ Hapus</button>
                      </div>
                    ) : <span style={{color:'#aaa', fontSize:'12px'}}>Dibatasi</span>}
                  </td>
                </tr>
              );
            })}
            {filteredBarang.length === 0 && <tr><td colSpan="7" style={{textAlign:'center', padding:'20px'}}>Tidak ada barang.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* ================= MODAL TETAP SAMA ================= */}
      {showModalTruk && (
        <div className="modal-overlay"><div className="modal-content"><h3>Tambah Armada Truk</h3>
          <form onSubmit={handleSimpanTruk}>
            <div className="form-group"><label>Merek / Tipe Armada</label><select required value={formTruk.merek} onChange={e => setFormTruk({...formTruk, merek: e.target.value})}><option value="" disabled>-- Pilih Merek --</option><option value="Mitsubishi Canter">Mitsubishi Canter</option><option value="Isuzu Elf">Isuzu Elf</option><option value="Isuzu Giga">Isuzu Giga</option><option value="Hino">Hino</option><option value="Lainnya">Lainnya</option></select></div>
            <div className="form-group"><label>Nama Truk / Julukan</label><input type="text" required value={formTruk.nama} onChange={e => setFormTruk({...formTruk, nama: e.target.value})} /></div>
            <div className="form-group"><label>Plat Nomor</label><input type="text" required value={formTruk.plat} onChange={e => setFormTruk({...formTruk, plat: e.target.value})} /></div>
            <div className="form-group"><label>Sopir Utama</label><input type="text" required value={formTruk.sopir} onChange={e => setFormTruk({...formTruk, sopir: e.target.value})} /></div>
            <div className="form-group"><label>Odo Awal</label><input type="number" required value={formTruk.odo} onChange={e => setFormTruk({...formTruk, odo: e.target.value})} /></div>
            <div className="modal-actions"><button type="button" className="btn-close" onClick={() => setShowModalTruk(false)}>Batal</button><button type="submit" className="btn-submit" disabled={prosesLoading} style={{width:'auto'}}>Simpan</button></div>
          </form>
        </div></div>
      )}

      {showModalBarang && (
        <div className="modal-overlay"><div className="modal-content"><h3>Tambah Barang</h3>
          <form onSubmit={handleSimpanBarang}>
            <div className="form-group"><label>Nama Barang</label><input type="text" required value={formBarang.nama} onChange={e => setFormBarang({...formBarang, nama: e.target.value})} /></div>
            <div className="form-group"><label>Batas KM (0 = tidak ada)</label><input type="number" required value={formBarang.batas_km} onChange={e => setFormBarang({...formBarang, batas_km: e.target.value})} /></div>
            <div className="form-group"><label>Stok Awal</label><input type="number" required value={formBarang.stok} onChange={e => setFormBarang({...formBarang, stok: e.target.value})} /></div>
            <div className="form-group"><label>Harga Satuan (Rp)</label><input type="text" required placeholder="Contoh: 150.000" value={formBarang.harga} onChange={e => { const rawValue = e.target.value.replace(/[^0-9]/g, ''); const formattedValue = rawValue ? parseInt(rawValue, 10).toLocaleString('id-ID') : ''; setFormBarang({...formBarang, harga: formattedValue}); }} /></div>
            <div className="form-group"><label>Tanggal Masuk</label><input type="date" required value={formBarang.tanggal} onChange={e => setFormBarang({...formBarang, tanggal: e.target.value})} /></div>
            <div className="modal-actions"><button type="button" className="btn-close" onClick={() => setShowModalBarang(false)}>Batal</button><button type="submit" className="btn-submit" disabled={prosesLoading} style={{width:'auto'}}>Simpan</button></div>
          </form>
        </div></div>
      )}

      {showEditTruk && (
        <div className="modal-overlay"><div className="modal-content"><h3 style={{color:'#F38C36'}}>✏️ Edit Armada Truk</h3>
          <form onSubmit={handleUpdateTruk}>
            <div className="form-group"><label>Merek / Tipe Armada</label><select required value={editTruk.merek || ''} onChange={e => setEditTruk({...editTruk, merek: e.target.value})}><option value="" disabled>-- Pilih Merek --</option><option value="Mitsubishi Canter">Mitsubishi Canter</option><option value="Isuzu Elf">Isuzu Elf</option><option value="Isuzu Giga">Isuzu Giga</option><option value="Hino">Hino</option><option value="Lainnya">Lainnya</option></select></div>
            <div className="form-group"><label>Nama Truk</label><input type="text" required value={editTruk.nama} onChange={e => setEditTruk({...editTruk, nama: e.target.value})} /></div>
            <div className="form-group"><label>Plat Nomor</label><input type="text" required value={editTruk.plat} onChange={e => setEditTruk({...editTruk, plat: e.target.value})} /></div>
            <div className="form-group"><label>Sopir</label><input type="text" required value={editTruk.sopir} onChange={e => setEditTruk({...editTruk, sopir: e.target.value})} /></div>
            <div className="form-group"><label>Odometer</label><input type="number" required value={editTruk.odo} onChange={e => setEditTruk({...editTruk, odo: e.target.value})} /></div>
            <div className="modal-actions"><button type="button" className="btn-close" onClick={() => setShowEditTruk(false)}>Batal</button><button type="submit" className="btn-submit" disabled={prosesLoading} style={{width:'auto', background:'#F38C36'}}>Update Truk</button></div>
          </form>
        </div></div>
      )}

      {showEditBarang && (
        <div className="modal-overlay"><div className="modal-content"><h3 style={{color:'#F38C36'}}>✏️ Edit Barang</h3>
          <form onSubmit={handleUpdateBarang}>
            <div className="form-group"><label>Nama Barang</label><input type="text" required value={editBarang.nama} onChange={e => setEditBarang({...editBarang, nama: e.target.value})} /></div>
            <div className="form-group"><label>Batas KM</label><input type="number" required value={editBarang.batas_km} onChange={e => setEditBarang({...editBarang, batas_km: e.target.value})} /></div>
            <div className="form-group"><label>Stok Saat Ini</label><input type="number" required value={editBarang.stok} onChange={e => setEditBarang({...editBarang, stok: e.target.value})} /></div>
            <div className="form-group"><label>Harga Satuan (Rp)</label><input type="text" required value={editBarang.harga} onChange={e => { const rawValue = e.target.value.replace(/[^0-9]/g, ''); const formattedValue = rawValue ? parseInt(rawValue, 10).toLocaleString('id-ID') : ''; setEditBarang({...editBarang, harga: formattedValue}); }} /></div>
            <div className="modal-actions"><button type="button" className="btn-close" onClick={() => setShowEditBarang(false)}>Batal</button><button type="submit" className="btn-submit" disabled={prosesLoading} style={{width:'auto', background:'#F38C36'}}>Update Barang</button></div>
          </form>
        </div></div>
      )}
    </div>
  );
}