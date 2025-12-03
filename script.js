// =========================================================
// SCRIPT.JS (VERSI FINAL: DOWNLOAD EXCEL RAPI + GRAFIK DUAL)
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

    // --- INISIALISASI HALAMAN ---
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

    // --- HELPER UTILS ---
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

    // --- 1. FITUR KEUANGAN & DOWNLOAD ---
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
                const rawNominal  = findValue(item, ['Nominal', 'amount', 'nilai', 'jumlah']);
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
                    else if (sumber.includes('wallet') || sumber.includes('pay') || sumber.includes('dana')) saldoEwallet += jumlah;
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
            
            if (document.getElementById('monthlyEarningsChart')) {
                createMonthlyChart(data);
            }

            // Inisialisasi Download
            if (document.getElementById('month-selector')) {
                setupDownloadFeature(data);
            }

        } catch (error) {
            console.error('Gagal proses data keuangan:', error);
        }
    }

    // --- LOGIKA DOWNLOAD EXCEL (.XLSX) ---
    function setupDownloadFeature(data) {
        const monthSelector = document.getElementById('month-selector');
        const btnDownload = document.getElementById('btn-download-csv'); 
        if (!monthSelector || !btnDownload) return;

        // 1. Cari Bulan Unik
        const uniqueMonths = new Set();
        data.forEach(item => {
            const rawTgl = findValue(item, ['Tanggal', 'date', 'tgl', 'timestamp']);
            const tgl = parseDate(rawTgl ? rawTgl.split(' ')[0] : null); 
            if (tgl && !isNaN(tgl)) {
                const monthValue = `${tgl.getFullYear()}-${padZero(tgl.getMonth() + 1)}`;
                uniqueMonths.add(monthValue);
            }
        });

        // 2. Masukkan ke Dropdown
        const sortedMonths = Array.from(uniqueMonths).sort().reverse();
        monthSelector.innerHTML = '<option value="">Pilih Bulan...</option>';
        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        sortedMonths.forEach(m => {
            const [y, mo] = m.split('-');
            const label = `${monthNames[parseInt(mo) - 1]} ${y}`;
            const option = document.createElement('option');
            option.value = m;
            option.textContent = label;
            monthSelector.appendChild(option);
        });

        // 3. Reset Button Listener
        const newBtn = btnDownload.cloneNode(true);
        btnDownload.parentNode.replaceChild(newBtn, btnDownload);
        newBtn.innerHTML = '<i class="fas fa-file-excel"></i> Unduh Excel'; 
        newBtn.style.backgroundColor = '#1D6F42'; 

        newBtn.addEventListener('click', () => {
            const selectedMonth = monthSelector.value;
            if (!selectedMonth) {
                alert('Silakan pilih bulan terlebih dahulu!');
                return;
            }
            downloadExcel(data, selectedMonth);
        });
    }

    function downloadExcel(data, selectedMonth) {
        if (typeof XLSX === 'undefined') {
            alert('Library Excel belum siap! Refresh halaman ini.');
            return;
        }

        // 1. Filter Data
        const filteredData = data.filter(item => {
            const rawTgl = findValue(item, ['Tanggal', 'date', 'tgl', 'timestamp']);
            const tgl = parseDate(rawTgl ? rawTgl.split(' ')[0] : null);
            if (!tgl) return false;
            const itemMonth = `${tgl.getFullYear()}-${padZero(tgl.getMonth() + 1)}`;
            return itemMonth === selectedMonth;
        });

        if (filteredData.length === 0) {
            alert('Tidak ada data untuk bulan ini.');
            return;
        }

        // 2. Format Data Sesuai Screenshot 105 (Rapi)
        const excelData = filteredData.map(item => {
            const nominalRaw = findValue(item, ['Nominal', 'amount']) || 0;
            const nominalNum = parseFloat(String(nominalRaw).replace(/[^0-9]/g, '')) || 0;

            return {
                "Timestamp": findValue(item, ['Timestamp', 'waktu']) || findValue(item, ['Tanggal', 'date']),
                "Jenis Transaksi": findValue(item, ['Jenis', 'tipe']) || '',
                "Nominal": nominalNum, 
                "Kategori": findValue(item, ['Kategori', 'cat']) || '',
                "Tanggal Transaksi": findValue(item, ['Tanggal', 'date']) || '',
                "Deskripsi": findValue(item, ['Deskripsi', 'ket']) || '',
                "Sumber Dana": findValue(item, ['Sumber', 'source']) || '',
                "Tujuan Dana": findValue(item, ['Tujuan', 'dest']) || '',
                "Bukti Transfer": findValue(item, ['Bukti', 'proof']) || '-'
            };
        });

        // 3. Buat File Excel
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const wscols = [
            {wch: 20}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 30}, {wch: 15}, {wch: 15}, {wch: 15}
        ];
        worksheet['!cols'] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Keuangan");
        XLSX.writeFile(workbook, `Laporan_Keuangan_${selectedMonth}.xlsx`);
    }

    function updateTransactionTable(data) {
        const tableBody = document.querySelector('#transaction-table tbody');
        if (!tableBody) return;

        tableBody.innerHTML = '';
        const recent = data.slice(-5).reverse();
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

    // --- GRAFIK (Pemasukan vs Pengeluaran) ---
    function createMonthlyChart(data) {
        if (typeof Chart === 'undefined') return;
        
        const ctx = document.getElementById('monthlyEarningsChart');
        if (!ctx) return;

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
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

        window.myFinanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthNames,
                datasets: [
                    {
                        label: 'Pemasukan',
                        data: incomePerMonth, 
                        borderColor: '#667eea', 
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Pengeluaran',
                        data: expensePerMonth, 
                        borderColor: '#f44336', 
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

    // --- 2. FITUR KESEHATAN ---
    async function fetchHealthData() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/health`);
            const data = await response.json();
            if (!data || data.length === 0) return;

            const latestRecord = data[data.length - 1];
            const kondisi = findValue(latestRecord, ['kondisi', 'tubuh']) || 'Sehat';
            const rawTgl = findValue(latestRecord, ['tanggal', 'date']);
            const lastSleep = [...data].reverse().find(item => findValue(item, ['tidur']));
            const lastMed = [...data].reverse().find(item => findValue(item, ['obat']));
            
            const bodyStatusEl = document.getElementById('body-status');
            const bodyVector = document.getElementById('body-vector');
            if (bodyStatusEl) bodyStatusEl.textContent = kondisi;
            if (bodyVector) bodyVector.className = (kondisi.toLowerCase() === 'sakit') ? 'body-sick' : 'body-normal';

            const sleepEl = document.getElementById('sleep-duration');
            if (sleepEl && lastSleep) {
                const t = findValue(lastSleep, ['tidur']) || '00:00';
                const b = findValue(lastSleep, ['bangun']) || '00:00';
                const [tH, tM] = t.split(':');
                const [bH, bM] = b.split(':');
                let dur = (parseInt(bH) - parseInt(tH));
                if (dur < 0) dur += 24;
                sleepEl.textContent = `${dur} Jam`;
            }

            const medEl = document.getElementById('last-medicine');
            if(medEl) medEl.textContent = lastMed ? findValue(lastMed, ['obat']) : '-';
            
            const dateEl = document.getElementById('health-date');
            if(dateEl && rawTgl) {
                dateEl.textContent = parseDate(rawTgl).toLocaleDateString('id-ID', {weekday: 'long'});
            }
        } catch (e) { console.error('Health Error:', e); }
    }

    async function fetchHealthDataForHealthPage() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/health`);
            const data = await response.json();
            if (!data || data.length === 0) return;
            const latest = data[data.length-1];
            const kondisi = findValue(latest, ['kondisi']) || 'Sehat';
            document.getElementById('body-status-large').textContent = kondisi;
            document.getElementById('body-vector-large').className = (kondisi.toLowerCase() === 'sakit') ? 'body-sick' : 'body-normal';
        } catch(e) { console.error(e); }
    }

    // --- 3. FITUR AKTIVITAS ---
    async function fetchActivityData() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/activities`);
            const data = await response.json();
            const list = document.getElementById('activity-log-list');
            if (!list) return;
            list.innerHTML = '';
            
            data.slice(-5).reverse().forEach(item => {
                const tgl = findValue(item, ['kapan', 'tanggal']) || '';
                const jam = findValue(item, ['waktu', 'jam']) || '';
                const keg = findValue(item, ['ngapain', 'kegiatan']) || '-';
                const note = findValue(item, ['notes']) || '';
                
                list.innerHTML += `
                    <li class="activity-log-item">
                        <div class="activity-log-time"><span class="date">${tgl}</span><span class="time">${jam}</span></div>
                        <div class="activity-log-details"><span class="title">${keg}</span><span class="notes">${note}</span></div>
                    </li>`;
            });
        } catch(e) { console.error('Activity Error:', e); }
    }

    // --- 4. FITUR BUDGET ---
    async function fetchBudgetData() {
        try {
            const [resB, resF] = await Promise.all([
                fetch(`${BACKEND_URL}/api/budgets`),
                fetch(`${BACKEND_URL}/api/finances`)
            ]);
            const budgets = await resB.json();
            const finances = await resF.json();
            
            const used = {};
            const now = new Date();
            
            finances.forEach(item => {
                const j = String(findValue(item, ['jenis'])).toLowerCase();
                const tgl = parseDate(findValue(item, ['tanggal']));
                if ((j.includes('keluar') || j==='pengeluaran') && tgl && tgl.getMonth() === now.getMonth()) {
                    const cat = findValue(item, ['kategori']) || 'Lainnya';
                    const amt = parseFloat(String(findValue(item, ['nominal'])).replace(/[^0-9]/g, '')) || 0;
                    used[cat] = (used[cat] || 0) + amt;
                }
            });

            const container = document.getElementById('budget-container');
            if(container) {
                container.innerHTML = '';
                budgets.forEach(b => {
                    const cat = findValue(b, ['kategori']);
                    const limit = parseFloat(String(findValue(b, ['alokasi'])).replace(/[^0-9]/g, '')) || 0;
                    const cur = used[cat] || 0;
                    const pct = (cur / limit) * 100;
                    const color = pct > 90 ? 'danger' : (pct > 70 ? 'warning' : '');
                    
                    container.innerHTML += `
                        <div class="budget-item">
                            <div class="budget-item-header"><span>${cat}</span><span>${formatRupiah(limit - cur)}</span></div>
                            <div class="progress-bar-container"><div class="progress-bar ${color}" style="width:${Math.min(pct,100)}%"></div></div>
                            <div class="budget-item-footer"><span>Terpakai: ${formatRupiah(cur)}</span><span>dari ${formatRupiah(limit)}</span></div>
                        </div>`;
                });
            }
        } catch(e) { console.error('Budget Error:', e); }
    }

    initNavListeners();
    runPageInit();
});
