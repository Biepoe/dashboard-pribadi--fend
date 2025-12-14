// =========================================================
// SCRIPT.JS (FINAL: PERSONAL MANAGER CLOUD + FIX CHART/BUDGET)
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Halaman dimuat, script.js berjalan.');

    const BACKEND_URL = 'https://dashboard-dpp-backend.onrender.com';
    // const STORAGE_KEY = 'dashboard_personal_data'; // HAPUS INI KARENA KITA PAKAI CLOUD

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
    // 2. INISIALISASI HALAMAN
    // =========================================================

    function initBeranda() {
        setDate(); setTime(); setInterval(setTime, 1000);
        fetchFinancialData(); fetchHealthData(); fetchActivityData();
    }
    function initKeuangan() { fetchFinancialData(); fetchBudgetData(); }
    function initKesehatan() {
        fetchHealthDataForHealthPage();
        initDiagnosticFeature(); initMentalHealthChart(); simulateActivityData();  
    }

    function initPersonal() {
        setDate();
        loadPersonalData(); // Sekarang mengambil dari Cloud
        
        // EXPOSE FUNGSI KE WINDOW
        window.openModal = openModal;
        window.closeModal = closeModal;
        window.saveProfile = saveProfile;
        window.saveSkill = saveSkill;
        window.saveGoal = saveGoal;
        window.saveBook = saveBook;
        window.deleteItem = deleteItem;
        
        window.openSkillModal = openSkillModal;
        window.addMaterialToList = addMaterialToList;
        window.toggleMaterialTemp = toggleMaterialTemp;
        window.deleteMaterialTemp = deleteMaterialTemp;
        
        window.toggleGoal = toggleGoal;
        window.toggleBook = toggleBook;
        
        window.onclick = function(event) {
            if (event.target.classList.contains('modal-overlay')) {
                event.target.classList.remove('show');
            }
        }
    }

    // =========================================================
    // 3. PERSONAL MANAGER (VERSI CLOUD / API)
    // =========================================================
    
    // Struktur Data Awal
    let personalData = {
        profile: { name: "Nama Kamu", role: "Pekerjaan", bio: "Bio singkat..." },
        skills: [], goals: [], books: []
    };

    // --- FUNGSI LOAD DARI SERVER ---
    async function loadPersonalData() {
        // Tampilkan loading state jika perlu
        try {
            const res = await fetch(`${BACKEND_URL}/api/personal`);
            if (!res.ok) throw new Error("Gagal ambil data");
            
            const cloudData = await res.json();
            
            // Jika ada data di cloud, pakai itu. Jika tidak, pakai default.
            // Asumsi cloudData mengembalikan object { profile:..., skills:..., ... }
            if (cloudData && !Array.isArray(cloudData)) { 
                personalData = cloudData;
            } else if (Array.isArray(cloudData) && cloudData.length > 0) {
                // Jika backend mengembalikan array, ambil item terakhir (terbaru)
                personalData = cloudData[cloudData.length - 1];
            }
            
            renderPersonalUI();
        } catch (error) {
            console.error("Gagal load personal data:", error);
            // Fallback: Jika gagal load, tetap render data default/kosong agar UI tidak rusak
            renderPersonalUI();
        }
    }

    // --- FUNGSI SAVE KE SERVER ---
    async function saveData() {
        // 1. Update Tampilan Dulu (Optimistic UI) agar terasa cepat
        renderPersonalUI();

        // 2. Kirim ke Backend
        try {
            // Kita kirim seluruh object personalData sebagai satu entry baru/update
            const res = await fetch(`${BACKEND_URL}/api/personal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(personalData)
            });
            
            if (!res.ok) throw new Error("Gagal simpan ke server");
            console.log("✅ Data Personal tersimpan di Cloud!");
            
        } catch (error) {
            console.error("Gagal save data:", error);
            alert("Gagal menyimpan perubahan ke server. Cek koneksi internet!");
        }
    }

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
                const materials = s.materials || [];
                const total = materials.length;
                const done = materials.filter(m => m.done).length;
                let progress = 0;
                if (total > 0) {
                    progress = Math.round((done / total) * 100);
                } else if (s.progress !== undefined) {
                    progress = s.progress;
                }

                skillContainer.innerHTML += `
                    <div class="skill-item" onclick="openSkillModal(${i})">
                        <div class="skill-head">
                            <span>${s.name} <small style="color:#999; font-weight:400;">(${done}/${total})</small></span>
                            <span>${progress}% <i class="fas fa-edit" style="font-size:10px; color:#667eea; margin-left:5px;"></i></span>
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
                let coverStyle = 'background-color: #eee;';
                let coverContent = title.charAt(0);
                if (img) {
                    coverStyle = `background-image: url('${img}'); background-size: cover; background-position: center; color: transparent;`;
                    coverContent = '';
                }
                bookContainer.innerHTML += `
                    <div class="book-item" onclick="toggleBook(${i})">
                        <div class="book-cover ${readClass}" style="${coverStyle}">${coverContent}</div>
                        <span class="book-title ${readClass}">${title}</span>
                        <div class="book-delete" onclick="event.stopPropagation(); deleteItem('books', ${i})">×</div>
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
    function closeModal(id) {
        const modal = document.getElementById(id);
        if(modal) modal.classList.remove('show');
    }

    function openSkillModal(index = -1) {
        const modal = document.getElementById('modal-skill');
        const title = document.getElementById('skill-modal-title');
        const nameInput = document.getElementById('input-skill-name');
        const indexInput = document.getElementById('edit-skill-index');

        modal.classList.add('show');
        indexInput.value = index;

        if (index === -1) {
            title.textContent = "Tambah Skill Baru";
            nameInput.value = "";
            tempMaterials = []; 
        } else {
            title.textContent = "Edit Skill & Materi";
            const skill = personalData.skills[index];
            nameInput.value = skill.name;
            tempMaterials = skill.materials ? JSON.parse(JSON.stringify(skill.materials)) : [];
        }
        renderMaterialList();
    }

    function addMaterialToList() {
        const input = document.getElementById('input-material-text');
        const text = input.value.trim();
        if (text) {
            tempMaterials.push({ text: text, done: false });
            input.value = "";
            renderMaterialList();
        }
    }

    function toggleMaterialTemp(index) {
        tempMaterials[index].done = !tempMaterials[index].done;
        renderMaterialList();
    }

    function deleteMaterialTemp(index) {
        tempMaterials.splice(index, 1);
        renderMaterialList();
    }

    function renderMaterialList() {
        const list = document.getElementById('material-list-container');
        list.innerHTML = "";
        tempMaterials.forEach((m, i) => {
            const check = m.done ? 'checked' : '';
            const style = m.done ? 'text-decoration:line-through; color:#aaa;' : '';
            list.innerHTML += `
                <li class="material-item">
                    <div style="display:flex; align-items:center; cursor:pointer;" onclick="toggleMaterialTemp(${i})">
                        <input type="checkbox" class="material-check" ${check} style="pointer-events:none;">
                        <span style="${style}">${m.text}</span>
                    </div>
                    <i class="fas fa-times material-del" onclick="deleteMaterialTemp(${i})"></i>
                </li>
            `;
        });
    }

    function saveSkill() {
        const name = document.getElementById('input-skill-name').value;
        const index = parseInt(document.getElementById('edit-skill-index').value);
        if (!name) return alert("Nama skill harus diisi!");
        const newSkillData = { name: name, materials: tempMaterials, progress: 0 };
        if (index === -1) personalData.skills.push(newSkillData);
        else personalData.skills[index] = newSkillData;
        saveData();
        closeModal('modal-skill');
    }

    function saveGoal() {
        const text = document.getElementById('input-goal-text').value;
        if(text) {
            personalData.goals.push({ text: text, done: false });
            saveData(); closeModal('modal-goal'); document.getElementById('input-goal-text').value = '';
        }
    }
    
    function toggleGoal(index) {
        if (typeof personalData.goals[index] === 'string') {
            personalData.goals[index] = { text: personalData.goals[index], done: true };
        } else {
            personalData.goals[index].done = !personalData.goals[index].done;
        }
        saveData();
    }

    function getImgUrl(url) {
        if (!url) return '';
        if (url.includes('drive.google.com') && url.includes('/d/')) {
            const id = url.split('/d/')[1].split('/')[0];
            return `https://lh3.googleusercontent.com/d/${id}=s220`; 
        }
        return url;
    }

    function saveBook() {
        const title = document.getElementById('input-book-title').value;
        const imgLink = document.getElementById('input-book-img').value;
        if(title) {
            personalData.books.push({ title: title, done: false, img: getImgUrl(imgLink) });
            saveData();
            closeModal('modal-book');
            document.getElementById('input-book-title').value = '';
            document.getElementById('input-book-img').value = '';
        }
    }
    
    function toggleBook(index) {
        if (typeof personalData.books[index] === 'string') {
            personalData.books[index] = { title: personalData.books[index], done: true, img: null };
        } else {
            personalData.books[index].done = !personalData.books[index].done;
        }
        saveData();
    }

    function saveProfile() {
        const name = document.getElementById('input-name').value;
        const role = document.getElementById('input-role').value;
        const bio = document.getElementById('input-bio').value;
        if(name) personalData.profile.name = name;
        if(role) personalData.profile.role = role;
        if(bio) personalData.profile.bio = bio;
        saveData(); closeModal('modal-profile');
    }

    function deleteItem(type, index) {
        if(confirm("Hapus item ini?")) {
            personalData[type].splice(index, 1);
            saveData();
        }
    }

    // =========================================================
    // 4. HELPER & UTILS
    // =========================================================

    function padZero(n){return n<10?'0'+n:n}
    function setDate(){const e=document.getElementById('current-date');if(e)e.innerHTML=`<i class="fas fa-calendar"></i> ${new Date().toLocaleDateString('id-ID',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}`}
    function setTime(){const e=document.getElementById('current-time');if(e)e.innerHTML=`<i class="fas fa-clock"></i> ${new Date().toLocaleTimeString('id-ID')}`}
    const formatRupiah = (n) => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(n);
    function parseDate(s){if(!s)return null;if(s.includes('/')){const p=s.split('/');return new Date(p[2],p[1]-1,p[0])}return new Date(s)}
    
    function findValue(o, k) {
        const ks = Object.keys(o);
        for (let key of ks) {
            const ck = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            for (let kw of k) {
                if (ck.includes(kw.toLowerCase().replace(/[^a-z0-9]/g, ''))) return o[key];
            }
        }
        return undefined;
    }

    // =========================================================
    // 5. DATA BACKEND (KEUANGAN & KESEHATAN)
    // =========================================================

    async function fetchFinancialData() {
        try {
            const res = await fetch(`${BACKEND_URL}/api/finances`);
            const data = await res.json();
            let pemasukan=0, pengeluaran=0, sBank=0, sEwallet=0, sCash=0;
            const now = new Date(); const m = now.getMonth(); const y = now.getFullYear();
            
            data.forEach(item => {
                const nom = parseFloat(String(findValue(item,['nominal','amount','jumlah','harga'])||'0').replace(/[^0-9]/g,''))||0;
                const jenis = String(findValue(item,['jenis','transaksi','tipe','type'])||'').toLowerCase().trim();
                const src = String(findValue(item,['sumber','bank','source'])||'').toLowerCase();
                const dst = String(findValue(item,['tujuan','ke','dest'])||'').toLowerCase();
                const tgl = parseDate(findValue(item,['tanggal','date','tgl']));
                
                const isCur = (tgl && tgl.getMonth()===m && tgl.getFullYear()===y);
                
                if(jenis.includes('masuk')||jenis==='pemasukan' || jenis === 'income'){
                    if(isCur) pemasukan+=nom;
                    if(src.includes('bank')||src.includes('bsi')) sBank+=nom; else if(src.includes('wallet')||src.includes('dana')||src.includes('ovo')||src.includes('pay')) sEwallet+=nom; else if(src.includes('cash')) sCash+=nom;
                } else if(jenis.includes('keluar')||jenis==='pengeluaran' || jenis === 'expense'){
                    if(isCur) pengeluaran+=nom;
                    if(src.includes('bank')||src.includes('bsi')) sBank-=nom; else if(src.includes('wallet')||src.includes('dana')||src.includes('ovo')||src.includes('pay')) sEwallet-=nom; else if(src.includes('cash')) sCash-=nom;
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
            
            updateTransactionTable(data);
            if(document.getElementById('monthlyEarningsChart')) createMonthlyChart(data);
            if(document.getElementById('month-selector')) setupDownloadFeature(data);
        } catch(e) { console.error('Finance Error:', e); }
    }
    
    function setupDownloadFeature(data) {
        const sel = document.getElementById('month-selector'); const btn = document.getElementById('btn-download-csv');
        if(!sel || !btn) return;
        const unq = new Set();
        data.forEach(i=>{const t=parseDate(findValue(i,['tanggal','date']));if(t)unq.add(`${t.getFullYear()}-${padZero(t.getMonth()+1)}`)});
        const srt = Array.from(unq).sort().reverse();
        sel.innerHTML='<option value="">Pilih Bulan...</option>';
        srt.forEach(m=>{sel.innerHTML+=`<option value="${m}">${m}</option>`});
        const nBtn = btn.cloneNode(true); btn.parentNode.replaceChild(nBtn, btn);
        nBtn.innerHTML='<i class="fas fa-file-excel"></i> Unduh Excel'; nBtn.style.backgroundColor='#1D6F42';
        nBtn.addEventListener('click',()=>{if(!sel.value)return alert('Pilih bulan'); downloadExcel(data,sel.value)});
    }
    
    function downloadExcel(data, selM) {
        if(typeof XLSX==='undefined') return alert('XLSX Library Missing');
        const fil = data.filter(i=>{const t=parseDate(findValue(i,['tanggal','date'])); return t&&`${t.getFullYear()}-${padZero(t.getMonth()+1)}`===selM});
        if(!fil.length) return alert('Kosong');
        const ex = fil.map(i=>({
            "Tanggal": findValue(i,['tanggal','date']), 
            "Ket": findValue(i,['deskripsi','ket','note']), 
            "Nominal": parseFloat(String(findValue(i,['nominal','amount'])).replace(/[^0-9]/g,'')), 
            "Jenis": findValue(i,['jenis','tipe'])
        }));
        const ws=XLSX.utils.json_to_sheet(ex); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Lap"); XLSX.writeFile(wb,`Lap_${selM}.xlsx`);
    }
    
    function updateTransactionTable(d){ 
        const t=document.querySelector('#transaction-table tbody'); 
        if(t){
            t.innerHTML=''; 
            d.slice(-5).reverse().forEach(i=>{
                const nom = parseFloat(String(findValue(i,['nominal','amount'])).replace(/[^0-9]/g,''));
                const ket = findValue(i,['deskripsi','ket','note']) || '-';
                const jen = findValue(i,['jenis','tipe']) || '-';
                t.innerHTML+=`<tr><td>${ket}</td><td>${jen}</td><td>${formatRupiah(nom)}</td></tr>`;
            });
        }
    }
    
    function createMonthlyChart(data) {
        if (typeof Chart === 'undefined' || !document.getElementById('monthlyEarningsChart')) return;
        const ctx = document.getElementById('monthlyEarningsChart');
        const income = Array(12).fill(0), expense = Array(12).fill(0);
        const year = new Date().getFullYear();
        
        data.forEach(item => {
            const tgl = parseDate(findValue(item, ['Tanggal', 'date', 'tgl']));
            const jenis = String(findValue(item, ['jenis', 'tipe', 'transaksi', 'type']) || '').toLowerCase();
            const amount = parseFloat(String(findValue(item, ['nominal', 'amount', 'jumlah']) || '0').replace(/[^0-9]/g, '')) || 0;
            
            if (tgl && tgl.getFullYear() === year) {
                if (jenis.includes('masuk') || jenis.includes('income')) income[tgl.getMonth()] += amount;
                else if (jenis.includes('keluar') || jenis.includes('expense')) expense[tgl.getMonth()] += amount;
            }
        });
        
        if (window.myFinanceChart instanceof Chart) window.myFinanceChart.destroy();
        window.myFinanceChart = new Chart(ctx, {
            type: 'line',
            data: { 
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'], 
                datasets: [
                    { label: 'Pemasukan', data: income, borderColor: '#667eea', backgroundColor: 'rgba(102, 126, 234, 0.1)', fill: true }, 
                    { label: 'Pengeluaran', data: expense, borderColor: '#f44336', backgroundColor: 'rgba(244, 67, 54, 0.1)', fill: true }
                ] 
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

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
                if (cond.toLowerCase().includes('sakit')) {
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
                const lastMed = [...data].reverse().find(i => findValue(i, ['obat']));
                document.getElementById('last-medicine').textContent = lastMed ? findValue(lastMed, ['obat']) : '-';
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
                    const t = findValue(i, ['kapan', 'date', 'waktu']) || '';
                    const k = findValue(i, ['ngapain', 'kegiatan', 'activity']) || '-';
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

    async function fetchBudgetData(){
        try{
            const [bRes, fRes] = await Promise.all([fetch(`${BACKEND_URL}/api/budgets`), fetch(`${BACKEND_URL}/api/finances`)]);
            const budgets = await bRes.json(); const finances = await fRes.json();
            const used={}; const now=new Date();
            
            finances.forEach(i=>{
                const j = String(findValue(i,['jenis','transaksi','tipe','type'])||'').toLowerCase();
                const t = parseDate(findValue(i,['tanggal','date','tgl']));
                
                if((j.includes('keluar')||j==='pengeluaran'||j.includes('expense')) && t && t.getMonth()===now.getMonth()){
                    const c = String(findValue(i,['kategori','category','cat'])||'lainnya').toLowerCase();
                    const a = parseFloat(String(findValue(i,['nominal','amount','jumlah'])).replace(/[^0-9]/g,''))||0;
                    
                    budgets.forEach(b=>{
                        const budgetCat = String(findValue(b,['kategori','category'])).toLowerCase();
                        if(c.includes(budgetCat) || budgetCat.includes(c)) {
                            used[budgetCat] = (used[budgetCat]||0) + a;
                        }
                    });
                }
            });
            
            const c=document.getElementById('budget-container');
            if(c){
                c.innerHTML=''; 
                budgets.forEach(b=>{
                    const n = findValue(b,['kategori','category']); 
                    const l = parseFloat(String(findValue(b,['alokasi','limit','budget'])).replace(/[^0-9]/g,''))||0;
                    const u = used[String(n).toLowerCase()]||0; 
                    const p = (u/l)*100;
                    const col = p > 90 ? 'danger' : (p > 70 ? 'warning' : '');
                    c.innerHTML+=`<div class="budget-item"><div class="budget-item-header"><span>${n}</span><span>${formatRupiah(l-u)}</span></div><div class="progress-bar-container"><div class="progress-bar ${col}" style="width:${Math.min(p,100)}%"></div></div></div>`;
                });
            }
        }catch(e){console.error('Budget Error:', e)}
    }

    let diagInterval=null;
    function initDiagnosticFeature(){
        const btn=document.getElementById('btn-diagnostic'); const mod=document.getElementById('diagnostic-modal'); const cl=document.querySelector('.close-btn');
        if(btn&&mod) btn.addEventListener('click',()=>{mod.classList.add('show'); sSim()});
        if(cl) cl.addEventListener('click',()=>{mod.classList.remove('show'); stSim()});
        window.onclick = (e) => { if(e.target==mod) { mod.classList.remove('show'); stSim(); }};
    }
    function sSim(){upVal(); diagInterval=setInterval(upVal,1500)}
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
        const el=document.getElementById('dummy-steps'); if(el){
            let s=8200; setInterval(()=>{s+=Math.floor(Math.random()*5); el.textContent=s.toLocaleString()},3000);
        }
    }

    initNavListeners();
    runPageInit();
});
