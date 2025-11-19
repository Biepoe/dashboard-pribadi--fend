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
        } else if (bodyId === 'halaman-kesehatan') {
            initKesehatan();
        }
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
            
            runPageInit(); // Jalankan inisialisasi untuk konten baru
            
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
            const link = e.target.closest('.bottom-nav a');
            if (!link) return;

            const url = link.href;
            if (!url || !url.endsWith('.html')) return;
            
            e.preventDefault();
            if (url === window.location.href.split('#')[0]) return;

            loadPage(url);
            
            document.querySelectorAll('.bottom-nav a').forEach(l => l.classList.remove('active'));
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
        setInterval(setTime, 1000);
        fetchFinancialData();
        fetchHealthData();
        fetchActivityData();
    }

    function initKeuangan() {
        console.log('Memuat data untuk Halaman Keuangan...');
        fetchFinancialData();
        fetchBudgetData();
    }
    
    function initKesehatan() {
        console.log('Memuat data untuk Halaman Kesehatan...');
        fetchHealthDataForHealthPage();
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
            
            // --- DEBUGGING (Cek di Console jika masih 0) ---
            console.log("✅ Data API Diterima:", data);
            // ------------------------------------------------

            let pemasukanBulanIni = 0;
            let pengeluaranBulanIni = 0;
            
            let saldoBank = 0;
            let saldoEwallet = 0;
            let saldoCash = 0;

            const now = new Date();
            const bulanIni = now.getMonth();
            const tahunIni = now.getFullYear();

            data.forEach(item => {
                // 1. AMBIL DATA SESUAI NAMA KOLOM SHEET (Persis!)
                // Menggunakan kurung siku ['...'] karena ada spasi di nama kolom
                const rawNominal  = item['Nominal']; 
                const rawJenis    = item['Jenis Transaksi'];
                const rawSumber   = item['Sumber Dana'];
                const rawTujuan   = item['Tujuan Dana'];
                const rawTanggal  = item['Tanggal Transaksi'];
                const rawDeskripsi = item['Deskripsi'];

                // 2. BERSIHKAN DATA (Biar komputer gak bingung)
                
                // Nominal: Hapus "Rp", titik, koma, spasi -> jadi angka murni
                const nominalStr = String(rawNominal || 0); 
                const jumlah = parseFloat(nominalStr.replace(/[^0-9]/g, '')) || 0;
                
                // Teks: Jadi huruf kecil semua & hapus spasi kiri-kanan (biar "Bank " sama dengan "bank")
                const jenis = String(rawJenis || '').trim().toLowerCase();
                const sumberDana = String(rawSumber || '').trim().toLowerCase();
                const tujuanDana = String(rawTujuan || '').trim().toLowerCase();

                // 3. FILTER WAKTU (Untuk "Bulan Ini")
                // Fungsi parseDate ada di bawah/utils, pastikan format di sheet DD/MM/YYYY
                const tglTransaksi = parseDate(rawTanggal); 
                let isCurrentMonth = false;
                if (tglTransaksi && tglTransaksi.getMonth() === bulanIni && tglTransaksi.getFullYear() === tahunIni) {
                    isCurrentMonth = true;
                }

                // 4. LOGIKA HITUNGAN (Sesuai Kolom Kamu)
                if (jenis === 'pemasukan') {
                    // --- HITUNG SALDO (Semua Waktu) ---
                    if (sumberDana.includes('bank') || sumberDana.includes('bsi')) saldoBank += jumlah;
                    else if (sumberDana.includes('wallet') || sumberDana.includes('pay') || sumberDana.includes('shopee') || sumberDana.includes('dana') || sumberDana.includes('gopay')) saldoEwallet += jumlah;
                    else if (sumberDana.includes('cash') || sumberDana.includes('tunai')) saldoCash += jumlah;

                    // --- DASHBOARD (Cuma Bulan Ini) ---
                    if (isCurrentMonth) pemasukanBulanIni += jumlah;

                } else if (jenis === 'pengeluaran') {
                    // --- HITUNG SALDO ---
                    if (sumberDana.includes('bank') || sumberDana.includes('bsi')) saldoBank -= jumlah;
                    else if (sumberDana.includes('wallet') || sumberDana.includes('pay') || sumberDana.includes('shopee') || sumberDana.includes('dana') || sumberDana.includes('gopay')) saldoEwallet -= jumlah;
                    else if (sumberDana.includes('cash') || sumberDana.includes('tunai')) saldoCash -= jumlah;

                    // --- DASHBOARD ---
                    if (isCurrentMonth) pengeluaranBulanIni += jumlah;

                } else if (jenis === 'transfer') {
                    // Kurangi dari Pengirim
                    if (sumberDana.includes('bank') || sumberDana.includes('bsi')) saldoBank -= jumlah;
                    else if (sumberDana.includes('wallet') || sumberDana.includes('pay')) saldoEwallet -= jumlah;
                    else if (sumberDana.includes('cash') || sumberDana.includes('tunai')) saldoCash -= jumlah;
            
                    // Tambah ke Penerima
                    if (tujuanDana.includes('bank') || tujuanDana.includes('bsi')) saldoBank += jumlah;
                    else if (tujuanDana.includes('wallet') || tujuanDana.includes('pay')) saldoEwallet += jumlah;
                    else if (tujuanDana.includes('cash') || tujuanDana.includes('tunai')) saldoCash += jumlah;
                }
            });
            
            const totalSaldo = saldoBank + saldoEwallet + saldoCash;

            // 5. UPDATE TAMPILAN HTML
            const setText = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.textContent = formatRupiah(val);
            };

            // Beranda & Keuangan
            setText('pemasukan-value', pemasukanBulanIni);
            setText('pengeluaran-value', pengeluaranBulanIni);
            setText('pemasukan-bulan-ini', pemasukanBulanIni);
            setText('pengeluaran-bulan-ini', pengeluaranBulanIni);
            
            setText('saldo-bank', saldoBank);
            setText('saldo-ewallet', saldoEwallet);
            setText('saldo-cash', saldoCash);
            setText('sisa-saldo-value', totalSaldo);
            
            setText('card-balance-bank', saldoBank);
            setText('card-balance-ewallet', saldoEwallet);

            // 6. UPDATE TABEL TRANSAKSI
            const tableBody = document.querySelector('#transaction-table tbody');
            if (tableBody) {
                tableBody.innerHTML = '';
                // Ambil 7 data terakhir
                const recentTransactions = data.slice(-7).reverse();
                recentTransactions.forEach(item => {
                    const row = document.createElement('tr');
                    
                    // Ambil data lagi buat tabel
                    const deskripsi = item['Deskripsi'] || '-';
                    const jenisTeks = item['Jenis Transaksi'] || '-';
                    const nominalRaw = item['Nominal'] || 0;
                    
                    // Format Nominal
                    const num = parseFloat(String(nominalRaw).replace(/[^0-9]/g, '')) || 0;
                    const nominalRp = num.toLocaleString('id-ID');
                    
                    // Tentukan Warna
                    const jenisKecil = String(jenisTeks).toLowerCase();
                    let warna = '#333';
                    let tanda = '';
                    
                    if(jenisKecil === 'pemasukan') { warna = '#4caf50'; tanda = '+'; }
                    else if(jenisKecil === 'pengeluaran') { warna = '#f44336'; tanda = '-'; }

                    row.innerHTML = `
                        <td>${deskripsi}</td>
                        <td>${jenisTeks}</td>
                        <td style="color: ${warna}">${tanda} Rp ${nominalRp}</td>
                    `;
                    tableBody.appendChild(row);
                });
            }
            
            // Update Grafik kalau fungsinya ada
            if (typeof createMonthlyChart === 'function') createMonthlyChart(data);

        } catch (error) {
            console.error('Gagal hitung keuangan:', error);
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

            if (bodyStatusEl) bodyStatusEl.textContent = kondisiTubuh;
            if (bodyVector) bodyVector.className = (kondisiTubuh === 'Sakit') ? 'body-sick' : 'body-normal';

            const sleepDurationEl = document.getElementById('sleep-duration');
            if (sleepDurationEl) {
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
            }

            const lastMedicineEl = document.getElementById('last-medicine');
            if(lastMedicineEl) lastMedicineEl.textContent = lastMedicineRecord ? lastMedicineRecord['Obat/Suplemen'] : '-';
            
            const healthDateEl = document.getElementById('health-date');
            if(healthDateEl) {
                const latestDate = parseDate(latestRecord['Tanggal Kejadian']);
                healthDateEl.textContent = (latestDate && !isNaN(latestDate)) ? latestDate.toLocaleDateString('id-ID', { weekday: 'long' }) : "Update";
            }

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
    async function fetchBudgetData() {
    try {
        const [budgetResponse, financeResponse] = await Promise.all([
            fetch(`${BACKEND_URL}/api/budgets`),
            fetch(`${BACKEND_URL}/api/finances`)
        ]);

        const budgetDefs = await budgetResponse.json();
        const financeData = await financeResponse.json();

        const spendingByCategory = {};
        
        // Filter Waktu (Hanya Bulan Ini)
        const now = new Date();
        const bulanIni = now.getMonth();
        const tahunIni = now.getFullYear();

        financeData.forEach(item => {
            if (item['Jenis Transaksi'] === 'Pengeluaran') {
                const tgl = parseDate(item['Tanggal Transaksi']);
                // Cek tanggal transaksi
                if (tgl && tgl.getMonth() === bulanIni && tgl.getFullYear() === tahunIni) {
                    const kategori = item.Kategori;
                    const nominalStr = item.Nominal ? String(item.Nominal) : '0';
                    const jumlah = parseFloat(nominalStr.replace(/[^0-9]/g, '')) || 0;
                    
                    if (!spendingByCategory[kategori]) spendingByCategory[kategori] = 0;
                    spendingByCategory[kategori] += jumlah;
                }
            }
        });

        const budgetContainer = document.getElementById('budget-container');
        if (budgetContainer) {
            budgetContainer.innerHTML = '';
            budgetDefs.forEach(budget => {
                const kategori = budget.Kategori;
                const alokasiStr = budget.Alokasi ? String(budget.Alokasi) : '0';
                const alokasi = parseFloat(alokasiStr.replace(/[^0-9]/g, '')) || 0;
                
                const terpakai = spendingByCategory[kategori] || 0;
                const sisa = alokasi - terpakai;
                const persentaseTerpakai = alokasi > 0 ? (terpakai / alokasi) * 100 : 0;

                let progressBarColorClass = '';
                if (persentaseTerpakai > 90) progressBarColorClass = 'danger';
                else if (persentaseTerpakai > 70) progressBarColorClass = 'warning';

                const budgetItem = document.createElement('div');
                budgetItem.className = 'budget-item';
                budgetItem.innerHTML = `
                    <div class="budget-item-header">
                        <span class="category">${kategori}</span>
                        <span class="remaining">${formatRupiah(sisa)}</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar ${progressBarColorClass}" style="width: ${Math.min(persentaseTerpakai, 100)}%;"></div>
                    </div>
                    <div class="budget-item-footer">
                        <span>Terpakai: ${formatRupiah(terpakai)}</span>
                        <span>dari ${formatRupiah(alokasi)}</span>
                    </div>
                `;
                budgetContainer.appendChild(budgetItem);
            });
        }
    } catch (error) {
        console.error('Gagal ambil data budget:', error);
    }
}
    
    // --- Fungsi Fetch untuk Halaman Kesehatan Detail ---
    async function fetchHealthDataForHealthPage() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/health`);
            const data = await response.json();
            if (!data || data.length === 0) return;

            const latestRecord = data[data.length - 1];
            const lastSleepRecord = [...data].reverse().find(item => item['Waktu Tidur'] && item['Waktu Bangun']);
            const lastMedicineRecord = [...data].reverse().find(item => item['Obat/Suplemen']);
            
            const bodyStatusLarge = document.getElementById('body-status-large');
            const bodyVectorLarge = document.getElementById('body-vector-large');
            const kondisiTubuh = latestRecord['Kondisi Tubuh'] || 'Sehat';
            if (bodyStatusLarge) bodyStatusLarge.textContent = kondisiTubuh;
            if (bodyVectorLarge) bodyVectorLarge.className = (kondisiTubuh === 'Sakit') ? 'body-sick' : 'body-normal';
            
            const lastMedicineDetail = document.getElementById('last-medicine-detail');
            if (lastMedicineDetail) lastMedicineDetail.textContent = lastMedicineRecord ? lastMedicineRecord['Obat/Suplemen'] : '-';
            
            const healthDateEl = document.getElementById('health-date');
            if (healthDateEl) {
                const latestDate = parseDate(latestRecord['Tanggal Kejadian']);
                healthDateEl.textContent = (latestDate && !isNaN(latestDate)) ? latestDate.toLocaleDateString('id-ID', { weekday: 'long' }) : "Update";
            }

            const sleepStartTimeEl = document.getElementById('sleep-start-time');
            const sleepEndTimeEl = document.getElementById('sleep-end-time');
            const sleepTotalDurationEl = document.getElementById('sleep-total-duration');

            if (lastSleepRecord && sleepStartTimeEl && sleepEndTimeEl && sleepTotalDurationEl) {
                const waktuTidur = lastSleepRecord['Waktu Tidur'];
                const waktuBangun = lastSleepRecord['Waktu Bangun'];
                
                sleepStartTimeEl.textContent = waktuTidur;
                sleepEndTimeEl.textContent = waktuBangun;

                const [jamTidur, menitTidur] = waktuTidur.split(':').map(Number);
                const [jamBangun, menitBangun] = waktuBangun.split(':').map(Number);
                
                const tglTidur = new Date(2025, 1, 1, jamTidur, menitTidur);
                let tglBangun = new Date(2025, 1, 1, jamBangun, menitBangun);
                if (tglBangun < tglTidur) tglBangun.setDate(tglBangun.getDate() + 1);
                
                const selisihMenit = (tglBangun - tglTidur) / 1000 / 60;
                const jam = Math.floor(selisihMenit / 60);
                const menit = selisihMenit % 60;
                
                sleepTotalDurationEl.textContent = `${jam}j ${menit}m`;
            }
        } catch (error) {
            console.error('Gagal mengambil data detail kesehatan:', error);
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

    initNavListeners();
    runPageInit();
});
