'use client';
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function BukuServisPage() {
  const [dataTruk, setDataTruk] = useState([]);
  const [dataRiwayat, setDataRiwayat] = useState([]);
  const [dataBarang, setDataBarang] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [selectedTruk, setSelectedTruk] = useState('');
  const [selectedBarang, setSelectedBarang] = useState('');
  const [filterBulan, setFilterBulan] = useState('');

  // Helper: Ubah link share Google Drive menjadi link gambar langsung
  const getDirectImageUrl = (url) => {
    if (!url) return '';
    const cleanUrl = String(url).trim();
    const driveMatch = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (cleanUrl.includes('drive.google.com') && driveMatch && driveMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
    }
    return cleanUrl;
  };

  // Helper: Perbesar gambar saat diklik
  const handlePreviewGambar = (imgUrl, namaBarang) => {
    if (!imgUrl) return;
    Swal.fire({
      title: namaBarang,
      imageUrl: imgUrl,
      imageAlt: namaBarang,
      imageHeight: 320,
      confirmButtonText: 'Tutup',
      confirmButtonColor: '#1798D1',
    });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'GET_DATA' }),
      });
      const result = await response.json();
      if (result.success) {
        setDataTruk(result.data.truk || []);
        setDataBarang(result.data.barang || []);

        const riwayatServis = (result.data.transaksi || [])
          .filter((t) => {
            const jenisTrx = String(t.jenis || '').toUpperCase().trim();
            return jenisTrx.includes('KELUAR') || jenisTrx.includes('JASA');
          })
          .reverse();

        setDataRiwayat(riwayatServis);
      }
    } catch (err) {
      alert('Gagal memuat data buku servis.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBatalkanTransaksi = async (idTrx, jenis) => {
    const isJasa = String(jenis || '').toUpperCase().includes('JASA');
    const pesanTeks = isJasa
      ? `Yakin ingin membatalkan transaksi jasa <b>${idTrx}</b>?`
      : `Yakin ingin membatalkan transaksi servis <b>${idTrx}</b>?<br>Stok sparepart akan dikembalikan ke gudang.`;

    const confirmBox = await Swal.fire({
      title: 'Batalkan Transaksi?',
      html: pesanTeks,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff4d4f',
      cancelButtonColor: '#888',
      confirmButtonText: 'Ya, Batalkan!',
      cancelButtonText: 'Tutup',
    });

    if (confirmBox.isConfirmed) {
      setLoading(true);
      const username = localStorage.getItem('sas_user');
      try {
        const response = await fetch('/api/sas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'HAPUS_TRANSAKSI', id: idTrx, username }),
        });
        const result = await response.json();
        if (result.success) {
          Swal.fire('Dibatalkan!', result.message, 'success');
          fetchData();
        } else {
          Swal.fire('Gagal!', result.message, 'error');
        }
      } catch (error) {
        Swal.fire('Sistem Error', 'Terjadi kesalahan jaringan.', 'error');
      }
      setLoading(false);
    }
  };

  // ================= LOGIKA FILTER DATA =================
  const riwayatTampil = dataRiwayat.filter((trx) => {
    if (selectedTruk && trx.idTruk !== selectedTruk) return false;
    if (selectedBarang && trx.idBarang !== selectedBarang) return false;

    if (filterBulan && trx.waktu_raw) {
      const d = new Date(trx.waktu_raw);
      const trxBulan = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      if (trxBulan !== filterBulan) return false;
    }
    return true;
  });

  const trukInfo = dataTruk.find((t) => t.id === selectedTruk);
  const barangInfo = dataBarang.find((b) => b.id === selectedBarang);

  // ================= HITUNG TOTAL OTOMATIS =================
  const totalBiayaTampil = riwayatTampil.reduce((sum, trx) => sum + (Number(trx.total_biaya) || 0), 0);

  const rawTotalQty = riwayatTampil.reduce((sum, trx) => {
    const isJasa = String(trx.jenis || '').toUpperCase().includes('JASA');
    return isJasa ? sum : sum + (Number(trx.jumlah) || 0);
  }, 0);
  const totalQtyTerpakai = parseFloat(rawTotalQty.toFixed(1));

  const totalItemGanti = parseFloat(
    riwayatTampil.reduce((sum, trx) => sum + (Number(trx.jumlah) || 0), 0).toFixed(1)
  );

  const getTeksPeriode = () => {
    if (!filterBulan) return 'Semua Waktu';
    const [tahun, bulan] = filterBulan.split('-');
    const namaBulan = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    return `${namaBulan[parseInt(bulan, 10) - 1]} ${tahun}`;
  };

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <h3>Memuat Buku Servis...</h3>
      </div>
    );
  }

  return (
    <div>
      <div className="print-hide">
        <h1 style={{ color: '#1798D1', marginBottom: '5px' }}>Buku Servis & Pelacakan</h1>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Pantau riwayat perbaikan armada, foto sparepart terpasang, dan total pemakaian barang.
        </p>

        {/* KOTAK FILTER */}
        <div
          style={{
            background: '#fff',
            padding: '20px',
            borderRadius: '15px',
            marginBottom: '25px',
            display: 'flex',
            gap: '15px',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
          }}
        >
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>
              1. Pilih Armada Truk
            </label>
            <select
              value={selectedTruk}
              onChange={(e) => setSelectedTruk(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
            >
              <option value="">-- Semua Truk --</option>
              {dataTruk.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nama} ({t.plat})
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '5px',
                fontWeight: 'bold',
                fontSize: '13px',
                color: '#10b981',
              }}
            >
              2. Lacak Sparepart Tertentu
            </label>
            <select
              value={selectedBarang}
              onChange={(e) => setSelectedBarang(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #10b981' }}
            >
              <option value="">-- Semua Barang & Jasa --</option>
              {dataBarang.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nama}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>
              3. Pilih Bulan
            </label>
            <select
              value={filterBulan}
              onChange={(e) => setFilterBulan(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
            >
              <option value="">-- Semua Waktu --</option>
              <option value="2026-08">Agustus 2026</option>
              <option value="2026-09">September 2026</option>
              <option value="2026-10">Oktober 2026</option>
              <option value="2026-11">November 2026</option>
              <option value="2026-12">Desember 2026</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => window.print()}
              style={{
                background: '#555',
                color: '#fff',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Cetak
            </button>
            <button
              onClick={() => {
                setSelectedTruk('');
                setSelectedBarang('');
                setFilterBulan('');
              }}
              style={{
                background: '#F38C36',
                color: '#fff',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* ================= KARTU RINGKASAN BIAYA & QTY ================= */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', flexWrap: 'wrap' }}>
        {trukInfo && (
          <div
            style={{
              flex: 2,
              minWidth: '250px',
              background: 'linear-gradient(135deg, #1798D1, #0c76a6)',
              color: '#fff',
              padding: '20px',
              borderRadius: '15px',
            }}
          >
            <h2 style={{ margin: '0 0 5px 0' }}>{trukInfo.nama}</h2>
            <p style={{ margin: 0, fontSize: '15px', opacity: 0.9 }}>
              Plat: <strong>{trukInfo.plat}</strong> | Sopir: <strong>{trukInfo.sopir}</strong>
            </p>
            <div
              style={{
                marginTop: '15px',
                display: 'inline-block',
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 'bold',
              }}
            >
              Odo Terakhir: {Number(trukInfo.odo || 0).toLocaleString('id-ID')} KM
            </div>
          </div>
        )}

        {barangInfo && (
          <div
            style={{
              flex: 2,
              minWidth: '250px',
              background: 'linear-gradient(135deg, #10b981, #047857)',
              color: '#fff',
              padding: '20px',
              borderRadius: '15px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {getDirectImageUrl(barangInfo.gambar || barangInfo.foto || barangInfo.image) && (
                <img
                  src={getDirectImageUrl(barangInfo.gambar || barangInfo.foto || barangInfo.image)}
                  alt={barangInfo.nama}
                  style={{
                    width: '64px',
                    height: '64px',
                    objectFit: 'cover',
                    borderRadius: '10px',
                    border: '2px solid rgba(255,255,255,0.6)',
                  }}
                />
              )}
              <div>
                <h2 style={{ margin: '0 0 5px 0' }}>{barangInfo.nama}</h2>
                <p style={{ margin: 0, fontSize: '15px', opacity: 0.9 }}>
                  Sisa Stok di Gudang: <strong>{parseFloat(Number(barangInfo.stok || 0).toFixed(1))}</strong>
                </p>
              </div>
            </div>
            <div
              style={{
                marginTop: '15px',
                display: 'inline-block',
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 'bold',
              }}
            >
              Total Pemakaian (Keluar): {totalQtyTerpakai} Pcs/Liter
            </div>
          </div>
        )}

        <div
          style={{
            flex: 1,
            minWidth: '280px',
            background: '#fff',
            padding: '20px',
            borderRadius: '15px',
            borderLeft: '6px solid #ff4d4f',
          }}
        >
          <h4 style={{ color: '#888', textTransform: 'uppercase', fontSize: '12px', margin: '0 0 5px 0' }}>
            Total Biaya Servis {trukInfo ? trukInfo.nama : '(Semua Armada)'}
          </h4>
          <h2 style={{ color: '#ff4d4f', fontSize: '28px', margin: '0 0 5px 0' }}>
            Rp {totalBiayaTampil.toLocaleString('id-ID')}
          </h2>
          <p style={{ color: '#555', fontSize: '14px', margin: 0 }}>
            Periode: <strong>{getTeksPeriode()}</strong> | Total Fisik: <strong>{totalItemGanti} Item</strong>
          </p>
        </div>
      </div>

      {/* ================= TABEL RIWAYAT ================= */}
      <div className="table-container">
        <div style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid #eee' }}>
          <h2 style={{ color: '#333', marginBottom: '5px', fontSize: '20px' }}>
            Laporan Riwayat Servis {trukInfo ? `Armada: ${trukInfo.nama}` : '(Semua Armada)'}
          </h2>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Tanggal</th>
              {!trukInfo && <th>Truk Armada</th>}
              <th style={{ width: '65px', textAlign: 'center' }}>Foto</th>
              <th>Item / Pekerjaan</th>
              <th>Jenis</th>
              <th>QTY (Keluar)</th>
              <th>Odo Saat Ganti & Target</th>
              <th>Total Biaya</th>
              <th className="print-hide">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {riwayatTampil.length > 0 ? (
              riwayatTampil.map((trx, index) => {
                const isJasa = String(trx.jenis || '').toUpperCase().includes('JASA');
                const brg = dataBarang.find(
                  (b) => b.id === trx.idBarang || b.nama === trx.barang_nama_asli
                );
                const rawImg =
                  brg?.gambar || brg?.foto || brg?.image || brg?.url_gambar || trx.gambar || '';
                const imgUrl = getDirectImageUrl(rawImg);

                return (
                  <tr key={index} style={{ backgroundColor: isJasa ? '#f5f3ff' : 'transparent' }}>
                    <td>{trx.waktu_str}</td>
                    {!trukInfo && (
                      <td>
                        <strong>{trx.truk_nama}</strong>
                      </td>
                    )}

                    {/* KOLOM FOTO BARANG */}
                    <td style={{ textAlign: 'center' }}>
                      {isJasa ? (
                        <div
                          title="Jasa Bengkel Luar"
                          style={{
                            width: '46px',
                            height: '46px',
                            margin: '0 auto',
                            borderRadius: '8px',
                            backgroundColor: '#ede9fe',
                            color: '#6d28d9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                          }}
                        >
                          🛠️
                        </div>
                      ) : imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={trx.barang_nama_asli}
                          onClick={() => handlePreviewGambar(imgUrl, trx.barang_nama_asli)}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                          title="Klik untuk perbesar foto barang"
                          style={{
                            width: '46px',
                            height: '46px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            display: 'block',
                            margin: '0 auto',
                          }}
                        />
                      ) : (
                        <div
                          title="Belum ada foto barang"
                          style={{
                            width: '46px',
                            height: '46px',
                            margin: '0 auto',
                            borderRadius: '8px',
                            backgroundColor: '#f1f5f9',
                            color: '#94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                          }}
                        >
                          📦
                        </div>
                      )}
                    </td>

                    <td>
                      <strong>{trx.barang_nama_asli}</strong>
                      {isJasa && (
                        <span style={{ fontSize: '10px', display: 'block', color: '#8b5cf6' }}>
                          *Bengkel Luar
                        </span>
                      )}
                    </td>

                    <td>
                      <span
                        style={{
                          padding: '3px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor: isJasa ? '#c4b5fd' : '#fed7aa',
                          color: isJasa ? '#5b21b6' : '#9a3412',
                        }}
                      >
                        {isJasa ? 'JASA' : 'SPAREPART'}
                      </span>
                    </td>

                    <td style={{ fontWeight: 'bold', color: isJasa ? '#888' : '#10b981' }}>
                      {isJasa ? '-' : parseFloat(Number(trx.jumlah || 0).toFixed(1))}
                    </td>

                    <td>
                      {trx.odo !== '-' && Number(trx.odo) > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontWeight: 'bold', color: '#333' }}>
                            {Number(trx.odo).toLocaleString('id-ID')} KM
                          </span>
                          {!isJasa &&
                            (() => {
                              const batas = brg ? Number(brg.batas_km) || 0 : 0;
                              if (batas > 0) {
                                return (
                                  <div
                                    style={{
                                      fontSize: '11px',
                                      color: '#ea580c',
                                      background: '#fff7ed',
                                      padding: '3px 6px',
                                      borderRadius: '4px',
                                    }}
                                  >
                                    Ganti: <b>{(Number(trx.odo) + batas).toLocaleString('id-ID')} KM</b>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td style={{ fontWeight: 'bold', color: '#ff4d4f' }}>
                      Rp {Number(trx.total_biaya || 0).toLocaleString('id-ID')}
                    </td>

                    <td className="print-hide">
                      <button
                        onClick={() => handleBatalkanTransaksi(trx.id, trx.jenis)}
                        style={{
                          background: '#ff4d4f',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold',
                        }}
                      >
                        X Batal
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={trukInfo ? 8 : 9} style={{ textAlign: 'center', padding: '20px' }}>
                  Tidak ada riwayat servis ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}