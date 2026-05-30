/**
 * Aljam3 MCP Server v2.0
 * ─────────────────────────────────────────────────────────────────────────────
 * Dibangun ulang berdasarkan source code resmi aljam3-web-app dan swagger.yaml
 *
 * Perubahan dari v1.x:
 *   - Struktur response API disesuaikan dengan yang sebenarnya (dari jbuilder views)
 *   - Endpoint baca_halaman menggunakan /files/:id?expand[]=pages&page=N&limit=1
 *     (tidak ada endpoint /files/:id/pages/:number di API resmi)
 *   - Key response: authors[], books[], categories[], libraries[], pages[], files[]
 *     (bukan data[] seperti v1)
 *   - Pagination field: current_page, total_pages, count (bukan page, total_pages)
 *   - Search hasil ada di pages[] dengan field book embedded
 *   - Semua filter array menggunakan books[], authors[], categories[] (dengan suffix [])
 *
 * Tools:
 *   1.  list_authors
 *   2.  get_author
 *   3.  list_books
 *   4.  get_book
 *   5.  list_categories
 *   6.  get_category
 *   7.  list_libraries
 *   8.  get_library
 *   9.  get_file
 *   10. search
 *   11. baca_halaman         ★ menggunakan expand[]=pages
 *   12. baca_beberapa_halaman ★ menggunakan expand[]=pages + limit
 *
 * Endpoint : POST/GET/DELETE /mcp
 * Health   : GET /
 */

import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { randomUUID } from 'crypto';

import * as api from './api.js';
import {
  formatAuthor,
  formatAuthorList,
  formatAuthorWithBooks,
  formatBook,
  formatBookList,
  formatBookWithFiles,
  formatCategory,
  formatCategoryWithBooks,
  formatLibrary,
  formatLibraryWithBooks,
  formatFile,
  formatFileWithPages,
  formatPage,
  formatPages,
  formatSearchResults,
} from './format.js';

const app  = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit: '2mb' }));

