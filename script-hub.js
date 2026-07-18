// =========================================================
// SCRIPT UNTUK HUB
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Halaman dimuat, script-hub berjalan.');

    const BACKEND_URL = 'https://dashboard-dpp-backend.onrender.com';

    // 1. Fungsi untuk mencari kolom data meskipun nama kolomnya beda spasi/huruf besar
    function findValue(obj, keys) {
        if (!obj) return null;
        const objKeys = Object.keys(obj);
        for (let targetKey of keys) {
            const cleanTarget = targetKey.toLowerCase().replace(/[^a-z0-9]/g, '');
            for (let actualKey of objKeys) {
                const cleanActual = actualKey.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (cleanActual === cleanTarget || cleanActual.includes(cleanTarget)) {
                    if (obj[actualKey] !== undefined && obj[actualKey] !== null && obj[actualKey] !== "") {
                        return obj[actualKey];
                    }
                }
            }
        }
        return null;
    }

    // 2. Fungsi untuk memastikan tanggal bisa dibaca oleh sistem
    function parseDate(dateStr) {
        if (!dateStr) return null;
        return new Date(dateStr);
    }

    // =========================================================
    // 6. KESEHATAN & REKAM MEDIS (VERSI BARU)
    // =========================================================
    
    async function initKesehatan() {
        // Hanya jalankan jika berada di halaman kesehatan
        if (!document.getElementById('halaman-kesehatan')) return;

        const uiUpdate = document.getElementById('health-last-update');
        if (uiUpdate) uiUpdate.textContent = 'Memuat data...';

        let anatomiData = {}; // KITA BUAT PENAMPUNG DATA ANATOMINYA DISINI

        try {
            // PERBAIKAN 1: Tangkap 3 response sekaligus (tambahkan anatomiRes)
            const [healthRes, logRes, anatomiRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/health`),
                fetch(`${BACKEND_URL}/api/health-database`), 
                fetch(`${BACKEND_URL}/api/anatomy-database`)
            ]);

            const healthData = healthRes.ok ? await healthRes.json() : [];
            const logData = (logRes && logRes.ok) ? await logRes.json() : [];
            
            // PERBAIKAN 2: Olah data dari backend anatomy
            const rawAnatomi = (anatomiRes && anatomiRes.ok) ? await anatomiRes.json() : [];
            
            // Format data dari array JSON backend menjadi Object agar gampang dibaca logika klik
            if (Array.isArray(rawAnatomi)) {
                rawAnatomi.forEach(row => {
                    // Fleksibilitas baca key dari JSON Backend (kolom 1=ID, 2=Nama, 3=Detail)
                    let keys = Object.keys(row);
                    if (keys.length >= 3) {
                        let id = row[keys[0]];
                        let title = row[keys[1]];
                        let detail = row[keys[2]];
                        
                        if(id) {
                            anatomiData[String(id).toLowerCase().trim()] = {
                                title: title,
                                items: detail
                            };
                        }
                    }
                });
            } else {
                anatomiData = rawAnatomi;
            }

            // 1. UPDATE KARTU VITALS & STATUS
            if (healthData.length > 0) {
                const latest = healthData[healthData.length - 1];
                const kondisi = findValue(latest, ['kondisi', 'tubuh', 'status']) || 'Sehat';
                document.getElementById('ui-kondisi').textContent = kondisi;

                const lastFisik = [...healthData].reverse().find(i => findValue(i, ['berat']) || findValue(i, ['tinggi']));
                if (lastFisik) {
                    const bb = findValue(lastFisik, ['berat']) ? `${findValue(lastFisik, ['berat'])} kg` : '-- kg';
                    const tb = findValue(lastFisik, ['tinggi']) ? `${findValue(lastFisik, ['tinggi'])} cm` : '-- cm';
                    document.getElementById('ui-fisik').textContent = `${bb} / ${tb}`;
                }

                const lastSleep = [...healthData].reverse().find(i => findValue(i, ['tidur']) && findValue(i, ['bangun']));
                if (lastSleep) {
                    const t = findValue(lastSleep, ['tidur']);
                    const b = findValue(lastSleep, ['bangun']);
                    if (t && b) {
                        const tJam = parseInt(t.split(':')[0]) || 0;
                        const bJam = parseInt(b.split(':')[0]) || 0;
                        let durasi = bJam - tJam;
                        if (durasi < 0) durasi += 24; 
                        document.getElementById('ui-sleep-duration').textContent = `${durasi} Jam`;
                    }
                }

                const lastTensi = [...healthData].reverse().find(i => {
                    const detail = String(findValue(i, ['detailkan', 'lapor'])).toLowerCase();
                    return detail.includes('tensi') || detail.includes('sys');
                });
                if (lastTensi) {
                    const detailStr = String(findValue(lastTensi, ['detailkan', 'lapor']));
                    const sysMatch = detailStr.match(/(\d+)\s*mmHg/i); 
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
                        const dataObat = healthData.filter(rec => {
                            if (!rec) return false;
                            const tindakan = String(findValue(rec, ['tindakan']) || '').toLowerCase();
                            return tindakan.includes('obat') || tindakan.includes('suplemen');
                        }).slice(-5).reverse();

                        const dataPenyakit = healthData.filter(rec => {
                            if (!rec) return false;
                            const tindakan = String(findValue(rec, ['tindakan', 'tindakan yang dilakukan']) || '').toLowerCase();
                            const kolomK = String(findValue(rec, ['apa yang ingin dilaporkan']) || '').toLowerCase();
                            return tindakan.includes('laporan') && kolomK.includes('penyakit yang dialami');
                        }).slice(-5).reverse();

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

                        if (dataPenyakit.length === 0) {
                            penyakitList.innerHTML = '<li style="text-align:center; color:#999; padding:15px;">Belum ada riwayat penyakit terbaru.</li>';
                        } else {
                            dataPenyakit.forEach(rec => {
                                const tgl = findValue(rec, ['tanggal', 'kejadian']) || '-';
                                const wkt = findValue(rec, ['waktu']) || '';
                                
                                let diag = '-', bagian = '-', detail = '-', hasilDiagnosa = '-';
                                
                                for (let key in rec) {
                                    let cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                                    
                                    if (cleanKey === 'diagnosa' || cleanKey === 'Diagnosa') {
                                        hasilDiagnosa = rec[key];
                                    } else if (cleanKey === 'didiagnosaoleh?' || cleanKey === 'DidiagnosaOleh?' || cleanKey === 'didiagnosaoleh') {
                                        diag = rec[key];
                                    } else if (cleanKey.includes('bagiantubuh') || cleanKey === 'BagianTubuh') {
                                        bagian = rec[key];
                                    } else if (cleanKey.includes('penjelasanlebihdetail') || cleanKey.includes('Penjelasan')) {
                                        detail = rec[key];
                                    }
                                }
                                
                                let keluhan = findValue(rec, ['deskripsi / keluhan', 'deskripsi', 'keluhan']) || '';
                                if (!keluhan || keluhan === '-') {
                                    keluhan = bagian !== '' && bagian !== '-' ? (bagian.charAt(0).toUpperCase() + bagian.slice(1)) : 'Laporan Penyakit';
                                }

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
            }

            // 3. UPDATE TABEL LOG HARIAN (HEALTH DATABASE)
            const logTable = document.getElementById('ui-health-log-list');
            if (logTable) {
                logTable.innerHTML = '';
                if (logData.length === 0) {
                    logTable.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#999; padding:15px;">Belum ada log harian.</td></tr>';
                } else {
                    const recentLogs = logData.slice(-7).reverse();
                    
                    recentLogs.forEach(log => {
                        const tgl = findValue(log, ['tanggal']) || '-';
                        const wkt = findValue(log, ['waktu']) || '';
                        const kat = findValue(log, ['kategori']) || '-';
                        const item = findValue(log, ['catatan', 'jumlah']) || '-'; 
                        const jumlah = findValue(log, ['jumlah']) || '';
                        
                        const badgeClass = String(kat).toLowerCase().includes('kafein') ? 'badge-kafein' : 'badge-umum';
                        const formatTanggal = typeof tgl === 'string' && tgl.includes('202') ? tgl.substring(0, 10) : tgl;

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

            if (uiUpdate) {
                const now = new Date();
                uiUpdate.textContent = `Diperbarui: ${now.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}`;
            }

        } catch (error) {
            console.error('Error fetching health data:', error);
            if (uiUpdate) uiUpdate.textContent = 'Gagal sinkronisasi';
        }

        // ============================================
        // LOGIKA MODAL & TITIK ANATOMI (Sudah Benar)
        // ============================================
        const btnAnatomi = document.getElementById('btn-anatomi');
        const modalAnatomi = document.getElementById('modal-anatomi');
        const closeAnatomi = document.getElementById('close-anatomi');
        const dots = document.querySelectorAll('.body-dot');
        const infoPanel = document.getElementById('anatomi-info-panel');
    
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

        if (dots.length > 0) {
            dots.forEach(dot => {
                dot.addEventListener('click', (e) => {
                    dots.forEach(d => d.classList.remove('active'));
                    e.target.classList.add('active');

                    const part = e.target.getAttribute('data-part');
                    const data = anatomiData[part]; // Sekarang data ini terisi dari fetch!

                    if(data) {
                        let htmlOutput = `<h3>${data.title}</h3><ul class="anatomi-data-list">`;
                        
                        let itemsArray = [];
                        if (Array.isArray(data.items)) {
                            itemsArray = data.items;
                        } else if (typeof data.items === 'string') {
                            itemsArray = data.items.split('\n');
                        }
                    
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
        if (!document.getElementById('ui-kalori') && !document.getElementById('ui-cal-bar')) return;

        try {
            const elTanggal = document.getElementById('ui-tanggal');
            if (elTanggal) {
                elTanggal.textContent = new Date().toLocaleDateString('id-ID', { 
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                });
            }

            const elNama = document.getElementById('ui-nama');
            if (elNama) {
                elNama.textContent = "Aulia Biepoe";
            }

            const [healthRes, logRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/health`), 
                fetch(`${BACKEND_URL}/api/nutrition-log`)
            ]);

            let healthData = healthRes.ok ? await healthRes.json() : []; 
            let logs = logRes.ok ? await logRes.json() : []; 
            
            if (!Array.isArray(healthData)) healthData = [];
            if (!Array.isArray(logs)) logs = [];
            
            if (healthData.length > 0) {
                const latestMedical = healthData[healthData.length - 1];
                
                const elKondisi = document.getElementById('ui-kondisi');
                if (elKondisi) elKondisi.textContent = findValue(latestMedical, ['kondisi', 'tubuh', 'status']) || "Normal";

                const lastMed = [...healthData].reverse().find(i => findValue(i, ['obat', 'medicine']) && findValue(i, ['obat', 'medicine']) !== '-');
                const elObat = document.getElementById('ui-obat');
                if (elObat) elObat.textContent = lastMed ? findValue(lastMed, ['obat', 'medicine']) : "-";

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
                const menu = findValue(log, ['deskripsi', 'menu']) || 'Makanan';
                const kalStr = findValue(log, ['kalori']) || '0';
                const protStr = findValue(log, ['protein']) || '0';
                const karboStr = findValue(log, ['karbohidrat', 'karbo']) || '0';
                const lemakStr = findValue(log, ['lemak']) || '0';
                const jam = findValue(log, ['jam', 'waktu']) || '';

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

            renderNutritionProgress(currentKal, currentProt, listHtml);

            const workoutBox = document.getElementById('ui-workout-box');
            if (workoutBox) workoutBox.style.display = 'none';

        } catch (err) { 
            console.error("Gagal sinkronisasi data nutrisi:", err); 
        }
    }

    function renderNutritionProgress(kal, prot, html) {
        // Asumsi TARGET_KALORI dkk. didefinisikan di utils.js atau global
        const TARGET_KALORI = typeof window.TARGET_KALORI !== 'undefined' ? window.TARGET_KALORI : 2500;
        const TARGET_PROTEIN = typeof window.TARGET_PROTEIN !== 'undefined' ? window.TARGET_PROTEIN : 120;

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
    // 🔥 PERBAIKAN 3: EKSEKUSI FUNGSI-FUNGSINYA!
    // =========================================================
    // Tanpa dua baris sakti ini, script kamu cuma numpang lewat
    initKesehatan();
    fetchNutritionData();

});
