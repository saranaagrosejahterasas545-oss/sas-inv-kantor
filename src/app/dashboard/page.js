'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
// Import komponen grafik dari Chart.js
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Daftarkan elemen grafik
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function DashboardPage() {
  const [user, setUser] = useState('');
  const [role, setRole] = useState('');
  const router = useRouter();

  const [summary, setSummary] = useState({ totalTruk: 0, totalBarang: 0, stokMenipis: 0, totalTransaksi: 0 });
  const [loading, setLoading] = useState(true);
  
  // State untuk Saran Bisnis & Grafik
  const [saranBisnis, setSaranBisnis] = useState('');
  const [chartBarang, setChartBarang] = useState(null);
  const [chartTruk, setChartTruk] = useState(null);

  useEffect(() => {
    const loggedInUser = localStorage.getItem('sas_user');
    const userRole = localStorage.getItem('sas_role');

    if (!loggedInUser) {
      router.push('/');
    } else {
      setUser(loggedInUser);
      setRole(userRole);
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/sas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "GET_DATA" })
      });
      const result = await response.json();
      
      if (result.success) {
        const { truk, barang, transaksi } = result.data;

        // 1. Hitung Ringkasan Atas
        const stokTipis = barang.filter(b => b.stok <= 5);
        setSummary({
          totalTruk: truk.length,
          totalBarang: barang.length,
          stokMenipis: stokTipis.length,
          totalTransaksi: transaksi.length
        });

        // 2. Olah Data untuk Saran Bisnis (Bulan Ini)
        const now = new Date();
        const currentMonthTrx = transaksi.filter(t => {
          if(!t.waktu_raw) return false;
          const d = new Date(t.waktu_raw);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && t.jenis === 'KELUAR';
        });

        let counterBarang = {};
        currentMonthTrx.forEach(t => { counterBarang[t.idBarang] = (counterBarang[t.idBarang] || 0) + t.jumlah; });
        
        let topItemId = null, maxQty = 0;
        for(let id in counterBarang) { if(counterBarang[id] > maxQty) { maxQty = counterBarang[id]; topItemId = id; } }

        let saranHtml = "";
        if(topItemId) {
          const brg = barang.find(b => b.id === topItemId);
          if(brg) {
            saranHtml += `Bulan ini, komponen dengan pemakaian tertinggi adalah <strong>${brg.nama}</strong> (${maxQty} unit). <br/><span style="color:#1798D1">💡 <strong>Keputusan:</strong> Lakukan pengecekan distributor atau negosiasi ulang kontrak grosir untuk item ini guna menghemat biaya operasional.</span>`;
          }
        } else {
          saranHtml += `Belum ada data pengeluaran yang cukup di bulan ini untuk dianalisis.`;
        }

        // FITUR BARU: Menampilkan Daftar Nama Barang yang Kritis
        if(stokTipis.length > 0) {
          const listBarangKritis = stokTipis.map(b => `<li><b>${b.nama}</b> (Sisa: ${b.stok})</li>`).join('');
          
          saranHtml += `<br/><br/>
          <div style="background-color: #fff1f0; color: #D84315; padding: 15px; border-radius: 8px; border-left: 5px solid #D84315;">
            ⚠️ <strong>Stok Kritis (${stokTipis.length} Barang):</strong><br/> 
            Harap informasikan ke bagian pembelian untuk segera membeli barang berikut:
            <ul style="margin-top: 8px; margin-bottom: 0; padding-left: 20px;">
              ${listBarangKritis}
            </ul>
          </div>`;
        }
        
        setSaranBisnis(saranHtml);

        // 3. Olah Data untuk Grafik (Hanya transaksi KELUAR)
        let dataBarangMap = {}; 
        let dataTrukMap = {};
        
        transaksi.filter(t => t.jenis === 'KELUAR').forEach(t => {
          // Frekuensi Barang
          dataBarangMap[t.barang_nama_asli] = (dataBarangMap[t.barang_nama_asli] || 0) + t.jumlah;
          
          // FITUR BARU: Menarik nama sopir dari data truk
          const infoTruk = truk.find(trk => trk.id === t.idTruk);
          const namaSopir = infoTruk && infoTruk.sopir ? infoTruk.sopir : 'Tanpa Sopir';
          const labelTruk = `${t.truk_nama} (${namaSopir})`;

          // Frekuensi Truk + Nama Sopir
          dataTrukMap[labelTruk] = (dataTrukMap[labelTruk] || 0) + 1;
        });

        // Top 10 Barang
        const sortedBarang = Object.entries(dataBarangMap).sort((a,b) => b[1] - a[1]).slice(0, 10);
        setChartBarang({
          labels: sortedBarang.map(x => x[0]),
          datasets: [{ label: 'Total Unit Keluar', data: sortedBarang.map(x => x[1]), backgroundColor: '#1798D1', borderRadius: 5 }]
        });

        // Top 10 Truk yang sering diperbaiki (Kini dengan nama sopir)
        const sortedTruk = Object.entries(dataTrukMap).sort((a,b) => b[1] - a[1]).slice(0, 10);
        setChartTruk({
          labels: sortedTruk.map(x => x[0]),
          datasets: [{ 
            data: sortedTruk.map(x => x[1]), 
            backgroundColor: [
              '#1798D1', '#F38C36', '#05CD99', '#F65B5B', '#4cbee8',
              '#8e44ad', '#f1c40f', '#e67e22', '#2ecc71', '#34495e'
            ], 
            borderWidth: 0 
          }]
        });
      }
    } catch (err) {
      console.log("Gagal memuat data ringkasan dashboard.");
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ color: '#1798D1', marginBottom: '20px' }}>🏠 Dashboard Utama</h1>
      
      {loading ? (
        <div style={{ marginTop: '40px', textAlign: 'center', color: '#888' }}>
          <h3>Menyusun Analitik Dashboard... ⏳</h3>
        </div>
      ) : (
        <>
          {/* KARTU RINGKASAN DATA */}
          <div className="dashboard-cards" style={{ marginTop: '0', marginBottom: '25px' }}>
            <div className="card">
              <h4>Total Armada Truk</h4><h2>{summary.totalTruk} <span>Unit</span></h2>
            </div>
            <div className="card orange">
              <h4>Macam Inventory Barang</h4><h2>{summary.totalBarang} <span>Item</span></h2>
            </div>
            <div className="card red">
              <h4>Peringatan Stok Menipis</h4><h2>{summary.stokMenipis} <span>Barang</span></h2>
            </div>
            <div className="card green">
              <h4>Total Aktivitas Transaksi</h4><h2>{summary.totalTransaksi} <span>Riwayat</span></h2>
            </div>
          </div>

          {/* KARTU SARAN BISNIS (AI LOGIC) */}
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderLeft: '6px solid #F38C36', marginBottom: '25px' }}>
            <h3 style={{ color: '#F38C36', marginBottom: '15px', fontSize: '18px' }}>💡 Analisa & Saran Bisnis (Bulan Ini)</h3>
            <p style={{ color: '#444', fontSize: '15px', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: saranBisnis }}></p>
          </div>

          {/* AREA GRAFIK (Hanya tampil jika bukan Admin biasa) */}
          {role === 'Manager' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
              
              {/* Grafik Bar - Barang */}
              <div style={{ background: '#fff', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <h3 style={{ color: '#333', marginBottom: '20px', borderLeft: '4px solid #1798D1', paddingLeft: '10px' }}>📊 Top 10 Barang Paling Sering Keluar</h3>
                {chartBarang && <Bar data={chartBarang} options={{ responsive: true, plugins: { legend: { display: false } } }} />}
              </div>

              {/* Grafik Donat - Truk */}
              <div style={{ background: '#fff', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <h3 style={{ color: '#333', marginBottom: '20px', borderLeft: '4px solid #F38C36', paddingLeft: '10px' }}>🍩 Top 10 Frekuensi Perbaikan Armada</h3>
                <div style={{ width: '80%', margin: '0 auto' }}>
                  {chartTruk && <Doughnut data={chartTruk} options={{ responsive: true, cutout: '70%' }} />}
                </div>
              </div>

            </div>
          )}
        </>
      )}
    </div>
  );
}