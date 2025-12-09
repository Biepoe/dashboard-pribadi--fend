// =========================================================
// SCRIPT.JS (FINAL: FULL DASHBOARD + PERSONAL MANAGER)
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
        } else if (bodyId === 'halaman-personal') {
            initPersonal(); // <--- FUNGSI BARU
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
        initDiagnosticFeature(); 
        initMentalHealthChart(); 
        simulateActivityData();  
    }

    // --- INIT PERSONAL PAGE (BARU) ---
    function initPersonal() {
        setDate();
        loadPersonalData(); // Muat data dari penyimpanan lokal
        
        // Expose fungsi ke window agar bisa dipanggil dari HTML onclick=""
        window.addSkill = addSkill;
        window.addGoal = addGoal;
        window.addBook = addBook;
        window.editProfile = editProfile;
        window.deleteItem = deleteItem; // Fungsi hapus
    }

    // =========================================================
    // 3. FITUR PERSONAL MANAGER (LOCAL STORAGE)
    // =========================================================

    // Kunci Penyimpanan
    const STORAGE_KEY = 'dashboard_personal_data';

    // Data Default (Jika belum ada data)
    let personalData = {
        profile: {
            name: "Nama Kamu",
            role: "Role / Pekerjaan",
            bio: "Tulis bio singkat kamu di sini..."
        },
        skills: [],
        goals: [],
        books: []
    };

    function loadPersonalData() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            personalData = JSON.parse(stored);
        }
        renderPersonalUI();
    }

    function saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(personalData));
        renderPersonalUI();
    }

    function renderPersonalUI() {
        // 1. Render Profil
        const pName = document.getElementById('profile-name');
        const pRole = document.getElementById('profile-role');
        const pBio = document.getElementById('profile-bio');
        
        if (pName) {
            pName.textContent = personalData.profile.name;
            pRole.textContent = personalData.profile.role;
            pBio.textContent = personalData.profile.bio;
        }

        // 2. Render Skills
        const skillContainer = document.getElementById('skill-container');
        if (skillContainer) {
            if (personalData.skills.length === 0) {
                skillContainer.innerHTML = '<div class="empty-state">Belum ada skill. Klik Tambah.</div>';
            } else {
                skillContainer.innerHTML = '';
                personalData.skills.forEach((skill, index) => {
                    skillContainer.innerHTML += `
                        <div class="skill-item" onclick="deleteItem('skills', ${index})">
                            <div class="skill-head">
                                <span>${skill.name}</span>
                                <span>${skill.progress}% <i class="fas fa-trash" style="font-size:10px; color:#ff4d4d; margin-left:5px;"></i></span>
                            </div>
                            <div class="progress-bar-container">
                                <div class="progress-bar" style="width: ${skill.progress}%;"></div>
                            </div>
                        </div>`;
                });
            }
        }

        // 3. Render Goals
        const goalContainer = document.getElementById('goal-container');
        if (goalContainer) {
            if (personalData.goals.length === 0) {
                goalContainer.innerHTML = '<div class="empty-state">Belum ada target. Ayo buat impian!</div>';
            } else {
                goalContainer.innerHTML = '<ul class="goal-list"></ul>';
                const list = goalContainer.querySelector('ul');
                personalData.goals.forEach((goal, index) => {
                    list.innerHTML += `
                        <li class="goal-item">
                            <div class="goal-check"><i class="fas fa-check" style="font-size: 10px; color:#ccc;"></i></div>
                            <span class="goal-text">${goal}</span>
                            <i class="fas fa-trash delete-item" onclick="deleteItem('goals', ${index})"></i>
                        </li>`;
                });
            }
        }

        // 4. Render Books
        const bookContainer = document.getElementById('book-container');
        if (bookContainer) {
            if (personalData.books.length === 0) {
                bookContainer.innerHTML = '<div class="empty-state" style="width:100%;">Belum ada buku.</div>';
            } else {
                bookContainer.innerHTML = '';
                personalData.books.forEach((book, index) => {
                    bookContainer.innerHTML += `
                        <div class="book-item">
                            <div class="book-cover"><i class="fas fa-book"></i></div>
                            <span class="book-title">${book}</span>
                            <div class="book-delete" onclick="deleteItem('books', ${index})">×</div>
                        </div>`;
                });
            }
        }
    }

    // --- FUNGSI AKSI (ADD/EDIT/DELETE) ---
    
    function editProfile() {
        const name = prompt("Masukkan Nama:", personalData.profile.name);
        const role = prompt("Masukkan Role/Pekerjaan:", personalData.profile.role);
        const bio = prompt("Masukkan Bio Singkat:", personalData.profile.bio);
        
        if (name) personalData.profile.name = name;
        if (role) personalData.profile.role = role;
        if (bio) personalData.profile.bio = bio;
        saveData();
    }

    function addSkill() {
        const name = prompt("Nama Skill (contoh: Coding):");
        if (!name) return;
        const progress = prompt("Progress (0-100):", "50");
        if (progress) {
            personalData.skills.push({ name: name, progress: parseInt(progress) });
            saveData();
        }
    }

    function addGoal() {
        const goal = prompt("Apa target kamu?");
        if (goal) {
            personalData.goals.push(goal);
            saveData();
        }
    }

    function addBook() {
        const title = prompt("Judul Buku:");
        if (title) {
            personalData.books.push(title);
            saveData();
        }
    }

    function deleteItem(type, index) {
        if (confirm("Hapus item ini?")) {
            personalData[type].splice(index, 1);
            saveData();
        }
    }

    // =========================================================
    // 4. HELPER & UTILS
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
    // 5. FITUR KEUANGAN & LAINNYA (DIPERTAHANKAN)
    // =========================================================

    // ... (Fungsi keuangan dipertahankan seperti sebelumnya)
    async function fetchFinancialData() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/finances`);
            const data = await response.json();
            let pemasukanBulanIni = 0, pengeluaranBulanIni = 0;
            let saldoBank = 0, saldoEwallet = 0, saldoCash = 0;
            const now = new Date();
            const bulanIni = now.getMonth();
            const tahunIni = now.getFullYear();

            data.forEach(item => {
                const rawNominal = findValue(item, ['Nominal', 'amount', 'jumlah']);
                const rawJenis = findValue(item, ['Jenis', 'tipe', 'transaksi']);
                const rawSumber = findValue(item, ['Sumber', 'bank', 'wallet']);
                const rawTujuan = findValue(item, ['Tujuan', 'ke']);
                const rawTanggal = findValue(item, ['Tanggal', 'date']);

                const jumlah = parseFloat(String(rawNominal || '0').replace(/[^0-9]/g, '')) || 0;
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

            const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = formatRupiah(val); };
            setText('pemasukan-value', pemasukanBulanIni);
            setText('pengeluaran-value', pengeluaranBulanIni);
            setText('pemasukan-bulan-ini', pemasukanBulanIni);
            setText('pengeluaran-bulan-ini', pengeluaranBulanIni);
            setText('saldo-bank', saldoBank);
            setText('saldo-ewallet', saldoEwallet);
            setText('saldo-cash', saldoCash);
            setText('sisa-saldo-value', saldoBank + saldoEwallet + saldoCash);
            setText('card-balance-bank', saldoBank);
            setText('card-balance-ewallet', saldoEwallet);

            updateTransactionTable(data);
            if (document.getElementById('monthlyEarningsChart')) createMonthlyChart(data);
            if (document.getElementById('month-selector')) setupDownloadFeature(data);

        } catch (error) { console.error(error); }
    }

    function setupDownloadFeature(data) {
        const monthSelector = document.getElementById('month-selector');
        const btnDownload = document.getElementById('btn-download-csv');
        if (!monthSelector || !btnDownload) return;

        const uniqueMonths = new Set();
        data.forEach(item => {
            const tgl = parseDate(findValue(item, ['Tanggal', 'date']));
            if (tgl) uniqueMonths.add(`${tgl.getFullYear()}-${padZero(tgl.getMonth() + 1)}`);
        });

        const sortedMonths = Array.from(uniqueMonths).sort().reverse();
        monthSelector.innerHTML = '<option value="">Pilih Bulan...</option>';
        const mNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        sortedMonths.forEach(m => {
            const [y, mo] = m.split('-');
            monthSelector.innerHTML += `<option value="${m}">${mNames[parseInt(mo)-1]} ${y}</option>`;
        });

        const newBtn = btnDownload.cloneNode(true);
        btnDownload.parentNode.replaceChild(newBtn, btnDownload);
        newBtn.innerHTML = '<i class="fas fa-file-excel"></i> Unduh Excel';
        newBtn.style.backgroundColor = '#1D6F42';
        
        newBtn.addEventListener('click', () => {
            if (!monthSelector.value) return alert('Pilih bulan dulu!');
            downloadExcel(data, monthSelector.value);
        });
    }

    function downloadExcel(data, selectedMonth) {
        if (typeof XLSX === 'undefined') return alert('Library Excel belum siap!');
        const filtered = data.filter(item => {
            const tgl = parseDate(findValue(item, ['Tanggal', 'date']));
            return tgl && `${tgl.getFullYear()}-${padZero(tgl.getMonth() + 1)}` === selectedMonth;
        });
        if (filtered.length === 0) return alert('Data kosong.');

        const excelData = filtered.map(item => ({
            "Timestamp": findValue(item, ['Timestamp', 'waktu']) || findValue(item, ['Tanggal', 'date']),
            "Jenis Transaksi": findValue(item, ['Jenis', 'tipe']),
            "Nominal": parseFloat(String(findValue(item, ['Nominal', 'amount'])).replace(/[^0-9]/g, '')) || 0,
            "Kategori": findValue(item, ['Kategori', 'cat']),
            "Tanggal Transaksi": findValue(item, ['Tanggal', 'date']),
            "Deskripsi": findValue(item, ['Deskripsi', 'ket']),
            "Sumber Dana": findValue(item, ['Sumber', 'source']),
            "Tujuan Dana": findValue(item, ['Tujuan', 'dest']),
            "Bukti Transfer": findValue(item, ['Bukti', 'proof']) || '-'
        }));

        const ws = XLSX.utils.json_to_sheet(excelData);
        ws['!cols'] = [{wch: 20}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 30}, {wch: 15}, {wch: 15}, {wch: 15}];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Laporan");
        XLSX.writeFile(wb, `Laporan_Keuangan_${selectedMonth}.xlsx`);
    }

    function updateTransactionTable(data) {
        const tbody = document.querySelector('#transaction-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        data.slice(-5).reverse().forEach(item => {
            const desc = findValue(item, ['deskripsi', 'ket']) || '-';
            const jenis = findValue(item, ['jenis', 'type']) || '-';
            const nom = parseFloat(String(findValue(item, ['nominal', 'amount'])).replace(/[^0-9]/g, '')) || 0;
            const color = String(jenis).toLowerCase().includes('masuk') ? '#4caf50' : '#f44336';
            const sign = String(jenis).toLowerCase().includes('masuk') ? '+' : '-';
            tbody.innerHTML += `<tr><td>${desc}</td><td>${jenis}</td><td style="color:${color}">${sign} ${formatRupiah(nom)}</td></tr>`;
        });
    }

    function createMonthlyChart(data) {
        if (typeof Chart === 'undefined' || !document.getElementById('monthlyEarningsChart')) return;
        const ctx = document.getElementById('monthlyEarningsChart');
        const income = Array(12).fill(0), expense = Array(12).fill(0);
        const year = new Date().getFullYear();

        data.forEach(item => {
            const tgl = parseDate(findValue(item, ['Tanggal', 'date']));
            const jenis = String(findValue(item, ['jenis', 'tipe'])).toLowerCase();
            const amount = parseFloat(String(findValue(item, ['nominal'])).replace(/[^0-9]/g, '')) || 0;
            
            if (tgl && tgl.getFullYear() === year) {
                if (jenis.includes('masuk')) income[tgl.getMonth()] += amount;
                else if (jenis.includes('keluar')) expense[tgl.getMonth()] += amount;
            }
        });

        if (window.myFinanceChart instanceof Chart) window.myFinanceChart.destroy();
        window.myFinanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
                datasets: [
                    { label: 'Pemasukan', data: income, borderColor: '#667eea', backgroundColor: 'rgba(102, 126, 234, 0.1)', fill: true, tension: 0.4 },
                    { label: 'Pengeluaran', data: expense, borderColor: '#f44336', backgroundColor: 'rgba(244, 67, 54, 0.1)', fill: true, tension: 0.4 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });
    }

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
        try {
            const res = await fetch(`${BACKEND_URL}/api/health`);
            const data = await res.json();
            if (!data.length) return;
            const last = data[data.length - 1];
            const cond = findValue(last, ['kondisi', 'tubuh']) || 'Sehat';
            document.getElementById('body-status-large').textContent = cond;
            document.getElementById('body-vector-large').className = cond.toLowerCase().includes('sakit') ? 'body-sick' : 'body-normal';
        } catch (e) { console.error(e); }
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
                    const cat = String(findValue(item, ['kategori']) || 'Lainnya').toLowerCase();
                    const amt = parseFloat(String(findValue(item, ['nominal'])).replace(/[^0-9]/g, '')) || 0;
                    
                    for (let b of budgets) {
                        const bName = String(findValue(b, ['kategori'])).toLowerCase();
                        if (cat.includes(bName)) {
                            used[bName] = (used[bName] || 0) + amt;
                            break;
                        }
                    }
                }
            });

            const container = document.getElementById('budget-container');
            if(container) {
                container.innerHTML = '';
                budgets.forEach(b => {
                    const cat = findValue(b, ['kategori']);
                    const catKey = String(cat).toLowerCase();
                    const limit = parseFloat(String(findValue(b, ['alokasi'])).replace(/[^0-9]/g, '')) || 0;
                    const cur = used[catKey] || 0;
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

    initNavListeners();
    runPageInit();
});
