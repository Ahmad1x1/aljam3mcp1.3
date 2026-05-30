/**
 * Format output untuk tools Aljam3 MCP v2.0
 * Disesuaikan dengan struktur response resmi dari aljam3-web-app
 *
 * Struktur field resmi:
 *   author:   { id, name, books_count, link }
 *   book:     { id, title, author, category, library, pages_count, files_count, views_count, volumes, link }
 *   category: { id, name, books_count, link }
 *   library:  { id, name, books_count, link }
 *   file:     { id, name, pages_count, urls: {pdf, docx, txt}, link }
 *   page:     { id, content, number }
 *   pagination: { from, to, count, current_page, total_pages, limit, next_page, next_page_link, previous_page, previous_page_link }
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripHtml(str) {
  return (str || '').replace(/<[^>]+>/g, '').trim();
}

function paginationInfo(p) {
  if (!p) return '';
  return `hal. ${p.current_page}/${p.total_pages} (${p.count} total)`;
}

// ─── Author ───────────────────────────────────────────────────────────────────

export function formatAuthor(a) {
  const lines = [
    `✍️  ${a.name || '—'}  (author_id: ${a.id})`,
    a.books_count != null ? `📚 Jumlah kitab: ${a.books_count}` : null,
  ];
  return lines.filter(Boolean).join('\n');
}

export function formatAuthorList(data, label = 'Pengarang') {
  if (!data?.authors?.length) return `ℹ️ ${label}: tidak ada hasil.`;
  const p = data.pagination;
  const header = `✍️  ${label} — ${paginationInfo(p)}\n`;
  const items = data.authors.map((a, i) => `[${i + 1}] ${formatAuthor(a)}`).join('\n\n');
  return header + '\n' + items;
}

// ─── Book ─────────────────────────────────────────────────────────────────────

export function formatBook(b) {
  const lines = [
    `📖 ${stripHtml(b.title) || '—'}  (book_id: ${b.id})`,
    b.author?.name  ? `✍️  Pengarang: ${b.author.name}`   : null,
    b.category?.name ? `🏷️  Kategori: ${b.category.name}` : null,
    b.library?.name  ? `🏛️  Perpustakaan: ${b.library.name}` : null,
    b.pages_count   ? `📄 Halaman: ${b.pages_count}`      : null,
    b.files_count   ? `📁 File tersedia: ${b.files_count}` : null,
    b.views_count   ? `👁  Dilihat: ${b.views_count}x`    : null,
  ];
  return lines.filter(Boolean).join('\n');
}

export function formatBookList(data, label = 'Kitab') {
  if (!data?.books?.length) return `ℹ️ ${label}: tidak ada hasil.`;
  const p = data.pagination;
  const header = `📚 ${label} — ${paginationInfo(p)}\n`;
  const items = data.books.map((b, i) => `[${i + 1}] ${formatBook(b)}`).join('\n\n');
  return header + '\n' + items;
}

// ─── File ─────────────────────────────────────────────────────────────────────

export function formatFile(f) {
  const lines = [
    `📁 ${f.name || 'File'}  (file_id: ${f.id})`,
    f.pages_count ? `📑 Halaman: ${f.pages_count}`  : null,
    f.urls?.pdf   ? `🔗 PDF: ${f.urls.pdf}`          : null,
    f.urls?.docx  ? `🔗 DOCX: ${f.urls.docx}`        : null,
    f.urls?.txt   ? `🔗 TXT: ${f.urls.txt}`           : null,
  ];
  return lines.filter(Boolean).join('\n');
}

export function formatFileWithPages(data) {
  let text = formatFile(data);
  if (data.pagination) {
    text += `\n📊 ${paginationInfo(data.pagination)}`;
  }
  if (data.pages?.length) {
    const halaman = data.pages
      .slice(0, 5)
      .map(p => `  📄 Hal. ${p.number}: ${stripHtml(p.content).slice(0, 120)}…`)
      .join('\n');
    text += `\n\nPratinjau ${Math.min(data.pages.length, 5)} Halaman Pertama:\n${halaman}`;
  }
  return text;
}

// ─── Category & Library ───────────────────────────────────────────────────────

export function formatCategory(c) {
  return [
    `🏷️  ${c.name || '—'}  (category_id: ${c.id})`,
    c.books_count ? `📚 Jumlah kitab: ${c.books_count}` : null,
  ].filter(Boolean).join('\n');
}

export function formatLibrary(lib) {
  return [
    `🏛️  ${lib.name || '—'}  (library_id: ${lib.id})`,
    lib.books_count ? `📚 Jumlah kitab: ${lib.books_count}` : null,
  ].filter(Boolean).join('\n');
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * Format satu halaman.
 * Input: { file: {id, name, pages_count, urls}, page: {id, content, number} }
 */