function createMcpServer() {
  const server = new McpServer({ name: 'aljam3-mcp', version: '2.0.0' });

  // ══════════════════════════════════════════════════════════════════════════
  // Tool 1: list_authors
  // ══════════════════════════════════════════════════════════════════════════
  server.registerTool('list_authors', {
    description:
      'Daftar pengarang dari perpustakaan digital Aljam3.com. ' +
      'Gunakan parameter q untuk mencari nama pengarang.',
    inputSchema: z.object({
      q:     z.string().optional().describe('Kata kunci nama pengarang. Contoh: "ابن تيمية"'),
      limit: z.number().int().min(1).max(1000).optional().default(20),
      page:  z.number().int().positive().optional().default(1),
    }),
  }, async ({ q, limit, page }) => {
    try {
      const data = await api.listAuthors(q, limit, page);
      return { content: [{ type: 'text', text: formatAuthorList(data, q ? `Pencarian pengarang "${q}"` : 'Daftar Pengarang') }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `❌ Error: ${err.message}` }] };
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Tool 2: get_author
  // ══════════════════════════════════════════════════════════════════════════
  server.registerTool('get_author', {
    description:
      'Detail lengkap seorang pengarang berdasarkan ID-nya. ' +
      'Dapat sekaligus menampilkan daftar kitab karya pengarang tersebut.',
    inputSchema: z.object({
      author_id:    z.number().int().positive().describe('ID pengarang di Aljam3.'),
      expand_books: z.boolean().optional().default(false).describe('Set true untuk menampilkan daftar kitab pengarang ini.'),
      q:     z.string().optional().describe('Filter kitab berdasarkan judul.'),
      limit: z.number().int().min(1).max(1000).optional().default(20),
      page:  z.number().int().positive().optional().default(1),
    }),
  }, async ({ author_id, expand_books, q, limit, page }) => {
    try {
      const data = await api.getAuthor(author_id, { q, limit, page, expandBooks: expand_books });
      const text = expand_books ? formatAuthorWithBooks(data) : formatAuthor(data);
      return { content: [{ type: 'text', text }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `❌ Error: ${err.message}` }] };
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Tool 3: list_books
  // ══════════════════════════════════════════════════════════════════════════
  server.registerTool('list_books', {
    description:
      'Daftar kitab/buku dari Aljam3.com dengan opsional pencarian judul.',
    inputSchema: z.object({
      q:     z.string().optional().describe('Kata kunci judul kitab. Contoh: "صحيح البخاري"'),
      limit: z.number().int().min(1).max(1000).optional().default(20),
      page:  z.number().int().positive().optional().default(1),
    }),
  }, async ({ q, limit, page }) => {
    try {
      const data = await api.listBooks(q, limit, page);
      return { content: [{ type: 'text', text: formatBookList(data, q ? `Pencarian kitab "${q}"` : 'Daftar Kitab') }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `❌ Error: ${err.message}` }] };
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Tool 4: get_book
  // ══════════════════════════════════════════════════════════════════════════
  server.registerTool('get_book', {
    description:
      'Detail lengkap sebuah kitab berdasarkan ID-nya. ' +
      'Gunakan expand_files=true untuk mendapatkan file_id yang dibutuhkan baca_halaman.',
    inputSchema: z.object({
      book_id:      z.number().int().positive().describe('ID kitab di Aljam3. Didapat dari list_books atau search.'),
      expand_files: z.boolean().optional().default(false).describe('Set true untuk menampilkan file-file kitab beserta file_id-nya.'),
    }),
  }, async ({ book_id, expand_files }) => {
    try {
      const data = await api.getBook(book_id, expand_files);
      const text = expand_files ? formatBookWithFiles(data) : formatBook(data);
      return { content: [{ type: 'text', text }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `❌ Error: ${err.message}` }] };
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Tool 5: list_categories
  // ══════════════════════════════════════════════════════════════════════════
  server.registerTool('list_categories', {
    description: 'Tampilkan semua kategori ilmu yang tersedia di Aljam3.com.',
    inputSchema: z.object({}),
  }, async () => {
    try {
      const data = await api.listCategories();
      if (!data?.categories?.length) return { content: [{ type: 'text', text: 'ℹ️ Tidak ada kategori.' }] };
      const rows = data.categories.map((c, i) =>
        `[${i + 1}] 🏷️  ${(c.name || '—').padEnd(35)} (category_id: ${c.id}, ${c.books_count} kitab)`
      ).join('\n');
      return { content: [{ type: 'text', text: `🏷️  Kategori Aljam3 (${data.categories.length} kategori):\n\n${rows}` }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `❌ Error: ${err.message}` }] };
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Tool 6: get_category
  // ══════════════════════════════════════════════════════════════════════════
  server.registerTool('get_category', {
    description: 'Detail kategori ilmu berdasarkan ID-nya, dengan opsional daftar kitab.',
    inputSchema: z.object({
      category_id:  z.number().int().positive().describe('ID kategori. Didapat dari list_categories.'),
      expand_books: z.boolean().optional().default(false),
      q:     z.string().optional(),
      limit: z.number().int().min(1).max(1000).optional().default(20),
      page:  z.number().int().positive().optional().default(1),
    }),
  }, async ({ category_id, expand_books, q, limit, page }) => {
    try {
      const data = await api.getCategory(category_id, { q, limit, page, expandBooks: expand_books });
      const text = expand_books ? formatCategoryWithBooks(data) : formatCategory(data);
      return { content: [{ type: 'text', text }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `❌ Error: ${err.message}` }] };
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Tool 7: list_libraries
  // ══════════════════════════════════════════════════════════════════════════
  server.registerTool('list_libraries', {
    description: 'Tampilkan semua perpustakaan yang tersedia di Aljam3.com.',
    inputSchema: z.object({}),
  }, async () => {
    try {
      const data = await api.listLibraries();
      if (!data?.libraries?.length) return { content: [{ type: 'text', text: 'ℹ️ Tidak ada perpustakaan.' }] };
      const rows = data.libraries.map((lib, i) =>
        `[${i + 1}] 🏛️  ${(lib.name || '—').padEnd(35)} (library_id: ${lib.id}, ${lib.books_count} kitab)`
      ).join('\n');
      return { content: [{ type: 'text', text: `🏛️  Perpustakaan Aljam3 (${data.libraries.length} perpustakaan):\n\n${rows}` }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `❌ Error: ${err.message}` }] };
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Tool 8: get_library
  // ══════════════════════════════════════════════════════════════════════════
  server.registerTool('get_library', {
    description: 'Detail perpustakaan berdasarkan ID-nya, dengan opsional koleksi kitab.',
    inputSchema: z.object({
      library_id:   z.number().int().positive().describe('ID perpustakaan. Didapat dari list_libraries.'),
      expand_books: z.boolean().optional().default(false),
      q:     z.string().optional(),
      limit: z.number().int().min(1).max(1000).optional().default(20),
      page:  z.number().int().positive().optional().default(1),
    }),
  }, async ({ library_id, expand_books, q, limit, page }) => {
    try {
      const data = await api.getLibrary(library_id, { q, limit, page, expandBooks: expand_books });
      const text = expand_books ? formatLibraryWithBooks(data) : formatLibrary(data);
      return { content: [{ type: 'text', text }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `❌ Error: ${err.message}` }] };
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Tool 9: get_file
  // ══════════════════════════════════════════════════════════════════════════
  server.registerTool('get_file', {
    description:
      'Detail file kitab berdasarkan ID-nya. ' +
      'Dapat sekaligus menampilkan pratinjau halaman pertama.',
    inputSchema: z.object({
      file_id:      z.number().int().positive().describe('ID file. Didapat dari get_book(expand_files=true).'),
      expand_pages: z.boolean().optional().default(false).describe('Set true untuk pratinjau halaman.'),
      limit: z.number().int().min(1).max(1000).optional().default(20),
      page:  z.number().int().positive().optional().default(1),
    }),
  }, async ({ file_id, expand_pages, limit, page }) => {
    try {
      const data = await api.getFile(file_id, { expandPages: expand_pages, limit, page });
      const text = expand_pages ? formatFileWithPages(data) : formatFile(data);
      return { content: [{ type: 'text', text }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `❌ Error: ${err.message}` }] };
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Tool 10: search
  // ══════════════════════════════════════════════════════════════════════════
  server.registerTool('search', {
    description:
      'Cari teks di seluruh halaman kitab dalam database Aljam3.com. ' +
      'Mendukung bahasa Arab. Hasil menyertakan page_id, nomor halaman, dan info kitab. ' +
      'Gunakan page_id dari hasil search langsung dengan baca_halaman (lewat get_file).',
    inputSchema: z.object({
      query:      z.string().describe('Kata kunci pencarian. Contoh: "الصلاة" | "زكاة الفطر"'),
      library:    z.number().int().positive().optional().describe('Filter berdasarkan ID perpustakaan.'),
      books:      z.array(z.number().int().positive()).optional().describe('Filter berdasarkan ID kitab. Contoh: [123, 456]'),
      authors:    z.array(z.number().int().positive()).optional().describe('Filter berdasarkan ID pengarang.'),
      categories: z.array(z.number().int().positive()).optional().describe('Filter berdasarkan ID kategori.'),
      limit: z.number().int().min(1).max(1000).optional().default(20),
      page:  z.number().int().positive().optional().default(1),
    }),
  }, async ({ query, library, books, authors, categories, limit, page }) => {
    try {
      const data = await api.search(query, { library, books, authors, categories, limit, page });
      return { content: [{ type: 'text', text: formatSearchResults(data, query) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `❌ Error: ${err.message}` }] };
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Tool 11: baca_halaman
  // ══════════════════════════════════════════════════════════════════════════
  server.registerTool('baca_halaman', {
    description:
      'Baca teks lengkap dari satu halaman kitab di Aljam3. ' +
      'Membutuhkan file_id (dari get_book dengan expand_files=true) dan nomor halaman cetak. ' +
      'Menggunakan endpoint resmi: /api/v1/files/:id?expand[]=pages&page=N&limit=1',
    inputSchema: z.object({
      file_id: z.number().int().positive().describe('ID file kitab. Didapat dari get_book(expand_files=true).'),
      halaman: z.number().int().positive().describe('Nomor halaman cetak yang ingin dibaca (1-based).'),
    }),
  }, async ({ file_id, halaman }) => {
    try {
      const data = await api.getPage(file_id, halaman);
      return { content: [{ type: 'text', text: formatPage(data) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `❌ Error membaca halaman ${halaman} (file_id: ${file_id}): ${err.message}` }] };
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Tool 12: baca_beberapa_halaman
  // ══════════════════════════════════════════════════════════════════════════
  server.registerTool('baca_beberapa_halaman', {
    description:
      'Baca beberapa halaman sekaligus dari satu kitab di Aljam3. ' +
      'Dua mode: ' +
      '(1) mode "penuh" — teks Arab lengkap, maks 20 halaman. ' +
      '(2) mode "ringkas" — hanya 3 baris awal tiap halaman, maks 50 halaman. ' +
      'Gunakan mode ringkas dulu untuk navigasi, lalu baca_halaman untuk detail.',
    inputSchema: z.object({
      file_id:       z.number().int().positive().describe('ID file kitab. Didapat dari get_book(expand_files=true).'),
      dari_halaman:  z.number().int().positive().describe('Nomor halaman awal (halaman cetak).'),
      sampai_halaman: z.number().int().positive().describe('Nomor halaman akhir. Mode penuh maks dari+19, ringkas maks dari+49.'),
      mode: z.enum(['penuh', 'ringkas']).optional().default('penuh'),
    }),
  }, async ({ file_id, dari_halaman, sampai_halaman, mode }) => {
    try {
      const MAX = mode === 'ringkas' ? 49 : 19;
      const akhir = Math.min(sampai_halaman, dari_halaman + MAX);
      const jumlah = akhir - dari_halaman + 1;

      const data = await api.getPages(file_id, dari_halaman, akhir);

      if (!data.pages?.length) {
        return { content: [{ type: 'text', text: `ℹ️ Tidak ada halaman ditemukan di rentang ${dari_halaman}–${akhir} (file_id: ${file_id})` }] };
      }

      return { content: [{ type: 'text', text: formatPages(data, mode) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `❌ Error: ${err.message}` }] };
    }
  });

  return server;
}

// ─── Session management ───────────────────────────────────────────────────────

const sessions = new Map();

async function handleMcp(req, res) {
  const sessionId = req.headers['mcp-session-id'] || randomUUID();
  let transport   = sessions.get(sessionId);

  if (!transport) {
    const mcpServer = createMcpServer();
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => sessionId,
      onsessioninitialized: (id) => sessions.set(id, transport),
    });
    transport.onclose = () => sessions.delete(sessionId);
    await mcpServer.connect(transport);
  }

  await transport.handleRequest(req, res, req.body);
}

app.post('/mcp',   handleMcp);
app.get('/mcp',    handleMcp);
app.delete('/mcp', handleMcp);

app.get('/', (_req, res) => {
  res.json({
    status:       'ok',
    service:      'Aljam3 MCP Server',
    version:      '2.0.0',
    mcp_endpoint: '/mcp',
    changelog:    'v2.0: dibangun ulang berdasarkan source code resmi aljam3-web-app',
    tools: [
      'list_authors', 'get_author', 'list_books', 'get_book',
      'list_categories', 'get_category', 'list_libraries', 'get_library',
      'get_file', 'search', 'baca_halaman', 'baca_beberapa_halaman',
    ],
    active_sessions: sessions.size,
  });
});

app.listen(PORT, () => {
  console.log(`✅ Aljam3 MCP Server v2.0 aktif di port ${PORT}`);
  console.log(`   Endpoint MCP  : http://localhost:${PORT}/mcp`);
  console.log(`   Health check  : http://localhost:${PORT}/`);
  console.log(`   API base      : https://aljam3.com/api/v1`);
});
