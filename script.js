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

        // GANTI SELURUH FUNGSI fetchFinancialData DENGAN VERSI BARU INI

async function fetchFinancialData() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/finances`);
        const data = await response.json();
        console.log('📦 Data Keuangan diterima dari backend:', data);

        // Siapkan variabel untuk semua kalkulasi
        let totalPemasukan = 0;
        let totalPengeluaran = 0;
        let saldoBank = 0;
        let saldoEwallet = 0;
        let saldoCash = 0;

        data.forEach(item => {
            const jumlah = parseFloat(item.Nominal) || 0;
            const sumberDana = item['Sumber Dana'] ? item['Sumber Dana'].toLowerCase() : '';

            // Kalkulasi Pemasukan & Pengeluaran Total
            if (item['Jenis Transaksi'] === 'Pemasukan') {
                totalPemasukan += jumlah;
                // Tambahkan pemasukan ke sumber dana yang sesuai
                if (sumberDana === 'bank') saldoBank += jumlah;
                if (sumberDana === 'e-wallet') saldoEwallet += jumlah;
                if (sumberDana === 'cash') saldoCash += jumlah;
            } else if (item['Jenis Transaksi'] === 'Pengeluaran') {
                totalPengeluaran += jumlah;
                // Kurangi pengeluaran dari sumber dana yang sesuai
                if (sumberDana === 'bank') saldoBank -= jumlah;
                if (sumberDana === 'e-wallet') saldoEwallet -= jumlah;
                if (sumberDana === 'cash') saldoCash -= jumlah;
            }
        });
        
        const totalSaldo = totalPemasukan - totalPengeluaran;

        // Fungsi untuk format ke Rupiah
        const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', {
            style: 'currency', currency: 'IDR', minimumFractionDigits: 0
        }).format(angka);
        
        // Update semua elemen di HTML
        document.getElementById('pemasukan-value').textContent = formatRupiah(totalPemasukan);
        document.getElementById('pengeluaran-value').textContent = formatRupiah(totalPengeluaran);
        document.getElementById('saldo-bank').textContent = formatRupiah(saldoBank);
        document.getElementById('saldo-ewallet').textContent = formatRupiah(saldoEwallet);
        document.getElementById('saldo-cash').textContent = formatRupiah(saldoCash);
        document.getElementById('sisa-saldo-value').textContent = formatRupiah(totalSaldo);

    } catch (error) {
        console.error('Gagal mengambil data keuangan:', error);
        // Bisa ditambahkan handling error untuk semua elemen jika perlu
    }
}

                // GANTI SELURUH BLOK forEach DENGAN INI

data.forEach((item, index) => {
    console.log(`--- Memproses Baris ke-${index} ---`);

    const jenisTransaksi = item['Jenis Transaksi'];
    const nominalString = item.Nominal;
    
    console.log(`Mencoba membaca:`, { jenis: jenisTransaksi, nominal: nominalString });

    if (!nominalString) {
        console.log('HASIL: Nominal kosong, dilewati.');
        return; // Lanjut ke item berikutnya
    }
    
    // Membersihkan string dari karakter aneh
    const nominalBersih = nominalString.replace(/[^0-9]/g, '');
    const jumlah = parseFloat(nominalBersih) || 0;

    console.log(`Setelah dibersihkan:`, { stringBersih: nominalBersih, angkaHasil: jumlah });

    if (jenisTransaksi === 'Pemasukan') {
        totalPemasukan += jumlah;
        console.log(`Ditemukan Pemasukan. Total Pemasukan sekarang: ${totalPemasukan}`);
    } else if (jenisTransaksi === 'Pengeluaran') {
        totalPengeluaran += jumlah;
        console.log(`Ditemukan Pengeluaran. Total Pengeluaran sekarang: ${totalPengeluaran}`);
    } else {
        console.log(`HASIL: Jenis Transaksi tidak dikenal: "${jenisTransaksi}"`);
    }
    console.log('---------------------------------');
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

        // api buat activity
        // GANTI SELURUH FUNGSI fetchActivityData DENGAN KODE INI

async function fetchActivityData() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/activities`);
        const data = await response.json();
        console.log('📦 Data Aktivitas diterima dari backend:', data);

        const listContainer = document.getElementById('activity-log-list');
        if (!listContainer) return;

        // Kosongkan kontainer
        listContainer.innerHTML = '';

        if (!data || data.length === 0) {
            listContainer.innerHTML = '<li class="placeholder">Belum ada aktivitas tercatat.</li>';
            return;
        }

        // Ambil 10 data terakhir dan balik urutannya (terbaru di atas)
        const recentData = data.slice(-10).reverse();

        recentData.forEach(item => {
            const listItem = document.createElement('li');
            listItem.className = 'activity-log-item';

            // --- PERBAIKAN DI SINI ---
            // Menggunakan nama kolom dari Google Sheet-mu
            const tanggal = item['Kapan ngelakuinnya?'] || '';
            const waktu = item['Waktunya?'] || '';
            const aktivitas = item['Kamu emang ngapain?'] || '-';
            const notes = item.Notes || ''; // Kolom Notes juga bisa dipakai

            listItem.innerHTML = `
                <div class="activity-log-time">
                    <span class="date">${tanggal}</span>
                    <span class="time">${waktu}</span>
                </div>
                <div class="activity-log-details">
                    <span class="title">${aktivitas}</span>
                    <span class="notes">${notes}</span>
                </div>
            `;
            listContainer.appendChild(listItem);
        });

    } catch (error) {
        console.error('Gagal mengambil data aktivitas:', error);
    }
}
    
        // =========================================================
        // MEMANGGIL SEMUA FUNGSI
        // =========================================================
        fetchFinancialData();
        setInterval(fetchFinancialData, 5000);
        fetchHealthData();
        setInterval(fetchHealthData, 5000);
        fetchActivityData();
        setInterval(fetchActivityData, 5000);
    
    });
