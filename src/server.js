/**
 * Aljam3 MCP Server v1.1
 * ─────────────────────────────────────────────────────────────────────────────
 * Pola: identik dengan Turath MCP Server (StreamableHTTP + Express)
 *
 * Tools:
 *   1.  list_authors         → daftar/cari pengarang
 *   2.  get_author           → detail pengarang + daftar kitabnya
 *   3.  list_books           → daftar/cari kitab
 *   4.  get_book             → detail kitab + file-filenya
 *   5.  list_categories      → semua kategori ilmu
 *   6.  get_category         → detail kategori + kitab di dalamnya
 *   7.  list_libraries       → semua perpustakaan
 *   8.  get_library          → detail perpustakaan + koleksinya
 *   9.  get_file             → detail file kitab + halamannya
 *   10. search               → cari teks di seluruh halaman kitab
 *   11. baca_halaman         → baca teks lengkap satu halaman kitab ★ BARU
 *   12. baca_beberapa_halaman→ baca rentang halaman sekaligus       ★ BARU
 *
 * Endpoint : POST/GET/DELETE /mcp
 * Health   : GET /
 * Deploy   : Railway (nixpacks, npm start)
 */

import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { randomUUID } from 'crypto';

import * as api from './api.js';
import {
  formatAuthorList,
  formatAuthor,
  formatBookList,
  formatBook,
  formatSearchResults,
  formatCategory,
  formatLibrary,
  formatFile,
  formatPage,
} from './format.js';

// ─── Express app ─────────────────────────────────────────────────────────────

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));

// ─── Factory: buat MCP server baru per session ───────────────────────────────

