# Aljam3 MCP Server v2.0

MCP Server untuk [aljam3.com](https://aljam3.com) — akses dan baca isi kitab Islam digital dari Claude.

## Changelog v2.0

Dibangun ulang berdasarkan **source code resmi** `aljam3-web-app` dan `swagger.yaml`.

### Perbaikan utama:
- **Struktur response API benar** — response key resmi: `authors[]`, `books[]`, `categories[]`, `libraries[]`, `pages[]`, `files[]` (bukan `data[]` seperti versi sebelumnya)
- **`baca_halaman` diperbaiki** — menggunakan endpoint resmi `/api/v1/files/:id?expand[]=pages&page=N&limit=1` (endpoint `/files/:id/pages/:number` tidak ada di API resmi)
- **`get_book(expand_files=true)` berfungsi** — parameter `expand[]` dikirim dengan benar
- **Pagination disesuaikan** — field resmi: `current_page`, `total_pages`, `count`
- **Search response** — hasil di `pages[]` dengan `book` embedded, bukan `data[]`
- **Format output lebih kaya** — menampilkan `page_id`, `urls.pdf/docx/txt`, `views_count`

## Alur penggunaan

```
1. search("الصلاة")                    → dapat book_id + file_id
2. get_book(book_id, expand_files=true) → dapat file_id
3. baca_halaman(file_id, 15)            → baca halaman 15
```

## Deploy ke Railway

```bash
npm install
npm start
```

## Endpoint API

- `GET /` — health check
- `POST /mcp` — MCP endpoint
