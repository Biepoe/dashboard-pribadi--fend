// script.js (VERSI FINAL & BERSIH)

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Halaman dimuat, script.js berjalan.');

    const BACKEND_URL = 'https://dashboard-dpp-backend.onrender.com'; // Pastikan URL ini benar
    const bodyId = document.body.id;

    // =========================================================
    // INISIALISASI & ROUTING HALAMAN
    // =========================================================
    
    // Logika untuk Sidebar Mobile
    const sidebar = document.getElementById('sidebar');
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const closeBtn = document.getElementById('close-btn');
    const mainContainer = document.getElementById('main-container');
    if (hamburgerBtn) hamburgerBtn.addEventListener('click', () => sidebar.classList.add('open'));
    if (closeBtn) closeBtn.addEventListener('click', () => sidebar.classList.remove('open'));
    if (mainContainer) mainContainer.addEventListener('click', () => sidebar.classList.remove('open'));

    // Panggil fungsi sesuai halaman yang aktif
    if (bodyId === 'halaman-beranda') {
        initBeranda();
    } else if (bodyId === 'halaman-keuangan') {
        initKeuangan();
    }
    // Tambahkan else if untuk halaman lain jika perlu

    // =========================================================
    // FUNGSI INISIALISASI PER HALAMAN
    // =========================================================
    
    function initBeranda() {
        console.log('Memuat data untuk Halaman Beranda...');
        setDate();
        setTime();
        setInterval(setTime, 1000);

        fetchFinancialData();
        fetchHealthData();
        fetchActivityData();
        
        setInterval(fetchFinancialData, 15000);
        setInterval(fetchHealthData, 15000);
        setInterval(fetchActivityData, 15000);
    }

    function initKeuangan() {
        console.log('Memuat data untuk Halaman Keuangan...');
        fetchFinancialDataForFinancePage();
        fetchPayablesData();

        setInterval(fetchFinancialDataForFinancePage, 15000);
        setInterval(fetchPayablesData, 15000);
    }

    // =========================================================
    // FUNGSI FETCH DATA (BERANDA)
    // =========================================================
    
    async function fetchFinancialData() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/finances`);
            const data = await response.json();
            
            let totalPemasukan = 0, totalPengeluaran = 0, saldoBank = 0, saldoEwallet = 0, saldoCash = 0;

            data.forEach(item => {
                const jumlah = parseFloat(item.Nominal.replace(/[^0-9]/g, '')) || 0;
                const sumberDana = item['Sumber Dana'] ? item['Sumber Dana'].toLowerCase() : '';

                if (item['Jenis Transaksi'] === 'Pemasukan') {
                    totalPemasukan += jumlah;
                    if (sumberDana === 'bank') saldoBank += jumlah;
                    if (sumberDana.includes('wallet')) saldoEwallet += jumlah;
                    if (sumberDana === 'cash') saldoCash += jumlah;
                } else if (item['Jenis Transaksi'] === 'Pengeluaran') {
                    totalPengeluaran += jumlah;
                    if (sumberDana === 'bank') saldoBank -= jumlah;
                    if (sumberDana.includes('wallet')) saldoEwallet -= jumlah;
                    if (sumberDana === 'cash') saldoCash -= jumlah;
                }
            });
            
            const totalSaldo = totalPemasukan - totalPengeluaran;
            
            document.getElementById('pemasukan-value').textContent = formatRupiah(totalPemasukan);
            document.getElementById('pengeluaran-value').textContent = formatRupiah(totalPengeluaran);
            document.getElementById('saldo-bank').textContent = formatRupiah(saldoBank);
            document.getElementById('saldo-ewallet').textContent = formatRupiah(saldoEwallet);
            document.getElementById('saldo-cash').textContent = formatRupiah(saldoCash);
            document.getElementById('sisa-saldo-value').textContent = formatRupiah(totalSaldo);
        } catch (error) {
            console.error('Gagal mengambil data keuangan (Beranda):', error);
        }
    }

    async function fetchHealthData() {
        // ... (kode lengkap fungsi fetchHealthData)
    }

    async function fetchActivityData() {
        // ... (kode lengkap fungsi fetchActivityData)
    }

    // =========================================================
    // FUNGSI FETCH DATA (HALAMAN KEUANGAN)
    // =========================================================

    async function fetchFinancialDataForFinancePage() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/finances`);
            const data = await response.json();
            
            // Kalkulasi Saldo (Sama seperti di beranda)
            let totalPemasukan = 0, totalPengeluaran = 0, saldoBank = 0, saldoEwallet = 0, saldoCash = 0;
            data.forEach(item => {
                const jumlah = parseFloat(item.Nominal.replace(/[^0-9]/g, '')) || 0;
                const sumberDana = item['Sumber Dana'] ? item['Sumber Dana'].toLowerCase() : '';
                if (item['Jenis Transaksi'] === 'Pemasukan') {
                    totalPemasukan += jumlah;
                    if (sumberDana === 'bank') saldoBank += jumlah;
                    if (sumberDana.includes('wallet')) saldoEwallet += jumlah;
                    if (sumberDana === 'cash') saldoCash += jumlah;
                } else if (item['Jenis Transaksi'] === 'Pengeluaran') {
                    totalPengeluaran += jumlah;
                    if (sumberDana === 'bank') saldoBank -= jumlah;
                    if (sumberDana.includes('wallet')) saldoEwallet -= jumlah;
                    if (sumberDana === 'cash') saldoCash -= jumlah;
                }
            });
            const totalSaldo = totalPemasukan - totalPengeluaran;

            // Update Info Saldo & Kartu Akun
            document.getElementById('pemasukan-value').textContent = formatRupiah(totalPemasukan);
            document.getElementById('pengeluaran-value').textContent = formatRupiah(totalPengeluaran);
            document.getElementById('saldo-bank').textContent = formatRupiah(saldoBank);
            document.getElementById('saldo-ewallet').textContent = formatRupiah(saldoEwallet);
            document.getElementById('saldo-cash').textContent = formatRupiah(saldoCash);
            document.getElementById('sisa-saldo-value').textContent = formatRupiah(totalSaldo);
            document.getElementById('card-balance-bank').textContent = formatRupiah(saldoBank);
            document.getElementById('card-balance-ewallet').textContent = formatRupiah(saldoEwallet);

            // Mengisi Riwayat Transaksi
            const transactionTableBody = document.querySelector('#transaction-table tbody');
            transactionTableBody.innerHTML = '';
            const recentTransactions = data.slice(-7).reverse();
            recentTransactions.forEach(item => {
                const row = document.createElement('tr');
                const jenis = item['Jenis Transaksi'];
                const nominal = parseInt(item.Nominal).toLocaleString('id-ID');
                row.innerHTML = `
                    <td>${item.Deskripsi}</td>
                    <td>${jenis}</td>
                    <td style="color: ${jenis === 'Pemasukan' ? '#4caf50' : '#f44336'}">${jenis === 'Pemasukan' ? '+' : '-'} Rp ${nominal}</td>
                `;
                transactionTableBody.appendChild(row);
            });

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
            const payablesList = document.getElementById('payables-list');
            if(!payablesList) return;
            payablesList.innerHTML = '';

            data.forEach(item => {
                const li = document.createElement('li');
                li.className = 'payable-item';
                const isLunas = item.Status === 'Lunas';
                li.innerHTML = `
                    <input type="checkbox" id="${item['Nama Tagihan']}" ${isLunas ? 'checked' : ''}>
                    <label for="${item['Nama Tagihan']}">${item['Nama Tagihan']}</label>
                    <span class="amount">Rp ${parseInt(item.Jumlah).toLocaleString('id-ID')}</span>
                `;
                payablesList.appendChild(li);
            });
        } catch (error) {
            console.error('Gagal mengambil data tagihan:', error);
        }
    }

    function createMonthlyChart(data) {
        const ctx = document.getElementById('monthlyEarningsChart');
        if (!ctx) return;
        
        // Cek jika chart sudah ada, hancurkan dulu
        if (Chart.getChart(ctx)) {
            Chart.getChart(ctx).destroy();
        }

        const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep'];
        const incomeData = [5000000, 5200000, 5100000, 5300000, 5500000, 5400000, 5600000, 5550000, 5700000]; // Data dummy
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Pemasukan', data: incomeData, borderColor: '#667eea',
                    tension: 0.4, fill: false
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });
    }
});