export function formatPage(data) {
  const { file, page } = data;
  const header = [
    '─'.repeat(50),
    `📖 ${file.name || '—'}  (file_id: ${file.id})`,
    `📄 Halaman: ${page.number}  (page_id: ${page.id})`,
    '─'.repeat(50),
  ].join('\n');

  const body = stripHtml(page.content) || '(konten kosong)';
  return header + '\n\n' + body;
}

/**
 * Format beberapa halaman.
 * Input: { file, pages: [{id, content, number}], pagination }
 */
export function formatPages(data, mode = 'penuh') {
  const { file, pages, pagination } = data;
  const modeLabel = mode === 'ringkas'
    ? '(mode ringkas — gunakan baca_halaman untuk teks penuh)'
    : '(mode penuh)';

  const header = [
    `📖 ${file.name || '—'}  (file_id: ${file.id})`,
    `📄 ${pages.length} halaman  ${modeLabel}`,
    pagination ? `📊 ${paginationInfo(pagination)}` : '',
  ].filter(Boolean).join('\n');

  const parts = pages.map(p => {
    const content = stripHtml(p.content);
    if (mode === 'ringkas') {
      const awal = content
        .split('\n')
        .filter(l => l.trim())
        .slice(0, 3)
        .join(' ')
        .slice(0, 250);
      return `📄 Hal. ${p.number}: ${awal}…`;
    }
    return [
      '─'.repeat(40),
      `📄 Halaman ${p.number}  (page_id: ${p.id})`,
      '',
      content || '(kosong)',
    ].join('\n');
  });

  return header + '\n\n' + parts.join('\n');
}

// ─── Search ───────────────────────────────────────────────────────────────────

/**
 * Format hasil search.
 * Response: { pagination, pages: [{id, content, number, book: {id, title, author, ...}}] }
 */
export function formatSearchResults(data, query) {
  if (!data?.pages?.length) return `🔍 Pencarian "${query}": tidak ada hasil.`;

  const p = data.pagination;
  const header = `🔍 Hasil pencarian "${query}" — ${paginationInfo(p)}\n`;

  const items = data.pages.map((page, i) => {
    const book = page.book || {};
    const lines = [
      `[${i + 1}] 📖 ${stripHtml(book.title) || '—'}  (book_id: ${book.id || '—'})`,
      book.author?.name ? `    ✍️  ${book.author.name}` : null,
      page.number       ? `    📄 Halaman: ${page.number}  (page_id: ${page.id})` : null,
      page.content
        ? `    💬 ${stripHtml(page.content).slice(0, 200)}…`
        : null,
    ];
    return lines.filter(Boolean).join('\n');
  });

  return header + '\n' + items.join('\n\n');
}

// ─── Category/Library dengan buku ─────────────────────────────────────────────

export function formatCategoryWithBooks(data) {
  let text = formatCategory(data);
  if (data.pagination) text += `\n📊 ${paginationInfo(data.pagination)}`;
  if (data.books?.length) {
    const buku = data.books.map((b, i) => `  [${i + 1}] ${formatBook(b)}`).join('\n\n');
    text += '\n\n📚 Daftar Kitab:\n' + buku;
  }
  return text;
}

export function formatLibraryWithBooks(data) {
  let text = formatLibrary(data);
  if (data.pagination) text += `\n📊 ${paginationInfo(data.pagination)}`;
  if (data.books?.length) {
    const buku = data.books.map((b, i) => `  [${i + 1}] ${formatBook(b)}`).join('\n\n');
    text += '\n\n📚 Koleksi Kitab:\n' + buku;
  }
  return text;
}

export function formatAuthorWithBooks(data) {
  let text = formatAuthor(data);
  if (data.pagination) text += `\n📊 ${paginationInfo(data.pagination)}`;
  if (data.books?.length) {
    const buku = data.books.map((b, i) => `  [${i + 1}] ${formatBook(b)}`).join('\n\n');
    text += '\n\n📚 Kitab karya pengarang ini:\n' + buku;
  }
  return text;
}

export function formatBookWithFiles(data) {
  let text = formatBook(data);
  if (data.files?.length) {
    const files = data.files.map((f, i) =>
      `  [${i + 1}] ${formatFile(f)}`
    ).join('\n\n');
    text += '\n\n📁 File Tersedia:\n' + files;
    text += '\n\n💡 Gunakan file_id di atas dengan tool baca_halaman untuk membaca isi kitab.';
  }
  return text;
}
