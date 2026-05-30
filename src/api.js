/**
 * Aljam3 API Client
 * Base URL: https://aljam3.com/api/v1
 */

const BASE_URL = 'https://aljam3.com/api/v1';

async function request(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}`);

  for (const [key, val] of Object.entries(params)) {
    if (val === undefined || val === null) continue;
    if (Array.isArray(val)) {
      for (const v of val) url.searchParams.append(`${key}[]`, v);
    } else {
      url.searchParams.set(key, val);
    }
  }

  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json', 'User-Agent': 'aljam3-mcp/1.1' },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url.toString()}`);
  return res.json();
}

// ─── Authors ──────────────────────────────────────────────────────────────────

export const listAuthors = (q, limit = 20, page = 1) =>
  request('/authors', { q, limit, page });

export const getAuthor = (id, expandBooks = false) =>
  request(`/authors/${id}`, { 'expand[]': expandBooks ? 'books' : undefined });

// ─── Books ────────────────────────────────────────────────────────────────────

export const listBooks = (q, limit = 20, page = 1) =>
  request('/books', { q, limit, page });

export const getBook = (id, expandFiles = false) =>
  request(`/books/${id}`, { 'expand[]': expandFiles ? 'files' : undefined });

// ─── Categories ───────────────────────────────────────────────────────────────

export const listCategories = () =>
  request('/categories');

export const getCategory = (id, expandBooks = false) =>
  request(`/categories/${id}`, { 'expand[]': expandBooks ? 'books' : undefined });

// ─── Libraries ────────────────────────────────────────────────────────────────

export const listLibraries = () =>
  request('/libraries');

export const getLibrary = (id, expandBooks = false) =>
  request(`/libraries/${id}`, { 'expand[]': expandBooks ? 'books' : undefined });

// ─── Files ────────────────────────────────────────────────────────────────────

export const getFile = (id, expandPages = false) =>
  request(`/files/${id}`, { 'expand[]': expandPages ? 'pages' : undefined });

export const getFilePages = (id) =>
  request(`/files/${id}/pages`);

// ─── Pages ────────────────────────────────────────────────────────────────────

/**
 * Baca satu halaman dari file kitab.
 * Aljam3 memakai struktur: /files/:file_id/pages/:page_number
 * page_number = nomor halaman cetak (1-based)
 */
export const getPage = (fileId, pageNumber) =>
  request(`/files/${fileId}/pages/${pageNumber}`);

/**
 * Cari file_id dari sebuah kitab (book_id).
 * Mengembalikan file pertama (biasanya edisi utama).
 */
export async function getMainFileId(bookId) {
  const data = await request(`/books/${bookId}`, { 'expand[]': 'files' });
  const files = data?.files?.data;
  if (!files || files.length === 0) {
    throw new Error(`Kitab ID ${bookId} tidak memiliki file teks yang tersedia.`);
  }
  // Prioritaskan file dengan format 'text' atau 'txt', fallback ke yang pertama
  const textFile = files.find(f =>
    f.format && ['text', 'txt', 'html'].includes(f.format.toLowerCase())
  ) || files[0];
  return { fileId: textFile.id, format: textFile.format, pagesCount: textFile.pages_count };
}

// ─── Search ───────────────────────────────────────────────────────────────────

export const search = (query, { library, books, authors, categories, limit = 20, page = 1 } = {}) =>
  request('/search', { q: query, library, books, authors, categories, limit, page });
