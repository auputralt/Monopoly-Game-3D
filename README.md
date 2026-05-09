<div align="center">

# 🎲 MONOPOLY INDONESIA 3D

<img src="Asset/Big Middle Picture.png" alt="Monopoly Indonesia 3D" width="600"/>

**Keliling Nusantara dalam papan permainan 3D**

Monopoly bertema Indonesia yang berjalan langsung di browser dengan papan 3D, token unik, dadu 3D, dan kartu Nusantara.

---

### 🎵 Soundtrack — *The Dealer's Gambit*

<audio controls autoplay loop>
  <source src="Asset/The_Dealer_s_Gambit.mp3" type="audio/mpeg">
  Browser Anda tidak mendukung pemutar audio.
</audio>

---

### 📸 Screenshot

<img src="Asset/Gemini_Generated_Image_jmjxo3jmjxo3jmjx.png" alt="Gameplay Screenshot" width="700"/>

</div>

---

## ✨ Fitur

- **Papan 3D** — Render penuh Three.js dengan kamera orbit
- **2–6 Pemain** — Pilih karakter dan token Nusantara
- **Kartu Kesempatan & Dana Masyarakat** — Efek unik bertema Indonesia
- **Bangun Rumah & Hotel** — Tingkatkan properti untuk sewa lebih tinggi
- **Lelang & Perdagangan** — Tukar properti antar pemain
- **Gadai Properti** — Strategi keuangan pinjaman
- **Penjara** — Bayar, gunakan kartu, atau coba double dadu
- **100% Browser** — Tanpa instalasi, tanpa build step

---

## 🚀 Menjalankan Lokal

```bash
# Clone repository
git clone https://github.com/auputralt/Monopoly-Game-3D.git
cd Monopoly-Game-3D

# Jalankan server lokal
python3 -m http.server 8000
```

Buka di browser:

```
http://localhost:8000
```

---

## 🎮 Cara Bermain

1. **Pilih jumlah pemain** (2–6)
2. **Masukkan nama** dan pilih token
3. **Lempar dadu** untuk bergerak di papan
4. **Beli properti** saat mendarat di kotak yang tersedia
5. **Bangun rumah/hotel** untuk menaikkan sewa
6. **Bankrupt pemain lain** — pemain terakhir yang bertahan menang!

---

## 🛠 Teknologi

| Teknologi | Fungsi |
|-----------|--------|
| [Three.js](https://threejs.org/) | Render 3D (papan, token, dadu) |
| Vanilla JS | Logika game |
| CSS3 | UI & animasi |

---

## 📁 Struktur Proyek

```
Monopoly-Game-3D/
├── Asset/
│   ├── Big Middle Picture.png
│   ├── Gemini_Generated_Image_jmjxo3jmjxo3jmjx.png
│   └── The_Dealer_s_Gambit.mp3
├── css/
│   └── style.css
├── js/
│   ├── board.js
│   ├── cards.js
│   ├── game.js
│   ├── players.js
│   └── renderer.js
├── index.html
└── README.md
```

---

## 📝 Catatan

- Tidak perlu build step — semua file statis
- Jika audio tidak muncul, klik tombol roll atau interaksi pertama di halaman untuk mengaktifkan audio browser
- Dimainkan di desktop browser untuk pengalaman terbaik

---

<div align="center">

**Dibuat dengan ❤️ untuk Nusantara**

</div>
