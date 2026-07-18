// =========================================================
// SCRIPT UNTUK HUB
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Halaman dimuat, script-hub berjalan.');

    const BACKEND_URL = 'https://dashboard-dpp-backend.onrender.com';


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
                fetch(`${BACKEND_URL}/api/health-database`), // Fallback jika endpoint belum ada
                fetch(`${BACKEND_URL}/api/anatomy-database`)
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
                                
                                // 1. EKSTRAKSI SUPER KETAT (Mengecek semua nama kolom satu per satu)
                                let diag = '-';
                                let bagian = '-';
                                let detail = '-';
                                let hasilDiagnosa = '-';
                                
                                for (let key in rec) {
                                    // Hilangkan semua spasi & tanda baca dari nama kolom di backend
                                    let cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                                    
                                    // Pengecekan SANGAT KETAT (Pake ===, bukan includes) buat Diagnosa
                                    if (cleanKey === 'diagnosa' || cleanKey === 'Diagnosa') {
                                        hasilDiagnosa = rec[key];
                                    } 
                                    // Pengecekan SANGAT KETAT buat Didiagnosa Oleh
                                    else if (cleanKey === 'didiagnosaoleh?' || cleanKey === 'DidiagnosaOleh?' || cleanKey === 'didiagnosaoleh') {
                                        diag = rec[key];
                                    } 
                                    else if (cleanKey.includes('bagiantubuh') || cleanKey === 'BagianTubuh') {
                                        bagian = rec[key];
                                    } 
                                    else if (cleanKey.includes('penjelasanlebihdetail') || cleanKey.includes('Penjelasan')) {
                                        detail = rec[key];
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

        const btnAnatomi = document.getElementById('btn-anatomi');
        const modalAnatomi = document.getElementById('modal-anatomi');
        const closeAnatomi = document.getElementById('close-anatomi');
        const dots = document.querySelectorAll('.body-dot');
        const infoPanel = document.getElementById('anatomi-info-panel');
    
    // 1. Logika Buka/Tutup Modal
        if(btnAnatomi && modalAnatomi) {
            btnAnatomi.addEventListener('click', () => {
                modalAnatomi.style.display = 'block';
            });
        }

        if(closeAnatomi && modalAnatomi) {
            closeAnatomi.addEventListener('click', () => {
                modalAnatomi.style.display = 'none';
            });
        }

        window.addEventListener('click', (e) => {
            if (e.target === modalAnatomi) {
                modalAnatomi.style.display = 'none';
            }
        });

    // 2. Logika Interaksi Titik Anatomi
        if (dots.length > 0) {
            dots.forEach(dot => {
                dot.addEventListener('click', (e) => {
                // Reset status aktif (warna berubah saat diklik)
                    dots.forEach(d => d.classList.remove('active'));
                    e.target.classList.add('active');

                // Ambil id bagian tubuh dari atribut HTML
                    const part = e.target.getAttribute('data-part');
                
                // Panggil data dari variabel yang disiapkan backend
                    const data = typeof anatomiData !== 'undefined' ? anatomiData[part] : null;

                    if(data) {
                        let htmlOutput = `<h3>${data.title}</h3><ul class="anatomi-data-list">`;
                    
                    // Handle format data dari backend (apakah sudah array atau masih string dengan \n)
                        let itemsArray = [];
                        if (Array.isArray(data.items)) {
                            itemsArray = data.items;
                        } else if (typeof data.items === 'string') {
                            itemsArray = data.items.split('\n');
                        }
                    
                    // Render ke list HTML
                        itemsArray.forEach(item => {
                            if(item && item.trim() !== "") {
                                htmlOutput += `<li>${item}</li>`;
                            }
                        });
                    
                        htmlOutput += `</ul>`;
                        infoPanel.innerHTML = htmlOutput;
                    } else {
                        infoPanel.innerHTML = `<h3>Data belum tersedia.</h3><p>Pastikan data dari backend sudah tersambung.</p>`;
                    }
                });
            });
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
}
