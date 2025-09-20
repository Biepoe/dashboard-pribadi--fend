document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Halaman dimuat, script.js berjalan.');
    console.log(`🕵️‍♂️ ID Halaman terdeteksi: '${document.body.id}'`);

    const BACKEND_URL = 'https://dashboard-dpp-backend.onrender.com'; // Pastikan URL ini benar

    // =========================================================
    // FUNGSI-FUNGSI UTAMA (ROUTING)
    // =========================================================

    // Cek di halaman mana kita berada, lalu panggil fungsi yang sesuai
    const bodyId = document.body.id;
    if (bodyId === 'halaman-beranda') {
        // Panggil semua fungsi untuk halaman Beranda
        fetchFinancialData();
        fetchHealthData();
        fetchActivityData();
        // Atur interval update
        setInterval(fetchFinancialData, 10000);
        setInterval(fetchHealthData, 10000);
        setInterval(fetchActivityData, 10000);
    } else if (bodyId === 'halaman-keuangan') {
        // Panggil semua fungsi untuk halaman Keuangan
        fetchFinancialDataForFinancePage(); // Kita buat fungsi baru khusus
        fetchPayablesData();
        // Atur interval update
        setInterval(fetchFinancialDataForFinancePage, 10000);
        setInterval(fetchPayablesData, 10000);
    }

    // =========================================================
    // FUNGSI-FUNGSI HELPER (ALAT BANTU)
    // =========================================================
    function padZero(num) {
        return num < 10 ? '0' + num : num;
    }

    function parseDate(dateString) {
        if (!dateString) return null;
        const parts = dateString.split('/');
        if (parts.length === 3) {
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
        return new Date(dateString);
    }

    const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(angka);

    // =========================================================
    // FUNGSI JAM & TANGGAL
    // =========================================================
    function setDate() {
        // ... (kode fungsi setDate lengkap di sini)
    }

    function setTime() {
        // ... (kode fungsi setTime lengkap di sini)
    }
    setDate();
    setTime();
    setInterval(setTime, 1000);

    // =========================================================
    // FUNGSI-FUNGSI FETCH DATA
    // =========================================================
    
    // Untuk Halaman Beranda
    async function fetchFinancialData() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/finances`);
            const data = await response.json();
            // ... (kode lengkap fungsi fetchFinancialData untuk beranda di sini) ...
        } catch (error) {
            console.error('Gagal mengambil data keuangan (Beranda):', error);
        }
    }

    async function fetchHealthData() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/health`);
            const data = await response.json();
            // ... (kode lengkap fungsi fetchHealthData di sini) ...
        } catch (error) {
            console.error('Gagal mengambil data kesehatan:', error);
        }
    }

    async function fetchActivityData() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/activities`);
            const data = await response.json();
            // ... (kode lengkap fungsi fetchActivityData di sini) ...
        } catch (error) {
            console.error('Gagal mengambil data aktivitas:', error);
        }
    }

    // Untuk Halaman Keuangan
    async function fetchFinancialDataForFinancePage() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/finances`);
            const data = await response.json();
            // ... (kode lengkap fetchFinancialData untuk halaman keuangan di sini) ...
            
            // Mengisi Riwayat Transaksi
            const transactionTableBody = document.querySelector('#transaction-table tbody');
            // ... (logika mengisi tabel) ...

            // Membuat Grafik
            createMonthlyChart(data);

        } catch (error) {
            console.error('Gagal mengambil data keuangan (Detail):', error);
        }
    }

    async function fetchPayablesData() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/payables`);
            const data = await response.json();
            // ... (kode lengkap fungsi fetchPayablesData di sini) ...
        } catch (error) {
            console.error('Gagal mengambil data tagihan:', error);
        }
    }

    function createMonthlyChart(data) {
        // ... (kode lengkap fungsi createMonthlyChart di sini) ...
    }
});
