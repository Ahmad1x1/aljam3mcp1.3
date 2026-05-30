/**
 * Aljam3 API Client v2.0
 * Dibangun berdasarkan source code resmi aljam3-web-app dan swagger.yaml
 *
 * Struktur response resmi:
 *   GET /api/v1/authors          → { pagination, authors: [...] }
 *   GET /api/v1/authors/:id      → { id, name, books_count, link, [books: [...]] }
 *   GET /api/v1/books            → { pagination, books: [...] }
 *   GET /api/v1/books/:id        → { id, title, author, category, library, pages_count, files_count, views_count, volumes, link, [files: [...]] }
 *   GET /api/v1/categories       → { categories: [...] }
 *   GET /api/v1/categories/:id   → { id, name, books_count, link, [books: [...]] }
 *   GET /api/v1/libraries        → { libraries: [...] }
 *   GET /api/v1/libraries/:id    → { id, name, books_count, link, [books: [...]] }
 *   GET /api/v1/files/:id        → { id, name, pages_count, urls: {pdf, docx, txt}, link, [pages: [...]] }
 *   GET /api/v1/files/:id/pages  → { pages: [{id, content, number}, ...] }
 *   GET /api/v1/search           → { pagination, pages: [{id, content, number, book: {...}}, ...] }
 *
 * TIDAK ADA endpoint GET /api/v1/files/:id/pages/:number
 * Cara baca halaman: GET /api/v1/files/:id/pages  → ambil semua, atau
 *                    GET /api/v1/files/:id?expand[]=pages&page=N&limit=1
 */

const BASE_URL = 'https://aljam3.com/api/v1';

async function request(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}`);

  for (const [key, val] of Object.entries(params)) {
    if (val === undefined || val === null) continue;
    if (Array.isArray(val)) {
      for (const v of val) url.searchParams.append(`${key}[]`, v);
    } else if (key === 'expand') {
      // expand[] harus di-append per value
      const values = Array.isArray(val) ? val : [val];
      for (const v of values) url.searchParams.append('expand[]', v);
    } else {
      url.searchParams.set(key, val);
    }
  }

  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json', 'User-Agent': 'aljam3-mcp/2.0' },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url.toString()}`);
  return res.json();
}

// ─── Authors ──────────────────────────────────────────────────────────────────
// Response: { pagination, authors: [{id, name, books_count, link}] }

export const listAuthors = (q, limit = 20, page = 1) =>
  request('/authors', { q, limit, page });

// Response: { id, name, books_count, link, [pagination, books: [{id, title, ...}]] }
// expand=books: tambahkan daftar kitab pengarang
export const getAuthor = (id, { q, limit = 20, page = 1, expandBooks = false } = {}) =>
  request(`/authors/${id}`, { q, limit, page, expand: expandBooks ? 'books' : undefined });

// ─── Books ────────────────────────────────────────────────────────────────────
// Response: { pagination, books: [{id, title, author, category, library, pages_count, files_count, views_count, volumes, link}] }

export const listBooks = (q, limit = 20, page = 1) =>
  request('/books', { q, limit, page });

// Response: { id, title, author, category, library, pages_count, files_count, views_count, volumes, link, [files: [{id, name, pages_count, urls, link}]] }
// expand=files: tambahkan daftar file kitab (id, name, pages_count, urls.pdf/docx/txt, link)
export const getBook = (id, expandFiles = false) =>
  request(`/books/${id}`, { expand: expandFiles ? 'files' : undefined });

// ─── Categories ───────────────────────────────────────────────────────────────
// Response: { categories: [{id, name, books_count, link}] }
export const listCategories = () => request('/categories');

// Response: { id, name, books_count, link, [pagination, books: [...]] }
export const getCategory = (id, { q, limit = 20, page = 1, expandBooks = false } = {}) =>
  request(`/categories/${id}`, { q, limit, page, expand: expandBooks ? 'books' : undefined });

// ─── Libraries ────────────────────────────────────────────────────────────────
// Response: { libraries: [{id, name, books_count, link}] }
export const listLibraries = () => request('/libraries');

// Response: { id, name, books_count, link, [pagination, books: [...]] }
export const getLibrary = (id, { q, limit = 20, page = 1, expandBooks = false } = {}) =>
  request(`/libraries/${id}`, { q, limit, page, expand: expandBooks ? 'books' : undefined });

// ─── Files ────────────────────────────────────────────────────────────────────
// Response: { id, name, pages_count, urls: {pdf, docx, txt}, link, [pagination, pages: [{id, content, number}]] }
// expand=pages + limit + page: ambil halaman dengan paginasi
export const getFile = (id, { expandPages = false, limit = 20, page = 1 } = {}) =>
  request(`/files/${id}`, { expand: expandPages ? 'pages' : undefined, limit, page });

// Response: { pages: [{id, content, number}] }
// Mengembalikan SEMUA halaman file (tanpa paginasi)
export const getFilePages = (id) => request(`/files/${id}/pages`);

/**
 * Baca satu halaman berdasarkan nomor halaman cetak.
 * Strategi: pakai expand[]=pages + page=N + limit=1 pada /files/:id
 * karena TIDAK ADA endpoint /files/:id/pages/:number di API resmi.
 *
 * @param {number} fileId - ID file dari getBook(expand=files)
 * @param {number} pageNumber - nomor halaman cetak (1-based)
 */
export async function getPage(fileId, pageNumber) {
  const data = await request(`/files/${fileId}`, {
    expand: 'pages',
    limit: 1,
    page: pageNumber,
  });
  // Response: { id, name, ..., pages: [{id, content, number}] }
  const pages = data.pages;
  if (!pages || pages.length === 0) {
    throw new Error(`Halaman ${pageNumber} tidak ditemukan di file ${fileId}`);
  }
  // Gabungkan info file + halaman untuk format yang kaya
  return {
    file: {
      id: data.id,
      name: data.name,
      pages_count: data.pages_count,
      urls: data.urls,
    },
    page: pages[0],
  };
}

/**
 * Baca beberapa halaman sekaligus.
 * Menggunakan paginasi: limit=N, page=startPage
 */
export async function getPages(fileId, fromPage, toPage) {
  const limit = toPage - fromPage + 1;
  const data = await request(`/files/${fileId}`, {
    expand: 'pages',
    limit,
    page: fromPage,
  });
  return {
    file: {
      id: data.id,
      name: data.name,
      pages_count: data.pages_count,
      urls: data.urls,
    },
    pages: data.pages || [],
    pagination: data.pagination,
  };
}

/**
 * Cari file_id utama dari sebuah kitab.
 * Mengembalikan file pertama yang tersedia.
 */
export async function getMainFileId(bookId) {
  const data = await getBook(bookId, true);
  const files = data.files;
  if (!files || files.length === 0) {
    throw new Error(`Kitab ID ${bookId} tidak memiliki file teks yang tersedia.`);
  }
  const f = files[0];
  return { fileId: f.id, name: f.name, pagesCount: f.pages_count, urls: f.urls };
}

// ─── Search ───────────────────────────────────────────────────────────────────
// Response: { pagination, pages: [{id, content, number, book: {id, title, author, ...}}] }
// Filter: library (int), books[] (int[]), authors[] (int[]), categories[] (int[])
export const search = (query, { library, books, authors, categories, limit = 20, page = 1 } = {}) =>
  request('/search', {
    q: query,
    library,
    ...(books    ? { 'books':      books    } : {}),
    ...(authors  ? { 'authors':    authors  } : {}),
    ...(categories ? { 'categories': categories } : {}),
    limit,
    page,
  });
