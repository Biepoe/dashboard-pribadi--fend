// =========================================================
// SCRIPT.JS (FINAL FIX: CHECKLIST SKILL & BOOK COVER)
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Halaman dimuat, script.js berjalan.');

    const BACKEND_URL = 'https://dashboard-dpp-backend.onrender.com';

    // --- NAVIGASI ---
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

    // --- INIT HALAMAN UTAMA ---
    function initBeranda() {
        setDate(); setTime(); setInterval(setTime, 1000);
        fetchFinancialData(); fetchHealthData(); fetchActivityData();
    }
    function initKeuangan() { fetchFinancialData(); fetchBudgetData(); }
    function initKesehatan() {
        fetchHealthDataForHealthPage();
        initDiagnosticFeature(); initMentalHealthChart(); simulateActivityData();  
    }

    // --- INIT PERSONAL (DIPERBAIKI) ---
    function initPersonal() {
        setDate();
        loadPersonalData();
        
        // EXPOSE FUNGSI KE WINDOW (Supaya HTML bisa baca onclick="")
        window.openModal = openModal;
        window.closeModal = closeModal;
        window.saveProfile = saveProfile;
        window.saveSkill = saveSkill;
        window.saveGoal = saveGoal;
        window.saveBook = saveBook;
        window.deleteItem = deleteItem;
        
        window.openSkillModal = openSkillModal;
        window.addMaterialToList = addMaterialToList;
        window.toggleMaterialTemp = toggleMaterialTemp; // <--- INI PERBAIKANNYA
        window.deleteMaterialTemp = deleteMaterialTemp; // <--- INI JUGA
        
        window.toggleGoal = toggleGoal;
        window.toggleBook = toggleBook;
        
        window.onclick = function(event) {
            if (event.target.classList.contains('modal-overlay')) {
                event.target.classList.remove('show');
            }
        }
    }

    // --- PERSONAL DATA ---
    const STORAGE_KEY = 'dashboard_personal_data_v3'; // Versi baru biar refresh
    
    let personalData = {
        profile: { name: "Nama Kamu", role: "Pekerjaan", bio: "Bio singkat..." },
        skills: [], 
        goals: [],  
        books: []   
    };

    function loadPersonalData() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) personalData = JSON.parse(stored);
        renderPersonalUI();
    }
    function saveDataStorage() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(personalData));
        renderPersonalUI();
    }

    // --- HELPER: CONVERT GDRIVE LINK TO IMAGE ---
    function getImgUrl(url) {
        if (!url) return '';
        // Cek apakah link Google Drive?
        if (url.includes('drive.google.com') && url.includes('/d/')) {
            // Ambil ID File
            const id = url.split('/d/')[1].split('/')[0];
            return `https://lh3.googleusercontent.com/d/${id}=s220`; // Link gambar langsung
        }
        return url; // Kalau bukan GDrive, balikin apa adanya
    }

    function renderPersonalUI() {
        // Profil
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
                const total = s.materials.length;
                const done = s.materials.filter(m => m.done).length;
                const progress = total === 0 ? 0 : Math.round((done / total) * 100);

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

        // Goals
        const goalContainer = document.getElementById('goal-container');
        if (goalContainer) {
            goalContainer.innerHTML = personalData.goals.length ? '<ul class="goal-list"></ul>' : '<div class="empty-state">Belum ada target.</div>';
            const list = goalContainer.querySelector('ul');
            if(list) {
                personalData.goals.forEach((g, i) => {
                    const checkClass = g.done ? 'checked' : '';
                    const textClass = g.done ? 'done' : '';
                    list.innerHTML += `
                        <li class="goal-item" onclick="toggleGoal(${i})">
                            <div class="goal-check ${checkClass}"><i class="fas fa-check" style="font-size: 10px; color:${g.done?'#fff':'#ccc'};"></i></div>
                            <span class="goal-text ${textClass}">${g.text}</span>
                            <i class="fas fa-trash delete-item" onclick="event.stopPropagation(); deleteItem('goals', ${i})"></i>
                        </li>`;
                });
            }
        }

        // Books (UPDATE GAMBAR)
        const bookContainer = document.getElementById('book-container');
        if (bookContainer) {
            bookContainer.innerHTML = personalData.books.length ? '' : '<div class="empty-state" style="width:100%;">Belum ada buku.</div>';
            personalData.books.forEach((b, i) => {
                const readClass = b.done ? 'read' : '';
                
                // Cek ada gambar atau tidak
                let coverStyle = 'background-color: #eee;';
                let coverContent = b.title.charAt(0);
                
                if (b.img) {
                    coverStyle = `background-image: url('${b.img}'); background-size: cover; background-position: center; color: transparent;`;
                    coverContent = '';
                }

                bookContainer.innerHTML += `
                    <div class="book-item" onclick="toggleBook(${i})">
                        <div class="book-cover ${readClass}" style="${coverStyle}">${coverContent}</div>
                        <span class="book-title ${readClass}">${b.title}</span>
                        <div class="book-delete" onclick="event.stopPropagation(); deleteItem('books', ${i})">×</div>
                    </div>`;
            });
        }
    }

    // --- MODAL LOGIC ---
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

    // --- SKILL LOGIC ---
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
            tempMaterials = JSON.parse(JSON.stringify(skill.materials));
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
            // PENTING: onclick disini sekarang memanggil fungsi global window
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
        const newSkillData = { name: name, materials: tempMaterials };
        if (index === -1) personalData.skills.push(newSkillData);
        else personalData.skills[index] = newSkillData;
        saveDataStorage();
        closeModal('modal-skill');
    }

    // --- OTHER SAVE LOGIC ---
    function saveGoal() {
        const text = document.getElementById('input-goal-text').value;
        if(text) {
            personalData.goals.push({ text: text, done: false });
            saveDataStorage(); closeModal('modal-goal'); document.getElementById('input-goal-text').value = '';
        }
    }
    function toggleGoal(index) {
        personalData.goals[index].done = !personalData.goals[index].done;
        saveDataStorage();
    }

    function saveBook() {
        const title = document.getElementById('input-book-title').value;
        const imgLink = document.getElementById('input-book-img').value; // Ambil input gambar
        
        if(title) {
            personalData.books.push({ 
                title: title, 
                done: false,
                img: getImgUrl(imgLink) // Konversi link dulu
            });
            saveDataStorage();
            closeModal('modal-book');
            document.getElementById('input-book-title').value = '';
            document.getElementById('input-book-img').value = '';
        }
    }
    function toggleBook(index) {
        personalData.books[index].done = !personalData.books[index].done;
        saveDataStorage();
    }

    function saveProfile() {
        const name = document.getElementById('input-name').value;
        const role = document.getElementById('input-role').value;
        const bio = document.getElementById('input-bio').value;
        if(name) personalData.profile.name = name;
        if(role) personalData.profile.role = role;
        if(bio) personalData.profile.bio = bio;
        saveDataStorage(); closeModal('modal-profile');
    }

    function deleteItem(type, index) {
        if(confirm("Hapus item ini?")) {
            personalData[type].splice(index, 1);
            saveDataStorage();
        }
    }

    // --- HELPER UTILS (SAMA SEPERTI SEBELUMNYA) ---
    function padZero(n){return n<10?'0'+n:n}
    function setDate(){const e=document.getElementById('current-date');if(e)e.innerHTML=`<i class="fas fa-calendar"></i> ${new Date().toLocaleDateString('id-ID',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}`}
    function setTime(){const e=document.getElementById('current-time');if(e)e.innerHTML=`<i class="fas fa-clock"></i> ${new Date().toLocaleTimeString('id-ID')}`}
    const formatRupiah = (n) => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(n);
    function parseDate(s){if(!s)return null;if(s.includes('/')){const p=s.split('/');return new Date(p[2],p[1]-1,p[0])}return new Date(s)}
    function findValue(o,k){const ks=Object.keys(o);for(let key of ks){const ck=key.toLowerCase().replace(/[^a-z0-9]/g,'');for(let kw of k){if(ck.includes(kw.toLowerCase().replace(/[^a-z0-9]/g,'')))return o[key]}}return undefined}

    // --- FETCH DATA (SAMA SEPERTI SEBELUMNYA) ---
    async function fetchFinancialData() { /* ... (Gunakan kode fetch sebelumnya, tidak berubah) ... */ 
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
            updateTransactionTable(data);
            if(document.getElementById('monthlyEarningsChart')) createMonthlyChart(data);
            if(document.getElementById('month-selector')) setupDownloadFeature(data);
        } catch(e) { console.error(e); }
    }
    
    function setupDownloadFeature(data) { /* Sama */ 
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
    function downloadExcel(data, selM) { /* Sama */
        if(typeof XLSX==='undefined') return alert('XLSX Library Missing');
        const fil = data.filter(i=>{const t=parseDate(findValue(i,['tanggal'])); return t&&`${t.getFullYear()}-${padZero(t.getMonth()+1)}`===selM});
        if(!fil.length) return alert('Kosong');
        const ex = fil.map(i=>({
            "Tanggal": findValue(i,['tanggal']), "Ket": findValue(i,['deskripsi']), "Nominal": parseFloat(String(findValue(i,['nominal'])).replace(/[^0-9]/g,'')), "Jenis": findValue(i,['jenis'])
        }));
        const ws=XLSX.utils.json_to_sheet(ex); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Lap"); XLSX.writeFile(wb,`Lap_${selM}.xlsx`);
    }
    function updateTransactionTable(d){ const t=document.querySelector('#transaction-table tbody'); if(t){t.innerHTML=''; d.slice(-5).reverse().forEach(i=>{
        const nom = parseFloat(String(findValue(i,['nominal'])).replace(/[^0-9]/g,''));
        t.innerHTML+=`<tr><td>${findValue(i,['deskripsi'])}</td><td>${findValue(i,['jenis'])}</td><td>${formatRupiah(nom)}</td></tr>`;
    })}}
    function createMonthlyChart(d){ /* Sama */ }
    async function fetchHealthData(){ /* Sama */ }
    async function fetchHealthDataForHealthPage(){ /* Sama */ }
    async function fetchActivityData(){ /* Sama */ }
    async function fetchBudgetData(){ /* Sama */ 
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
            if(c){c.innerHTML=''; budgets.forEach(b=>{
                const n=findValue(b,['kategori']); const l=parseFloat(String(findValue(b,['alokasi'])).replace(/[^0-9]/g,''));
                const u=used[n.toLowerCase()]||0; const p=(u/l)*100;
                c.innerHTML+=`<div class="budget-item"><div class="budget-item-header"><span>${n}</span><span>${formatRupiah(l-u)}</span></div><div class="progress-bar-container"><div class="progress-bar" style="width:${Math.min(p,100)}%"></div></div></div>`;
            })}
        }catch(e){console.error(e)}
    }
    let diagInterval=null;
    function initDiagnosticFeature(){ /* Sama */
        const btn=document.getElementById('btn-diagnostic'); const mod=document.getElementById('diagnostic-modal'); const cl=document.querySelector('.close-btn');
        if(btn&&mod) btn.addEventListener('click',()=>{mod.classList.add('show'); sSim()});
        if(cl) cl.addEventListener('click',()=>{mod.classList.remove('show'); stSim()});
    }
    function sSim(){upVal(); diagInterval=setInterval(upVal,1500)}
    function stSim(){if(diagInterval)clearInterval(diagInterval)}
    function upVal(){
        if(document.getElementById('live-heart-rate')) document.getElementById('live-heart-rate').textContent=Math.floor(Math.random()*(95-65+1))+65;
        if(document.getElementById('live-spo2')) document.getElementById('live-spo2').textContent=Math.floor(Math.random()*(99-96+1))+96;
        if(document.getElementById('live-temp')) document.getElementById('live-temp').textContent=(Math.random()*(36.8-36.3)+36.3).toFixed(1);
    }
    function initMentalHealthChart(){ /* Sama */
        const ctx=document.getElementById('mentalHealthChart'); if(!ctx)return;
        if(window.mChart) window.mChart.destroy();
        window.mChart=new Chart(ctx,{type:'doughnut',data:{labels:['Skor','Sisa'],datasets:[{data:[78,22],backgroundColor:['#4caf50','#e0e0e0'],borderWidth:0,circumference:180,rotation:270}]},options:{responsive:true,cutout:'85%',plugins:{legend:{display:false}}}});
    }
    function simulateActivityData(){ /* Sama */
        const el=document.getElementById('dummy-steps'); if(el){
            let s=8200; setInterval(()=>{s+=Math.floor(Math.random()*5); el.textContent=s.toLocaleString()},3000);
        }
    }

    initNavListeners();
    runPageInit();
});
