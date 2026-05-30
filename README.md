# Aljam3 MCP Server v1.1

MCP Server untuk **aljam3.com** — akses dan **baca isi kitab** Islam digital langsung dari Claude.

Dibangun dengan pola yang sama persis dengan [Turath MCP Server](https://turath-production.up.railway.app).

---

## ✨ Yang Baru di v1.1

Ditambahkan **2 tools pembaca konten** yang sebelumnya hilang:

| Tool Baru | Fungsi |
|---|---|
| `baca_halaman` | Baca teks lengkap satu halaman kitab |
| `baca_beberapa_halaman` | Baca rentang halaman sekaligus (mode penuh/ringkas) |

---

## Tools Lengkap (12 tools)

| # | Tool | Fungsi |
|---|------|--------|
| 1 | `list_authors` | Daftar / cari pengarang |
| 2 | `get_author` | Detail pengarang + kitabnya |
| 3 | `list_books` | Daftar / cari kitab |
| 4 | `get_book` | Detail kitab + file-nya (gunakan expand_files=true) |
| 5 | `list_categories` | Semua kategori ilmu |
| 6 | `get_category` | Detail kategori + kitabnya |
| 7 | `list_libraries` | Semua perpustakaan |
| 8 | `get_library` | Detail perpustakaan + koleksinya |
| 9 | `get_file` | Detail file (PDF/TXT) + pratinjau halaman |
| 10 | `search` | Cari teks di seluruh halaman kitab |
| 11 | `baca_halaman` | ★ Baca teks lengkap satu halaman |
| 12 | `baca_beberapa_halaman` | ★ Baca rentang halaman (penuh/ringkas) |

---

## Alur Penggunaan untuk Membaca Kitab

```
1. Cari kitab          → list_books (q="nama kitab")
2. Dapatkan file_id    → get_book (book_id=..., expand_files=true)
3. Baca isi kitab      → baca_halaman (file_id=..., halaman=1)
   atau scan cepat     → baca_beberapa_halaman (file_id=..., dari_halaman=1, sampai_halaman=10, mode="ringkas")
```

---

## 🚀 Deploy ke Railway

### Langkah 1 — Push ke GitHub

```bash
git init
git add .
git commit -m "v1.1: tambah baca_halaman & baca_beberapa_halaman"
git remote add origin https://github.com/USERNAME/aljam3-mcp.git
git push -u origin main
```

### Langkah 2 — Deploy di Railway

1. Buka [railway.app](https://railway.app) → Login
2. Klik **New Project → Deploy from GitHub repo**
3. Pilih repo `aljam3-mcp`
4. Railway otomatis detect `railway.toml` dan jalankan `npm start`
5. Tunggu beberapa menit → Railway beri URL seperti:
   ```
   https://aljam3-mcp-production.up.railway.app
   ```

### Langkah 3 — Verifikasi

```json
{
  "status": "ok",
  "service": "Aljam3 MCP Server",
  "version": "1.1.0",
  "tools": ["list_authors", ..., "baca_halaman", "baca_beberapa_halaman"]
}
```

---

## 🔌 Connect ke Claude.ai

1. **Settings → Integrations → Add Integration**
2. URL: `https://aljam3-mcp-production.up.railway.app/mcp`

---

## Struktur Project

```
aljam3-mcp/
├── src/
│   ├── server.js    ← MCP server utama (12 tools)
│   ├── api.js       ← HTTP client ke aljam3.com API
│   └── format.js    ← Helper format output
├── package.json
├── railway.toml
└── README.md
```

---

## API yang Digunakan

- `GET /api/v1/authors[/:id]`
- `GET /api/v1/books[/:id]`
- `GET /api/v1/categories[/:id]`
- `GET /api/v1/libraries[/:id]`
- `GET /api/v1/files/:id[/pages/:page]`  ← dipakai baca_halaman
- `GET /api/v1/search`
