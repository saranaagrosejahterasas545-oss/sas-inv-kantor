'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2'; // 👈 Import SweetAlert2

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/sas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'LOGIN',
          username: username,
          password: password
        })
      });

      const result = await response.json();

      if (result.success) {
        // Simpan sesi ke localStorage
        localStorage.setItem('sas_user', result.username);
        localStorage.setItem('sas_role', result.role);
        
        // SweetAlert Sukses (Otomatis hilang dalam 1,5 detik tanpa perlu diklik)
        Swal.fire({
          title: 'Login Berhasil!',
          text: `Selamat datang, ${result.username}`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
          // Pindah ke halaman dashboard
          router.push('/dashboard');
        });

      } else {
        // SweetAlert Gagal
        Swal.fire({
          title: 'Akses Ditolak!',
          text: result.message,
          icon: 'error',
          confirmButtonColor: '#ff4d4f'
        });
      }
    } catch (error) {
      Swal.fire({
        title: 'Sistem Error',
        text: 'Tidak dapat terhubung ke server.',
        icon: 'error',
        confirmButtonColor: '#ff4d4f'
      });
    }

    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f4f7fe' }}>
      <div style={{ background: '#fff', padding: '40px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '100%', maxWidth: '400px', textAlign: 'center', borderTop: '5px solid #1798D1', margin: '20px' }}>
        <h2 style={{ color: '#1798D1', marginBottom: '5px', fontSize: '28px', fontWeight: 'bold' }}>
          🚚 SAS <span style={{ color: '#F38C36' }}>Inventory</span>
        </h2>
        <p style={{ color: '#888', marginBottom: '25px', fontSize: '14px' }}>Silakan login untuk mengakses sistem</p>
        
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#444', fontSize: '14px' }}>Username</label>
            <input 
              type="text" 
              required 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%', padding: '12px 15px', border: '1px solid #ddd', borderRadius: '10px', outline: 'none', fontSize: '14px', backgroundColor: '#fafafa' }} 
            />
          </div>
          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#444', fontSize: '14px' }}>Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '12px 15px', border: '1px solid #ddd', borderRadius: '10px', outline: 'none', fontSize: '14px', backgroundColor: '#fafafa' }} 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            style={{ backgroundColor: '#1798D1', color: '#fff', border: 'none', padding: '15px 20px', width: '100%', borderRadius: '10px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', transition: '0.3s', fontSize: '15px' }}
          >
            {loading ? 'Memeriksa...' : 'Login Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}