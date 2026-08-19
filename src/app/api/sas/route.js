export const maxDuration = 60;
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // 🔴 TEMPELKAN URL DEPLOY BARU ANDA DI SINI
    // Pastikan berakhiran /exec dan tidak ada tanda kurung ( )
    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbysjZq0wQkDv1NYRCaOSung3-LTMXN2Q7U50onSbGljIO5jp2IOWAup3VRaPLYiipo/exec";

    const googleResponse = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(body),
    });

    // Ambil jawaban Google sebagai teks mentah dulu
    const rawText = await googleResponse.text();

    // Jika Google malah mengirim halaman Web (HTML), cegah error!
    if (rawText.startsWith("<!DOCTYPE") || rawText.startsWith("<html")) {
      console.log("DIBLOKIR GOOGLE. INI BALASANNYA:", rawText);
      return NextResponse.json(
        { success: false, message: "Akses ditolak oleh Google! Pastikan Deploy 'Jalankan Sebagai: SAYA' dan 'Akses: SIAPA SAJA'." },
        { status: 403 }
      );
    }

    // Jika aman, ubah menjadi data JSON seperti biasa
    const data = JSON.parse(rawText);
    return NextResponse.json(data);
    
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Server API lokal error: " + error.message },
      { status: 500 }
    );
  }
}