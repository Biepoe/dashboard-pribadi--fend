// =========================================================
// SCRIPT.JS
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Halaman dimuat, script.js berjalan.');

    const BACKEND_URL = 'https://dashboard-dpp-backend.onrender.com';
    const TARGET_KALORI = 2055;
    const TARGET_PROTEIN = 80;
    let activeIntervals = []; 

    // --- STRUKTUR DATA UTAMA (DEFAULT) ---
    let personalData = {
        profile: { name: "Nama Kamu", role: "Pekerjaan", bio: "Bio..." },
        skills: [], goals: [], books: [], movies: [],
        tracker: { water: { count: 0, date: "" }, mood: { status: "", date: "" } },
        bills: [] 
    };

    // =========================================================
    // 0. FITUR NOTIFIKASI (TOAST)
    // =========================================================
    function showNotification(message, type = 'success') {
        const div = document.createElement('div');
        Object.assign(div.style, {
            position: 'fixed', bottom: '20px', right: '20px',
            padding: '12px 24px', borderRadius: '8px', color: 'white',
            fontWeight: '500', zIndex: '9999',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px',
            transition: 'transform 0.3s ease-in-out, opacity 0.3s',
            transform: 'translateY(100px)', opacity: '0'
        });

        if (type === 'error') {
            div.style.backgroundColor = '#f44336'; 
            div.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        } else {
            div.style.backgroundColor = '#4caf50'; 
            div.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        }

        document.body.appendChild(div);
        
        requestAnimationFrame(() => { 
            div.style.transform = 'translateY(0)'; 
            div.style.opacity = '1'; 
        });

        setTimeout(() => {
            div.style.transform = 'translateY(100px)'; 
            div.style.opacity = '0';
            setTimeout(() => div.remove(), 300);
        }, 3000);
    }

    // =========================================================
    // 1. SISTEM NAVIGASI (SPA)
    // =========================================================
    function clearPageIntervals() {
        activeIntervals.forEach(clearInterval);
        activeIntervals = [];
        if (typeof stSim === 'function') stSim(); 
    }

    function runPageInit() {
        const bodyId = document.body.id;
        if (bodyId === 'halaman-beranda') initBeranda();
        else if (bodyId === 'halaman-keuangan') initKeuangan();
        else if (bodyId === 'halaman-hub');
        else if (bodyId === 'halaman-kesehatan') initKesehatan();
        else if (bodyId === 'halaman-personal') initPersonal();
        else if (bodyId === 'halaman-nutrition') fetchNutritionData();
    }

    async function loadPage(url) {
        clearPageIntervals(); 
        const cw = document.getElementById('content-wrapper');
        if(!cw) return;
        
        cw.style.opacity = '0.5';
        try {
            const res = await fetch(url);
            if(!res.ok) throw new Error('Err');
            const text = await res.text();
            const doc = new DOMParser().parseFromString(text, 'text/html');
            const newContent = doc.getElementById('content-wrapper');
            
            if(newContent) {
                document.title = doc.title;
                document.body.id = doc.body.id;
                cw.innerHTML = newContent.innerHTML;
                runPageInit();
                history.pushState({path:url},'',url);
            } else {
                window.location.href = url;
            }
        } catch(e) { 
            console.error("Gagal load page SPA, redirecting...", e);
            window.location.href = url; 
        } finally {
            cw.style.opacity='1';
        }
    }

    function initNavListeners() {
        document.body.addEventListener('click', (e) => {
            const link = e.target.closest('.bottom-nav a');
            if(!link) return;
            e.preventDefault();
            document.querySelectorAll('.bottom-nav a').forEach(l=>l.classList.remove('active'));
            link.classList.add('active');
            loadPage(link.href);
        });
    }

    // =========================================================
    // 2. INIT PER HALAMAN
    // =========================================================
    function initBeranda() {
        setDate(); setTime(); 
        activeIntervals.push(setInterval(setTime, 1000));
        fetchFinancialData(); fetchHealthData(); fetchActivityData();  
    }
    
    function initKeuangan() { 
        fetchFinancialData(); fetchBudgetData(); loadPersonalData().then(renderBills); 
    }

    function initPersonal() {
        setDate();
        loadPersonalData();
        
        window.openModal = openModal; window.closeModal = closeModal;
        window.saveProfile = saveProfile; window.saveSkill = saveSkill;
        window.saveGoal = saveGoal; window.saveBook = saveBook;
        window.saveMovie = saveMovie; window.deleteItem = deleteItem;
        
        window.openSkillModal = openSkillModal;
        window.addMaterialToList = addMaterialToList;
        window.toggleMaterialTemp = toggleMaterialTemp; 
        window.deleteMaterialTemp = deleteMaterialTemp; 
        
        window.toggleGoal = toggleGoal; window.toggleBook = toggleBook; window.toggleMovie = toggleMovie; 
        
        window.onclick = function(event) {
            if (event.target.classList.contains('modal-overlay')) event.target.classList.remove('show');
        }
    }

    // =========================================================
    // 3. FUNGSI DATA CLOUD
    // =========================================================
    async function loadPersonalData() {
        try {
            const res = await fetch(`${BACKEND_URL}/api/personal`);
            let cloudData = {};
            if (res.ok) cloudData = await res.json();
            
            if (cloudData && typeof cloudData === 'object' && !Array.isArray(cloudData)) {
                personalData = { ...personalData, ...cloudData };
            }
            
            ['skills','goals','books','movies','bills'].forEach(k => { if(!personalData[k]) personalData[k] = []; });
            if(!personalData.tracker) personalData.tracker = { water: {count:0}, mood: {} };
            
            updateAllUI();
        } catch (error) {
            console.warn("Offline/Server Busy:", error); updateAllUI();
        }
    }

    async function saveData(silent = false) {
        updateAllUI();
        try {
            const res = await fetch(`${BACKEND_URL}/api/personal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(personalData)
            });
            if (!res.ok) throw new Error(`Server Error: ${res.status}`);
            if(!silent) showNotification("Data berhasil disimpan!", 'success');
        } catch (error) {
            console.error("❌ Gagal simpan:", error);
            showNotification("Gagal menyimpan ke server!", 'error');
        }
    }

    function updateAllUI() {
        if(document.getElementById('profile-name')) renderPersonalUI();
        if(document.getElementById('water-count')) renderTracker();
        if(document.getElementById('bill-list')) renderBills();
    }

    // =========================================================
    // 4. LOGIKA TAGIHAN (BILLS)
    // =========================================================
    window.addBill = function() {
        const name = prompt("Nama Tagihan (misal: Netflix):");
        const dateStr = prompt("Tanggal jatuh tempo (1-31):");
        const date = parseInt(dateStr);
        if (name && !isNaN(date) && date >= 1 && date <= 31) {
            personalData.bills.push({ name: name, date: date }); saveData(); 
        } else {
            alert("⚠️ Input tidak valid!");
        }
    }

    window.deleteBill = function(index) {
        if(confirm("Hapus tagihan ini?")) { personalData.bills.splice(index, 1); saveData(); }
    }

    function renderBills() {
        const list = document.getElementById('bill-list');
        if (!list) return;
        const bills = personalData.bills || [];
        list.innerHTML = '';
        if (bills.length === 0) {
            list.innerHTML = '<li style="text-align:center; color:#999; font-size:12px; padding:10px;">Belum ada tagihan.</li>'; return;
        }

        bills.sort((a, b) => a.date - b.date);
        const today = new Date().getDate();

        bills.forEach((b, i) => {
            const diff = b.date - today;
            let status = diff < 0 ? 'Telat!' : (diff === 0 ? 'Hari ini!' : `${diff} hari lagi`);
            let color = diff < 0 ? 'red' : (diff <= 3 ? '#ff9800' : '#4caf50');
            list.innerHTML += `
                <li class="bill-item">
                    <span class="bill-date">Tgl ${b.date}</span>
                    <span class="bill-name">${b.name}</span>
                    <span style="color:${color}; font-weight:600; font-size:11px; margin-right:10px;">${status}</span>
                    <i class="fas fa-trash" style="cursor:pointer; color:#ccc; font-size:12px;" onclick="deleteBill(${i})"></i>
                </li>`;
        });
    }

    // =========================================================
    // 5. KEUANGAN (FINANCE) & BUDGET
    // =========================================================
    async function fetchFinancialData() {
        try {
            const res = await fetch(`${BACKEND_URL}/api/finances`); const data = await res.json();
            let pemasukan=0, pengeluaran=0, sBank=0, sEwallet=0, sCash=0;
            const now = new Date(); const m = now.getMonth(); const y = now.getFullYear();
            
            data.forEach(item => {
                const nom = parseFloat(String(findValue(item,['nominal','amount','jumlah'])||'0').replace(/[^0-9]/g,''))||0;
                const jenis = String(findValue(item,['jenis','transaksi','tipe'])||'').toLowerCase().trim();
                const src = String(findValue(item,['sumber','bank'])||'').toLowerCase();
                const dst = String(findValue(item,['tujuan','ke'])||'').toLowerCase();
                const tgl = parseDate(findValue(item,['tanggal','date']));
                const isCur = (tgl && tgl.getMonth()===m && tgl.getFullYear()===y);
                
                if(jenis.includes('masuk')||jenis==='pemasukan'||jenis.includes('income')){
                    if(isCur) pemasukan+=nom;
                    if(src.includes('bank')||src.includes('bsi')) sBank+=nom; else if(src.includes('wallet')) sEwallet+=nom; else sCash+=nom;
                } else if(jenis.includes('keluar')||jenis==='pengeluaran'||jenis.includes('expense')){
                    if(isCur) pengeluaran+=nom;
                    if(src.includes('bank')||src.includes('bsi')) sBank-=nom; else if(src.includes('wallet')) sEwallet-=nom; else sCash-=nom;
                } else if(jenis.includes('tf')||jenis.includes('transfer')){
                    if(src.includes('bank')) sBank-=nom; else if(src.includes('wallet')) sEwallet-=nom; else sCash-=nom;
                    if(dst.includes('bank')) sBank+=nom; else if(dst.includes('wallet')) sEwallet+=nom; else sCash+=nom;
                }
            });

            const setText = (id,v) => {const el=document.getElementById(id);if(el)el.textContent=formatRupiah(v)};
            setText('pemasukan-value', pemasukan); setText('pengeluaran-value', pengeluaran);
            setText('pemasukan-bulan-ini', pemasukan); setText('pengeluaran-bulan-ini', pengeluaran);
            setText('saldo-bank', sBank); setText('saldo-ewallet', sEwallet); setText('saldo-cash', sCash);
            setText('sisa-saldo-value', sBank+sEwallet+sCash);
            setText('card-balance-bank', sBank); setText('card-balance-ewallet', sEwallet);
            
            generateAIInsight(pemasukan, pengeluaran, sBank+sEwallet+sCash);
            updateTransactionTable(data);
            
            if(document.getElementById('monthlyEarningsChart')) createMonthlyChart(data);
            if(document.getElementById('month-selector')) setupDownloadFeature(data);

        } catch(e) { console.error(e); }
    }

    async function fetchBudgetData(){
        try{
            const [bRes, fRes] = await Promise.all([fetch(`${BACKEND_URL}/api/budgets`), fetch(`${BACKEND_URL}/api/finances`)]);
            const budgets = await bRes.json(); const finances = await fRes.json();
            const used={}; const now=new Date();
            
            finances.forEach(i=>{
                const j=String(findValue(i,['jenis'])).toLowerCase(); const t=parseDate(findValue(i,['tanggal']));
                if((j.includes('keluar')||j.includes('pengeluaran')) && t && t.getMonth()===now.getMonth()){
                    const c=String(findValue(i,['kategori'])).toLowerCase();
                    const a=parseFloat(String(findValue(i,['nominal'])).replace(/[^0-9]/g,''))||0;
                    budgets.forEach(b=>{if(c.includes(String(findValue(b,['kategori'])).toLowerCase())) used[String(findValue(b,['kategori'])).toLowerCase()]=(used[String(findValue(b,['kategori'])).toLowerCase()]||0)+a});
                }
            });
            const c=document.getElementById('budget-container');
            if(c){
                c.innerHTML=''; 
                budgets.forEach(b=>{
                    const n = findValue(b,['kategori', 'category', 'nama']); 
                    const rawLimit = findValue(b,['alokasi', 'budget', 'limit', 'amount', 'nominal', 'target']);
                    const l = parseFloat(String(rawLimit || '0').replace(/[^0-9]/g,'')) || 0;
                    const u = used[String(n).toLowerCase()]||0; const p = l > 0 ? (u/l)*100 : 0;
                    const col = p > 90 ? 'danger' : (p > 70 ? 'warning' : '');
                    
                    c.innerHTML+=`<div class="budget-item"><div class="budget-item-header"><span>${n}</span><span>${formatRupiah(l-u)}</span></div>
                        <div class="progress-bar-container"><div class="progress-bar ${col}" style="width:${Math.min(p,100)}%"></div></div></div>`;
                });
            }
        }catch(e){console.error('Budget Error:', e)}
    }

    function updateTransactionTable(d){ const t=document.querySelector('#transaction-table tbody'); if(t){t.innerHTML=''; d.slice(-5).reverse().forEach(i=>{
        const nom = parseFloat(String(findValue(i,['nominal'])).replace(/[^0-9]/g,''));
        t.innerHTML+=`<tr><td>${findValue(i,['deskripsi','note'])}</td><td>${findValue(i,['jenis'])}</td><td>${formatRupiah(nom)}</td></tr>`;
    })}}

    function generateAIInsight(inc, exp, total) {
        const el = document.getElementById('ai-insight-text'); if(!el) return;
        let msg = ""; const ratio = exp / (inc || 1);
        if (inc===0 && exp===0) msg = "Data bulan ini masih kosong. Yuk catat!";
        else if (ratio > 1) msg = "⚠️ <strong>Boros!</strong> Pengeluaran lebih besar dari pemasukan.";
        else if (ratio > 0.8) msg = "🚧 <strong>Hati-hati!</strong> Kamu sudah habiskan >80% pemasukan.";
        else if (ratio < 0.5) msg = "🌟 <strong>Hemat Banget!</strong> Pengeluaran di bawah 50%. Tabung sisanya!";
        else msg = "✅ <strong>Sehat!</strong> Keuanganmu stabil.";
        if (total < 100000 && total > 0) msg += " <br>📉 Saldo menipis, hemat dulu ya!";
        el.innerHTML = msg;
    }

    function createMonthlyChart(data) { 
        if(!document.getElementById('monthlyEarningsChart')) return; 
        const ctx=document.getElementById('monthlyEarningsChart'); 
        const inc=Array(12).fill(0), exp=Array(12).fill(0); const y=new Date().getFullYear(); 
        data.forEach(i=>{ 
            const t=parseDate(findValue(i,['tanggal'])); const a=parseFloat(String(findValue(i,['nominal'])).replace(/[^0-9]/g,''))||0; 
            const j=String(findValue(i,['jenis'])).toLowerCase(); 
            if(t&&t.getFullYear()===y){ if(j.includes('masuk') || j.includes('income')) inc[t.getMonth()]+=a; else if(j.includes('keluar') || j.includes('pengeluaran')) exp[t.getMonth()]+=a; } 
        }); 
        if(window.myC) window.myC.destroy(); 
        window.myC=new Chart(ctx,{type:'line',data:{labels:['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'],datasets:[{label:'Masuk',data:inc,borderColor:'#4caf50',fill:true},{label:'Keluar',data:exp,borderColor:'#f44336',fill:true}]},options:{responsive:true,maintainAspectRatio:false}}); 
    }

    function setupDownloadFeature(data) {
        const sel = document.getElementById('month-selector'); const btn = document.getElementById('btn-download-csv');
        if(!sel || !btn) return;
        const unq = new Set();
        data.forEach(i=>{const t=parseDate(findValue(i,['tanggal']));if(t)unq.add(`${t.getFullYear()}-${padZero(t.getMonth()+1)}`)});
        sel.innerHTML='<option value="">Pilih Bulan...</option>';
        Array.from(unq).sort().reverse().forEach(m=>{sel.innerHTML+=`<option value="${m}">${m}</option>`});
        const nBtn = btn.cloneNode(true); btn.parentNode.replaceChild(nBtn, btn);
        nBtn.innerHTML='<i class="fas fa-file-excel"></i> Unduh Excel'; nBtn.style.backgroundColor='#1D6F42';
        nBtn.addEventListener('click',()=>{if(!sel.value)return alert('Pilih bulan'); downloadExcel(data,sel.value)});
    }
    
    function downloadExcel(data, selM) {
        if(typeof XLSX==='undefined') return alert('XLSX Library Missing');
        const fil = data.filter(i=>{const t=parseDate(findValue(i,['tanggal'])); return t&&`${t.getFullYear()}-${padZero(t.getMonth()+1)}`===selM});
        if(!fil.length) return alert('Kosong');
        const ex = fil.map(i=>({ "Tanggal": findValue(i,['tanggal']), "Ket": findValue(i,['deskripsi']), "Nominal": parseFloat(String(findValue(i,['nominal'])).replace(/[^0-9]/g,'')), "Jenis": findValue(i,['jenis']) }));
        const ws=XLSX.utils.json_to_sheet(ex); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Lap"); XLSX.writeFile(wb,`Lap_${selM}.xlsx`);
    }

    //==========================================
    // UNTUK KESEHATAN DAN ACTIVITY DI BERANDA
    //==========================================
    async function fetchHealthData() {
        try {
            const res = await fetch(`${BACKEND_URL}/api/health`); 
            const data = await res.json();
            if (!data.length) return;
            const last = data[data.length - 1];
            const cond = findValue(last, ['kondisi', 'tubuh', 'status']) || 'Sehat';
            
            if (document.getElementById('body-status')) document.getElementById('body-status').textContent = cond;
            
            const vec = document.getElementById('body-vector');
            if (vec) {
                if (cond.toLowerCase().includes('sakit') || cond.toLowerCase().includes('demam')) {
                    vec.classList.remove('body-normal'); vec.classList.add('body-sick');
                } else {
                    vec.classList.add('body-normal'); vec.classList.remove('body-sick');
                }
            }
            
            const lastSleep = [...data].reverse().find(i => findValue(i, ['tidur']) && findValue(i, ['bangun']));
            if(document.getElementById('sleep-duration') && lastSleep) {
                const t = findValue(lastSleep, ['tidur']); const b = findValue(lastSleep, ['bangun']);
                if(t && b) {
                    let durasi = (parseInt(b.split(':')[0]) || 0) - (parseInt(t.split(':')[0]) || 0);
                    if (durasi < 0) durasi += 24;
                    document.getElementById('sleep-duration').textContent = `${durasi} Jam`;
                }
            }
            
            if(document.getElementById('last-medicine')) {
                const lastMed = [...data].reverse().find(i => findValue(i, ['obat', 'medicine']) && findValue(i, ['obat', 'medicine']) !== '-');
                document.getElementById('last-medicine').textContent = lastMed ? findValue(lastMed, ['obat', 'medicine']) : '-';
            }
        } catch (e) { console.error("Error fetchHealthData:", e); }
    }

    async function fetchActivityData() {
        try {
            const res = await fetch(`${BACKEND_URL}/api/activities`); 
            const data = await res.json();
            const list = document.getElementById('activity-log-list');
            if (list) {
                list.innerHTML = '';
                const recent = data.slice(-5).reverse();
                if(recent.length === 0) { list.innerHTML = '<li class="placeholder">Belum ada aktivitas.</li>'; return; }
                recent.forEach(i => {
                    const t = findValue(i, ['kapan', 'date', 'waktu', 'tanggal']) || '';
                    const k = findValue(i, ['ngapain', 'kegiatan', 'activity', 'nama']) || '-';
                    const dObj = new Date(t);
                    const dateDisplay = !isNaN(dObj.getTime()) ? `${dObj.toLocaleDateString('id-ID')} ${dObj.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}` : t;
                    
                    list.innerHTML += `
                    <li class="activity-log-item">
                        <div class="activity-log-time" style="font-size:11px;">${dateDisplay}</div>
                        <div class="activity-log-details"><span class="title" style="font-size:14px;">${k}</span></div>
                    </li>`;
                });
            }
        } catch (e) { console.error("Error fetchActivityData:", e); }
    }
    
    // =========================================================
    // 6. KESEHATAN & REKAM MEDIS (VERSI BARU)
    // =========================================================
    
    async function initKesehatan() {
        // Hanya jalankan jika berada di halaman kesehatan
        if (!document.getElementById('halaman-kesehatan')) return;

        const uiUpdate = document.getElementById('health-last-update');
        if (uiUpdate) uiUpdate.textContent = 'Memuat data...';

        try {
            // Mengambil data dari Backend Render (sesuaikan endpoint jika nama tab-nya berbeda di backend)
            // Asumsi: /api/health mengarah ke "Medical Record Tracker"
            // Asumsi: /api/health-database mengarah ke "Health Database" (Log Kafein)
            const [healthRes, logRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/health`),
                fetch(`${BACKEND_URL}/api/health-database`).catch(() => null) // Fallback jika endpoint belum ada
            ]);

            const healthData = healthRes.ok ? await healthRes.json() : [];
            const logData = (logRes && logRes.ok) ? await logRes.json() : [];

            // 1. UPDATE KARTU VITALS & STATUS
            if (healthData.length > 0) {
                // Ambil data terbaru (baris paling bawah di sheet)
                const latest = healthData[healthData.length - 1];
                
                // Set Kondisi Saat Ini
                const kondisi = findValue(latest, ['kondisi', 'tubuh', 'status']) || 'Sehat';
                document.getElementById('ui-kondisi').textContent = kondisi;

                // Cari data BB/TB terakhir (mundur dari bawah ke atas mencari yang tidak kosong)
                const lastFisik = [...healthData].reverse().find(i => findValue(i, ['berat']) || findValue(i, ['tinggi']));
                if (lastFisik) {
                    const bb = findValue(lastFisik, ['berat']) ? `${findValue(lastFisik, ['berat'])} kg` : '-- kg';
                    const tb = findValue(lastFisik, ['tinggi']) ? `${findValue(lastFisik, ['tinggi'])} cm` : '-- cm';
                    document.getElementById('ui-fisik').textContent = `${bb} / ${tb}`;
                }

                // Cari data Tidur terakhir
                const lastSleep = [...healthData].reverse().find(i => findValue(i, ['tidur']) && findValue(i, ['bangun']));
                if (lastSleep) {
                    const t = findValue(lastSleep, ['tidur']);
                    const b = findValue(lastSleep, ['bangun']);
                    if (t && b) {
                        const tJam = parseInt(t.split(':')[0]) || 0;
                        const bJam = parseInt(b.split(':')[0]) || 0;
                        let durasi = bJam - tJam;
                        if (durasi < 0) durasi += 24; // Koreksi jika tidur melewati tengah malam
                        document.getElementById('ui-sleep-duration').textContent = `${durasi} Jam`;
                    }
                }

                // Cari data Tensi terakhir (dari kolom 'Apa yang ingin dilaporkan' atau 'Detailkan')
                const lastTensi = [...healthData].reverse().find(i => {
                    const detail = String(findValue(i, ['detailkan', 'lapor'])).toLowerCase();
                    return detail.includes('tensi') || detail.includes('sys');
                });
                if (lastTensi) {
                    // Ekstrak angka tensi dari string panjang (contoh: "SYS 114 mmHg... DIA 85 mmHg")
                    const detailStr = String(findValue(lastTensi, ['detailkan', 'lapor']));
                    const sysMatch = detailStr.match(/(\d+)\s*mmHg/i); // Cari angka pertama sebelum mmHg
                    // Parsing manual sederhana:
                    document.getElementById('ui-tensi').textContent = sysMatch ? `${sysMatch[1]} / --` : 'Cek Detail';
                }
            }

            // 2. UPDATE TIMELINE RIWAYAT OBAT & PENYAKIT
            try {
                const obatList = document.getElementById('ui-obat-list');
                const penyakitList = document.getElementById('ui-penyakit-list');
                
                if (obatList && penyakitList) {
                    obatList.innerHTML = '';
                    penyakitList.innerHTML = '';
                    
                    if (!healthData || healthData.length === 0) {
                        obatList.innerHTML = '<li style="text-align:center; color:#999; padding:20px;">Belum ada data.</li>';
                        penyakitList.innerHTML = '<li style="text-align:center; color:#999; padding:20px;">Belum ada data.</li>';
                    } else {
                        // Filter 1: Minum Obat 
                        const dataObat = healthData.filter(rec => {
                            if (!rec) return false;
                            const tindakan = String(findValue(rec, ['tindakan']) || '').toLowerCase();
                            return tindakan.includes('obat') || tindakan.includes('suplemen');
                        }).slice(-5).reverse();

                        // Filter 2: Penyakit 
                        const dataPenyakit = healthData.filter(rec => {
                            if (!rec) return false;
                            const tindakan = String(findValue(rec, ['tindakan', 'tindakan yang dilakukan']) || '').toLowerCase();
                            const kolomK = String(findValue(rec, ['apa yang ingin dilaporkan']) || '').toLowerCase();
                            
                            // Harus memenuhi KEDUA syarat ini
                            return tindakan.includes('laporan') && kolomK.includes('penyakit yang dialami');
                        }).slice(-5).reverse();

                        // --- RENDER RIWAYAT OBAT ---
                        if (dataObat.length === 0) {
                            obatList.innerHTML = '<li style="text-align:center; color:#999; padding:15px;">Belum ada riwayat obat.</li>';
                        } else {
                            dataObat.forEach(rec => {
                                const tgl = findValue(rec, ['tanggal', 'kejadian']) || '-';
                                const wkt = findValue(rec, ['waktu']) || '';
                                const keluhan = findValue(rec, ['deskripsi', 'keluhan']) || '-';
                                const obat = findValue(rec, ['obat', 'suplemen']) || '';
                                const obatHTML = (obat && obat !== '-') ? `<p class="meds"><i class="fas fa-capsules"></i> ${obat}</p>` : '';

                                obatList.innerHTML += `
                                    <li class="timeline-item">
                                        <div class="timeline-date">${tgl} <span>${wkt}</span></div>
                                        <div class="timeline-content status-sehat-border">
                                            <h4>Konsumsi Obat/Suplemen</h4>
                                            <p class="desc">${keluhan}</p>
                                            ${obatHTML}
                                        </div>
                                    </li>
                                `;
                            });
                        }

                        // --- RENDER RIWAYAT PENYAKIT ---
                        if (dataPenyakit.length === 0) {
                            penyakitList.innerHTML = '<li style="text-align:center; color:#999; padding:15px;">Belum ada riwayat penyakit terbaru.</li>';
                        } else {
                            dataPenyakit.forEach(rec => {
                                const tgl = findValue(rec, ['tanggal', 'kejadian']) || '-';
                                const wkt = findValue(rec, ['waktu']) || '';
                                
                                // 1. Tarik Data dengan findValue (Aman dari perbedaan format backend)
                                const diag = String(findValue(rec, ['didiagnosa oleh', 'oleh', 'didiagnosis']) || '').toLowerCase();
                                const bagian = String(findValue(rec, ['bagian tubuh', 'bagian']) || '').toLowerCase();
                                const detail = findValue(rec, ['penjelasan lebih detail', 'penjelasan', 'detailkan']) || '-';
                                
                                // KHUSUS DIAGNOSA: Filter super ketat biar gak nyomot isi "Didiagnosa Oleh"
                                let hasilDiagnosa = '-';
                                for (let key in rec) {
                                    let cleanKey = key.toLowerCase().trim();
                                    // Harus SAMA PERSIS dengan kata "diagnosa" atau "hasil diagnosa"
                                    if (cleanKey === 'diagnosa' || cleanKey === 'hasil diagnosa') {
                                        hasilDiagnosa = rec[key];
                                        break;
                                    }
                                }
                                
                                // 2. Logika Judul (Keluhan)
                                let keluhan = findValue(rec, ['deskripsi / keluhan', 'deskripsi', 'keluhan']) || '';
                                if (!keluhan || keluhan === '-') {
                                    keluhan = bagian !== '' && bagian !== '-' ? (bagian.charAt(0).toUpperCase() + bagian.slice(1)) : 'Laporan Penyakit';
                                }

                                // 3. Logika Ikon Dinamis
                                let iconClass = 'fa-viruses';
                                const bagianLower = String(bagian).toLowerCase();
                                if (bagianLower.includes('mata')) iconClass = 'fa-eye';
                                else if (bagianLower.includes('tangan') || bagianLower.includes('jari')) iconClass = 'fa-hand-paper';
                                else if (bagianLower.includes('kepala') || bagianLower.includes('pusing')) iconClass = 'fa-head-side-virus';
                                else if (bagianLower.includes('gigi') || bagianLower.includes('mulut')) iconClass = 'fa-tooth';
                                else if (bagianLower.includes('kaki') || bagianLower.includes('lutut')) iconClass = 'fa-shoe-prints';
                                else if (bagianLower.includes('perut') || bagianLower.includes('lambung')) iconClass = 'fa-x-ray';
                                else if (bagianLower.includes('telinga')) iconClass = 'fa-ear-listen';
                                else if (bagianLower.includes('dada') || bagianLower.includes('jantung')) iconClass = 'fa-heartbeat';
                                else if (bagianLower !== '' && bagianLower !== '-') iconClass = 'fa-band-aid'; 

                                // 4. Logika Coret (Strikethrough)
                                let textSelf = "Self-diagnose / with AI Support";
                                let textNakes = "Tenaga Kesehatan";
                                const diagLower = String(diag).toLowerCase();

                                if (diagLower.includes('tenaga') || diagLower.includes('kesehatan') || diagLower.includes('nakes') || diagLower.includes('dokter')) {
                                    textSelf = `<del style="opacity: 0.4;">${textSelf}</del>`;
                                    textNakes = `<strong style="color: #059669;">${textNakes} <i class="fas fa-check-circle"></i></strong>`;
                                } else if (diagLower.includes('self') || diagLower.includes('ai') || diagLower.includes('support')) {
                                    textSelf = `<strong style="color: #2563eb;">${textSelf} <i class="fas fa-check-circle"></i></strong>`;
                                    textNakes = `<del style="opacity: 0.4;">${textNakes}</del>`;
                                }

                                penyakitList.innerHTML += `
                                    <li class="timeline-item">
                                        <div class="timeline-date">${tgl} <span>${wkt}</span></div>
                                        <div class="timeline-content status-sakit-border">
                                            <h4 style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                                                <div style="background: #fee2e2; color: #ef4444; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; flex-shrink: 0;">
                                                    <i class="fas ${iconClass}"></i>
                                                </div>
                                                ${keluhan}
                                            </h4>
                                            
                                            <div style="margin-top: 10px; margin-bottom: 10px; padding-left: 2px;">
                                                <span style="font-size: 11px; font-weight: bold; color: #ef4444;"><i class="fas fa-stethoscope"></i> Diagnosa:</span>
                                                <span style="font-size: 13px; font-weight: 700; color: #1e293b; display: block; margin-top: 2px;">${hasilDiagnosa}</span>
                                            </div>

                                            <div class="desc" style="background: #ffffff; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
                                                <span style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold;">Penjelasan Detail:</span><br>
                                                <span style="color: #334155;">${detail}</span>
                                            </div>

                                            <div style="margin-top: 10px; background: #f8fafc; padding: 10px; border-radius: 8px; font-size: 11px;">
                                                <span style="display: block; color: #64748b; margin-bottom: 6px; font-weight: 600;">Didiagnosa Oleh:</span>
                                                <div style="display: flex; flex-direction: column; gap: 4px;">
                                                    <span>${textSelf}</span>
                                                    <span>${textNakes}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                `;
                            });
                        }
                    }
                }
            } catch (err) {
                console.error("Error merender timeline obat/penyakit:", err);
                const obatList = document.getElementById('ui-obat-list');
                const penyakitList = document.getElementById('ui-penyakit-list');
                if(obatList) obatList.innerHTML = '<li style="text-align:center; color:#ef4444; padding:15px;">Terjadi kesalahan memuat data.</li>';
                if(penyakitList) penyakitList.innerHTML = '<li style="text-align:center; color:#ef4444; padding:15px;">Terjadi kesalahan memuat data.</li>';
            }

            // 3. UPDATE TABEL LOG HARIAN (HEALTH DATABASE)
            const logTable = document.getElementById('ui-health-log-list');
            if (logTable) {
                logTable.innerHTML = '';
                if (logData.length === 0) {
                    logTable.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#999; padding:15px;">Belum ada log harian.</td></tr>';
                } else {
                    // Tampilkan 7 data terakhir
                    const recentLogs = logData.slice(-7).reverse();
                    
                    recentLogs.forEach(log => {
                        const tgl = findValue(log, ['tanggal']) || '-';
                        const wkt = findValue(log, ['waktu']) || '';
                        const kat = findValue(log, ['kategori']) || '-';
                        const item = findValue(log, ['catatan', 'jumlah']) || '-'; // Gabungan jumlah dan catatan
                        const jumlah = findValue(log, ['jumlah']) || '';
                        
                        const badgeClass = String(kat).toLowerCase().includes('kafein') ? 'badge-kafein' : 'badge-umum';
                        const formatTanggal = typeof tgl === 'string' && tgl.includes('202') ? tgl.substring(0, 10) : tgl; // Potong format ISO jika perlu

                        logTable.innerHTML += `
                            <tr>
                                <td><small>${formatTanggal}<br>${wkt}</small></td>
                                <td><span class="${badgeClass}">${kat}</span></td>
                                <td>${jumlah} ${item}</td>
                            </tr>
                        `;
                    });
                }
            }

            // Update waktu sinkronisasi
            if (uiUpdate) {
                const now = new Date();
                uiUpdate.textContent = `Diperbarui: ${now.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}`;
            }

        } catch (error) {
            console.error('Error fetching health data:', error);
            if (uiUpdate) uiUpdate.textContent = 'Gagal sinkronisasi';
        }
    }
    
    //=====================================
    // NUTRISI
    //=====================================
    async function fetchNutritionData() {
        try {
            // 1. Isi Tanggal Otomatis di Halaman Nutrition
            const elTanggal = document.getElementById('ui-tanggal');
            if (elTanggal) {
                elTanggal.textContent = new Date().toLocaleDateString('id-ID', { 
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                });
            }

            // 2. Set Nama Permanen
            const elNama = document.getElementById('ui-nama');
            if (elNama) {
                elNama.textContent = "Aulia Biepoe";
            }

            // 3. Fetch Data (Tidak perlu lagi nutrition-db)
            const [healthRes, logRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/health`), 
                fetch(`${BACKEND_URL}/api/nutrition-log`)
            ]);

            // Cek apakah response berhasil (status 200-299)
            let healthData = healthRes.ok ? await healthRes.json() : []; 
            let logs = logRes.ok ? await logRes.json() : []; 
            
            // Validasi keamanan ekstra: Pastikan datanya benar-benar Array
            if (!Array.isArray(healthData)) healthData = [];
            if (!Array.isArray(logs)) logs = [];
            
            // 4. Update UI Status Tubuh (Sinkronisasi dari Data Health)
            if (healthData.length > 0) {
                const latestMedical = healthData[healthData.length - 1];
                
                // Update Kondisi
                const elKondisi = document.getElementById('ui-kondisi');
                if (elKondisi) elKondisi.textContent = findValue(latestMedical, ['kondisi', 'tubuh', 'status']) || "Normal";

                // Update Obat Terakhir (cari mundur dari bawah)
                const lastMed = [...healthData].reverse().find(i => findValue(i, ['obat', 'medicine']) && findValue(i, ['obat', 'medicine']) !== '-');
                const elObat = document.getElementById('ui-obat');
                if (elObat) elObat.textContent = lastMed ? findValue(lastMed, ['obat', 'medicine']) : "-";

                // Update BB, TB, BMI
                const lastFisik = [...healthData].reverse().find(i => findValue(i, ['berat']) && findValue(i, ['tinggi']));
                if (lastFisik) {
                    const bb = parseFloat(findValue(lastFisik, ['berat'])) || 0;
                    const tb = parseFloat(findValue(lastFisik, ['tinggi'])) || 0;
                    const bmi = (bb && tb) ? (bb / ((tb / 100) ** 2)).toFixed(1) : 0;
                    
                    const statusGrid = document.getElementById('ui-status-grid');
                    if (statusGrid) {
                        statusGrid.innerHTML = `
                            <div class="status-grid-nutri">
                                <div class="status-item-nutri"><span>Berat</span><strong>${bb} kg</strong></div>
                                <div class="status-item-nutri"><span>Tinggi</span><strong>${tb} cm</strong></div>
                                <div class="status-item-nutri"><span>BMI</span><strong>${bmi}</strong></div>
                                <div class="status-item-nutri"><span>Proyek</span><strong style="color: #f97316;">Bulking</strong></div>
                            </div>`;
                    }
                }
            }

            // 
            // 5. LOGIKA BARU: Filter Tanggal Pintar & Mapping Kolom Sesuai Sheet
            const now = new Date();
            
            const todayLogs = logs.filter(l => {
                const tglObj = parseDate(findValue(l, ['tanggal', 'date']));
                return tglObj && 
                       tglObj.getFullYear() === now.getFullYear() && 
                       tglObj.getMonth() === now.getMonth() && 
                       tglObj.getDate() === now.getDate();
            });

            let currentKal = 0; 
            let currentProt = 0; 
            let listHtml = '';

            todayLogs.forEach(log => {
                // Ambil data sesuai format fotomu (Menu diambil dari kolom "Deskripsi")
                const menu = findValue(log, ['deskripsi', 'menu']) || 'Makanan';
                const kalStr = findValue(log, ['kalori']) || '0';
                const protStr = findValue(log, ['protein']) || '0';
                const karboStr = findValue(log, ['karbohidrat', 'karbo']) || '0';
                const lemakStr = findValue(log, ['lemak']) || '0';
                const jam = findValue(log, ['jam', 'waktu']) || '';

                // Bersihkan string dari huruf "Kkal" atau "g" agar murni angka
                const k = parseInt(String(kalStr).replace(/[^0-9]/g, '')) || 0;
                const p = parseInt(String(protStr).replace(/[^0-9]/g, '')) || 0;
                
                currentKal += k; 
                currentProt += p;

                listHtml += `
                    <li style="align-items: center;">
                        <div style="flex-grow: 1;">
                            <span style="display: block; font-weight: 600;">${menu}</span>
                            <small style="font-size:11px; color:#888;">⌚ ${jam} | Karbo: ${karboStr}, Lemak: ${lemakStr}</small>
                        </div>
                        <div style="text-align:right;">
                            <strong style="color: #f97316;">${k} Kkal</strong><br>
                            <small style="font-size:11px;">${p}g Protein</small>
                        </div>
                    </li>`;
            });

            // Tampilkan ke Progress Bar
            renderNutritionProgress(currentKal, currentProt, listHtml);

            // Hide bagian Workout
            const workoutBox = document.getElementById('ui-workout-box');
            if (workoutBox) workoutBox.style.display = 'none';

        } catch (err) { 
            console.error("Gagal sinkronisasi data nutrisi:", err); 
        }
    }

    function renderNutritionProgress(kal, prot, html) {
        const calBar = document.getElementById('ui-cal-bar'); 
        const calText = document.getElementById('ui-cal-text');
        if (calBar && calText) {
            calBar.style.width = `${Math.min((kal / TARGET_KALORI) * 100, 100)}%`;
            calText.textContent = `${kal} / ${TARGET_KALORI}`;
        }
        
        const protBar = document.getElementById('ui-prot-bar'); 
        const protText = document.getElementById('ui-prot-text');
        if (protBar && protText) {
            protBar.style.width = `${Math.min((prot / TARGET_PROTEIN) * 100, 100)}%`;
            protText.textContent = `${prot} / ${TARGET_PROTEIN}`;
        }
        
        const list = document.getElementById('ui-riwayat-list');
        if (list) {
            list.innerHTML = html || '<li style="text-align:center; color:#999; padding-top:10px;">Belum ada asupan hari ini</li>';
        }
    }

    // =========================================================
    // 7. RENDER PERSONAL UI (PERSONAL PAGE)
    // =========================================================
    function renderPersonalUI() {
        if(document.getElementById('profile-name')) {
            document.getElementById('profile-name').textContent = personalData.profile.name;
            document.getElementById('profile-role').textContent = personalData.profile.role;
            document.getElementById('profile-bio').textContent = personalData.profile.bio;
        }

        const skillContainer = document.getElementById('skill-container');
        if (skillContainer) {
            skillContainer.innerHTML = personalData.skills.length ? '' : '<div class="empty-state">Belum ada skill. Klik Tambah.</div>';
            personalData.skills.forEach((s, i) => {
                const total = s.materials ? s.materials.length : 0; const done = s.materials ? s.materials.filter(m => m.done).length : 0;
                const progress = total === 0 ? (s.progress || 0) : Math.round((done / total) * 100);
                skillContainer.innerHTML += `
                    <div class="skill-item" onclick="openSkillModal(${i})">
                        <div class="skill-head">
                            <span>${s.name} <small style="color:#999;">(${done}/${total})</small></span>
                            <span>${progress}% <i class="fas fa-edit" style="color:#667eea; margin-left:5px;"></i></span>
                        </div>
                        <div class="progress-bar-container"><div class="progress-bar" style="width: ${progress}%;"></div></div>
                    </div>`;
            });
        }

        const goalContainer = document.getElementById('goal-container');
        if (goalContainer) {
            goalContainer.innerHTML = personalData.goals.length ? '<ul class="goal-list"></ul>' : '<div class="empty-state">Belum ada target.</div>';
            const list = goalContainer.querySelector('ul');
            if(list) {
                personalData.goals.forEach((g, i) => {
                    const isDone = typeof g === 'object' ? g.done : false;
                    list.innerHTML += `
                        <li class="goal-item" onclick="toggleGoal(${i})">
                            <div class="goal-check ${isDone ? 'checked' : ''}"><i class="fas fa-check" style="font-size: 10px; color:${isDone?'#fff':'#ccc'};"></i></div>
                            <span class="goal-text ${isDone ? 'done' : ''}">${typeof g === 'object' ? g.text : g}</span>
                            <i class="fas fa-trash delete-item" onclick="event.stopPropagation(); deleteItem('goals', ${i})"></i>
                        </li>`;
                });
            }
        }

        if (document.getElementById('book-container')) renderGrid(document.getElementById('book-container'), personalData.books, 'books');
        if (document.getElementById('movie-container')) renderGrid(document.getElementById('movie-container'), personalData.movies, 'movies');
    }

    function renderGrid(container, data, type) {
        container.innerHTML = data.length ? '' : `<div class="empty-state" style="width:100%;">Belum ada item.</div>`;
        data.forEach((item, i) => {
            const readClass = item.done ? 'read' : '';
            let coverStyle = item.img ? `background-image: url('${item.img}'); background-size: cover; background-position: center; color: transparent;` : 'background-color: #eee;';
            container.innerHTML += `
                <div class="book-item" onclick="${type === 'books' ? 'toggleBook' : 'toggleMovie'}(${i})">
                    <div class="book-cover ${readClass}" style="${coverStyle}">${item.img ? '' : item.title.charAt(0)}</div>
                    <span class="book-title ${readClass}">${item.title}</span>
                    <div class="book-delete" onclick="event.stopPropagation(); deleteItem('${type}', ${i})">×</div>
                </div>`;
        });
    }

    // =========================================================
    // 8. MODAL & HELPER LAINNYA
    // =========================================================
    let tempMaterials = []; 

    function openModal(id) {
        const modal = document.getElementById(id);
        if(modal) {
            modal.classList.add('show');
            if(id === 'modal-profile') {
                document.getElementById('input-name').value = personalData.profile.name;
                document.getElementById('input-role').value = personalData.profile.role;
                document.getElementById('input-bio').value = personalData.profile.bio;
            }
        }
    }
    function closeModal(id) { const m=document.getElementById(id); if(m) m.classList.remove('show'); }

    function openSkillModal(index = -1) {
        document.getElementById('modal-skill').classList.add('show');
        document.getElementById('edit-skill-index').value = index;
        if (index === -1) { 
            document.getElementById('skill-modal-title').textContent = "Tambah Skill"; 
            document.getElementById('input-skill-name').value = ""; tempMaterials = []; 
        } else { 
            document.getElementById('skill-modal-title').textContent = "Edit Skill"; 
            document.getElementById('input-skill-name').value = personalData.skills[index].name; 
            tempMaterials = personalData.skills[index].materials ? JSON.parse(JSON.stringify(personalData.skills[index].materials)) : []; 
        }
        renderMaterialList();
    }

    function addMaterialToList() { 
        const t=document.getElementById('input-material-text').value.trim(); 
        if(t) { tempMaterials.push({text:t, done:false}); document.getElementById('input-material-text').value=''; renderMaterialList(); } 
    }
    function toggleMaterialTemp(i) { tempMaterials[i].done = !tempMaterials[i].done; renderMaterialList(); }
    function deleteMaterialTemp(i) { tempMaterials.splice(i, 1); renderMaterialList(); }
    
    function renderMaterialList() {
        const l=document.getElementById('material-list-container'); l.innerHTML='';
        tempMaterials.forEach((m,i)=>{
            l.innerHTML += `<li class="material-item"><div style="display:flex;align-items:center;cursor:pointer;" onclick="toggleMaterialTemp(${i})"><input type="checkbox" ${m.done?'checked':''} style="pointer-events:none;"><span style="${m.done?'text-decoration:line-through;color:#aaa;':''}">${m.text}</span></div><i class="fas fa-times" onclick="deleteMaterialTemp(${i})" style="color:red;cursor:pointer;"></i></li>`;
        });
    }

    function saveSkill() {
        const name = document.getElementById('input-skill-name').value;
        const index = parseInt(document.getElementById('edit-skill-index').value);
        if (!name) return;
        const data = { name, materials: tempMaterials, progress: 0 };
        if (index === -1) personalData.skills.push(data); else personalData.skills[index] = data;
        saveData(); closeModal('modal-skill');
    }

    function validateAndGetImgUrl(url) {
        if (!url) return '';
        if (url.length > 5000) { alert("❌ Link gambar kepanjangan!"); return null; }
        if (url.includes('drive.google.com') && url.includes('/d/')) return `http://googleusercontent.com/profile/picture/${url.split('/d/')[1].split('/')[0]}`;
        return url;
    }

    function saveGoal() { const t=document.getElementById('input-goal-text').value; if(t){ personalData.goals.push({text:t, done:false}); saveData(); closeModal('modal-goal'); } }
    function toggleGoal(i) { const g=personalData.goals[i]; if(typeof g==='string') personalData.goals[i]={text:g, done:true}; else g.done=!g.done; saveData(); }
    
    function saveBook() { 
        const t=document.getElementById('input-book-title').value; const img = validateAndGetImgUrl(document.getElementById('input-book-img').value);
        if(img === null) return;
        if(t){ personalData.books.push({title:t, done:false, img:img}); saveData(); closeModal('modal-book'); document.getElementById('input-book-title').value=''; document.getElementById('input-book-img').value='';} 
    }
    window.toggleBook = function(i) { personalData.books[i].done = !personalData.books[i].done; saveData(); }
    
    function saveMovie() { 
        const t=document.getElementById('input-movie-title').value; const img = validateAndGetImgUrl(document.getElementById('input-movie-img').value);
        if(img === null) return;
        if(t){ personalData.movies.push({title:t, done:false, img:img}); saveData(); closeModal('modal-movie'); document.getElementById('input-movie-title').value=''; document.getElementById('input-movie-img').value='';} 
    }
    window.toggleMovie = function(i) { personalData.movies[i].done = !personalData.movies[i].done; saveData(); }

    function saveProfile() {
        personalData.profile.name = document.getElementById('input-name').value;
        personalData.profile.role = document.getElementById('input-role').value;
        personalData.profile.bio = document.getElementById('input-bio').value;
        saveData(); closeModal('modal-profile');
    }
    
    function deleteItem(type, index) { if(confirm("Hapus?")) { personalData[type].splice(index, 1); saveData(); } }

    function padZero(n){return n<10?'0'+n:n}
    function setDate(){const e=document.getElementById('current-date');if(e)e.innerHTML=`<i class="fas fa-calendar"></i> ${new Date().toLocaleDateString('id-ID',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}`}
    function setTime(){const e=document.getElementById('current-time');if(e)e.innerHTML=`<i class="fas fa-clock"></i> ${new Date().toLocaleTimeString('id-ID')}`}
    const formatRupiah=(n)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(n);
    function parseDate(s){if(!s)return null;if(s.includes('/')){const p=s.split('/');return new Date(p[2],p[1]-1,p[0])}return new Date(s)}
    
    function findValue(o,k){
        const ks=Object.keys(o);
        for(let key of ks){
            const ck=key.toLowerCase().replace(/[^a-z0-9]/g,'');
            for(let kw of k){ if(ck.includes(kw.toLowerCase().replace(/[^a-z0-9]/g,''))) return o[key]; }
        }
        return undefined;
    }

    window.updateWater = function(change) {
        const today = new Date().toDateString();
        if (personalData.tracker.water.date !== today) { personalData.tracker.water = { count: 0, date: today }; }
        let count = personalData.tracker.water.count + change;
        if (count < 0) count = 0; if (count > 8) count = 8;
        personalData.tracker.water.count = count; personalData.tracker.water.date = today;
        saveData(true); 
    }
    window.setMood = function(mood) {
        personalData.tracker.mood = { status: mood, date: new Date().toDateString() };
        saveData(true); 
    }
    function renderTracker() {
        const wEl = document.getElementById('water-count'); const wBar = document.getElementById('water-bar');
        const mBtns = document.querySelectorAll('.btn-mood'); const mStat = document.getElementById('mood-status');
        if (wEl && personalData.tracker && personalData.tracker.water) {
            const today = new Date().toDateString();
            let count = personalData.tracker.water.date === today ? personalData.tracker.water.count : 0;
            wEl.textContent = count; wBar.style.width = `${(count / 8) * 100}%`;
        }
        if (mBtns && personalData.tracker && personalData.tracker.mood) {
            const today = new Date().toDateString();
            const currentMood = personalData.tracker.mood.date === today ? personalData.tracker.mood.status : null;
            mBtns.forEach(btn => {
                btn.classList.remove('active');
                if (currentMood && btn.getAttribute('onclick').includes(currentMood)) btn.classList.add('active');
            });
            if (mStat) {
                const text = { 'happy': 'Senang! Pertahankan 😄', 'neutral': 'Biasa saja 😐', 'sad': 'Sedih, semangat ya! 😔', 'tired': 'Lelah, istirahatlah 😫' };
                mStat.textContent = text[currentMood] || 'Bagaimana perasaanmu?';
            }
        }
    }

    initNavListeners();
    runPageInit();
});
