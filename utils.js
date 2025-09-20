// utils.js

function padZero(num) {
    return num < 10 ? '0' + num : num;
}

function parseDate(dateString) {
    if (!dateString) return null;
    const parts = dateString.split('/');
    if (parts.length === 3) {
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return new Date(dateString);
}

const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0
}).format(angka);
