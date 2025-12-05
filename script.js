// =========================================================
// SCRIPT.JS (FINAL: FULL DASHBOARD INTEGRATION)
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Halaman dimuat, script.js berjalan.');

    const BACKEND_URL = 'https://dashboard-dpp-backend.onrender.com';

    // =========================================================
    // 1. SISTEM NAVIGASI (SPA)
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
        // Fitur Baru untuk Halaman Kesehatan
        initDiagnosticFeature(); // Pop-up simulasi
        initMentalHealthChart(); // Grafik Mental Health
        simulateActivityData();  // Data Dummy Steps/Workout
        fetchHealthDataForHealthPage(); // Data API (jika ada)
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
    // 4. FITUR KEUANGAN (DATA & CHART & DOWNLOAD)
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

        const uniqueMonths = new Set();
        data.forEach(item => {
            const rawTgl = findValue(item, ['Tanggal', 'date', 'tgl', 'timestamp']);
            const tgl = parseDate(rawTgl ? rawTgl.split(' ')[0] : null); 
            if (tgl && !isNaN(tgl)) {
                const monthValue = `${tgl.getFullYear()}-${padZero(tgl.getMonth() + 1)}`;
                uniqueMonths.add(monthValue);
            }
        });

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

    // =========================================================
    // 5. FITUR BUDGET (FILTER BULAN REAL-TIME)
    // =========================================================

    async function fetchBudgetData() {
        try {
            const [budgetResponse, financeResponse] = await Promise.all([
                fetch(`${BACKEND_URL}/api/budgets`),
                fetch(`${BACKEND_URL}/api/finances`)
            ]);

            const budgetDefs = await budgetResponse.json();
            const financeData = await financeResponse.json();

            const budgetMap = {};
            
            budgetDefs.forEach(b => {
                const name = findValue(b, ['kategori', 'category']);
                const rawLimit = findValue(b, ['alokasi', 'limit', 'budget', 'nominal']);
                if (name) {
                    const limit = parseFloat(String(rawLimit).replace(/[^0-9]/g, '')) || 0;
                    budgetMap[name.toLowerCase()] = { 
                        originalName: name, 
                        limit: limit, 
                        used: 0 
                    };
                }
            });

            const now = new Date();
            const bulanIni = now.getMonth();
            const tahunIni = now.getFullYear();

            financeData.forEach(item => {
                const jenis = String(findValue(item, ['jenis', 'transaksi']) || '').toLowerCase();
                const rawTgl = findValue(item, ['Tanggal', 'date', 'tgl']);
                const tgl = parseDate(rawTgl);

                if ((jenis.includes('keluar') || jenis === 'pengeluaran') && 
                    tgl && tgl.getMonth() === bulanIni && tgl.getFullYear() === tahunIni) {
                    
                    const transCat = String(findValue(item, ['kategori', 'category']) || '').toLowerCase();
                    const rawNominal = findValue(item, ['nominal', 'jumlah']);
                    const amount = parseFloat(String(rawNominal).replace(/[^0-9]/g, '')) || 0;

                    for (let budgetKey in budgetMap) {
                        if (transCat.includes(budgetKey)) {
                            budgetMap[budgetKey].used += amount;
                            break; 
                        }
                    }
                }
            });

            const budgetContainer = document.getElementById('budget-container');
            if (budgetContainer) {
                budgetContainer.innerHTML = '';
                
                for (let key in budgetMap) {
                    const data = budgetMap[key];
                    const sisa = data.limit - data.used;
                    
                    let percentage = 0;
                    if (data.limit > 0) percentage = (data.used / data.limit) * 100;
                    else if (data.used > 0) percentage = 100;

                    let colorClass = '';
                    if (percentage >= 100) colorClass = 'danger'; 
                    else if (percentage > 75) colorClass = 'warning'; 

                    budgetContainer.innerHTML += `
                        <div class="budget-item">
                            <div class="budget-item-header">
                                <span class="category">${data.originalName}</span>
                                <span class="remaining" style="color: ${sisa < 0 ? '#f44336' : '#4caf50'}">
                                    ${sisa < 0 ? 'Over: ' : 'Sisa: '} ${formatRupiah(Math.abs(sisa))}
                                </span>
                            </div>
                            <div class="progress-bar-container">
                                <div class="progress-bar ${colorClass}" style="width: ${Math.min(percentage, 100)}%;"></div>
                            </div>
                            <div class="budget-item-footer">
                                <span>Terpakai: ${formatRupiah(data.used)}</span>
                                <span>dari ${formatRupiah(data.limit)}</span>
                            </div>
                        </div>
                    `;
                }
            }

        } catch (error) {
            console.error('Gagal ambil data budget:', error);
        }
    }

    // =========================================================
    // 6. FITUR KESEHATAN BARU (SIMULASI & CHART)
    // =========================================================

    // --- MENTAL HEALTH CHART (GAUGE) ---
    function initMentalHealthChart() {
        const ctx = document.getElementById('mentalHealthChart');
        if (!ctx) return;

        if (window.mentalChart instanceof Chart) window.mentalChart.destroy();

        window.mentalChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Skor', 'Sisa'], 
                datasets: [{
                    data: [78, 22],
                    backgroundColor: ['#4caf50', '#e0e0e0'],
                    borderWidth: 0,
                    circumference: 180, 
                    rotation: 270, 
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '85%',
                plugins: { legend: { display: false }, tooltip: { enabled: false } }
            }
        });
    }

    // --- SIMULASI AKTIVITAS (ANGKA BERGERAK DIKIT) ---
    function simulateActivityData() {
        const elSteps = document.getElementById('dummy-steps');
        
        if (elSteps) {
            let steps = 8200;
            setInterval(() => {
                steps += Math.floor(Math.random() * 5); 
                elSteps.textContent = steps.toLocaleString();
            }, 3000);
        }
    }

    // --- FITUR DIAGNOSTIC (MODAL POPUP) ---
    let diagInterval = null;
    function initDiagnosticFeature() {
        const btn = document.getElementById('btn-diagnostic');
        const modal = document.getElementById('diagnostic-modal');
        const close = document.querySelector('.close-btn');
        if(btn && modal) btn.addEventListener('click', ()=>{ modal.classList.add('show'); startSim(); });
        if(close) close.addEventListener('click', ()=>{ modal.classList.remove('show'); stopSim(); });
        window.onclick = (e) => { if(e.target==modal) { modal.classList.remove('show'); stopSim(); }};
    }
    function startSim(){ updateVal(); diagInterval=setInterval(updateVal, 1500); }
    function stopSim(){ if(diagInterval) clearInterval(diagInterval); }
    function updateVal(){
        const hr = Math.floor(Math.random()*(95-65+1))+65;
        const sp = Math.floor(Math.random()*(99-96+1))+96;
        const tp = (Math.random()*(36.8-36.3)+36.3).toFixed(1);
        if(document.getElementById('live-heart-rate')) document.getElementById('live-heart-rate').textContent=hr;
        if(document.getElementById('live-spo2')) document.getElementById('live-spo2').textContent=sp;
        if(document.getElementById('live-temp')) document.getElementById('live-temp').textContent=tp;
    }

    // --- FETCH DATA KESEHATAN (DATA LAMA DARI SHEET) ---
    async function fetchHealthData() {
        try {
            const res = await fetch(`${BACKEND_URL}/api/health`);
            const data = await res.json();
            if (!data.length) return;
            const last = data[data.length - 1];
            const cond = findValue(last, ['kondisi', 'tubuh']) || 'Sehat';
            const vec = document.getElementById('body-vector');
            if (document.getElementById('body-status')) document.getElementById('body-status').textContent = cond;
            if (vec) vec.className = cond.toLowerCase().includes('sakit') ? 'body-sick' : 'body-normal';
            
            const sleepEl = document.getElementById('sleep-duration');
            const lastSleep = [...data].reverse().find(i => findValue(i, ['tidur']));
            if(sleepEl && lastSleep) {
                const t = findValue(lastSleep, ['tidur']);
                const b = findValue(lastSleep, ['bangun']);
                const dur = (parseInt(b.split(':')[0]) - parseInt(t.split(':')[0]) + 24) % 24;
                sleepEl.textContent = `${dur} Jam`;
            }
            if(document.getElementById('last-medicine')) {
                const lastMed = [...data].reverse().find(i => findValue(i, ['obat']));
                document.getElementById('last-medicine').textContent = lastMed ? findValue(lastMed, ['obat']) : '-';
            }
        } catch (e) { console.error(e); }
    }

    async function fetchHealthDataForHealthPage() {
        // Biarkan kosong atau isi logika jika mau ambil data real dari sheet ke kartu baru
    }

    async function fetchActivityData() {
        try {
            const res = await fetch(`${BACKEND_URL}/api/activities`);
            const data = await res.json();
            const list = document.getElementById('activity-log-list');
            if (list) {
                list.innerHTML = '';
                data.slice(-5).reverse().forEach(i => {
                    const t = findValue(i, ['kapan', 'date']) || '';
                    const k = findValue(i, ['ngapain', 'kegiatan']) || '-';
                    list.innerHTML += `<li class="activity-log-item"><div class="activity-log-time">${t}</div><div class="activity-log-details">${k}</div></li>`;
                });
            }
        } catch (e) { console.error(e); }
    }

    initNavListeners();
    runPageInit();
});
