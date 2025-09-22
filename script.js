// =========================================================
// SCRIPT.JS (VERSI FINAL, LENGKAP, DAN BERSIH DENGAN AJAX)
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Halaman dimuat, script.js berjalan.');

    const BACKEND_URL = 'https://dashboard-dpp-backend.onrender.com';

    // =========================================================
    // 1. SISTEM NAVIGASI AJAX (TANPA RELOAD)
    // =========================================================
    
    // Fungsi untuk menjalankan skrip inisialisasi setelah konten baru dimuat
    function runPageInit() {
        const bodyId = document.body.id;
        if (bodyId === 'halaman-beranda') {
            initBeranda();
        } else if (bodyId === 'halaman-keuangan') {
            initKeuangan();
        }
        // Tambahkan else if untuk halaman lain jika perlu
    }

    // Fungsi untuk memuat konten halaman baru
    async function loadPage(url) {
        const contentWrapper = document.getElementById('content-wrapper');
        try {
            if (!contentWrapper) {
                console.error('Wadah #content-wrapper tidak ditemukan!');
                return;
            }
            contentWrapper.style.transition = 'opacity 0.3s ease-out';
            contentWrapper.style.opacity = '0.5';

            const response = await fetch(url);
            if (!response.ok) throw new Error(`Halaman tidak ditemukan (${response.status})`);
            
            const text = await response.text();
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const newContentWrapper = doc.getElementById('content-wrapper');

            if (!newContentWrapper) {
                console.error('Gagal menemukan #content-wrapper di file HTML yang baru.');
                contentWrapper.style.opacity = '1';
                return;
            }

            const newContent = newContentWrapper.innerHTML;
            const newTitle = doc.title;
            const newBodyId = doc.body.id;
            
            document.title = newTitle;
            document.body.id = newBodyId;
            contentWrapper.innerHTML = newContent;
            
            // Jalankan kembali fungsi inisialisasi untuk konten baru
            runPageInit();
            
            contentWrapper.style.opacity = '1';
            history.pushState({ path: url }, '', url);

        } catch (error) {
            console.error('Gagal memuat halaman:', error);
            if (contentWrapper) contentWrapper.style.opacity = '1';
        }
    }

    // Tambahkan event listener ke semua link navigasi
    function initNavListeners() {
        document.body.addEventListener('click', (e) => {
            const link = e.target.closest('.sidebar-nav a, .bottom-nav a');
            if (!link) return;

            const url = link.href;
            if (!url || !url.endsWith('.html')) return;
            
            e.preventDefault();
            if (url === window.location.href.split('#')[0]) return;

            loadPage(url);
            
            document.querySelectorAll('.sidebar-nav a, .bottom-nav a').forEach(l => l.classList.remove('active'));
            document.querySelectorAll(`a[href="${link.getAttribute('href')}"]`).forEach(activeLink => {
                activeLink.classList.add('active');
            });
        });
    }

    // =========================================================
    // 2. FUNGSI INISIALISASI PER HALAMAN
    // =========================================================
    
    function initBeranda() {
        console.log('Memuat data untuk Halaman Beranda...');
        setDate();
        setTime();
        const timeInterval = setInterval(setTime, 1000); // Simpan interval untuk dibersihkan
        fetchFinancialData();
        fetchHealthData();
        fetchActivityData();
    }

    function initKeuangan() {
        console.log('Memuat data untuk Halaman Keuangan...');
        fetchFinancialDataForFinancePage();
        fetchPayablesData();
    }

    // =========================================================
    // 3. DEFINISI SEMUA FUNGSI (LENGKAP)
    // =========================================================
    
    // --- Fungsi Helper (Alat Bantu) ---
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
    
    // --- Fungsi Jam & Tanggal ---
    function setDate() {
        const dateElement = document.getElementById('current-date');
        if (dateElement) {
            const now = new Date();
            const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            const day = dayNames[now.getDay()];
            const date = now.getDate();
            const month = monthNames[now.getMonth()];
            const year = now.getFullYear();
            const calendarIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>';
            dateElement.innerHTML = `${calendarIcon} ${day}, ${date} ${month} ${year}`;
        }
    }

    function setTime() {
        const timeElement = document.getElementById('current-time');
        if (timeElement) {
            const now = new Date();
            const hours = padZero(now.getHours());
            const minutes = padZero(now.getMinutes());
            const seconds = padZero(now.getSeconds());
            const clockIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
            timeElement.innerHTML = `${clockIcon} ${hours}:${minutes}:${seconds}`;
        }
    }
    
    // --- Fungsi Fetch (Beranda) ---
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
        try {
            const response = await fetch(`${BACKEND_URL}/api/health`);
            const data = await response.json();

            if (!data || data.length === 0) return;

            const latestRecord = data[data.length - 1];
            const lastSleepRecord = [...data].reverse().find(item => item['Waktu Tidur'] && item['Waktu Bangun']);
            const lastMedicineRecord = [...data].reverse().find(item => item['Obat/Suplemen']);
            
            const bodyVector = document.getElementById('body-vector');
            const bodyStatusEl = document.getElementById('body-status');
            const kondisiTubuh = latestRecord['Kondisi Tubuh'] || 'Sehat';

            bodyStatusEl.textContent = kondisiTubuh;
            bodyVector.className = (kondisiTubuh === 'Sakit') ? 'body-sick' : 'body-normal';

            const sleepDurationEl = document.getElementById('sleep-duration');
            if (lastSleepRecord) {
                const [jamTidur, menitTidur] = lastSleepRecord['Waktu Tidur'].split(':').map(Number);
                const [jamBangun, menitBangun] = lastSleepRecord['Waktu Bangun'].split(':').map(Number);
                const tglTidur = new Date(2025, 1, 1, jamTidur, menitTidur);
                let tglBangun = new Date(2025, 1, 1, jamBangun, menitBangun);
                if (tglBangun < tglTidur) tglBangun.setDate(tglBangun.getDate() + 1);
                const selisihMenit = (tglBangun - tglTidur) / 1000 / 60;
                sleepDurationEl.textContent = `${Math.floor(selisihMenit / 60)} Jam ${selisihMenit % 60} Menit`;
            } else {
                sleepDurationEl.textContent = '- Jam - Menit';
            }

            document.getElementById('last-medicine').textContent = lastMedicineRecord ? lastMedicineRecord['Obat/Suplemen'] : '-';
            
            const healthDateEl = document.getElementById('health-date');
            const latestDate = parseDate(latestRecord['Tanggal Kejadian']);
            healthDateEl.textContent = (latestDate && !isNaN(latestDate)) ? latestDate.toLocaleDateString('id-ID', { weekday: 'long' }) : "Tanggal Tidak Valid";

        } catch (error) {
            console.error('Gagal mengambil data kesehatan:', error);
        }
    }

    async function fetchActivityData() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/activities`);
            const data = await response.json();

            const listContainer = document.getElementById('activity-log-list');
            if (!listContainer) return;

            listContainer.innerHTML = '';
            if (!data || data.length === 0) {
                listContainer.innerHTML = '<li class="placeholder">Belum ada aktivitas tercatat.</li>';
                return;
            }

            const recentData = data.slice(-10).reverse();
            recentData.forEach(item => {
                const listItem = document.createElement('li');
                listItem.className = 'activity-log-item';
                listItem.innerHTML = `
                    <div class="activity-log-time">
                        <span class="date">${item['Kapan ngelakuinnya?'] || ''}</span>
                        <span class="time">${item['Waktunya?'] || ''}</span>
                    </div>
                    <div class="activity-log-details">
                        <span class="title">${item['Kamu emang ngapain?'] || '-'}</span>
                        <span class="notes">${item.Notes || ''}</span>
                    </div>`;
                listContainer.appendChild(listItem);
            });
        } catch (error) {
            console.error('Gagal mengambil data aktivitas:', error);
        }
    }

    // --- Fungsi Fetch Data (Halaman Keuangan) ---
    async function fetchFinancialDataForFinancePage() {
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
            document.getElementById('card-balance-bank').textContent = formatRupiah(saldoBank);
            document.getElementById('card-balance-ewallet').textContent = formatRupiah(saldoEwallet);

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
    
    // =========================================================
    // 4. EKSEKUSI AWAL
    // =========================================================
    
    function initSidebarListeners() {
        const sidebar = document.getElementById('sidebar');
        const hamburgerBtn = document.getElementById('hamburger-btn');
        const closeBtn = document.getElementById('close-btn');
        if (hamburgerBtn) hamburgerBtn.addEventListener('click', (e) => { e.stopPropagation(); sidebar.classList.add('open'); });
        if (closeBtn) closeBtn.addEventListener('click', () => sidebar.classList.remove('open'); });
    }

    initSidebarListeners();
    initNavListeners();
    runPageInit(); // Jalankan fungsi init untuk halaman yang pertama kali dimuat
});
