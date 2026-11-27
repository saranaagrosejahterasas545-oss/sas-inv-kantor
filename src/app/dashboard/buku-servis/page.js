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
  const [filterBukti, setFilterBukti] = useState('');

  // Ekstrak ID file Google Drive dari link file.getUrl()
  const extractDriveId = (url) => {
    if (!url) return null;
    const cleanUrl = String(url).trim();
    if (!cleanUrl.includes('drive.google.com') && !cleanUrl.includes('docs.google.com')) return null;
    const match = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  // Konversi link Google Drive menjadi URL gambar langsung
  const getDirectImageUrl = (url) => {
    if (!url) return '';
    const cleanUrl = String(url).trim();
    const driveId = extractDriveId(cleanUrl);
    if (driveId) {
      return `https://lh3.googleusercontent.com/d/${driveId}`;
    }
    return cleanUrl;
  };

  // Bersihkan nilai URL dari "-" atau kosong
  const cleanLink = (val) => {
    const str = String(val || '').trim();
    if (!str || str === '-' || str.toLowerCase() === 'null') return '';
    return str;
  };

  // Ambil URL bukti barang/nota (sesuai properti foto_url dari getMasterData)
  const getRawBukti = (trx) => cleanLink(trx.foto_url || trx.bukti || trx.foto);

  // Ambil URL bukti odometer (jika dikirim Apps Script)
  const getRawFotoOdo = (trx) => cleanLink(trx.foto_odo);

  // Perbesar gambar bukti saat diklik
  const handlePreviewBukti = (rawUrl, imgUrl, labelJenis, trx) => {
    if (!rawUrl) return;
    Swal.fire({
      title: `${labelJenis}: ${trx.truk_nama || 'Armada'}`,
      html: `
        <div style="font-size: 13px; color: #555; margin-bottom: 10px;">
          Item: <b>${trx.barang_nama_asli}</b><br/>
          Tanggal: <b>${trx.waktu_str || '-'}</b> | Odo: <b>${trx.odo && trx.odo !== '-' ? Number(trx.odo).toLocaleString('id-ID') + ' KM' : '-'}</b> | Biaya: <b>Rp ${Number(trx.total_biaya || 0).toLocaleString('id-ID')}</b>
        </div>
        <div style="margin-top: 8px;">
          <a href="${rawUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 12px; color: #1798D1; text-decoration: underline;">
            Buka File Asli di Google Drive ↗
          </a>
        </div>
      `,
      imageUrl: imgUrl,
      imageAlt: `${labelJenis} ${trx.barang_nama_asli}`,
      imageHeight: 340,
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

    const punyaBukti = Boolean(getRawBukti(trx) || getRawFotoOdo(trx));
    if (filterBukti === 'ADA' && !punyaBukti) return false;
    if (filterBukti === 'TIDAK' && punyaBukti) return false;

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

  const jumlahAdaBukti = riwayatTampil.filter((trx) => Boolean(getRawBukti(trx) || getRawFotoOdo(trx))).length;

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
        <h1 style={{ color: '#1798D1', marginBottom: '5px' }}>Buku Servis & Bukti Armada</h1>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Pantau riwayat perbaikan armada, cek lampiran foto bukti transaksi, dan rekap biaya servis.
        </p>

        {/* KOTAK FILTER */}
        <div
          style={{
            background: '#fff',
            padding: '20px',
            borderRadius: '15px',
            marginBottom: '25px',
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
          }}
        >
          <div style={{ flex: 1, minWidth: '180px' }}>
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

          <div style={{ flex: 1, minWidth: '180px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '5px',
                fontWeight: 'bold',
                fontSize: '13px',
                color: '#10b981',
              }}
            >
              2. Lacak Sparepart
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

          <div style={{ flex: 1, minWidth: '150px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '5px',
                fontWeight: 'bold',
                fontSize: '13px',
                color: '#1798D1',
              }}
            >
              4. Filter Foto Bukti
            </label>
            <select
              value={filterBukti}
              onChange={(e) => setFilterBukti(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #1798D1' }}
            >
              <option value="">-- Semua Status --</option>
              <option value="ADA">Ada Foto Bukti</option>
              <option value="TIDAK">Belum Ada Bukti</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => window.print()}
              style={{
                background: '#555',
                color: '#fff',
                border: 'none',
                padding: '10px 14px',
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
                setFilterBukti('');
              }}
              style={{
                background: '#F38C36',
                color: '#fff',
                border: 'none',
                padding: '10px 14px',
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
            <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                }}
              >
                Odo Terakhir: {Number(trukInfo.odo || 0).toLocaleString('id-ID')} KM
              </span>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                }}
              >
                Bukti Terlampir: {jumlahAdaBukti} / {riwayatTampil.length}
              </span>
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
            <h2 style={{ margin: '0 0 5px 0' }}>{barangInfo.nama}</h2>
            <p style={{ margin: 0, fontSize: '15px', opacity: 0.9 }}>
              Sisa Stok di Gudang: <strong>{parseFloat(Number(barangInfo.stok || 0).toFixed(1))}</strong>
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
        <div
          style={{
            marginBottom: '15px',
            paddingBottom: '10px',
            borderBottom: '2px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <h2 style={{ color: '#333', margin: 0, fontSize: '20px' }}>
            Laporan Riwayat Servis {trukInfo ? `Armada: ${trukInfo.nama}` : '(Semua Armada)'}
          </h2>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            Menampilkan <strong>{riwayatTampil.length}</strong> transaksi ({jumlahAdaBukti} ada foto bukti)
          </span>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Tanggal</th>
              {!trukInfo && <th>Truk Armada</th>}
              <th>Item / Pekerjaan</th>
              <th>Jenis</th>
              <th>QTY (Keluar)</th>
              <th>Odo Saat Ganti & Target</th>
              <th style={{ width: '115px', textAlign: 'center' }}>Bukti Foto</th>
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

                const rawBukti = getRawBukti(trx);
                const imgBuktiUrl = getDirectImageUrl(rawBukti);
                const driveIdBukti = extractDriveId(rawBukti);

                const rawOdo = getRawFotoOdo(trx);
                const imgOdoUrl = getDirectImageUrl(rawOdo);
                const driveIdOdo = extractDriveId(rawOdo);

                return (
                  <tr key={index} style={{ backgroundColor: isJasa ? '#f5f3ff' : 'transparent' }}>
                    <td>{trx.waktu_str}</td>
                    {!trukInfo && (
                      <td>
                        <strong>{trx.truk_nama}</strong>
                      </td>
                    )}

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

                    {/* KOLOM BUKTI FOTO (DARI trx.foto_url) */}
                    <td style={{ textAlign: 'center' }}>
                      {rawBukti || rawOdo ? (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                          {rawBukti && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <img
                                src={imgBuktiUrl}
                                alt={isJasa ? 'Bukti Nota' : 'Bukti Barang'}
                                onClick={() =>
                                  handlePreviewBukti(
                                    rawBukti,
                                    imgBuktiUrl,
                                    isJasa ? 'Bukti Nota Bengkel' : 'Bukti Pengambilan Barang',
                                    trx
                                  )
                                }
                                onError={(e) => {
                                  if (driveIdBukti && !e.currentTarget.dataset.retried) {
                                    e.currentTarget.dataset.retried = 'true';
                                    e.currentTarget.src = `https://drive.google.com/thumbnail?id=${driveIdBukti}&sz=w800`;
                                  } else {
                                    e.currentTarget.style.display = 'none';
                                  }
                                }}
                                title="Klik untuk perbesar foto"
                                style={{
                                  width: '44px',
                                  height: '44px',
                                  objectFit: 'cover',
                                  borderRadius: '7px',
                                  border: '2px solid #1798D1',
                                  cursor: 'pointer',
                                }}
                              />
                              <a
                                href={rawBukti}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: '9px', color: '#1798D1', fontWeight: 'bold', marginTop: '2px', textDecoration: 'none' }}
                              >
                                {isJasa ? 'Nota ↗' : 'Barang ↗'}
                              </a>
                            </div>
                          )}

                          {rawOdo && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <img
                                src={imgOdoUrl}
                                alt="Bukti Odometer"
                                onClick={() =>
                                  handlePreviewBukti(rawOdo, imgOdoUrl, 'Bukti Foto Odometer', trx)
                                }
                                onError={(e) => {
                                  if (driveIdOdo && !e.currentTarget.dataset.retried) {
                                    e.currentTarget.dataset.retried = 'true';
                                    e.currentTarget.src = `https://drive.google.com/thumbnail?id=${driveIdOdo}&sz=w800`;
                                  } else {
                                    e.currentTarget.style.display = 'none';
                                  }
                                }}
                                title="Klik untuk perbesar foto odometer"
                                style={{
                                  width: '44px',
                                  height: '44px',
                                  objectFit: 'cover',
                                  borderRadius: '7px',
                                  border: '2px solid #10b981',
                                  cursor: 'pointer',
                                }}
                              />
                              <a
                                href={rawOdo}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: '9px', color: '#10b981', fontWeight: 'bold', marginTop: '2px', textDecoration: 'none' }}
                              >
                                Odo ↗
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: '11px',
                            color: '#94a3b8',
                            background: '#f1f5f9',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            display: 'inline-block',
                          }}
                        >
                          Kosong
                        </span>
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