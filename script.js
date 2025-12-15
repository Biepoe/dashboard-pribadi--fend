// =========================================================
// SCRIPT.JS (FINAL: BUDGET FIX, BILLS FIX, & NOTIFICATIONS)
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Halaman dimuat, script.js berjalan.');

    const BACKEND_URL = 'https://dashboard-dpp-backend.onrender.com';
    let activeIntervals = []; 

    // --- STRUKTUR DATA CLOUD ---
    let personalData = {
        profile: { name: "Nama Kamu", role: "Pekerjaan", bio: "Bio..." },
        skills: [],
        goals: [],
        books: [],
        movies: [], 
        tracker: { water: { count: 0, date: "" }, mood: { status: "", date: "" } },
        bills: [] 
    };

    // =========================================================
    // 0. FITUR NOTIFIKASI (TOAST)
    // =========================================================
    function showNotification(message, type = 'success') {
        // Buat elemen notifikasi secara dinamis
        const div = document.createElement('div');
        div.style.position = 'fixed';
        div.style.bottom = '20px';
        div.style.right = '20px';
        div.style.padding = '12px 24px';
        div.style.borderRadius = '8px';
        div.style.color = 'white';
        div.style.fontWeight = '500';
        div.style.zIndex = '9999';
        div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.gap = '10px';
        div.style.fontSize = '14px';
        div.style.transition = 'all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55)';
        div.style.transform = 'translateY(100px)'; // Mulai dari bawah (tersembunyi)

        if (type === 'error') {
            div.style.backgroundColor = '#f44336'; // Merah
            div.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        } else {
            div.style.backgroundColor = '#4caf50'; // Hijau
            div.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        }

        document.body.appendChild(div);

        // Animasi Masuk
        requestAnimationFrame(() => {
            div.style.transform = 'translateY(0)';
        });

        // Hilangkan setelah 3 detik
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
        else if (bodyId === 'halaman-kesehatan') initKesehatan();
        else if (bodyId === 'halaman-personal') initPersonal();
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
    // 2. INIT HALAMAN
    // =========================================================

    function initBeranda() {
        setDate(); 
        setTime(); 
        activeIntervals.push(setInterval(setTime, 1000));
        fetchFinancialData(); 
        fetchHealthData();    
        fetchActivityData();  
    }
    
    function initKeuangan() { 
        fetchFinancialData(); 
        fetchBudgetData();    
        loadPersonalData().then(renderBills); 
    }
    
    function initKesehatan() {
        fetchHealthDataForHealthPage(); 
        initDiagnosticFeature(); 
        initMentalHealthChart(); 
        simulateActivityData();  
        loadPersonalData().then(renderTracker);
    }

    function initPersonal() {
        setDate();
        loadPersonalData();
        
        window.openModal = openModal;
        window.closeModal = closeModal;
        window.saveProfile = saveProfile;
        window.saveSkill = saveSkill;
        window.saveGoal = saveGoal;
        window.saveBook = saveBook;
        window.saveMovie = saveMovie; 
        window.deleteItem = deleteItem;
        
        window.openSkillModal = openSkillModal;
        window.addMaterialToList = addMaterialToList;
        window.toggleMaterialTemp = toggleMaterialTemp; 
        window.deleteMaterialTemp = deleteMaterialTemp; 
        
        window.toggleGoal = toggleGoal;
        window.toggleBook = toggleBook;
        window.toggleMovie = toggleMovie; 
        
        window.onclick = function(event) {
            if (event.target.classList.contains('modal-overlay')) {
                event.target.classList.remove('show');
            }
        }
    }

    // =========================================================
    // 3. FUNGSI DATA CLOUD (LOAD & SAVE)
    // =========================================================

    async function loadPersonalData() {
        try {
            const res = await fetch(`${BACKEND_URL}/api/personal`);
            if (!res.ok) throw new Error("Gagal ambil data");
            const cloudData = await res.json();
            
            if (cloudData && !Array.isArray(cloudData)) {
                personalData = { ...personalData, ...cloudData };
                if(!personalData.tracker) personalData.tracker = { water: {count:0}, mood: {} };
                if(!personalData.bills) personalData.bills = [];
                if(!personalData.movies) personalData.movies = [];
                if(!personalData.books) personalData.books = [];
                if(!personalData.skills) personalData.skills = [];
                if(!personalData.goals) personalData.goals = [];
            }
            if(document.getElementById('profile-name')) renderPersonalUI();
            if(document.getElementById('water-count')) renderTracker();
            if(document.getElementById('bill-list')) renderBills();

        } catch (error) {
            console.warn("Offline/Server Busy:", error);
            // Tetap render apa yang ada di memori (kosong/default) jika gagal load
            if(document.getElementById('profile-name')) renderPersonalUI();
            if(document.getElementById('bill-list')) renderBills();
        }
    }

    // FUNGSI SAVE DENGAN NOTIFIKASI
    async function saveData(silent = false) {
        // Render UI langsung (Optimistic UI)
        if(document.getElementById('profile-name')) renderPersonalUI();
        if(document.getElementById('water-count')) renderTracker();
        if(document.getElementById('bill-list')) renderBills();

        try {
            const res = await fetch(`${BACKEND_URL}/api/personal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(personalData)
            });
            
            if (!res.ok) throw new Error("Server Error");
            
            // Tampilkan notifikasi sukses jika bukan update silent (seperti water tracker yg sering diklik)
            if(!silent) showNotification("Data berhasil disimpan!", 'success');
            console.log("✅ Tersimpan ke Cloud");

        } catch (error) {
            console.error("Gagal simpan:", error);
            // TAMPILKAN NOTIFIKASI MERAH JIKA GAGAL
            showNotification("Gagal menyimpan ke server! Cek internet.", 'error');
        }
    }

    // =========================================================
    // 4. LOGIKA FITUR BILLS
    // =========================================================

    window.addBill = function() {
        const name = prompt("Nama Tagihan (misal: Netflix):");
        const date = prompt("Tanggal jatuh tempo (1-31):");
        if (name && date) {
            personalData.bills.push({ name, date: parseInt(date) });
            saveData(); // Akan memicu notifikasi sukses/gagal
        }
    }

    window.deleteBill = function(index) {
        if(confirm("Hapus tagihan ini?")) {
            personalData.bills.splice(index, 1);
            saveData();
        }
    }

    function renderBills() {
        const list = document.getElementById('bill-list');
        if (!list) return;
        
        const bills = personalData.bills || [];
        list.innerHTML = '';
        
        if (bills.length === 0) {
            list.innerHTML = '<li style="text-align:center; color:#999; font-size:12px; padding:10px;">Belum ada tagihan.</li>';
            return;
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
    // 5. KEUANGAN & BUDGET
    // =========================================================

    async function fetchFinancialData() {
        try {
            const res = await fetch(`${BACKEND_URL}/api/finances`);
            const data = await res.json();
            let pemasukan=0, pengeluaran=0, sBank=0, sEwallet=0, sCash=0;
            const now = new Date(); const m = now.getMonth(); const y = now.getFullYear();
            
            data.forEach(item => {
                const nom = parseFloat(String(findValue(item,['nominal','amount'])||'0').replace(/[^0-9]/g,''))||0;
                const jenis = String(findValue(item,['jenis','transaksi'])||'').toLowerCase().trim();
                const src = String(findValue(item,['sumber','bank'])||'').toLowerCase();
                const dst = String(findValue(item,['tujuan','ke'])||'').toLowerCase();
                const tgl = parseDate(findValue(item,['tanggal','date']));
                const isCur = (tgl && tgl.getMonth()===m && tgl.getFullYear()===y);
                
                if(jenis.includes('masuk')||jenis==='pemasukan'){
                    if(isCur) pemasukan+=nom;
                    if(src.includes('bank')||src.includes('bsi')) sBank+=nom; else if(src.includes('wallet')) sEwallet+=nom; else if(src.includes('cash')) sCash+=nom;
                } else if(jenis.includes('keluar')||jenis==='pengeluaran'){
                    if(isCur) pengeluaran+=nom;
                    if(src.includes('bank')||src.includes('bsi')) sBank-=nom; else if(src.includes('wallet')) sEwallet-=nom; else if(src.includes('cash')) sCash-=nom;
                } else if(jenis.includes('tf')||jenis.includes('transfer')){
                    if(src.includes('bank')) sBank-=nom; else if(src.includes('wallet')) sEwallet-=nom; else if(src.includes('cash')) sCash-=nom;
                    if(dst.includes('bank')) sBank+=nom; else if(dst.includes('wallet')) sEwallet+=nom; else if(dst.includes('cash')) sCash+=nom;
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
                const j=String(findValue(i,['jenis'])).toLowerCase();
                const t=parseDate(findValue(i,['tanggal']));
                if((j.includes('keluar')||j==='pengeluaran') && t && t.getMonth()===now.getMonth()){
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
                    // FIX: Perluas pencarian key untuk angka budget agar tidak NaN
                    const rawLimit = findValue(b,['alokasi', 'budget', 'limit', 'amount', 'nominal', 'target']);
                    const l = parseFloat(String(rawLimit || '0').replace(/[^0-9]/g,'')) || 0;
                    
                    const u = used[String(n).toLowerCase()]||0; 
                    const p = l > 0 ? (u/l)*100 : 0;
                    const col = p > 90 ? 'danger' : (p > 70 ? 'warning' : '');
                    
                    c.innerHTML+=`<div class="budget-item">
                        <div class="budget-item-header"><span>${n}</span><span>${formatRupiah(l-u)}</span></div>
                        <div class="progress-bar-container"><div class="progress-bar ${col}" style="width:${Math.min(p,100)}%"></div></div>
                    </div>`;
                });
            }
        }catch(e){console.error('Budget Error:', e)}
    }

    function updateTransactionTable(d){ const t=document.querySelector('#transaction-table tbody'); if(t){t.innerHTML=''; d.slice(-5).reverse().forEach(i=>{
        const nom = parseFloat(String(findValue(i,['nominal'])).replace(/[^0-9]/g,''));
        t.innerHTML+=`<tr><td>${findValue(i,['deskripsi'])}</td><td>${findValue(i,['jenis'])}</td><td>${formatRupiah(nom)}</td></tr>`;
    })}}

    function generateAIInsight(inc, exp, total) {
        const el = document.getElementById('ai-insight-text');
        if(!el) return;
        let msg = "";
        const ratio = exp / (inc || 1);
        
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
        const inc=Array(12).fill(0), exp=Array(12).fill(0); 
        const y=new Date().getFullYear(); 
        
        data.forEach(i=>{ 
            const t=parseDate(findValue(i,['tanggal'])); 
            const a=parseFloat(String(findValue(i,['nominal'])).replace(/[^0-9]/g,''))||0; 
            const j=String(findValue(i,['jenis'])).toLowerCase(); 
            const isMasuk = j.includes('masuk') || j.includes('income');
            const isKeluar = j.includes('keluar') || j.includes('pengeluaran') || j.includes('expense');
            if(t&&t.getFullYear()===y){ 
                if(isMasuk) inc[t.getMonth()]+=a; 
                else if(isKeluar) exp[t.getMonth()]+=a; 
            } 
        }); 
        
        if(window.myC) window.myC.destroy(); 
        window.myC=new Chart(ctx,{type:'line',data:{labels:['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'],datasets:[{label:'Masuk',data:inc,borderColor:'#4caf50',fill:true},{label:'Keluar',data:exp,borderColor:'#f44336',fill:true}]},options:{responsive:true,maintainAspectRatio:false}}); 
    }

    function setupDownloadFeature(data) {
        const sel = document.getElementById('month-selector'); const btn = document.getElementById('btn-download-csv');
        if(!sel || !btn) return;
        const unq = new Set();
        data.forEach(i=>{const t=parseDate(findValue(i,['tanggal']));if(t)unq.add(`${t.getFullYear()}-${padZero(t.getMonth()+1)}`)});
        const srt = Array.from(unq).sort().reverse();
        sel.innerHTML='<option value="">Pilih Bulan...</option>';
        srt.forEach(m=>{sel.innerHTML+=`<option value="${m}">${m}</option>`});
        const nBtn = btn.cloneNode(true); btn.parentNode.replaceChild(nBtn, btn);
        nBtn.innerHTML='<i class="fas fa-file-excel"></i> Unduh Excel'; nBtn.style.backgroundColor='#1D6F42';
        nBtn.addEventListener('click',()=>{if(!sel.value)return alert('Pilih bulan'); downloadExcel(data,sel.value)});
    }
    
    function downloadExcel(data, selM) {
        if(typeof XLSX==='undefined') return alert('XLSX Library Missing');
        const fil = data.filter(i=>{const t=parseDate(findValue(i,['tanggal'])); return t&&`${t.getFullYear()}-${padZero(t.getMonth()+1)}`===selM});
        if(!fil.length) return alert('Kosong');
        const ex = fil.map(i=>({
            "Tanggal": findValue(i,['tanggal']), "Ket": findValue(i,['deskripsi']), "Nominal": parseFloat(String(findValue(i,['nominal'])).replace(/[^0-9]/g,'')), "Jenis": findValue(i,['jenis'])
        }));
        const ws=XLSX.utils.json_to_sheet(ex); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Lap"); XLSX.writeFile(wb,`Lap_${selM}.xlsx`);
    }

    // =========================================================
    // 6. KESEHATAN (API + SIMULASI)
    // =========================================================
    
    async function fetchHealthData() {
        try {
            const res = await fetch(`${BACKEND_URL}/api/health`);
            const data = await res.json();
            if (!data.length) return;
            const last = data[data.length - 1];
            
            const cond = findValue(last, ['kondisi', 'tubuh', 'status']) || 'Sehat';
            const statusEl = document.getElementById('body-status');
            if (statusEl) statusEl.textContent = cond;
            
            const vec = document.getElementById('body-vector');
            if (vec) {
                if (cond.toLowerCase().includes('sakit') || cond.toLowerCase().includes('demam')) {
                    vec.classList.remove('body-normal'); vec.classList.add('body-sick');
                } else {
                    vec.classList.add('body-normal'); vec.classList.remove('body-sick');
                }
            }
            
            const sleepEl = document.getElementById('sleep-duration');
            const lastSleep = [...data].reverse().find(i => findValue(i, ['tidur']));
            if(sleepEl && lastSleep) {
                const t = findValue(lastSleep, ['tidur']);
                const b = findValue(lastSleep, ['bangun']);
                if(t && b) {
                    const dur = (parseInt(b.split(':')[0]) - parseInt(t.split(':')[0]) + 24) % 24;
                    sleepEl.textContent = `${dur} Jam`;
                }
            }
            if(document.getElementById('last-medicine')) {
                const lastMed = [...data].reverse().find(i => findValue(i, ['obat', 'medicine']));
                document.getElementById('last-medicine').textContent = lastMed ? findValue(lastMed, ['obat', 'medicine']) : '-';
            }
        } catch (e) { console.error('Health fetch err:', e); }
    }

    async function fetchHealthDataForHealthPage() {
        try {
            const res = await fetch(`${BACKEND_URL}/api/health`);
            const data = await res.json();
            if (!data.length) return;
            const last = data[data.length - 1];
            const mental = findValue(last, ['mental', 'jiwa']);
            if (mental && document.getElementById('mental-score')) document.getElementById('mental-score').textContent = mental;
        } catch (e) { console.error(e); }
    }

    async function fetchActivityData() {
        try {
            const res = await fetch(`${BACKEND_URL}/api/activities`);
            const data = await res.json();
            const list = document.getElementById('activity-log-list');
            if (list) {
                list.innerHTML = '';
                const recent = data.slice(-5).reverse();
                if(recent.length === 0) {
                    list.innerHTML = '<li class="placeholder">Belum ada aktivitas.</li>';
                    return;
                }
                recent.forEach(i => {
                    const t = findValue(i, ['kapan', 'date', 'waktu', 'tanggal']) || '';
                    const k = findValue(i, ['ngapain', 'kegiatan', 'activity', 'nama']) || '-';
                    let dateDisplay = t;
                    const dObj = new Date(t);
                    if(!isNaN(dObj.getTime())) {
                        dateDisplay = dObj.toLocaleDateString('id-ID') + ' ' + dObj.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
                    }
                    list.innerHTML += `<li class="activity-log-item"><div class="activity-log-time" style="font-size:11px;">${dateDisplay}</div><div class="activity-log-details"><span class="title" style="font-size:14px;">${k}</span></div></li>`;
                });
            }
        } catch (e) { console.error(e); }
    }

    let diagInterval = null;
    function initDiagnosticFeature(){
        const btn=document.getElementById('btn-diagnostic'); const mod=document.getElementById('diagnostic-modal'); const cl=document.querySelector('.close-btn');
        if(btn&&mod) btn.addEventListener('click',()=>{mod.classList.add('show'); sSim()});
        if(cl) cl.addEventListener('click',()=>{mod.classList.remove('show'); stSim()});
    }
    
    function sSim(){
        upVal(); 
        diagInterval=setInterval(upVal,1500);
        activeIntervals.push(diagInterval); 
    }
    function stSim(){if(diagInterval)clearInterval(diagInterval)}
    
    function upVal(){
        if(document.getElementById('live-heart-rate')) document.getElementById('live-heart-rate').textContent=Math.floor(Math.random()*(95-65+1))+65;
        if(document.getElementById('live-spo2')) document.getElementById('live-spo2').textContent=Math.floor(Math.random()*(99-96+1))+96;
        if(document.getElementById('live-temp')) document.getElementById('live-temp').textContent=(Math.random()*(36.8-36.3)+36.3).toFixed(1);
    }
    
    function initMentalHealthChart(){
        const ctx=document.getElementById('mentalHealthChart'); if(!ctx)return;
        if(window.mChart) window.mChart.destroy();
        window.mChart=new Chart(ctx,{type:'doughnut',data:{labels:['Skor','Sisa'],datasets:[{data:[78,22],backgroundColor:['#4caf50','#e0e0e0'],borderWidth:0,circumference:180,rotation:270}]},options:{responsive:true,cutout:'85%',plugins:{legend:{display:false}}}});
    }
    
    function simulateActivityData(){
        const el=document.getElementById('dummy-steps'); 
        if(el){
            let s=8200; 
            const int = setInterval(()=>{s+=Math.floor(Math.random()*5); el.textContent=s.toLocaleString()},3000);
            activeIntervals.push(int);
        }
    }

    // =========================================================
    // 7. RENDER PERSONAL UI
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
                const total = s.materials ? s.materials.length : 0;
                const done = s.materials ? s.materials.filter(m => m.done).length : 0;
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
                    const text = typeof g === 'object' ? g.text : g;
                    const isDone = typeof g === 'object' ? g.done : false;
                    const checkClass = isDone ? 'checked' : '';
                    const textClass = isDone ? 'done' : '';
                    list.innerHTML += `
                        <li class="goal-item" onclick="toggleGoal(${i})">
                            <div class="goal-check ${checkClass}"><i class="fas fa-check" style="font-size: 10px; color:${isDone?'#fff':'#ccc'};"></i></div>
                            <span class="goal-text ${textClass}">${text}</span>
                            <i class="fas fa-trash delete-item" onclick="event.stopPropagation(); deleteItem('goals', ${i})"></i>
                        </li>`;
                });
            }
        }

        const bookContainer = document.getElementById('book-container');
        if (bookContainer) {
            bookContainer.innerHTML = personalData.books.length ? '' : '<div class="empty-state" style="width:100%;">Belum ada buku.</div>';
            personalData.books.forEach((b, i) => {
                const title = typeof b === 'object' ? b.title : b;
                const isDone = typeof b === 'object' ? b.done : false;
                const img = typeof b === 'object' ? b.img : null;
                const readClass = isDone ? 'read' : '';
                
                let coverStyle = img ? `background-image: url('${img}'); background-size: cover; color: transparent;` : 'background-color: #eee;';
                let coverContent = img ? '' : title.charAt(0);

                bookContainer.innerHTML += `
                    <div class="book-item" onclick="toggleBook(${i})">
                        <div class="book-cover ${readClass}" style="${coverStyle}">${coverContent}</div>
                        <span class="book-title ${readClass}">${title}</span>
                        <div class="book-delete" onclick="event.stopPropagation(); deleteItem('books', ${i})">×</div>
                    </div>`;
            });
        }

        const movieContainer = document.getElementById('movie-container');
        if (movieContainer) {
            const movies = personalData.movies || [];
            movieContainer.innerHTML = movies.length ? '' : '<div class="empty-state" style="width:100%;">Belum ada film.</div>';
            movies.forEach((m, i) => {
                const title = typeof m === 'object' ? m.title : m;
                const isDone = typeof m === 'object' ? m.done : false;
                const img = typeof m === 'object' ? m.img : null;
                const readClass = isDone ? 'read' : ''; 
                let coverStyle = img ? `background-image: url('${img}'); background-size: cover; color: transparent;` : 'background-color: #eee;';
                let coverContent = img ? '' : title.charAt(0);

                movieContainer.innerHTML += `
                    <div class="book-item" onclick="toggleMovie(${i})">
                        <div class="book-cover ${readClass}" style="${coverStyle}">${coverContent}</div>
                        <span class="book-title ${readClass}">${title}</span>
                        <div class="book-delete" onclick="event.stopPropagation(); deleteItem('movies', ${i})">×</div>
                    </div>`;
            });
        }
    }

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
        const modal = document.getElementById('modal-skill');
        const title = document.getElementById('skill-modal-title');
        const nameInput = document.getElementById('input-skill-name');
        const indexInput = document.getElementById('edit-skill-index');
        modal.classList.add('show');
        indexInput.value = index;
        if (index === -1) { 
            title.textContent = "Tambah Skill"; nameInput.value = ""; tempMaterials = []; 
        } else { 
            title.textContent = "Edit Skill"; 
            const s = personalData.skills[index]; 
            nameInput.value = s.name; 
            tempMaterials = s.materials ? JSON.parse(JSON.stringify(s.materials)) : []; 
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

    function getImgUrl(url) {
        if (!url) return '';
        if (url.includes('drive.google.com') && url.includes('/d/')) {
            const id = url.split('/d/')[1].split('/')[0];
            return `http://googleusercontent.com/profile/picture/${id}`; 
        }
        return url;
    }

    function saveGoal() { const t=document.getElementById('input-goal-text').value; if(t){ personalData.goals.push({text:t, done:false}); saveData(); closeModal('modal-goal'); } }
    function toggleGoal(i) { const g=personalData.goals[i]; if(typeof g==='string') personalData.goals[i]={text:g, done:true}; else g.done=!g.done; saveData(); }
    
    function saveBook() { const t=document.getElementById('input-book-title').value; if(t){ personalData.books.push({title:t, done:false, img:getImgUrl(document.getElementById('input-book-img').value)}); saveData(); closeModal('modal-book'); } }
    function toggleBook(i) { const b=personalData.books[i]; if(typeof b==='string') personalData.books[i]={title:b, done:true, img:null}; else b.done=!b.done; saveData(); }
    
    function saveMovie() { const t=document.getElementById('input-movie-title').value; if(t){ personalData.movies.push({title:t, done:false, img:getImgUrl(document.getElementById('input-movie-img').value)}); saveData(); closeModal('modal-movie'); } }
    function toggleMovie(i) { const b=personalData.movies[i]; if(typeof b==='string') personalData.movies[i]={title:b, done:true, img:null}; else b.done=!b.done; saveData(); }

    function saveProfile() {
        personalData.profile.name = document.getElementById('input-name').value;
        personalData.profile.role = document.getElementById('input-role').value;
        personalData.profile.bio = document.getElementById('input-bio').value;
        saveData(); closeModal('modal-profile');
    }
    function deleteItem(type, index) { if(confirm("Hapus?")) { personalData[type].splice(index, 1); saveData(); } }

    // --- HELPER UTILS ---
    function padZero(n){return n<10?'0'+n:n}
    function setDate(){const e=document.getElementById('current-date');if(e)e.innerHTML=`<i class="fas fa-calendar"></i> ${new Date().toLocaleDateString('id-ID',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}`}
    function setTime(){const e=document.getElementById('current-time');if(e)e.innerHTML=`<i class="fas fa-clock"></i> ${new Date().toLocaleTimeString('id-ID')}`}
    const formatRupiah=(n)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(n);
    function parseDate(s){if(!s)return null;if(s.includes('/')){const p=s.split('/');return new Date(p[2],p[1]-1,p[0])}return new Date(s)}
    
    function findValue(o,k){
        const ks=Object.keys(o);
        for(let key of ks){
            const ck=key.toLowerCase().replace(/[^a-z0-9]/g,'');
            for(let kw of k){
                if(ck.includes(kw.toLowerCase().replace(/[^a-z0-9]/g,''))) return o[key];
            }
        }
        return undefined;
    }

    // --- Water & Mood ---
    window.updateWater = function(change) {
        const today = new Date().toDateString();
        if (personalData.tracker.water.date !== today) { personalData.tracker.water = { count: 0, date: today }; }
        let count = personalData.tracker.water.count + change;
        if (count < 0) count = 0; if (count > 8) count = 8;
        personalData.tracker.water.count = count; personalData.tracker.water.date = today;
        saveData(true); // Silent update (no notification)
    }
    window.setMood = function(mood) {
        const today = new Date().toDateString();
        personalData.tracker.mood = { status: mood, date: today };
        saveData(true); // Silent update
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