function createMcpServer() {
  const server = new McpServer({ name: 'aljam3-mcp', version: '1.1.0' });

  // ══════════════════════════════════════════════════════════════════════════
  // Tool 1: list_authors
  // ══════════════════════════════════════════════════════════════════════════
  server.registerTool(
    'list_authors',
    {
      description:
        'Daftar pengarang dari perpustakaan digital Aljam3.com. ' +
        'Gunakan parameter q untuk mencari nama pengarang. ' +
        'Mengembalikan nama, biografi singkat, dan jumlah kitab tiap pengarang.',
      inputSchema: z.object({
        q: z.string().optional().describe(
          'Kata kunci nama pengarang. Contoh: "ابن تيمية" atau "النووي"'
        ),
        limit: z.number().int().min(1).max(100).optional().default(20).describe(
          'Jumlah hasil per halaman (default: 20, max: 100)'
        ),
        page: z.number().int().positive().optional().default(1).describe(
          'Nomor halaman untuk navigasi (default: 1)'
        ),
      }),
    },
    async ({ q, limit, page }) => {
      try {
        const data = await api.listAuthors(q, limit, page);
        return { content: [{ type: 'text', text: formatAuthorList(data, q ? `Pencarian pengarang "${q}"` : 'Daftar Pengarang') }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `❌ Error: ${err.message}` }] };
      }
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // Tool 2: get_author
  // ══════════════════════════════════════════════════════════════════════════
  server.registerTool(
    'get_author',
    {
      description:
        'Detail lengkap seorang pengarang berdasarkan ID-nya. ' +
        'Dapat sekaligus menampilkan daftar kitab karya pengarang tersebut.',
      inputSchema: z.object({
        author_id: z.number().int().positive().describe(
          'ID pengarang di Aljam3. Didapat dari list_authors.'
        ),
        expand_books: z.boolean().optional().default(false).describe(
          'Set true untuk sekaligus menampilkan daftar kitab pengarang ini (default: false)'
        ),
      }),
    },
    async ({ author_id, expand_books }) => {
      try {
        const data = await api.getAuthor(author_id, expand_books);
        let text = formatAuthor(data);
        if (expand_books && data.books?.data?.length) {
          const buku = data.books.data.map((b, i) => `  [${i + 1}] 📖 ${b.title}  (book_id: ${b.id})`).join('\n');
          text += `\n\n📚 Kitab karya pengarang ini (${data.books.data.length} hasil):\n${buku}`;
        }
        return { content: [{ type: 'text', text }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `❌ Error: ${err.message}` }] };
      }
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // Tool 3: list_books
  // ══════════════════════════════════════════════════════════════════════════
  server.registerTool(
    'list_books',
    {
      description:
        'Daftar kitab/buku dari Aljam3.com dengan opsional pencarian judul. ' +
        'Mengembalikan judul, nama pengarang, kategori, perpustakaan, dan jumlah halaman.',
      inputSchema: z.object({
        q: z.string().optional().describe(
          'Kata kunci judul kitab. Contoh: "صحيح البخاري" atau "رياض الصالحين"'
        ),
        limit: z.number().int().min(1).max(100).optional().default(20).describe(
          'Jumlah hasil per halaman (default: 20, max: 100)'
        ),
        page: z.number().int().positive().optional().default(1).describe(
          'Nomor halaman untuk navigasi (default: 1)'
        ),
      }),
    },
    async ({ q, limit, page }) => {
      try {
        const data = await api.listBooks(q, limit, page);
        return { content: [{ type: 'text', text: formatBookList(data, q ? `Pencarian kitab "${q}"` : 'Daftar Kitab') }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `❌ Error: ${err.message}` }] };
      }
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // Tool 4: get_book
  // ══════════════════════════════════════════════════════════════════════════
  server.registerTool(
    'get_book',
    {
      description:
        'Detail lengkap sebuah kitab berdasarkan ID-nya. ' +
        'Dapat sekaligus menampilkan file-file yang tersedia (PDF, TXT, dll). ' +
        'Gunakan tool ini sebelum baca_halaman untuk mendapat file_id yang diperlukan.',
      inputSchema: z.object({
        book_id: z.number().int().positive().describe(
          'ID kitab di Aljam3. Didapat dari list_books atau search.'
        ),
        expand_files: z.boolean().optional().default(false).describe(
          'Set true untuk sekaligus menampilkan file-file kitab ini (default: false)'
        ),
      }),
    },
    async ({ book_id, expand_files }) => {
      try {
        const data = await api.getBook(book_id, expand_files);
        let text = formatBook(data);
        if (expand_files && data.files?.data?.length) {
          const files = data.files.data.map((f, i) =>
            `  [${i + 1}] 📁 Format: ${f.format || 'file'}  (file_id: ${f.id})` +
            (f.pages_count ? `  — ${f.pages_count} halaman` : '') +
            (f.pdf_url ? `\n       🔗 PDF: ${f.pdf_url}` : '') +
            (f.txt_url ? `\n       🔗 TXT: ${f.txt_url}` : '')
          ).join('\n');
          text += `\n\n📁 File tersedia (${data.files.data.length} file):\n${files}`;
          text += '\n\n💡 Gunakan file_id di atas dengan tool baca_halaman untuk membaca isi kitab.';
        }
        return { content: [{ type: 'text', text }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `❌ Error: ${err.message}` }] };
      }
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // Tool 5: list_categories
  // ══════════════════════════════════════════════════════════════════════════
  server.registerTool(
    'list_categories',
    {
      description: 'Tampilkan semua kategori ilmu yang tersedia di Aljam3.com beserta jumlah kitab tiap kategori.',
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const data = await api.listCategories();
        if (!data?.data?.length) return { content: [{ type: 'text', text: 'ℹ️ Tidak ada kategori.' }] };
        const rows = data.data.map((c, i) =>
          `[${i + 1}] 🏷️  ${(c.name || '—').padEnd(35)} — category_id: ${c.id}` +
          (c.books_count ? `  (${c.books_count} kitab)` : '')
        ).join('\n');
        return { content: [{ type: 'text', text: `🏷️  Kategori Aljam3 (${data.data.length} kategori):\n\n${rows}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `❌ Error: ${err.message}` }] };
      }
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // Tool 6: get_category
  // ══════════════════════════════════════════════════════════════════════════
  server.registerTool(
    'get_category',
    {
      description:
        'Detail kategori ilmu berdasarkan ID-nya. ' +
        'Dapat sekaligus menampilkan daftar kitab dalam kategori tersebut.',
      inputSchema: z.object({
        category_id: z.number().int().positive().describe(
          'ID kategori. Didapat dari list_categories.'
        ),
        expand_books: z.boolean().optional().default(false).describe(
          'Set true untuk sekaligus menampilkan kitab dalam kategori ini (default: false)'
        ),
      }),
    },
    async ({ category_id, expand_books }) => {
      try {
        const data = await api.getCategory(category_id, expand_books);
        return { content: [{ type: 'text', text: formatCategory(data, expand_books) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `❌ Error: ${err.message}` }] };
      }
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // Tool 7: list_libraries
  // ══════════════════════════════════════════════════════════════════════════
  server.registerTool(
    'list_libraries',
    {
      description: 'Tampilkan semua perpustakaan yang tersedia di Aljam3.com.',
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const data = await api.listLibraries();
        if (!data?.data?.length) return { content: [{ type: 'text', text: 'ℹ️ Tidak ada perpustakaan.' }] };
        const rows = data.data.map((lib, i) =>
          `[${i + 1}] 🏛️  ${(lib.name || '—').padEnd(35)} — library_id: ${lib.id}` +
          (lib.books_count ? `  (${lib.books_count} kitab)` : '')
        ).join('\n');
        return { content: [{ type: 'text', text: `🏛️  Perpustakaan Aljam3 (${data.data.length} perpustakaan):\n\n${rows}` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `❌ Error: ${err.message}` }] };
      }
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // Tool 8: get_library
  // ══════════════════════════════════════════════════════════════════════════
  server.registerTool(
    'get_library',
    {
      description:
        'Detail perpustakaan berdasarkan ID-nya. ' +
        'Dapat sekaligus menampilkan koleksi kitab dalam perpustakaan tersebut.',
      inputSchema: z.object({
        library_id: z.number().int().positive().describe(
          'ID perpustakaan. Didapat dari list_libraries.'
        ),
        expand_books: z.boolean().optional().default(false).describe(
          'Set true untuk sekaligus menampilkan koleksi kitab perpustakaan ini (default: false)'
        ),
      }),
    },
    async ({ library_id, expand_books }) => {
      try {
        const data = await api.getLibrary(library_id, expand_books);
        return { content: [{ type: 'text', text: formatLibrary(data, expand_books) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `❌ Error: ${err.message}` }] };
      }
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // Tool 9: get_file
  // ══════════════════════════════════════════════════════════════════════════
  server.registerTool(
    'get_file',
    {
      description:
        'Detail file kitab berdasarkan ID-nya (PDF, TXT, dll). ' +
        'Dapat sekaligus menampilkan pratinjau halaman-halamannya.',
      inputSchema: z.object({
        file_id: z.number().int().positive().describe(
          'ID file. Didapat dari get_book dengan expand_files=true.'
        ),
        expand_pages: z.boolean().optional().default(false).describe(
          'Set true untuk pratinjau halaman pertama file ini (default: false)'
        ),
      }),
    },
    async ({ file_id, expand_pages }) => {
      try {
        const data = await api.getFile(file_id, expand_pages);
        return { content: [{ type: 'text', text: formatFile(data, expand_pages) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `❌ Error: ${err.message}` }] };
      }
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // Tool 10: search
  // ══════════════════════════════════════════════════════════════════════════
  server.registerTool(
    'search',
    {
      description:
        'Cari teks di seluruh halaman kitab dalam database Aljam3.com. ' +
        'Mendukung bahasa Arab. Bisa difilter per perpustakaan, kitab, pengarang, atau kategori. ' +
        'Hasil pencarian menyertakan file_id dan page_number yang bisa langsung dipakai di baca_halaman. ' +
        'Cocok untuk: "cari ayat/hadits tertentu", "cari pembahasan tentang X di kitab Y".',
      inputSchema: z.object({
        query: z.string().describe(
          'Kata kunci pencarian. Contoh: "الصلاة" | "زكاة الفطر" | "حديث النية"'
        ),
        library: z.number().int().positive().optional().describe(
          'Filter berdasarkan ID perpustakaan (dari list_libraries)'
        ),
        books: z.array(z.number().int().positive()).optional().describe(
          'Filter berdasarkan daftar ID kitab. Contoh: [123, 456]'
        ),
        authors: z.array(z.number().int().positive()).optional().describe(
          'Filter berdasarkan daftar ID pengarang. Contoh: [789]'
        ),
        categories: z.array(z.number().int().positive()).optional().describe(
          'Filter berdasarkan daftar ID kategori. Contoh: [1, 2]'
        ),
        limit: z.number().int().min(1).max(100).optional().default(20).describe(
          'Jumlah hasil per halaman (default: 20)'
        ),
        page: z.number().int().positive().optional().default(1).describe(
          'Nomor halaman hasil (default: 1)'
        ),
      }),
    },
    async ({ query, library, books, authors, categories, limit, page }) => {
      try {
        const data = await api.search(query, { library, books, authors, categories, limit, page });
        return { content: [{ type: 'text', text: formatSearchResults(data, query) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `❌ Error: ${err.message}` }] };
      }
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // Tool 11: baca_halaman  ★ BARU — setara dengan baca_halaman di Turats
  // ══════════════════════════════════════════════════════════════════════════
  server.registerTool(
    'baca_halaman',
    {
      description:
        'Baca teks lengkap dari satu halaman kitab di Aljam3. ' +
        'Membutuhkan file_id dan nomor halaman. ' +
        'file_id didapat dari get_book (expand_files=true) atau dari hasil search. ' +
        'Jika hanya punya book_id, gunakan get_book dulu untuk mendapat file_id. ' +
        'Menampilkan teks Arab asli beserta info kitab dan pengarang.',
      inputSchema: z.object({
        file_id: z.number().int().positive().describe(
          'ID file kitab di Aljam3. Didapat dari get_book(expand_files=true) atau hasil search.'
        ),
        halaman: z.number().int().positive().describe(
          'Nomor halaman yang ingin dibaca (halaman cetak, mulai dari 1)'
        ),
      }),
    },
    async ({ file_id, halaman }) => {
      try {
        const pageData = await api.getPage(file_id, halaman);
        return { content: [{ type: 'text', text: formatPage(pageData, file_id, halaman) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `❌ Error membaca halaman ${halaman} (file_id: ${file_id}): ${err.message}` }] };
      }
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // Tool 12: baca_beberapa_halaman  ★ BARU — setara dengan turats
  // ══════════════════════════════════════════════════════════════════════════
  server.registerTool(
    'baca_beberapa_halaman',
    {
      description:
        'Baca beberapa halaman sekaligus dari satu kitab di Aljam3. ' +
        'Dua mode: ' +
        '(1) mode "penuh" — teks Arab lengkap, maks 20 halaman agar tidak melebihi context. ' +
        '(2) mode "ringkas" — hanya 3 baris awal tiap halaman, maks 50 halaman, ' +
        'cocok untuk memindai isi kitab sebelum memilih halaman yang ingin dibaca penuh. ' +
        'Gunakan mode ringkas dulu untuk navigasi, lalu baca_halaman untuk detail.',
      inputSchema: z.object({
        file_id: z.number().int().positive().describe(
          'ID file kitab di Aljam3. Didapat dari get_book(expand_files=true).'
        ),
        dari_halaman: z.number().int().positive().describe(
          'Nomor halaman awal (halaman cetak)'
        ),
        sampai_halaman: z.number().int().positive().describe(
          'Nomor halaman akhir. Mode penuh maks dari_halaman+19, mode ringkas maks dari_halaman+49.'
        ),
        mode: z.enum(['penuh', 'ringkas']).optional().default('penuh').describe(
          '"penuh" = teks Arab lengkap (maks 20 hal). "ringkas" = 3 baris awal (maks 50 hal)'
        ),
      }),
    },
    async ({ file_id, dari_halaman, sampai_halaman, mode }) => {
      try {
        const MAX = mode === 'ringkas' ? 49 : 19;
        const akhir = Math.min(sampai_halaman, dari_halaman + MAX);
        const jumlah = akhir - dari_halaman + 1;

        const pageNums = Array.from({ length: jumlah }, (_, i) => dari_halaman + i);

        // Fetch paralel dengan concurrency 5
        const hasil = [];
        for (let i = 0; i < pageNums.length; i += 5) {
          const batch = pageNums.slice(i, i + 5);
          const batchResult = await Promise.all(
            batch.map(pg => api.getPage(file_id, pg).catch(e => ({ _error: e.message, _pg: pg })))
          );
          hasil.push(...batchResult);
        }

        // Ambil info kitab dari halaman pertama yang berhasil
        const firstOk = hasil.find(p => !p._error);
        const bookTitle  = firstOk?.book?.title || firstOk?.book_title || 'Kitab';
        const authorName = firstOk?.book?.author?.name || firstOk?.author_name || '—';

        const modeLabel = mode === 'ringkas'
          ? '(mode ringkas — gunakan baca_halaman untuk teks penuh)'
          : '(mode penuh)';

        const header =
          `📖 ${bookTitle}  |  ✍️  ${authorName}\n` +
          `📄 Halaman ${dari_halaman}–${akhir}  |  ${jumlah} halaman  ${modeLabel}\n` +
          `📁 file_id: ${file_id}\n`;

        const parts = hasil.map((p, i) => {
          const pg = pageNums[i];
          if (p._error) return `[Hal. ${pg}] ❌ ${p._error}`;

          const actualPage = p.number || p.page_number || pg;
          const content = (p.content || p.text || p.body || '')
            .replace(/<[^>]+>/g, '')
            .trim();

          if (mode === 'ringkas') {
            const awal = content
              .split('\n')
              .filter(l => l.trim())
              .slice(0, 3)
              .join(' ')
              .slice(0, 250);
            return `📄 Hal. ${actualPage}: ${awal}…`;
          }

          return [
            `${'─'.repeat(40)}`,
            `📄 Halaman ${actualPage}`,
            '',
            content || '(kosong)',
          ].join('\n');
        });

        const separator = mode === 'ringkas' ? '\n' : '\n';
        return { content: [{ type: 'text', text: header + '\n' + parts.join(separator) }] };

      } catch (err) {
        return { content: [{ type: 'text', text: `❌ Error: ${err.message}` }] };
      }
    }
  );

  return server;
}

// ─── Session management (identik dengan turath) ───────────────────────────────

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

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.json({
    status:          'ok',
    service:         'Aljam3 MCP Server',
    version:         '1.1.0',
    mcp_endpoint:    '/mcp',
    tools: [
      'list_authors',
      'get_author',
      'list_books',
      'get_book',
      'list_categories',
      'get_category',
      'list_libraries',
      'get_library',
      'get_file',
      'search',
      'baca_halaman',
      'baca_beberapa_halaman',
    ],
    active_sessions: sessions.size,
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`✅ Aljam3 MCP Server v1.1 aktif di port ${PORT}`);
  console.log(`   Endpoint MCP : http://localhost:${PORT}/mcp`);
  console.log(`   Health check : http://localhost:${PORT}/`);
  console.log(`   Tools aktif  : 12 tools (termasuk baca_halaman & baca_beberapa_halaman)`);
});
