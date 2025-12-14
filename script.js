// =========================================================
// SCRIPT.JS (FULL CLOUD FEATURES: TRACKER, BILLS, AI, MOVIES)
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Halaman dimuat, script.js berjalan.');

    const BACKEND_URL = 'https://dashboard-dpp-backend.onrender.com';

    // --- STRUKTUR DATA CLOUD (DIPERLUAS) ---
    let personalData = {
        profile: { name: "Nama Kamu", role: "Pekerjaan", bio: "Bio..." },
        skills: [],
        goals: [],
        books: [],
        movies: [], // [BARU] Tempat simpan data film
        tracker: { water: { count: 0, date: "" }, mood: { status: "", date: "" } },
        bills: [] 
    };

    // =========================================================
    // 1. SISTEM NAVIGASI (SPA)
    // =========================================================
    
    function runPageInit() {
        const bodyId = document.body.id;
        if (bodyId === 'halaman-beranda') initBeranda();
        else if (bodyId === 'halaman-keuangan') initKeuangan();
        else if (bodyId === 'halaman-kesehatan') initKesehatan();
        else if (bodyId === 'halaman-personal') initPersonal();
    }

    async function loadPage(url) {
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
            } else window.location.href = url;
        } catch(e) { cw.style.opacity='1'; }
        cw.style.opacity='1';
    }

    function initNavListeners() {
        document.body.addEventListener('click', (e) => {
            const link = e.target.closest('.bottom-nav a');
            if(!link) return;
            e.preventDefault();
            loadPage(link.href);
            document.querySelectorAll('.bottom-nav a').forEach(l=>l.classList.remove('active'));
            link.classList.add('active');
        });
    }

    // =========================================================
    // 2. INIT HALAMAN
    // =========================================================

    function initBeranda() {
        setDate(); setTime(); setInterval(setTime, 1000);
        fetchFinancialData(); fetchHealthData(); fetchActivityData();
    }
    
    function initKeuangan() { 
        fetchFinancialData(); 
        fetchBudgetData(); 
        loadPersonalData().then(renderBills); 
    }
    
    function initKesehatan() {
        fetchHealthDataForHealthPage();
        initDiagnosticFeature(); initMentalHealthChart(); simulateActivityData();  
        loadPersonalData().then(renderTracker);
    }

    function initPersonal() {
        setDate();
        loadPersonalData(); // Render UI otomatis dipanggil di dalam loadPersonalData
        
        // Expose fungsi ke window
        window.openModal = openModal;
        window.closeModal = closeModal;
        window.saveProfile = saveProfile;
        window.saveSkill = saveSkill;
        window.saveGoal = saveGoal;
        window.saveBook = saveBook;
        window.saveMovie = saveMovie; // [BARU]
        window.deleteItem = deleteItem;
        
        window.openSkillModal = openSkillModal;
        window.addMaterialToList = addMaterialToList;
        window.toggleMaterialTemp = toggleMaterialTemp;
        window.deleteMaterialTemp = deleteMaterialTemp;
        
        window.toggleGoal = toggleGoal;
        window.toggleBook = toggleBook;
        window.toggleMovie = toggleMovie; // [BARU]
        
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
                if(!personalData.movies) personalData.movies = []; // [BARU] Safety check
            }
            
            if(document.getElementById('profile-name')) renderPersonalUI();
            if(document.getElementById('water-count')) renderTracker();
            if(document.getElementById('bill-list')) renderBills();

        } catch (error) {
            console.warn("Sedang offline atau server sibuk. Menggunakan data default.", error);
            if(document.getElementById('profile-name')) renderPersonalUI();
            if(document.getElementById('water-count')) renderTracker();
            if(document.getElementById('bill-list')) renderBills();
        }
    }

    async function saveData() {
        if(document.getElementById('profile-name')) renderPersonalUI();
        if(document.getElementById('water-count')) renderTracker();
        if(document.getElementById('bill-list')) renderBills();

        try {
            await fetch(`${BACKEND_URL}/api/personal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(personalData)
            });
            console.log("✅ Tersimpan ke Cloud");
        } catch (error) {
            alert("Gagal menyimpan ke server. Cek koneksi!");
        }
    }

    // =========================================================
    // 4. LOGIKA FITUR LAIN (WATER, BILLS)
    // =========================================================

    // --- Water & Mood ---
    window.updateWater = function(change) {
        const today = new Date().toDateString();
        if (personalData.tracker.water.date !== today) { personalData.tracker.water = { count: 0, date: today }; }
        let count = personalData.tracker.water.count + change;
        if (count < 0) count = 0; if (count > 8) count = 8;
        personalData.tracker.water.count = count;
        personalData.tracker.water.date = today;
        saveData();
    }

    window.setMood = function(mood) {
        const today = new Date().toDateString();
        personalData.tracker.mood = { status: mood, date: today };
        saveData();
    }

    function renderTracker() {
        const wEl = document.getElementById('water-count');
        const wBar = document.getElementById('water-bar');
        const mBtns = document.querySelectorAll('.btn-mood');
        const mStat = document.getElementById('mood-status');

        if (wEl && personalData.tracker && personalData.tracker.water) {
            const today = new Date().toDateString();
            let count = personalData.tracker.water.date === today ? personalData.tracker.water.count : 0;
            wEl.textContent = count;
            wBar.style.width = `${(count / 8) * 100}%`;
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

    // --- Bill Calendar ---
    window.addBill = function() {
        const name = prompt("Nama Tagihan (misal: Netflix):");
        const date = prompt("Tanggal jatuh tempo (1-31):");
        if (name && date) { personalData.bills.push({ name, date: parseInt(date) }); saveData(); }
    }
    window.deleteBill = function(index) { if(confirm("Hapus tagihan ini?")) { personalData.bills.splice(index, 1); saveData(); } }

    function renderBills() {
        const list = document.getElementById('bill-list');
        if (!list) return;
        const bills = personalData.bills || [];
        list.innerHTML = '';
        if (bills.length === 0) { list.innerHTML = '<li style="text-align:center; color:#999; font-size:12px; padding:10px;">Belum ada tagihan.</li>'; return; }
        bills.sort((a, b) => a.date - b.date);
        const today = new Date().getDate();
        bills.forEach((b, i) => {
            const diff = b.date - today;
            let status = diff < 0 ? 'Telat!' : (diff === 0 ? 'Hari ini!' : `${diff} hari lagi`);
            let color = diff < 0 ? 'red' : (diff <= 3 ? '#ff9800' : '#4caf50');
            list.innerHTML += `<li class="bill-item"><span class="bill-date">Tgl ${b.date}</span><span class="bill-name">${b.name}</span><span style="color:${color}; font-weight:600; font-size:11px; margin-right:10px;">${status}</span><i class="fas fa-trash" style="cursor:pointer; color:#ccc; font-size:12px;" onclick="deleteBill(${i})"></i></li>`;
        });
    }

    // =========================================================
    // 5. RENDER PERSONAL UI (PROFILE, SKILL, GOAL, BOOK, MOVIE)
    // =========================================================
    function renderPersonalUI() {
        if(document.getElementById('profile-name')) {
            document.getElementById('profile-name').textContent = personalData.profile.name;
            document.getElementById('profile-role').textContent = personalData.profile.role;
            document.getElementById('profile-bio').textContent = personalData.profile.bio;
        }

        // Skills
        const skillContainer = document.getElementById('skill-container');
        if (skillContainer) {
            skillContainer.innerHTML = personalData.skills.length ? '' : '<div class="empty-state">Belum ada skill. Klik Tambah.</div>';
            personalData.skills.forEach((s, i) => {
                const materials = s.materials || [];
                const total = materials.length;
                const done = materials.filter(m => m.done).length;
                let progress = total > 0 ? Math.round((done / total) * 100) : (s.progress || 0);
                skillContainer.innerHTML += `<div class="skill-item" onclick="openSkillModal(${i})"><div class="skill-head"><span>${s.name} <small style="color:#999;">(${done}/${total})</small></span><span>${progress}% <i class="fas fa-edit" style="color:#667eea; margin-left:5px;"></i></span></div><div class="progress-bar-container"><div class="progress-bar" style="width: ${progress}%;"></div></div></div>`;
            });
        }

        // Goals
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
                    list.innerHTML += `<li class="goal-item" onclick="toggleGoal(${i})"><div class="goal-check ${checkClass}"><i class="fas fa-check" style="font-size: 10px; color:${isDone?'#fff':'#ccc'};"></i></div><span class="goal-text ${textClass}">${text}</span><i class="fas fa-trash delete-item" onclick="event.stopPropagation(); deleteItem('goals', ${i})"></i></li>`;
                });
            }
        }

        // Books
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
                bookContainer.innerHTML += `<div class="book-item" onclick="toggleBook(${i})"><div class="book-cover ${readClass}" style="${coverStyle}">${coverContent}</div><span class="book-title ${readClass}">${title}</span><div class="book-delete" onclick="event.stopPropagation(); deleteItem('books', ${i})">×</div></div>`;
            });
        }

        // [BARU] Movies
        const movieContainer = document.getElementById('movie-container');
        if (movieContainer) {
            const movies = personalData.movies || [];
            movieContainer.innerHTML = movies.length ? '' : '<div class="empty-state" style="width:100%;">Belum ada film.</div>';
            movies.forEach((m, i) => {
                const title = typeof m === 'object' ? m.title : m;
                const isDone = typeof m === 'object' ? m.done : false;
                const img = typeof m === 'object' ? m.img : null;
                const readClass = isDone ? 'read' : ''; // Kita pakai class 'read' juga biar sama
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

    // --- MODAL & DATA HELPER ---
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
        if (index === -1) { title.textContent = "Tambah Skill"; nameInput.value = ""; tempMaterials = []; } 
        else { title.textContent = "Edit Skill"; const s = personalData.skills[index]; nameInput.value = s.name; tempMaterials = s.materials ? JSON.parse(JSON.stringify(s.materials)) : []; }
        renderMaterialList();
    }

    function addMaterialToList() { const t=document.getElementById('input-material-text').value.trim(); if(t) { tempMaterials.push({text:t, done:false}); document.getElementById('input-material-text').value=''; renderMaterialList(); } }
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

    function saveGoal() { const t=document.getElementById('input-goal-text').value; if(t){ personalData.goals.push({text:t, done:false}); saveData(); closeModal('modal-goal'); } }
    function toggleGoal(i) { const g=personalData.goals[i]; if(typeof g==='string') personalData.goals[i]={text:g, done:true}; else g.done=!g.done; saveData(); }
    
    function getImgUrl(url) { if(url && url.includes('drive.google.com')) return `https://lh3.googleusercontent.com/d/${url.split('/d/')[1].split('/')[0]}`; return url; }
    
    function saveBook() { const t=document.getElementById('input-book-title').value; if(t){ personalData.books.push({title:t, done:false, img:getImgUrl(document.getElementById('input-book-img').value)}); saveData(); closeModal('modal-book'); } }
    function toggleBook(i) { const b=personalData.books[i]; if(typeof b==='string') personalData.books[i]={title:b, done:true, img:null}; else b.done=!b.done; saveData(); }

    // [BARU] FUNGSI MOVIE
    function saveMovie() { 
        const t=document.getElementById('input-movie-title').value; 
        if(t){ 
            personalData.movies.push({title:t, done:false, img:getImgUrl(document.getElementById('input-movie-img').value)}); 
            saveData(); 
            closeModal('modal-movie'); 
            document.getElementById('input-movie-title').value = '';
            document.getElementById('input-movie-img').value = '';
        } 
    }
    function toggleMovie(i) { 
        const m=personalData.movies[i]; 
        if(typeof m==='string') personalData.movies[i]={title:m, done:true, img:null}; 
        else m.done=!m.done; 
        saveData(); 
    }
    
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
    function findValue(o,k){const ks=Object.keys(o);for(let key of ks){const ck=key.toLowerCase().replace(/[^a-z0-9]/g,'');for(let kw of k){if(ck.includes(kw.toLowerCase().replace(/[^a-z0-9]/g,'')))return o[key]}}return undefined}

    // =========================================================
    // 5. FETCH DATA UTAMA
    // =========================================================

    async function fetchFinancialData() {
        try {
            const res = await fetch(`${BACKEND_URL}/api/finances`);
            const data = await res.json();
            let pemasukan=0, pengeluaran=0, sBank=0, sEwallet=0, sCash=0;
            const now = new Date(); const m = now.getMonth(); const y = now.getFullYear();
            
            data.forEach(item => {
                const nom = parseFloat(String(findValue(item,['nominal','amount','jumlah'])||'0').replace(/[^0-9]/g,''))||0;
                const jenis = String(findValue(item,['jenis','tipe'])||'').toLowerCase();
                const src = String(findValue(item,['sumber','bank'])||'').toLowerCase();
                const dst = String(findValue(item,['tujuan','ke'])||'').toLowerCase();
                const tgl = parseDate(findValue(item,['tanggal','date']));
                
                if(tgl && tgl.getMonth()===m && tgl.getFullYear()===y) {
                    if(jenis.includes('masuk')) pemasukan+=nom;
                    if(jenis.includes('keluar')) pengeluaran+=nom;
                }
                if(jenis.includes('masuk')) { if(src.includes('bank')) sBank+=nom; else if(src.includes('wallet')) sEwallet+=nom; else sCash+=nom; }
                else if(jenis.includes('keluar')) { if(src.includes('bank')) sBank-=nom; else if(src.includes('wallet')) sEwallet-=nom; else sCash-=nom; }
            });

            const setText = (id,v) => {const el=document.getElementById(id);if(el)el.textContent=formatRupiah(v)};
            setText('pemasukan-value', pemasukan); setText('pengeluaran-value', pengeluaran);
            setText('pemasukan-bulan-ini', pemasukan); setText('pengeluaran-bulan-ini', pengeluaran);
            setText('saldo-bank', sBank); setText('saldo-ewallet', sEwallet); setText('saldo-cash', sCash);
            setText('sisa-saldo-value', sBank+sEwallet+sCash);
            generateAIInsight(pemasukan, pengeluaran, sBank+sEwallet+sCash);
            updateTransactionTable(data);
            if(document.getElementById('monthlyEarningsChart')) createMonthlyChart(data);
            if(document.getElementById('month-selector')) setupDownloadFeature(data);
        } catch(e) { console.error(e); }
    }

    function generateAIInsight(inc, exp, total) {
        const el = document.getElementById('ai-insight-text'); if(!el) return;
        let msg = ""; const ratio = exp / (inc || 1);
        if (inc===0 && exp===0) msg = "Data bulan ini masih kosong.";
        else if (ratio > 1) msg = "⚠️ <strong>Boros!</strong> Pengeluaran > Pemasukan.";
        else if (ratio > 0.8) msg = "🚧 <strong>Hati-hati!</strong> Habis >80%.";
        else msg = "✅ <strong>Sehat!</strong> Keuangan stabil.";
        if (total < 100000 && total > 0) msg += " <br>📉 Saldo menipis!";
        el.innerHTML = msg;
    }

    function updateTransactionTable(d){ const t=document.querySelector('#transaction-table tbody'); if(t){ t.innerHTML=''; d.slice(-5).reverse().forEach(i=>{ t.innerHTML+=`<tr><td>${findValue(i,['deskripsi','note'])}</td><td>${findValue(i,['jenis'])}</td><td>${formatRupiah(parseFloat(String(findValue(i,['nominal'])).replace(/[^0-9]/g,'')))}</td></tr>`; })}}
    function createMonthlyChart(data) { if(!document.getElementById('monthlyEarningsChart')) return; const ctx=document.getElementById('monthlyEarningsChart'); const inc=Array(12).fill(0), exp=Array(12).fill(0); const y=new Date().getFullYear(); data.forEach(i=>{ const t=parseDate(findValue(i,['tanggal'])); const a=parseFloat(String(findValue(i,['nominal'])).replace(/[^0-9]/g,''))||0; const j=String(findValue(i,['jenis'])).toLowerCase(); if(t&&t.getFullYear()===y){ if(j.includes('masuk')) inc[t.getMonth()]+=a; else if(j.includes('keluar')) exp[t.getMonth()]+=a; } }); if(window.myC) window.myC.destroy(); window.myC=new Chart(ctx,{type:'line',data:{labels:['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'],datasets:[{label:'Masuk',data:inc,borderColor:'#4caf50',fill:true},{label:'Keluar',data:exp,borderColor:'#f44336',fill:true}]},options:{responsive:true,maintainAspectRatio:false}}); }
    function setupDownloadFeature(d) { }

    async function fetchHealthData() { try { const res=await fetch(`${BACKEND_URL}/api/health`); const data=await res.json(); if(data.length){ const l=data[data.length-1]; if(document.getElementById('body-status')) document.getElementById('body-status').textContent=findValue(l,['kondisi'])||'-'; } } catch(e){} }
    async function fetchHealthDataForHealthPage() { }
    async function fetchActivityData() { try{const res=await fetch(`${BACKEND_URL}/api/activities`);const d=await res.json();const l=document.getElementById('activity-log-list');if(l){l.innerHTML='';d.slice(-5).reverse().forEach(i=>{l.innerHTML+=`<li class="activity-log-item"><div class="activity-log-time">${findValue(i,['date'])}</div><div class="activity-log-details">${findValue(i,['activity'])}</div></li>`})}}catch(e){} }
    async function fetchBudgetData() { }
    
    function initDiagnosticFeature(){ const b=document.getElementById('btn-diagnostic'); const m=document.getElementById('diagnostic-modal'); if(b&&m){ b.onclick=()=>{m.classList.add('show')}; document.querySelector('.close-btn').onclick=()=>{m.classList.remove('show')}; }}
    function initMentalHealthChart(){ if(document.getElementById('mentalHealthChart')) new Chart(document.getElementById('mentalHealthChart'),{type:'doughnut',data:{labels:['Skor','Sisa'],datasets:[{data:[78,22],backgroundColor:['#4caf50','#eee']}]},options:{cutout:'85%',plugins:{legend:{display:false}}}}); }
    function simulateActivityData(){ const el=document.getElementById('dummy-steps'); if(el) setInterval(()=>{el.textContent=(parseInt(el.textContent.replace('.',''))+Math.floor(Math.random()*5)).toLocaleString()},3000); }

    initNavListeners();
    runPageInit();
});
