'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import Swal from 'sweetalert2';

export default function DashboardLayout({ children }) {
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedUser = localStorage.getItem('sas_user');
    const storedRole = localStorage.getItem('sas_role');

    if (!storedUser) {
      router.push('/');
    } else {
      setUsername(storedUser);
      setRole(storedRole);
    }
  }, [router]);

  const handleLogout = () => {
    Swal.fire({
      title: 'Keluar dari sistem?',
      text: "Anda harus login kembali untuk masuk.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ff4d4f',
      cancelButtonColor: '#888',
      confirmButtonText: 'Ya, Logout',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('sas_user');
        localStorage.removeItem('sas_role');
        router.push('/');
      }
    });
  };

  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  const getMenuItemStyle = (path) => {
    const isActive = pathname === path;
    return {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '14px 16px',
      borderRadius: '12px',
      color: isActive ? '#fff' : '#64748b',
      backgroundColor: isActive ? '#1798D1' : 'transparent',
      boxShadow: isActive ? '0 4px 12px rgba(23,152,209,0.3)' : 'none',
      textDecoration: 'none',
      fontWeight: isActive ? '600' : '500',
      transition: 'all 0.2s ease-in-out',
      whiteSpace: 'nowrap',
      width: '100%',
      boxSizing: 'border-box'
    };
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f4f7fe', overflow: 'hidden' }}>
      
      {/* ================= SIDEBAR KIRI ================= */}
      <aside className="print-hide" style={{ 
        width: '320px', 
        backgroundColor: '#fff', 
        boxShadow: '4px 0 20px rgba(0,0,0,0.03)', 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        
        <div style={{ padding: '25px 20px 15px 20px' }}>
          <h2 style={{ color: '#1798D1', margin: '0 0 25px 0', fontSize: '26px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            🚚 <span style={{fontWeight: '800'}}>SAS</span> <span style={{ color: '#F38C36' }}>Gudang</span>
          </h2>
          
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '15px', padding: '16px', 
            backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
          }}>
            <div style={{
              width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#1798D1', 
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', 
              fontSize: '20px', fontWeight: 'bold', flexShrink: 0
            }}>
              {getInitial(username)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#334155', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {username || 'Memuat...'}
              </span>
              {role && (
                <span style={{ 
                  display: 'inline-block', padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', 
                  borderRadius: '20px', marginTop: '4px', width: 'fit-content',
                  backgroundColor: role === 'Manager' ? '#e0f2fe' : '#ffedd5',
                  color: role === 'Manager' ? '#0369a1' : '#c2410c' 
                }}>
                  {role}
                </span>
              )}
            </div>
          </div>
        </div>

        <ul className="sidebar-menu" style={{ flex: 1, overflowY: 'auto', padding: '10px 20px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <li>
            <Link href="/dashboard" style={getMenuItemStyle('/dashboard')}>
              <span style={{ fontSize: '18px' }}>🏠</span> Dashboard Utama
            </Link>
          </li>
          <li>
            <Link href="/dashboard/transaksi" style={getMenuItemStyle('/dashboard/transaksi')}>
              <span style={{ fontSize: '18px' }}>🔄</span> Transaksi Gudang
            </Link>
          </li>
          <li>
            <Link href="/dashboard/buku-servis" style={getMenuItemStyle('/dashboard/buku-servis')}>
              <span style={{ fontSize: '18px' }}>📖</span> Buku Servis Armada
            </Link>
          </li>

          {role === 'Manager' && (
            <>
              <li>
                <Link href="/dashboard/master" style={getMenuItemStyle('/dashboard/master')}>
                  <span style={{ fontSize: '18px' }}>📦</span> Master Data
                </Link>
              </li>
              <li>
                <Link href="/dashboard/laporan" style={getMenuItemStyle('/dashboard/laporan')}>
                  <span style={{ fontSize: '18px' }}>📊</span> Laporan & Analitik
                </Link>
              </li>
              <li>
                <Link href="/dashboard/arsip" style={getMenuItemStyle('/dashboard/arsip')}>
                  <span style={{ fontSize: '18px' }}>🗑️</span> Arsip Data
                </Link>
              </li>
            </>
          )}
        </ul>
        
        <div style={{ padding: '20px' }}>
          <button 
            onClick={handleLogout} 
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              width: '100%', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', 
              padding: '14px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' 
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#fee2e2'}
            onMouseOut={(e) => e.currentTarget.style.background = '#fef2f2'}
          >
            <span>🚪</span> Logout Keluar
          </button>
        </div>

      </aside>

      {/* ================= KONTEN HALAMAN KANAN ================= */}
      <main style={{ flex: 1, padding: '35px', overflowY: 'auto', height: '100vh', width: '100%' }}>
        {children}
      </main>
    </div>
  );
}