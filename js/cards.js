/* ============================================================
   cards.js — Keberuntungan (Chance) & Kas Umum (Community)
   ============================================================ */

var CHANCE_CARDS = [
    { text:'Pindah ke BOND (Bundaran HI). Terima Rp 2.000.', effect:'moveToGo' },
    { text:'Pindah ke Jakarta Pusat. Lewati BOND, terima Rp 2.000.', effect:'moveTo', target:39 },
    { text:'Pindah ke PLN terdekat. Lewati BOND, terima Rp 2.000.', effect:'moveToNearestUtility' },
    { text:'Pindah ke stasiun kereta terdekat. Lewati BOND, terima Rp 2.000.', effect:'moveToNearestRailroad' },
    { text:'Bank membayar Anda Rp 1.500.', effect:'collect', amount:1500 },
    { text:'Keluar dari Penjara GRATIS.', effect:'getOutOfJail' },
    { text:'Maju 3 langkah ke belakang.', effect:'moveBack3' },
    { text:'Masuk Penjara! Jangan lewat BOND.', effect:'goToJail' },
    { text:'Bayar biaya perbaikan: Rp 250 per rumah, Rp 1.000 per hotel.', effect:'payPerHouse', houseAmt:250, hotelAmt:1000 },
    { text:'Bayar denda tilang Rp 1.500.', effect:'pay', amount:1500 },
    { text:'Pindah ke Surabaya. Lewati BOND, terima Rp 2.000.', effect:'moveTo', target:18 },
    { text:'Pindah ke Bandung. Lewati BOND, terima Rp 2.000.', effect:'moveTo', target:16 },
    { text:'Pindah ke Makassar. Lewati BOND, terima Rp 2.000.', effect:'moveTo', target:9 },
    { text:'Setiap pemain membayar Anda Rp 500.', effect:'collectFromEach', amount:500 },
    { text:'Anda menang lomba makan rendang! Terima Rp 1.000.', effect:'collect', amount:1000 },
    { text:'Bayar pajak tambahan Rp 300.', effect:'pay', amount:300 }
];

var COMMUNITY_CARDS = [
    { text:'Pindah ke BOND. Terima Rp 2.000.', effect:'moveToGo' },
    { text:'Bank salah hitung. Terima Rp 2.000.', effect:'collect', amount:2000 },
    { text:'Biaya dokter. Bayar Rp 500.', effect:'pay', amount:500 },
    { text:'Jual saham. Terima Rp 500.', effect:'collect', amount:500 },
    { text:'Keluar dari Penjara GRATIS.', effect:'getOutOfJail' },
    { text:'Masuk Penjara! Jangan lewat BOND.', effect:'goToJail' },
    { text:'Dapat THR Lebaran! Terima Rp 2.000.', effect:'collect', amount:2000 },
    { text:'Refund pajak. Terima Rp 200.', effect:'collect', amount:200 },
    { text:'Ulang tahun! Terima Rp 1.000 dari setiap pemain.', effect:'collectFromEach', amount:1000 },
    { text:'Asuransi jatuh tempo. Terima Rp 1.000.', effect:'collect', amount:1000 },
    { text:'Biaya rumah sakit. Bayar Rp 1.000.', effect:'pay', amount:1000 },
    { text:'Biaya sekolah anak. Bayar Rp 500.', effect:'pay', amount:500 },
    { text:'Konsultasi jasa. Terima Rp 250.', effect:'collect', amount:250 },
    { text:'Kena tilang! Bayar Rp 1.000.', effect:'pay', amount:1000 },
    { text:'Juara 2 kontes batik! Terima Rp 100.', effect:'collect', amount:100 },
    { text:'Warisan dari saudara jauh. Terima Rp 1.000.', effect:'collect', amount:1000 }
];
