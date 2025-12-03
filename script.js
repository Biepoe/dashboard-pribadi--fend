// =========================================================
// SCRIPT.JS
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Halaman dimuat, script.js berjalan.');

    const BACKEND_URL = 'https://dashboard-dpp-backend.onrender.com';

    // =========================================================
    // 1. SISTEM NAVIGASI (SPA - Single Page Application)
    // =========================================================
    
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
                window.location.href = url; 
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

    // =========================================================
    // 2. INISIALISASI HALAMAN
    // =========================================================

    function initBeranda() {
        setDate(); setTime(); setInterval(setTime, 1000);
        fetchFinancialData(); 
        fetchHealthData();
        fetchActivityData();
    }

    function initKeuangan() {
        fetchFinancialData(); 
        fetchBudgetData();
    }
    
    function initKesehatan() {
        fetchHealthDataForHealthPage();
    }

    // =========================================================
    // 3. HELPER & UTILS
    // =========================================================

    function padZero(num) { return num < 10 ? '0' + num : num; }

    function parseDate(dateString) {
        if (!dateString) return null;
        if (dateString.includes('/')) {
            const parts = dateString.split('/');
            if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
        }
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

    // --- MAGIC FUNCTION: PENCARI KOLOM OTOMATIS (FINDVALUE) ---
    function findValue(item, keywords) {
        const keys = Object.keys(item);
        for (let key of keys) {
            const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, ''); 
            for (let keyword of keywords) {
                if (cleanKey.includes(keyword.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
                    return item[key];
                }
            }
        }
        return undefined;
    }

    // =========================================================
    // 4. FITUR UTAMA: KEUANGAN & GRAFIK DUAL
    // =========================================================

    async function fetchFinancialData() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/finances`);
            const data = await response.json();

            let pemasukanBulanIni = 0;
            let pengeluaranBulanIni = 0;
            let saldoBank = 0;
            let saldoEwallet = 0;
            let saldoCash = 0;

            const now = new Date();
            const bulanIni = now.getMonth();
            const tahunIni = now.getFullYear();

            data.forEach(item => {
                const rawNominal  = findValue(item, ['Nominal', 'amount', 'nilai', 'jumlah', 'harga']);
                const rawJenis    = findValue(item, ['Jenis', 'tipe', 'type', 'transaksi']); 
                const rawSumber   = findValue(item, ['Sumber', 'source', 'bank', 'wallet', 'asal']);
                const rawTujuan   = findValue(item, ['Tujuan', 'dest', 'ke']);
                const rawTanggal  = findValue(item, ['Tanggal', 'date', 'tgl']);

                const nominalStr = String(rawNominal || '0');
                const jumlah = parseFloat(nominalStr.replace(/[^0-9]/g, '')) || 0;

                const jenis = String(rawJenis || '').toLowerCase().trim();
                const sumber = String(rawSumber || '').toLowerCase().trim();
                const tujuan = String(rawTujuan || '').toLowerCase().trim();

                const tgl = parseDate(rawTanggal);
                const isCurrentMonth = (tgl && tgl.getMonth() === bulanIni && tgl.getFullYear() === tahunIni);

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
                    if (sumber.includes('bank') || sumber.includes('bsi')) saldoBank -= jumlah;
                    else if (sumber.includes('wallet') || sumber.includes('pay')) saldoEwallet -= jumlah;
                    else if (sumber.includes('cash')) saldoCash -= jumlah;

                    if (tujuan.includes('bank') || tujuan.includes('bsi')) saldoBank += jumlah;
                    else if (tujuan.includes('wallet') || tujuan.includes('pay')) saldoEwallet += jumlah;
                    else if (tujuan.includes('cash')) saldoCash += jumlah;
                }
            });

            const totalSaldo = saldoBank + saldoEwallet + saldoCash;

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

            updateTransactionTable(data);
            
            // Panggil grafik
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
            
            const desc = findValue(item, ['deskripsi', 'ket', 'desc']) || '-';
            const jenis = findValue(item, ['jenis', 'type', 'transaksi']) || '-'; 
            const nomRaw = findValue(item, ['nominal', 'amount', 'nilai']) || 0;
            const nom = parseFloat(String(nomRaw).replace(/[^0-9]/g, '')) || 0;

            let color = '#333', sign = '';
            const j = String(jenis).toLowerCase();
            if (j.includes('masuk')) { color = '#4caf50'; sign = '+'; }
            else if (j.includes('keluar')) { color = '#f44336'; sign = '-'; }

            row.innerHTML = `<td>${desc}</td><td>${jenis}</td><td style="color:${color}">${sign} ${formatRupiah(nom)}</td>`;
            tableBody.appendChild(row);
        });
    }

    // --- GRAFIK BULANAN (Pemasukan vs Pengeluaran) ---
    function createMonthlyChart(data) {
        if (typeof Chart === 'undefined') return;
        
        const ctx = document.getElementById('monthlyEarningsChart');
        if (!ctx) return;

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        // Siapkan DUA wadah: satu untuk pemasukan, satu untuk pengeluaran
        const incomePerMonth = new Array(12).fill(0); 
        const expensePerMonth = new Array(12).fill(0); 

        const currentYear = new Date().getFullYear();
        
        data.forEach(item => {
            const rawJenis = findValue(item, ['Jenis', 'transaksi', 'tipe']);
            const rawNominal = findValue(item, ['Nominal', 'amount', 'jumlah']);
            const rawTanggal = findValue(item, ['Tanggal', 'date']);
            
            const jenis = String(rawJenis || '').toLowerCase();
            const jumlah = parseFloat(String(rawNominal).replace(/[^0-9]/g, '')) || 0;
            const tgl = parseDate(rawTanggal);

            if (tgl && tgl.getFullYear() === currentYear) {
                const monthIndex = tgl.getMonth(); 
                
                // Pisahkan Pemasukan & Pengeluaran
                if (jenis.includes('masuk') || jenis === 'pemasukan') {
                    incomePerMonth[monthIndex] += jumlah;
                } else if (jenis.includes('keluar') || jenis === 'pengeluaran') {
                    expensePerMonth[monthIndex] += jumlah;
                }
            }
        });

        if (window.myFinanceChart instanceof Chart) {
            window.myFinanceChart.destroy();
        }

        // Buat Chart dengan 2 Dataset
        window.myFinanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthNames,
                datasets: [
                    {
                        label: 'Pemasukan',
                        data: incomePerMonth, 
                        borderColor: '#667eea', // Biru
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Pengeluaran',
                        data: expensePerMonth, 
                        borderColor: '#f44336', // Merah
                        backgroundColor: 'rgba(244, 67, 54, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: { 
                    y: { beginAtZero: true } 
                }
            }
        });
    }

    // =========================================================
    // 5. FITUR KESEHATAN
    // =========================================================

    async function fetchHealthData() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/health`);
            const data = await response.json();

            if (!data || data.length === 0) return;

            const latestRecord = data[data.length - 1];
            
            const kondisiTubuh = findValue(latestRecord, ['kondisi', 'condition', 'tubuh']) || 'Sehat';
            const rawTgl = findValue(latestRecord, ['tanggal', 'date', 'kejadian']);

            const lastSleepRecord = [...data].reverse().find(item => findValue(item, ['waktu_tidur', 'tidur']));
            const lastMedicineRecord = [...data].reverse().find(item => findValue(item, ['obat', 'suplemen']));
            
            const bodyVector = document.getElementById('body-vector');
            const bodyStatusEl = document.getElementById('body-status');

            if (bodyStatusEl) bodyStatusEl.textContent = kondisiTubuh;
            if (bodyVector) bodyVector.className = (kondisiTubuh.toLowerCase() === 'sakit') ? 'body-sick' : 'body-normal';

            const sleepDurationEl = document.getElementById('sleep-duration');
            if (sleepDurationEl && lastSleepRecord) {
                const jamTidurStr = findValue(lastSleepRecord, ['waktu_tidur', 'tidur']) || '00:00';
                const jamBangunStr = findValue(lastSleepRecord, ['waktu_bangun', 'bangun']) || '00:00';
                
                const [tH, tM] = jamTidurStr.split(':').map(Number);
                const [bH, bM] = jamBangunStr.split(':').map(Number);
                
                let durasiJam = bH - tH;
                let durasiMenit = bM - tM;
                if (durasiJam < 0) durasiJam += 24; 
                
                sleepDurationEl.textContent = `${durasiJam} Jam ${Math.abs(durasiMenit)} Menit`;
            }

            const lastMedicineEl = document.getElementById('last-medicine');
            if(lastMedicineEl) {
                const namaObat = lastMedicineRecord ? findValue(lastMedicineRecord, ['obat', 'suplemen']) : '-';
                lastMedicineEl.textContent = namaObat;
            }
            
            const healthDateEl = document.getElementById('health-date');
            if(healthDateEl && rawTgl) {
                const latestDate = parseDate(rawTgl);
                healthDateEl.textContent = (latestDate) ? latestDate.toLocaleDateString('id-ID', { weekday: 'long' }) : "Update";
            }

        } catch (error) {
            console.error('Gagal mengambil data kesehatan:', error);
        }
    }

    async function fetchHealthDataForHealthPage() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/health`);
            const data = await response.json();
            if (!data || data.length === 0) return;

            const latestRecord = data[data.length - 1];
            const kondisi = findValue(latestRecord, ['kondisi', 'tubuh']) || 'Sehat';
            const lastMedicineRecord = [...data].reverse().find(item => findValue(item, ['obat', 'suplemen']));
            
            const bodyStatusLarge = document.getElementById('body-status-large');
            const bodyVectorLarge = document.getElementById('body-vector-large');
            const lastMedicineDetail = document.getElementById('last-medicine-detail');
            
            if (bodyStatusLarge) bodyStatusLarge.textContent = kondisi;
            if (bodyVectorLarge) bodyVectorLarge.className = (kondisi.toLowerCase() === 'sakit') ? 'body-sick' : 'body-normal';
            if (lastMedicineDetail) lastMedicineDetail.textContent = lastMedicineRecord ? findValue(lastMedicineRecord, ['obat', 'suplemen']) : '-';

        } catch (error) {
            console.error('Gagal mengambil data detail kesehatan:', error);
        }
    }

    // =========================================================
    // 6. FITUR AKTIVITAS
    // =========================================================

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
                const tanggal = findValue(item, ['kapan', 'tanggal', 'when']) || '';
                const waktu = findValue(item, ['waktu', 'jam', 'time']) || '';
                const kegiatan = findValue(item, ['ngapain', 'kegiatan', 'aktivitas', 'activity']) || '-';
                const notes = findValue(item, ['notes', 'catatan']) || '';

                const listItem = document.createElement('li');
                listItem.className = 'activity-log-item';
                listItem.innerHTML = `
                    <div class="activity-log-time">
                        <span class="date">${tanggal}</span>
                        <span class="time">${waktu}</span>
                    </div>
                    <div class="activity-log-details">
                        <span class="title">${kegiatan}</span>
                        <span class="notes">${notes}</span>
                    </div>`;
                listContainer.appendChild(listItem);
            });
        } catch (error) {
            console.error('Gagal mengambil data aktivitas:', error);
        }
    }

    // =========================================================
    // 7. FITUR BUDGET
    // =========================================================

    async function fetchBudgetData() {
        try {
            const [budgetResponse, financeResponse] = await Promise.all([
                fetch(`${BACKEND_URL}/api/budgets`),
                fetch(`${BACKEND_URL}/api/finances`)
            ]);

            const budgetDefs = await budgetResponse.json();
            const financeData = await financeResponse.json();

            const spendingByCategory = {};
            const now = new Date();
            const bulanIni = now.getMonth();
            const tahunIni = now.getFullYear();

            financeData.forEach(item => {
                const jenis = String(findValue(item, ['jenis', 'transaksi']) || '').toLowerCase();
                if (jenis.includes('keluar') || jenis === 'pengeluaran') {
                    
                    const rawTgl = findValue(item, ['tanggal', 'date']);
                    const tgl = parseDate(rawTgl);

                    if (tgl && tgl.getMonth() === bulanIni && tgl.getFullYear() === tahunIni) {
                        const kategori = findValue(item, ['kategori', 'category']) || 'Lainnya';
                        const rawNominal = findValue(item, ['nominal', 'jumlah']);
                        const jumlah = parseFloat(String(rawNominal).replace(/[^0-9]/g, '')) || 0;
                        
                        if (!spendingByCategory[kategori]) spendingByCategory[kategori] = 0;
                        spendingByCategory[kategori] += jumlah;
                    }
                }
            });

            const budgetContainer = document.getElementById('budget-container');
            if (budgetContainer) {
                budgetContainer.innerHTML = '';
                budgetDefs.forEach(budget => {
                    const kategori = findValue(budget, ['kategori', 'category']);
                    const rawAlokasi = findValue(budget, ['alokasi', 'budget', 'limit']);
                    const alokasi = parseFloat(String(rawAlokasi).replace(/[^0-9]/g, '')) || 0;
                    
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

    initNavListeners();
    runPageInit();
});
