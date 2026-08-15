'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function TransaksiPage() {
  const [dataTruk, setDataTruk] = useState([]);
  const [dataBarang, setDataBarang] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  
  const [tab, setTab] = useState('masuk'); 
  const [prosesLoading, setProsesLoading] = useState(false);

  const hariIni = new Date().toISOString().split('T')[0];

  const [formMasuk, setFormMasuk] = useState({ idBarang: '', qty: '', tanggal: hariIni });
  const [formKeluar, setFormKeluar] = useState({ idTruk: '', idBarang: '', qty: '', odo: '', tanggal: hariIni });
  const [formOpname, setFormOpname] = useState({ idBarang: '', stokSistem: '', stokFisik: '', keterangan: '' });
  const [formJasa, setFormJasa] = useState({ idTruk: '', namaJasa: '', biaya: '', odo: '', tanggal: hariIni });
  
  // STATE BARU: Form untuk Penjualan Barang Bekas (Pemasukan)
  const [formJual, setFormJual] = useState({ namaBarang: '', nominal: '', keterangan: '', tanggal: hariIni });
  
  const [searchMasuk, setSearchMasuk] = useState('');
  const [searchKeluarTruk, setSearchKeluarTruk] = useState('');
  const [searchKeluarBarang, setSearchKeluarBarang] = useState('');
  const [searchOpname, setSearchOpname] = useState('');
  const [searchJasaTruk, setSearchJasaTruk] = useState('');

  const [fileNota, setFileNota] = useState(null);
  const [fileFoto, setFileFoto] = useState(null);
  const [fileFotoOdo, setFileFotoOdo] = useState(null);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/sas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: "GET_DATA" }) });
      const result = await response.json();
      if (result.success) { setDataTruk(result.data.truk); setDataBarang(result.data.barang); }
    } catch (err) { Swal.fire('Error!', 'Gagal memuat data master.', 'error'); }
    setLoadingData(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filteredBarangMasuk = dataBarang.filter(b => b.nama.toLowerCase().includes(searchMasuk.toLowerCase()));
  const filteredTrukKeluar = dataTruk.filter(t => t.nama.toLowerCase().includes(searchKeluarTruk.toLowerCase()) || t.plat.toLowerCase().includes(searchKeluarTruk.toLowerCase()));
  const filteredBarangKeluar = dataBarang.filter(b => b.nama.toLowerCase().includes(searchKeluarBarang.toLowerCase()));
  const filteredBarangOpname = dataBarang.filter(b => b.nama.toLowerCase().includes(searchOpname.toLowerCase()));
  const filteredTrukJasa = dataTruk.filter(t => t.nama.toLowerCase().includes(searchJasaTruk.toLowerCase()) || t.plat.toLowerCase().includes(searchJasaTruk.toLowerCase()));

  const toBase64 = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = error => reject(error); });

  // ================= SEMUA FUNGSI SUBMIT =================
  const handleMasuk = async (e) => {
    e.preventDefault(); setProsesLoading(true);
    try {
      const username = localStorage.getItem('sas_user'); const qtyFinal = parseFloat(formMasuk.qty.toString().replace(',', '.'));
      const response = await fetch('/api/sas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: "BARANG_MASUK", ...formMasuk, qty: qtyFinal, username }) });
      const result = await response.json();
      if (result.success) { Swal.fire('Sukses!', result.message, 'success'); setFormMasuk({ idBarang: '', qty: '', tanggal: hariIni }); setSearchMasuk(''); fetchData(); } else Swal.fire('Gagal!', result.message, 'warning');
    } catch (error) { Swal.fire('Error!', 'Terjadi kesalahan sistem.', 'error'); } setProsesLoading(false);
  };

  const handleKeluar = async (e) => {
    e.preventDefault(); setProsesLoading(true);
    const barangTerpilih = dataBarang.find(b => b.id === formKeluar.idBarang); const batasKm = barangTerpilih ? (Number(barangTerpilih.batas_km) || 0) : 0; const odoSaatIni = Number(formKeluar.odo) || 0; const estimasiOdo = odoSaatIni + batasKm;
    try {
      const username = localStorage.getItem('sas_user'); const qtyFinal = parseFloat(formKeluar.qty.toString().replace(',', '.'));
      let fileData = null; if (fileFoto) { fileData = { base64: await toBase64(fileFoto), mimeType: fileFoto.type, name: fileFoto.name }; }
      let fileDataOdo = null; if (fileFotoOdo) { fileDataOdo = { base64: await toBase64(fileFotoOdo), mimeType: fileFotoOdo.type, name: fileFotoOdo.name }; }
      
      const response = await fetch('/api/sas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: "TRANSAKSI_KELUAR", ...formKeluar, qty: qtyFinal, fileData, fileDataOdo, username }) });
      const result = await response.json();
      if (result.success) {
        let pesanSukses = result.message;
        if (batasKm > 0 && odoSaatIni > 0) { pesanSukses += `<br><br><div style="background: #fff7ed; padding: 15px; border-radius: 8px; border: 1px solid #fdba74;"><b style="color: #c2410c;">🛠️ Servis Berikutnya:</b><br>Ganti di KM <span style="font-size: 20px; font-weight: 900; color: #ea580c;">${estimasiOdo.toLocaleString('id-ID')}</span></div>`; }
        Swal.fire({ title: 'Sukses!', html: pesanSukses, icon: 'success' });
        setFormKeluar({ idTruk: '', idBarang: '', qty: '', odo: '', tanggal: hariIni }); setFileFoto(null); setFileFotoOdo(null); document.getElementById('inputFoto').value = ''; document.getElementById('inputFotoOdo').value = ''; setSearchKeluarBarang(''); setSearchKeluarTruk(''); fetchData();
      } else Swal.fire('Gagal!', result.message, 'warning');
    } catch (error) { Swal.fire('Error!', 'Terjadi kesalahan sistem.', 'error'); } setProsesLoading(false);
  };

  const handleOpname = async (e) => {
    e.preventDefault(); setProsesLoading(true);
    try {
      const username = localStorage.getItem('sas_user'); const stokFisikFinal = parseFloat(formOpname.stokFisik.toString().replace(',', '.'));
      const response = await fetch('/api/sas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: "OPNAME", idBarang: formOpname.idBarang, stokFisik: stokFisikFinal, keterangan: formOpname.keterangan, username }) });
      const result = await response.json();
      if (result.success) { Swal.fire('Sukses!', result.message, 'success'); setFormOpname({ idBarang: '', stokSistem: '', stokFisik: '', keterangan: '' }); setSearchOpname(''); fetchData(); } else Swal.fire('Gagal!', result.message, 'warning');
    } catch (error) { Swal.fire('Error!', 'Terjadi kesalahan sistem.', 'error'); } setProsesLoading(false);
  };

  const handleJasa = async (e) => {
    e.preventDefault(); setProsesLoading(true);
    try {
      const username = localStorage.getItem('sas_user'); const biayaBersih = parseInt(String(formJasa.biaya).replace(/\./g, ''), 10) || 0;
      let fileDataNota = null; if (fileNota) { fileDataNota = { base64: await toBase64(fileNota), mimeType: fileNota.type, name: fileNota.name }; }
      const response = await fetch('/api/sas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: "JASA_BENGKEL", ...formJasa, biaya: biayaBersih, fileNota: fileDataNota, username }) });
      const result = await response.json();
      if (result.success) { Swal.fire('Sukses!', result.message, 'success'); setFormJasa({ idTruk: '', namaJasa: '', biaya: '', odo: '', tanggal: hariIni }); setFileNota(null); document.getElementById('inputNota').value = ''; setSearchJasaTruk(''); fetchData(); } else Swal.fire('Gagal!', result.message, 'warning');
    } catch (error) { Swal.fire('Error!', 'Terjadi kesalahan sistem.', 'error'); } setProsesLoading(false);
  };

  // FUNGSI BARU: PENJUALAN BARANG BEKAS
  const handleJualBekas = async (e) => {
    e.preventDefault(); setProsesLoading(true);
    try {
      const username = localStorage.getItem('sas_user'); 
      const nominalBersih = parseInt(String(formJual.nominal).replace(/\./g, ''), 10) || 0;
      
      const response = await fetch('/api/sas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: "PENJUALAN_BEKAS", ...formJual, nominal: nominalBersih, username }) });
      const result = await response.json();
      
      if (result.success) { 
        Swal.fire('Sukses!', result.message, 'success'); 
        setFormJual({ namaBarang: '', nominal: '', keterangan: '', tanggal: hariIni }); 
        fetchData(); 
      } else Swal.fire('Gagal!', result.message, 'warning');
    } catch (error) { Swal.fire('Error!', 'Terjadi kesalahan sistem.', 'error'); } 
    setProsesLoading(false);
  };

  const handlePilihBarangOpname = (e) => {
    const id = e.target.value; const barang = dataBarang.find(b => b.id === id); setFormOpname({ ...formOpname, idBarang: id, stokSistem: barang ? barang.stok : '' });
  };

  if (loadingData) return <div style={{ padding: '20px' }}><h3>Memuat Formulir... ⏳</h3></div>;
  const barangKeluarTerpilih = dataBarang.find(b => b.id === formKeluar.idBarang);
  const batasKmKeluar = barangKeluarTerpilih ? (Number(barangKeluarTerpilih.batas_km) || 0) : 0;

  return (
    <div>
      <h1 style={{ color: '#1798D1', marginBottom: '20px' }}>🔄 Transaksi & Mutasi Gudang</h1>

      <div className="tab-container" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <button className={`tab-btn ${tab === 'masuk' ? 'active' : ''}`} onClick={() => setTab('masuk')}>📥 Barang Masuk (Restok)</button>
        <button className={`tab-btn ${tab === 'keluar' ? 'active' : ''}`} onClick={() => setTab('keluar')}>📤 Barang Keluar (Servis)</button>
        <button className={`tab-btn ${tab === 'opname' ? 'active' : ''}`} onClick={() => setTab('opname')} style={{ backgroundColor: tab === 'opname' ? '#05CD99' : '#e2e8f0', color: tab === 'opname' ? 'white' : '#64748b' }}>📋 Stock Opname</button>
        <button className={`tab-btn ${tab === 'jasa' ? 'active' : ''}`} onClick={() => setTab('jasa')} style={{ backgroundColor: tab === 'jasa' ? '#8b5cf6' : '#e2e8f0', color: tab === 'jasa' ? 'white' : '#64748b' }}>🛠️ Jasa Bengkel Luar</button>
        {/* TAB BARU: PENJUALAN BARANG BEKAS */}
        <button className={`tab-btn ${tab === 'jual' ? 'active' : ''}`} onClick={() => setTab('jual')} style={{ backgroundColor: tab === 'jual' ? '#10b981' : '#e2e8f0', color: tab === 'jual' ? 'white' : '#64748b' }}>💰 Jual Bekas/Rongsok</button>
      </div>

      {/* ================= FORM BARANG MASUK ================= */}
      {tab === 'masuk' && (
        <div className="form-container">
          <h3 style={{ marginBottom: '20px', color: '#1798D1' }}>Form Barang Masuk</h3>
          <form onSubmit={handleMasuk}>
            <div className="form-group" style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label>Pilih Barang (Stok Saat Ini)</label>
              <input type="text" placeholder="🔍 Ketik nama barang untuk mencari..." value={searchMasuk} onChange={(e) => setSearchMasuk(e.target.value)} style={{ marginBottom: '10px', padding: '10px', width: '100%', borderRadius: '5px', border: '1px solid #1798D1' }} />
              <select required value={formMasuk.idBarang} onChange={(e) => setFormMasuk({...formMasuk, idBarang: e.target.value})}>
                <option value="" disabled>-- Hasil Pencarian ({filteredBarangMasuk.length} barang) --</option>
                {filteredBarangMasuk.map(b => ( <option key={b.id} value={b.id}>{b.nama} (Stok: {b.stok})</option> ))}
              </select>
            </div>
            <div className="form-group"><label>Jumlah Masuk (Qty)</label><input type="number" required step="any" min="0.01" value={formMasuk.qty} onChange={(e) => setFormMasuk({...formMasuk, qty: e.target.value})} placeholder="0" /></div>
            <div className="form-group"><label>Tanggal Pembelian/Masuk</label><input type="date" required value={formMasuk.tanggal} onChange={(e) => setFormMasuk({...formMasuk, tanggal: e.target.value})} /></div>
            <button type="submit" className="btn-submit" disabled={prosesLoading}>{prosesLoading ? "Memproses..." : "Simpan Barang Masuk"}</button>
          </form>
        </div>
      )}

      {/* ================= FORM BARANG KELUAR ================= */}
      {tab === 'keluar' && (
        <div className="form-container" style={{ borderTop: '4px solid #F38C36' }}>
          <h3 style={{ marginBottom: '20px', color: '#F38C36' }}>Form Barang Keluar</h3>
          <form onSubmit={handleKeluar}>
            <div className="form-group"><label>Tanggal Servis / Penggantian</label><input type="date" required value={formKeluar.tanggal} onChange={(e) => setFormKeluar({...formKeluar, tanggal: e.target.value})} /></div>

            <div className="form-group" style={{ background: '#fff7ed', padding: '15px', borderRadius: '8px', border: '1px solid #fed7aa' }}>
              <label style={{ color: '#c2410c' }}>Pilih Armada Truk</label>
              <input type="text" placeholder="🔍 Cari Truk / Plat..." value={searchKeluarTruk} onChange={(e) => setSearchKeluarTruk(e.target.value)} style={{ marginBottom: '10px', padding: '10px', width: '100%', borderRadius: '5px', border: '1px solid #fdba74' }} />
              <select required value={formKeluar.idTruk} onChange={(e) => setFormKeluar({...formKeluar, idTruk: e.target.value})}>
                <option value="" disabled>-- Hasil Pencarian ({filteredTrukKeluar.length} truk) --</option>
                {filteredTrukKeluar.map(t => <option key={t.id} value={t.id}>{t.nama} - {t.plat} (Odo: {t.odo || t.odo_terakhir || t.km || '-'})</option>)}
              </select>
            </div>
            
            <div className="form-group" style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ color: '#334155' }}>Pilih Barang / Sparepart</label>
              <input type="text" placeholder="🔍 Ketik nama barang..." value={searchKeluarBarang} onChange={(e) => setSearchKeluarBarang(e.target.value)} style={{ marginBottom: '10px', padding: '10px', width: '100%', borderRadius: '5px', border: '1px solid #cbd5e1' }} />
              <select required value={formKeluar.idBarang} onChange={(e) => setFormKeluar({...formKeluar, idBarang: e.target.value})}>
                <option value="" disabled>-- Hasil Pencarian ({filteredBarangKeluar.length} barang) --</option>
                {filteredBarangKeluar.map(b => ( <option key={b.id} value={b.id}>{b.nama} (Sisa Stok: {b.stok})</option> ))}
              </select>
            </div>
            
            <div className="form-group"><label>Jumlah Keluar (Qty)</label><input type="number" required step="any" min="0.01" value={formKeluar.qty} onChange={(e) => setFormKeluar({...formKeluar, qty: e.target.value})} placeholder="0" /></div>
            
            <div className="form-group">
              <label>Odometer Truk Saat Ini (KM)</label><input type="number" required value={formKeluar.odo} onChange={(e) => setFormKeluar({...formKeluar, odo: e.target.value})} placeholder="Masukkan KM saat ini" />
              {batasKmKeluar > 0 && formKeluar.odo && (
                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff7ed', borderLeft: '4px solid #F38C36', borderRadius: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#ea580c' }}>💡 Info Interval Servis: <b>{batasKmKeluar.toLocaleString('id-ID')} KM</b></span><br/>
                  <span style={{ fontSize: '14px', color: '#c2410c', fontWeight: 'bold' }}>Target Ganti Berikutnya: KM {(Number(formKeluar.odo) + batasKmKeluar).toLocaleString('id-ID')}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '15px' }}>
              <div className="form-group" style={{ flex: 1, minWidth: '250px' }}><label>Bukti Foto Barang (Opsional)</label><input type="file" id="inputFoto" accept="image/*" capture="environment" onChange={(e) => setFileFoto(e.target.files[0])} /></div>
              <div className="form-group" style={{ flex: 1, minWidth: '250px', borderLeft: '3px solid #1798D1', paddingLeft: '15px' }}><label style={{ color: '#1798D1', fontWeight: 'bold' }}>📸 Bukti Foto ODO Meter</label><input type="file" id="inputFotoOdo" accept="image/*" capture="environment" onChange={(e) => setFileFotoOdo(e.target.files[0])} /></div>
            </div>
            
            <button type="submit" className="btn-submit" disabled={prosesLoading} style={{ backgroundColor: '#F38C36' }}>{prosesLoading ? "Memproses..." : "Simpan Barang Keluar"}</button>
          </form>
        </div>
      )}

      {/* ================= FORM STOCK OPNAME ================= */}
      {tab === 'opname' && (
        <div className="form-container" style={{ borderTop: '4px solid #05CD99' }}>
          <h3 style={{ marginBottom: '5px', color: '#05CD99' }}>Form Stock Opname</h3>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>Sesuaikan perbedaan stok fisik dengan sistem.</p>
          <form onSubmit={handleOpname}>
            <div className="form-group" style={{ background: '#f0fdf4', padding: '15px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <label style={{ color: '#166534' }}>Pilih Barang</label>
              <input type="text" placeholder="🔍 Cari Barang..." value={searchOpname} onChange={(e) => setSearchOpname(e.target.value)} style={{ marginBottom: '10px', padding: '10px', width: '100%', borderRadius: '5px', border: '1px solid #86efac' }} />
              <select required value={formOpname.idBarang} onChange={handlePilihBarangOpname}>
                <option value="" disabled>-- Hasil Pencarian ({filteredBarangOpname.length} barang) --</option>
                {filteredBarangOpname.map(b => ( <option key={b.id} value={b.id}>{b.nama}</option> ))}
              </select>
            </div>
            <div className="form-group"><label>Stok di Sistem</label><input type="number" readOnly value={formOpname.stokSistem} style={{ backgroundColor: '#f0f0f0', color: '#888', fontWeight: 'bold' }} placeholder="Otomatis" /></div>
            <div className="form-group"><label>Stok Fisik Nyata</label><input type="number" required step="any" min="0" value={formOpname.stokFisik} onChange={(e) => setFormOpname({...formOpname, stokFisik: e.target.value})} placeholder="0" /></div>
            <div className="form-group"><label>Alasan Selisih</label><input type="text" required value={formOpname.keterangan} onChange={(e) => setFormOpname({...formOpname, keterangan: e.target.value})} placeholder="Contoh: Hilang / Salah catat" /></div>
            <button type="submit" className="btn-submit" disabled={prosesLoading} style={{ backgroundColor: '#05CD99' }}>{prosesLoading ? "Memproses..." : "Sesuaikan Stok"}</button>
          </form>
        </div>
      )}

      {/* ================= FORM JASA BENGKEL LUAR ================= */}
      {tab === 'jasa' && (
        <div className="form-container" style={{ borderTop: '4px solid #8b5cf6' }}>
          <h3 style={{ marginBottom: '5px', color: '#8b5cf6' }}>Form Jasa Bengkel Luar</h3>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>Catat ongkos jasa tanpa memotong stok gudang.</p>
          <form onSubmit={handleJasa}>
            <div className="form-group"><label>Tanggal Pekerjaan</label><input type="date" required value={formJasa.tanggal} onChange={(e) => setFormJasa({...formJasa, tanggal: e.target.value})} /></div>
            <div className="form-group" style={{ background: '#f5f3ff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd6fe' }}>
              <label style={{ color: '#5b21b6' }}>Pilih Armada Truk</label>
              <input type="text" placeholder="🔍 Cari Truk / Plat..." value={searchJasaTruk} onChange={(e) => setSearchJasaTruk(e.target.value)} style={{ marginBottom: '10px', padding: '10px', width: '100%', borderRadius: '5px', border: '1px solid #c4b5fd' }} />
              <select required value={formJasa.idTruk} onChange={(e) => setFormJasa({...formJasa, idTruk: e.target.value})}>
                <option value="" disabled>-- Hasil Pencarian ({filteredTrukJasa.length} truk) --</option>
                {filteredTrukJasa.map(t => <option key={t.id} value={t.id}>{t.nama} - {t.plat}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Keterangan Pekerjaan</label><input type="text" required value={formJasa.namaJasa} onChange={(e) => setFormJasa({...formJasa, namaJasa: e.target.value})} placeholder="Contoh: Turun Mesin, Las Bak" /></div>
            <div className="form-group"><label>Total Biaya (Rp)</label><input type="text" required value={formJasa.biaya} onChange={e => { const raw = e.target.value.replace(/[^0-9]/g, ''); setFormJasa({...formJasa, biaya: raw ? parseInt(raw, 10).toLocaleString('id-ID') : ''}); }} /></div>
            <div className="form-group"><label>Odometer Saat Ini (Opsional)</label><input type="number" value={formJasa.odo} onChange={(e) => setFormJasa({...formJasa, odo: e.target.value})} /></div>
            <div className="form-group"><label>Upload Nota (Opsional)</label><input type="file" id="inputNota" accept="image/*" capture="environment" onChange={(e) => setFileNota(e.target.files[0])} /></div>
            <button type="submit" className="btn-submit" disabled={prosesLoading} style={{ backgroundColor: '#8b5cf6' }}>{prosesLoading ? "Memproses..." : "Simpan Biaya Jasa"}</button>
          </form>
        </div>
      )}

      {/* ================= FORM PENJUALAN BEKAS (BARU) ================= */}
      {tab === 'jual' && (
        <div className="form-container" style={{ borderTop: '4px solid #10b981' }}>
          <h3 style={{ marginBottom: '5px', color: '#10b981' }}>Form Penjualan Rongsok / Bekas</h3>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>Catat pemasukan uang dari penjualan velg rusak, aki mati, kardus, atau besi tua.</p>
          <form onSubmit={handleJualBekas}>
            <div className="form-group"><label>Tanggal Penjualan</label><input type="date" required value={formJual.tanggal} onChange={(e) => setFormJual({...formJual, tanggal: e.target.value})} /></div>
            <div className="form-group">
              <label>Kategori / Nama Barang Terjual</label>
              <input type="text" required value={formJual.namaBarang} onChange={(e) => setFormJual({...formJual, namaBarang: e.target.value})} placeholder="Contoh: Aki Bekas, Besi Tua, Velg Patah" />
            </div>
            <div className="form-group">
              <label>Keterangan Tambahan</label>
              <input type="text" value={formJual.keterangan} onChange={(e) => setFormJual({...formJual, keterangan: e.target.value})} placeholder="Contoh: Terjual ke Pengepul, Total 50 KG" />
            </div>
            <div className="form-group">
              <label>Total Pendapatan (Rp)</label>
              <input type="text" required placeholder="Contoh: 1.500.000" value={formJual.nominal} onChange={e => { const raw = e.target.value.replace(/[^0-9]/g, ''); setFormJual({...formJual, nominal: raw ? parseInt(raw, 10).toLocaleString('id-ID') : ''}); }} />
            </div>
            <button type="submit" className="btn-submit" disabled={prosesLoading} style={{ backgroundColor: '#10b981' }}>{prosesLoading ? "Memproses..." : "Simpan Uang Masuk"}</button>
          </form>
        </div>
      )}

    </div>
  );
}