// =========================================================
// SCRIPT.JS (VERSI PERBAIKAN: CHART.JS SAFE & ROBUST DATA)
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Halaman dimuat, script.js berjalan.');

    const BACKEND_URL = 'https://dashboard-dpp-backend.onrender.com';

    // --- FUNGSI NAVIGASI (SPA) ---
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

    async function loadPage(url) {
        const contentWrapper = document.getElementById('content-wrapper');
        try {
            if (!contentWrapper) return;
            contentWrapper.style.opacity = '0.5';

            const response = await fetch(url);
            if (!response.ok) throw new Error(`Halaman error: ${response.status}`);
            
            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const newContent = doc.getElementById('content-wrapper');

            if (!newContent) {
                console.error('Element #content-wrapper tidak ditemukan di halaman tujuan.');
                window.location.href = url; // Fallback reload manual
                return;
            }

            document.title = doc.title;
            document.body.id = doc.body.id;
            contentWrapper.innerHTML = newContent.innerHTML;
            
            runPageInit();
            
            contentWrapper.style.opacity = '1';
            history.pushState({ path: url }, '', url);
        } catch (error) {
            console.error('Gagal navigasi:', error);
            contentWrapper.style.opacity = '1';
        }
    }

    function initNavListeners() {
        document.body.addEventListener('click', (e) => {
            const link = e.target.closest('.bottom-nav a');
            if (!link) return;
            e.preventDefault();
            const url = link.href;
            if (url === window.location.href) return;
            
            loadPage(url);
            
            document.querySelectorAll('.bottom-nav a').forEach(l => l.classList.remove('active'));
            document.querySelectorAll(`a[href="${link.getAttribute('href')}"]`).forEach(active => active.classList.add('active'));
        });
    }

    // --- INISIALISASI HALAMAN ---
    function initBeranda() {
        setDate(); setTime(); setInterval(setTime, 1000);
        fetchFinancialData(); // Memanggil fungsi pintar yang sama
        fetchHealthData();
        fetchActivityData();
    }

    function initKeuangan() {
        fetchFinancialData(); // Memanggil fungsi pintar yang sama
        fetchBudgetData();
    }
    
    function initKesehatan() {
        fetchHealthDataForHealthPage();
    }

    // --- HELPER UTILS ---
    function padZero(num) { return num < 10 ? '0' + num : num; }

    function parseDate(dateString) {
        if (!dateString) return null;
        // Coba format DD/MM/YYYY (Format Sheet biasanya)
        if (dateString.includes('/')) {
            const parts = dateString.split('/');
            if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
        }
        // Coba format YYYY-MM-DD (Format ISO/API)
        if (dateString.includes('-')) {
            return new Date(dateString);
        }
        return new Date(dateString);
    }

    const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(angka);

    function setDate() {
        const el = document.getElementById('current-date');
        if (el) {
            const now = new Date();
            el.innerHTML = `<i class="far fa-calendar-alt"></i> ${now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
        }
    }
    function setTime() {
        const el = document.getElementById('current-time');
        if (el) {
            const now = new Date();
            el.innerHTML = `<i class="far fa-clock"></i> ${now.toLocaleTimeString('id-ID')}`;
        }
    }

    // --- MAGIC FUNCTION: PENCARI KOLOM OTOMATIS ---
    function findValue(item, keywords) {
        const keys = Object.keys(item);
        for (let key of keys) {
            // Bersihkan key (hapus spasi, simbol, lowercase)
            const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, ''); 
            for (let keyword of keywords) {
                if (cleanKey === keyword.toLowerCase().replace(/[^a-z0-9]/g, '')) {
                    return item[key];
                }
            }
        }
        return undefined;
    }

    // --- FITUR UTAMA: KEUANGAN ---
    async function fetchFinancialData() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/finances`);
            const data = await response.json();
            
            // DEBUGGING: Cek di Console
            console.log(`✅ Data API Keuangan: ${data.length} baris diterima.`);
            if (data.length > 0) console.log("🔍 Sample Data:", data[0]);

            let pemasukanBulanIni = 0;
            let pengeluaranBulanIni = 0;
            let saldoBank = 0;
            let saldoEwallet = 0;
            let saldoCash = 0;

            const now = new Date();
            const bulanIni = now.getMonth();
            const tahunIni = now.getFullYear();

            data.forEach(item => {
                // Gunakan findValue untuk mencari data yang cocok, apapun nama kolomnya
                const rawNominal  = findValue(item, ['Nominal', 'amount', 'nilai', 'jumlah', 'harga']);
                const rawJenis    = findValue(item, ['Jenis Transaksi', 'jenis', 'tipe', 'type']);
                const rawSumber   = findValue(item, ['Sumber Dana', 'sumber', 'source', 'bank', 'wallet']);
                const rawTujuan   = findValue(item, ['Tujuan Dana', 'tujuan', 'dest']);
                const rawTanggal  = findValue(item, ['Tanggal Transaksi', 'tanggal', 'date', 'tgl']);

                // Bersihkan angka
                const nominalStr = String(rawNominal || '0');
                const jumlah = parseFloat(nominalStr.replace(/[^0-9]/g, '')) || 0;

                // Bersihkan teks
                const jenis = String(rawJenis || '').toLowerCase().trim();
                const sumber = String(rawSumber || '').toLowerCase().trim();
                const tujuan = String(rawTujuan || '').toLowerCase().trim();

                // Cek Tanggal
                const tgl = parseDate(rawTanggal);
                const isCurrentMonth = (tgl && tgl.getMonth() === bulanIni && tgl.getFullYear() === tahunIni);

                // LOGIKA SALDO & BULANAN
                if (jenis.includes('masuk') || jenis === 'pemasukan') {
                    if (isCurrentMonth) pemasukanBulanIni += jumlah;
                    
                    if (sumber.includes('bank') || sumber.includes('bsi')) saldoBank += jumlah;
                    else if (sumber.includes('wallet') || sumber.includes('pay') || sumber.includes('dana') || sumber.includes('ovo')) saldoEwallet += jumlah;
                    else if (sumber.includes('cash') || sumber.includes('tunai')) saldoCash += jumlah;

                } else if (jenis.includes('keluar') || jenis === 'pengeluaran') {
                    if (isCurrentMonth) pengeluaranBulanIni += jumlah;

                    if (sumber.includes('bank') || sumber.includes('bsi')) saldoBank -= jumlah;
                    else if (sumber.includes('wallet') || sumber.includes('pay') || sumber.includes('dana')) saldoEwallet -= jumlah;
                    else if (sumber.includes('cash') || sumber.includes('tunai')) saldoCash -= jumlah;
                
                } else if (jenis.includes('transfer') || jenis.includes('tf')) {
                    // Kurangi pengirim
                    if (sumber.includes('bank') ||cBSI(sumber)) saldoBank -= jumlah;
                    else if (sumber.includes('wallet') || sumber.includes('pay')) saldoEwallet -= jumlah;
                    else if (sumber.includes('cash')) saldoCash -= jumlah;

                    // Tambah penerima
                    if (tujuan.includes('bank') || cBSI(tujuan)) saldoBank += jumlah;
                    else if (tujuan.includes('wallet') || tujuan.includes('pay')) saldoEwallet += jumlah;
                    else if (tujuan.includes('cash')) saldoCash += jumlah;
                }
            });

            // Helper simple cek BSI
            function cBSI(str) { return str.includes('bsi') || str.includes('syariah'); }

            const totalSaldo = saldoBank + saldoEwallet + saldoCash;

            // UPDATE HTML (Pakai try-catch per elemen biar error satu gak matiin semua)
            const safeSetText = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.textContent = formatRupiah(val);
            };

            safeSetText('pemasukan-value', pemasukanBulanIni);
            safeSetText('pengeluaran-value', pengeluaranBulanIni);
            safeSetText('pemasukan-bulan-ini', pemasukanBulanIni);
            safeSetText('pengeluaran-bulan-ini', pengeluaranBulanIni);
            
            safeSetText('saldo-bank', saldoBank);
            safeSetText('saldo-ewallet', saldoEwallet);
            safeSetText('saldo-cash', saldoCash);
            safeSetText('sisa-saldo-value', totalSaldo);
            safeSetText('card-balance-bank', saldoBank);
            safeSetText('card-balance-ewallet', saldoEwallet);

            // UPDATE TABEL
            updateTransactionTable(data);

            // UPDATE GRAFIK (Dengan Pengecekan Aman)
            if (document.getElementById('monthlyEarningsChart')) {
                createMonthlyChart(data);
            }

        } catch (error) {
            console.error('Gagal proses data keuangan:', error);
        }
    }

    function updateTransactionTable(data) {
        const tableBody = document.querySelector('#transaction-table tbody');
        if (!tableBody) return;

        tableBody.innerHTML = '';
        const recent = data.slice(-7).reverse();
        recent.forEach(item => {
            const row = document.createElement('tr');
            const desc = findValue(item, ['deskripsi', 'ket']) || '-';
            const jenis = findValue(item, ['jenis', 'type']) || '-';
            const nomRaw = findValue(item, ['nominal', 'amount']) || 0;
            const nom = parseFloat(String(nomRaw).replace(/[^0-9]/g, '')) || 0;

            let color = '#333', sign = '';
            const j = String(jenis).toLowerCase();
            if (j.includes('masuk')) { color = '#4caf50'; sign = '+'; }
            else if (j.includes('keluar')) { color = '#f44336'; sign = '-'; }

            row.innerHTML = `<td>${desc}</td><td>${jenis}</td><td style="color:${color}">${sign} ${formatRupiah(nom)}</td>`;
            tableBody.appendChild(row);
        });
    }

    // --- FUNGSI GRAFIK AMAN ---
    function createMonthlyChart(data) {
        // Cek apakah Library Chart.js sudah dimuat?
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js belum dimuat. Grafik dilewati.');
            return;
        }
        
        const ctx = document.getElementById('monthlyEarningsChart');
        if (!ctx) return;

        // Hapus chart lama jika ada biar gak numpuk
        if (window.myFinanceChart instanceof Chart) {
            window.myFinanceChart.destroy();
        }

        // Data Dummy untuk grafik (Bisa dikembangkan nanti pakai data real)
        const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'];
        const incomeData = [1500000, 2000000, 1800000, 2200000, 2500000, 3000000];

        window.myFinanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tren Pemasukan',
                    data: incomeData,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } }
            }
        });
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
