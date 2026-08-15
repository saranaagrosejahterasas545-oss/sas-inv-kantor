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
  
  // STATE BARU: Form untuk Jasa Bengkel Luar
  const [formJasa, setFormJasa] = useState({ idTruk: '', namaJasa: '', biaya: '', odo: '', tanggal: hariIni });
  const [fileNota, setFileNota] = useState(null);

  // State untuk menyimpan DUA jenis foto (Barang & Odo)
  const [fileFoto, setFileFoto] = useState(null);
  const [fileFotoOdo, setFileFotoOdo] = useState(null);

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
      }
    } catch (err) { 
      Swal.fire({ title: 'Error!', text: 'Gagal memuat data master.', icon: 'error', confirmButtonColor: '#ef4444' }); 
    }
    setLoadingData(false);
  };

  useEffect(() => { fetchData(); }, []);

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });

  const handleMasuk = async (e) => {
    e.preventDefault(); 
    setProsesLoading(true);
    try {
      const username = localStorage.getItem('sas_user');
      const qtyFinal = parseFloat(formMasuk.qty.toString().replace(',', '.'));

      const response = await fetch('/api/sas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "BARANG_MASUK", ...formMasuk, qty: qtyFinal, username })
      });
      const result = await response.json();
      if (result.success) {
        Swal.fire({ title: 'Sukses!', text: result.message, icon: 'success', confirmButtonColor: '#1798D1' });
        setFormMasuk({ idBarang: '', qty: '', tanggal: hariIni }); 
        fetchData();
      } else {
        Swal.fire({ title: 'Gagal!', text: result.message, icon: 'warning', confirmButtonColor: '#ef4444' });
      }
    } catch (error) { 
      Swal.fire({ title: 'Error!', text: 'Terjadi kesalahan sistem.', icon: 'error', confirmButtonColor: '#ef4444' }); 
    }
    setProsesLoading(false);
  };

  const handleKeluar = async (e) => {
    e.preventDefault(); 
    setProsesLoading(true);
    
    const barangTerpilih = dataBarang.find(b => b.id === formKeluar.idBarang);
    const batasKm = barangTerpilih ? (Number(barangTerpilih.batas_km) || 0) : 0; 
    const odoSaatIni = Number(formKeluar.odo) || 0;
    const estimasiOdo = odoSaatIni + batasKm;

    try {
      const username = localStorage.getItem('sas_user');
      const qtyFinal = parseFloat(formKeluar.qty.toString().replace(',', '.'));

      let fileData = null;
      if (fileFoto) {
        const base64 = await toBase64(fileFoto);
        fileData = { base64: base64, mimeType: fileFoto.type, name: fileFoto.name };
      }

      let fileDataOdo = null;
      if (fileFotoOdo) {
        const base64 = await toBase64(fileFotoOdo);
        fileDataOdo = { base64: base64, mimeType: fileFotoOdo.type, name: fileFotoOdo.name };
      }
      
      const response = await fetch('/api/sas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "TRANSAKSI_KELUAR", ...formKeluar, qty: qtyFinal, fileData, fileDataOdo, username })
      });
      const result = await response.json();
      
      if (result.success) {
        let pesanSukses = result.message;
        if (batasKm > 0 && odoSaatIni > 0) {
          pesanSukses += `<br><br><div style="background: #fff7ed; padding: 15px; border-radius: 8px; border: 1px solid #fdba74;">
            <b style="color: #c2410c;">🛠️ Pengingat Servis Berikutnya:</b><br>
            Ganti di KM <span style="font-size: 20px; font-weight: 900; color: #ea580c;">${estimasiOdo.toLocaleString('id-ID')}</span>
          </div>`;
        }

        Swal.fire({ title: 'Sukses!', html: pesanSukses, icon: 'success', confirmButtonColor: '#F38C36' });

        setFormKeluar({ idTruk: '', idBarang: '', qty: '', odo: '', tanggal: hariIni });
        setFileFoto(null); 
        setFileFotoOdo(null);
        document.getElementById('inputFoto').value = ''; 
        document.getElementById('inputFotoOdo').value = ''; 
        fetchData();
      } else {
        Swal.fire({ title: 'Gagal!', text: result.message, icon: 'warning', confirmButtonColor: '#ef4444' });
      }
    } catch (error) { 
      Swal.fire({ title: 'Error!', text: 'Terjadi kesalahan sistem.', icon: 'error', confirmButtonColor: '#ef4444' }); 
    }
    setProsesLoading(false);
  };

  const handleOpname = async (e) => {
    e.preventDefault(); 
    setProsesLoading(true);
    try {
      const username = localStorage.getItem('sas_user');
      const stokFisikFinal = parseFloat(formOpname.stokFisik.toString().replace(',', '.'));

      const response = await fetch('/api/sas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "OPNAME", idBarang: formOpname.idBarang, stokFisik: stokFisikFinal, keterangan: formOpname.keterangan, username })
      });
      const result = await response.json();
      if (result.success) {
        Swal.fire({ title: 'Sukses!', text: result.message, icon: 'success', confirmButtonColor: '#05CD99' });
        setFormOpname({ idBarang: '', stokSistem: '', stokFisik: '', keterangan: '' }); 
        fetchData();
      } else {
        Swal.fire({ title: 'Gagal!', text: result.message, icon: 'warning', confirmButtonColor: '#ef4444' });
      }
    } catch (error) { 
      Swal.fire({ title: 'Error!', text: 'Terjadi kesalahan sistem.', icon: 'error', confirmButtonColor: '#ef4444' }); 
    }
    setProsesLoading(false);
  };

  // ================= HANDLER JASA BENGKEL =================
  const handleJasa = async (e) => {
    e.preventDefault();
    setProsesLoading(true);
    try {
      const username = localStorage.getItem('sas_user');
      // Bersihkan titik sebelum dikirim ke server (Ubah "150.000" jadi 150000)
      const biayaBersih = parseInt(String(formJasa.biaya).replace(/\./g, ''), 10) || 0;

      let fileDataNota = null;
      if (fileNota) {
        const base64 = await toBase64(fileNota);
        fileDataNota = { base64: base64, mimeType: fileNota.type, name: fileNota.name };
      }

      const response = await fetch('/api/sas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "JASA_BENGKEL", ...formJasa, biaya: biayaBersih, fileNota: fileDataNota, username })
      });
      const result = await response.json();

      if (result.success) {
        Swal.fire({ title: 'Sukses!', text: result.message, icon: 'success', confirmButtonColor: '#8b5cf6' });
        setFormJasa({ idTruk: '', namaJasa: '', biaya: '', odo: '', tanggal: hariIni });
        setFileNota(null);
        document.getElementById('inputNota').value = '';
        fetchData();
      } else {
        Swal.fire({ title: 'Gagal!', text: result.message, icon: 'warning', confirmButtonColor: '#ef4444' });
      }
    } catch (error) {
      Swal.fire({ title: 'Error!', text: 'Terjadi kesalahan sistem.', icon: 'error', confirmButtonColor: '#ef4444' });
    }
    setProsesLoading(false);
  };

  const handlePilihBarangOpname = (e) => {
    const id = e.target.value;
    const barang = dataBarang.find(b => b.id === id);
    setFormOpname({ ...formOpname, idBarang: id, stokSistem: barang ? barang.stok : '' });
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
        {/* TOMBOL TAB BARU UNTUK JASA BENGKEL */}
        <button className={`tab-btn ${tab === 'jasa' ? 'active' : ''}`} onClick={() => setTab('jasa')} style={{ backgroundColor: tab === 'jasa' ? '#8b5cf6' : '#e2e8f0', color: tab === 'jasa' ? 'white' : '#64748b' }}>🛠️ Jasa Bengkel Luar</button>
      </div>

      {/* ================= FORM BARANG MASUK ================= */}
      {tab === 'masuk' && (
        <div className="form-container">
          <h3 style={{ marginBottom: '20px', color: '#1798D1' }}>Form Barang Masuk</h3>
          <form onSubmit={handleMasuk}>
            <div className="form-group">
              <label>Pilih Barang (Stok Saat Ini)</label>
              <select required value={formMasuk.idBarang} onChange={(e) => setFormMasuk({...formMasuk, idBarang: e.target.value})}>
                <option value="" disabled>-- Pilih Barang --</option>
                {dataBarang.map(b => ( <option key={b.id} value={b.id}>{b.nama} (Stok: {b.stok})</option> ))}
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
            
            <div className="form-group">
              <label>Tanggal Servis / Penggantian</label>
              <input type="date" required value={formKeluar.tanggal} onChange={(e) => setFormKeluar({...formKeluar, tanggal: e.target.value})} />
              <span style={{ fontSize: '12px', color: '#888' }}>*Bisa dimundurkan jika transaksi terjadi tadi malam/kemarin.</span>
            </div>

            <div className="form-group">
              <label>Pilih Armada Truk</label>
              <select required value={formKeluar.idTruk} onChange={(e) => setFormKeluar({...formKeluar, idTruk: e.target.value})}>
                <option value="" disabled>-- Pilih Truk --</option>
                {dataTruk.map(t => {
                  const odoTerakhir = t.odo || t.odo_terakhir || t.km || '-';
                  return (
                    <option key={t.id} value={t.id}>
                      {t.nama} - {t.plat} (ODO Terakhir: {odoTerakhir})
                    </option>
                  );
                })}
              </select>
            </div>
            
            <div className="form-group">
              <label>Pilih Barang / Sparepart</label>
              <select required value={formKeluar.idBarang} onChange={(e) => setFormKeluar({...formKeluar, idBarang: e.target.value})}>
                <option value="" disabled>-- Pilih Barang --</option>
                {dataBarang.map(b => ( <option key={b.id} value={b.id}>{b.nama} (Sisa Stok: {b.stok})</option> ))}
              </select>
            </div>
            
            <div className="form-group"><label>Jumlah Keluar (Qty)</label><input type="number" required step="any" min="0.01" value={formKeluar.qty} onChange={(e) => setFormKeluar({...formKeluar, qty: e.target.value})} placeholder="0" /></div>
            
            <div className="form-group">
              <label>Odometer Truk Saat Ini (KM)</label>
              <input type="number" required value={formKeluar.odo} onChange={(e) => setFormKeluar({...formKeluar, odo: e.target.value})} placeholder="Masukkan KM saat ini" />
              
              {batasKmKeluar > 0 && formKeluar.odo && (
                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff7ed', borderLeft: '4px solid #F38C36', borderRadius: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#ea580c' }}>💡 Info Interval Servis: <b>{batasKmKeluar.toLocaleString('id-ID')} KM</b></span><br/>
                  <span style={{ fontSize: '14px', color: '#c2410c', fontWeight: 'bold' }}>
                    Target Ganti Berikutnya: KM {(Number(formKeluar.odo) + batasKmKeluar).toLocaleString('id-ID')}
                  </span>
                </div>
              )}
            </div>

            {/* INPUT FOTO DENGAN FITUR KAMERA OTOMATIS */}
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '15px' }}>
              <div className="form-group" style={{ flex: 1, minWidth: '250px' }}>
                <label>Bukti Foto Barang (Opsional)</label>
                <input type="file" id="inputFoto" accept="image/*" capture="environment" onChange={(e) => setFileFoto(e.target.files[0])} />
                <span style={{ fontSize: '12px', color: '#888' }}>*Di HP, tombol ini akan langsung membuka kamera.</span>
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: '250px', borderLeft: '3px solid #1798D1', paddingLeft: '15px' }}>
                <label style={{ color: '#1798D1', fontWeight: 'bold' }}>📸 Bukti Foto ODO Meter (Wajib/Opsional)</label>
                <input type="file" id="inputFotoOdo" accept="image/*" capture="environment" onChange={(e) => setFileFotoOdo(e.target.files[0])} />
                <span style={{ fontSize: '12px', color: '#1798D1' }}>*Fotokan ODO di *dashboard* truk untuk audit keaslian.</span>
              </div>
            </div>
            
            <button type="submit" className="btn-submit" disabled={prosesLoading} style={{ backgroundColor: '#F38C36' }}>{prosesLoading ? "Memproses..." : "Simpan Barang Keluar"}</button>
          </form>
        </div>
      )}

      {/* ================= FORM STOCK OPNAME ================= */}
      {tab === 'opname' && (
        <div className="form-container" style={{ borderTop: '4px solid #05CD99' }}>
          <h3 style={{ marginBottom: '5px', color: '#05CD99' }}>Form Stock Opname</h3>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>Sesuaikan perbedaan jumlah stok fisik aktual dengan yang ada di sistem.</p>
          <form onSubmit={handleOpname}>
            <div className="form-group">
              <label>Pilih Barang</label>
              <select required value={formOpname.idBarang} onChange={handlePilihBarangOpname}>
                <option value="" disabled>-- Pilih Barang --</option>
                {dataBarang.map(b => ( <option key={b.id} value={b.id}>{b.nama}</option> ))}
              </select>
            </div>
            <div className="form-group"><label>Stok di Sistem Saat Ini</label><input type="number" readOnly value={formOpname.stokSistem} style={{ backgroundColor: '#f0f0f0', color: '#888', fontWeight: 'bold', cursor: 'not-allowed' }} placeholder="Pilih barang terlebih dahulu" /></div>
            <div className="form-group"><label>Stok Fisik Aktual (Nyata)</label><input type="number" required step="any" min="0" value={formOpname.stokFisik} onChange={(e) => setFormOpname({...formOpname, stokFisik: e.target.value})} placeholder="Masukkan jumlah yang ada di gudang" /></div>
            <div className="form-group"><label>Keterangan / Alasan Selisih</label><input type="text" required value={formOpname.keterangan} onChange={(e) => setFormOpname({...formOpname, keterangan: e.target.value})} placeholder="Contoh: Barang hilang, rusak, atau salah hitung" /></div>
            <button type="submit" className="btn-submit" disabled={prosesLoading} style={{ backgroundColor: '#05CD99' }}>{prosesLoading ? "Memproses..." : "Sesuaikan Stok"}</button>
          </form>
        </div>
      )}

      {/* ================= FORM JASA BENGKEL LUAR ================= */}
      {tab === 'jasa' && (
        <div className="form-container" style={{ borderTop: '4px solid #8b5cf6' }}>
          <h3 style={{ marginBottom: '5px', color: '#8b5cf6' }}>Form Jasa Bengkel Luar</h3>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>Catat biaya jasa tukang/bengkel. Transaksi ini <b>TIDAK</b> akan memotong stok barang di gudang.</p>
          <form onSubmit={handleJasa}>
            
            <div className="form-group">
              <label>Tanggal Servis / Pekerjaan</label>
              <input type="date" required value={formJasa.tanggal} onChange={(e) => setFormJasa({...formJasa, tanggal: e.target.value})} />
            </div>

            <div className="form-group">
              <label>Pilih Armada Truk</label>
              <select required value={formJasa.idTruk} onChange={(e) => setFormJasa({...formJasa, idTruk: e.target.value})}>
                <option value="" disabled>-- Pilih Truk --</option>
                {dataTruk.map(t => {
                  const odoTerakhir = t.odo || t.odo_terakhir || t.km || '-';
                  return (
                    <option key={t.id} value={t.id}>
                      {t.nama} - {t.plat} (ODO Terakhir: {odoTerakhir})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="form-group">
              <label>Keterangan Jasa / Pekerjaan</label>
              <input type="text" required value={formJasa.namaJasa} onChange={(e) => setFormJasa({...formJasa, namaJasa: e.target.value})} placeholder="Contoh: Las Bak, Press Per, Turun Mesin, dll" />
            </div>

            <div className="form-group">
              <label>Total Biaya Jasa (Rp)</label>
              <input 
                type="text" 
                required 
                placeholder="Contoh: 350.000"
                value={formJasa.biaya} 
                onChange={e => {
                  const rawValue = e.target.value.replace(/[^0-9]/g, '');
                  const formattedValue = rawValue ? parseInt(rawValue, 10).toLocaleString('id-ID') : '';
                  setFormJasa({...formJasa, biaya: formattedValue});
                }} 
              />
            </div>

            <div className="form-group">
              <label>Odometer Truk Saat Ini (KM) - Opsional</label>
              <input type="number" value={formJasa.odo} onChange={(e) => setFormJasa({...formJasa, odo: e.target.value})} placeholder="Masukkan KM jika ada/diketahui" />
            </div>

            <div className="form-group">
              <label>Upload Nota / Kwitansi Bengkel (Opsional)</label>
              <input type="file" id="inputNota" accept="image/*" capture="environment" onChange={(e) => setFileNota(e.target.files[0])} />
            </div>

            <button type="submit" className="btn-submit" disabled={prosesLoading} style={{ backgroundColor: '#8b5cf6' }}>{prosesLoading ? "Memproses..." : "Simpan Biaya Jasa"}</button>
          </form>
        </div>
      )}

    </div>
  );
}