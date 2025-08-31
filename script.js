document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ 1. Halaman selesai dimuat, script.js mulai berjalan.');

        // =========================================================
        // BAGIAN JAM DAN TANGGAL
        // =========================================================
        function padZero(num) {
            return num < 10 ? '0' + num : num;
        }

        function setDate() {
            const dateElement = document.getElementById('current-date');
            if (dateElement) {
                const now = new Date();
                const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                const day = dayNames[now.getDay()];
                const date = now.getDate();
                const month = monthNames[now.getMonth()];
                const year = now.getFullYear();
                const calendarIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>';
                dateElement.innerHTML = `${calendarIcon} ${day}, ${date} ${month} ${year}`;
            }
        }

        function setTime() {
            const timeElement = document.getElementById('current-time');
            if (timeElement) {
                const now = new Date();
                const hours = padZero(now.getHours());
                const minutes = padZero(now.getMinutes());
                const seconds = padZero(now.getSeconds());
                const clockIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
                timeElement.innerHTML = `${clockIcon} ${hours}:${minutes}:${seconds}`;
            }
        }

        setDate();
        setTime();
        setInterval(setTime, 1000);

        // =========================================================
        // BAGIAN PENGAMBILAN DATA (FETCH)
        // =========================================================
        const BACKEND_URL = 'https://dashboard-dpp-backend.onrender.com';
        let activityChart = null;

        async function fetchFinancialData() {
            try {
                const response = await fetch(`${BACKEND_URL}/api/finances`);
                const data = await response.json();

                let totalPemasukan = 0;
                let totalPengeluaran = 0;

                data.forEach(item => {
                    const jumlah = parseFloat(item.Jumlah) || 0;
                    if (item['Tipe'] === 'Pemasukan') {
                        totalPemasukan += jumlah;
                    } else if (item['Tipe'] === 'Pengeluaran') {
                        totalPengeluaran += jumlah;
                    }
                });

                const sisaSaldo = totalPemasukan - totalPengeluaran;

                const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);

                document.getElementById('pemasukan-value').textContent = formatRupiah(totalPemasukan);
                document.getElementById('pengeluaran-value').textContent = formatRupiah(totalPengeluaran);
                document.getElementById('sisa-saldo-value').textContent = formatRupiah(sisaSaldo);

            } catch (error) {
                console.error('Gagal mengambil data keuangan:', error);
                document.getElementById('pengeluaran-value').textContent = 'Error';
                document.getElementById('pemasukan-value').textContent = 'Error';
                document.getElementById('sisa-saldo-value').textContent = 'Error';
            }
        }


    // GANTI SELURUH FUNGSI fetchHealthData DENGAN VERSI BARU INI

// Fungsi baru untuk mengubah format tanggal DD/MM/YYYY menjadi objek Date yang valid
    function parseDate(dateString) {
        if (!dateString) return null;
        const parts = dateString.split('/');
        if (parts.length === 3) {
            // parts[2] = YYYY, parts[1] = MM, parts[0] = DD
            // Bulan di JavaScript dimulai dari 0 (Januari=0, Februari=1, dst.)
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
        return new Date(dateString); // Fallback untuk format lain
    }


    async function fetchHealthData() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/health`);
            const data = await response.json();
            console.log('📦 Data Kesehatan diterima dari backend:', data);

            if (!data || data.length === 0) return; // Keluar jika tidak ada data

            // --- Cari data relevan ---
            const latestRecord = data[data.length - 1]; // Catatan paling baru untuk status & obat
            // Catatan terakhir yang ADA DATA TIDURNYA
            const lastSleepRecord = [...data].reverse().find(item => item['Waktu Tidur'] && item['Waktu Bangun']);

            // --- 1. Update Kondisi Tubuh & Warna Vektor (dari catatan terakhir) ---
            const bodyVector = document.getElementById('body-vector');
            const bodyStatusEl = document.getElementById('body-status');
            const kondisiTubuh = latestRecord['Kondisi Tubuh'] || 'Sehat';

            bodyStatusEl.textContent = kondisiTubuh;
            if (kondisiTubuh === 'Sakit') {
                bodyVector.className = 'body-sick';
            } else {
                bodyVector.className = 'body-normal';
            }

            // --- 2. Hitung & Update Durasi Tidur (dari catatan tidur terakhir) ---
            const sleepDurationEl = document.getElementById('sleep-duration');
            if (lastSleepRecord) {
                const waktuTidur = lastSleepRecord['Waktu Tidur'];
                const waktuBangun = lastSleepRecord['Waktu Bangun'];

                const [jamTidur, menitTidur] = waktuTidur.split(':').map(Number);
                const [jamBangun, menitBangun] = waktuBangun.split(':').map(Number);

                const tglTidur = new Date(2025, 1, 1, jamTidur, menitTidur);
                let tglBangun = new Date(2025, 1, 1, jamBangun, menitBangun);

                if (tglBangun < tglTidur) {
                    tglBangun.setDate(tglBangun.getDate() + 1);
                }

                const selisihMenit = (tglBangun - tglTidur) / 1000 / 60;
                const jam = Math.floor(selisihMenit / 60);
                const menit = selisihMenit % 60;

                sleepDurationEl.textContent = `${jam} Jam ${menit} Menit`;
            } else {
                sleepDurationEl.textContent = '- Jam - Menit';
            }

            // --- 3. Update Obat Terakhir Diminum ---
            const lastMedicineEl = document.getElementById('last-medicine');
            // Kita cari dari data terakhir ke awal yang kolom obatnya tidak kosong
            const lastMedicineRecord = [...data].reverse().find(item => item['Obat/Suplemen yang dikonsumsi']);
            if (lastMedicineRecord) {
                lastMedicineEl.textContent = lastMedicineRecord['Obat/Suplemen yang dikonsumsi'];
            } else {
                lastMedicineEl.textContent = '-';
            }

            // --- 4. Update Tanggal (dengan fungsi parseDate yang baru) ---
            const healthDateEl = document.getElementById('health-date');
            const latestDate = parseDate(latestRecord['Tanggal Kejadian']);
            if (latestDate && !isNaN(latestDate)) {
                healthDateEl.textContent = latestDate.toLocaleDateString('id-ID', { weekday: 'long' });
            } else {
                healthDateEl.textContent = "Tanggal Tidak Valid";
            }


        } catch (error) {
            console.error('Gagal mengambil data kesehatan:', error);
        }
    }

        // =========================================================
        // BAGIAN GRAFIK (CHART)
        // =========================================================
        const ctx = document.getElementById('activityChart');
        if (ctx) {
            activityChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
                    datasets: [{
                        label: 'Aktivitas (jam)',
                        data: [0, 0, 0, 0, 0, 0, 0], // Data awal kosong
                        backgroundColor: '#667eea',
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true, stacked: true }, x: { stacked: true }},
                    plugins: { legend: { position: 'bottom' }}
                }
            });
        }

        // =========================================================
        // MEMANGGIL SEMUA FUNGSI
        // =========================================================
        fetchFinancialData();
        setInterval(fetchFinancialData, 5000);
        fetchHealthData();
        setInterval(fetchHealthData, 5000);
        // Nanti kita akan panggil fungsi untuk data aktivitas di sini
    });
