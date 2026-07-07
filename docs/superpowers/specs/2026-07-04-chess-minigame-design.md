# Chess Minigame — Stockfish.js

## Ringkasan
Mini game catur Player vs AI menggunakan Stockfish.js (Web Worker) dan chess.js.
Berjalan di `/chess/`, dark theme sesuai website.

## Lokasi
- URL: `/chess/`
- Tautan dari: navbar (link "Catur") & halaman Gabut (`/portfolio/`)

## Tech Stack
- **chess.js** (CDN) — aturan catur, validasi gerakan, highlight legal moves, notasi
- **Stockfish.js** (CDN, Web Worker) — engine AI, jalan di background thread tanpa nge-block UI
- **HTML/CSS/JS murni** — tanpa framework/bundler, cocok static Cloudflare Pages

## Layout
2 kolom responsif:
- Kiri: papan catur (8x8, klik/drag bidak)
- Kanan: kontrol (level, new game) + notasi langkah + status permainan + dashboard statistik (tabel win/loss per level)

## Difficulty
6 level (skill parameter Stockfish 0-20):

| Level | Nama | Skill SF |
|-------|------|----------|
| 1 | Pemula | 0 |
| 2 | Mudah | 3 |
| 3 | Menengah | 6 |
| 4 | Sulit | 10 |
| 5 | Expert | 15 |
| 6 | Grandmaster | 20 |

## Fitur
1. **Drag & Drop** — bidak dipindah dengan mouse drag atau klik-klik
2. **Highlight legal moves** — kotak hijau/gelap menunjukkan bidak yang bisa dipindah dan targetnya
3. **Notasi langkah** — riwayat ditampilkan di panel kanan (format algebraic notation)
4. **Flip board** — papan otomatis putih di bawah, hitam di atas
5. **Status** — indikator giliran, check, checkmate, stalemate
6. **New Game** — reset permainan dengan level yang dipilih
7. **Statistik Win/Loss per Level** — dicatat di localStorage:
   - Tabel ringkasan menampilkan: Level, Menang, Kalah, Total, Win Rate
   - Di-reset otomatis tiap New Game (game sebelumnya tercatat)
   - Data per level terpisah (Pemula, Mudah, Menengah, dst)

## File Baru
- `/chess/index.html` — halaman (inline style + script, tanpa file eksternal tambahan)
- Tidak perlu ubah file CSS/JS existing

## Integrasi
- `index.html` navbar: tambah link `<a href="/chess/">Catur</a>`
- `portfolio/index.html`: tambah kartu project catur

## Alur Game
1. User pilih level → klik New Game
2. Stockfish diinit dengan skill level sesuai
3. User main putih, Stockfish main hitam
4. User klik/drag bidak → highlight legal moves → user pilih gerakan
5. chess.js validasi → update board → kirim FEN ke Stockfish
6. Stockfish pikir → balikin gerakan → update board
7. Ulang sampai checkmate/stalemate/serah

## Edge Cases
- User klik saat Stockfish sedang mikir: dicegah (board lock)
- Stockfish butuh waktu: loading spinner di panel status
- Check/Checkmate/Stalemate: overlay notifikasi
- Level diganti di tengah game: tidak terapkan sampai New Game
