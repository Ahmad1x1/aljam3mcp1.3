#!/usr/bin/env python3

import asyncio
import logging
from typing import Any, Dict, List, Optional

import httpx
from mcp.server.fastmcp import FastMCP

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aljam3-server")

# Create the MCP server
mcp = FastMCP("Aljam3 Digital Library Server")

class Aljam3Client:
    def __init__(self, base_url: str = "https://aljam3.com"):
        self.base_url = base_url.rstrip("/")
        self.client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        await self.client.aclose()

    async def _make_request(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        url = f"{self.base_url}{endpoint}"
        try:
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"HTTP error occurred: {e}")
            return {"error": str(e)}
        except Exception as e:
            logger.error(f"Unexpected error occurred: {e}")
            return {"error": str(e)}

    async def list_authors(self, q: Optional[str] = None, limit: int = 20, page: int = 1) -> Dict[str, Any]:
        params = {"limit": limit, "page": page}
        if q:
            params["q"] = q
        return await self._make_request("/api/v1/authors", params)

    async def get_author(self, author_id: int, q: Optional[str] = None, limit: int = 20, page: int = 1, expand_books: bool = False) -> Dict[str, Any]:
        params = {"limit": limit, "page": page}
        if q:
            params["q"] = q
        if expand_books:
            params["expand[]"] = "books"
        return await self._make_request(f"/api/v1/authors/{author_id}", params)

    async def list_books(self, q: Optional[str] = None, limit: int = 20, page: int = 1) -> Dict[str, Any]:
        params = {"limit": limit, "page": page}
        if q:
            params["q"] = q
        return await self._make_request("/api/v1/books", params)

    async def get_book(self, book_id: int, expand_files: bool = False) -> Dict[str, Any]:
        params = {}
        if expand_files:
            params["expand[]"] = "files"
        return await self._make_request(f"/api/v1/books/{book_id}", params)

    async def list_categories(self) -> Dict[str, Any]:
        return await self._make_request("/api/v1/categories")

    async def get_category(self, category_id: int, q: Optional[str] = None, limit: int = 20, page: int = 1, expand_books: bool = False) -> Dict[str, Any]:
        params = {"limit": limit, "page": page}
        if q:
            params["q"] = q
        if expand_books:
            params["expand[]"] = "books"
        return await self._make_request(f"/api/v1/categories/{category_id}", params)

    async def list_libraries(self) -> Dict[str, Any]:
        return await self._make_request("/api/v1/libraries")

    async def get_library(self, library_id: int, q: Optional[str] = None, limit: int = 20, page: int = 1, expand_books: bool = False) -> Dict[str, Any]:
        params = {"limit": limit, "page": page}
        if q:
            params["q"] = q
        if expand_books:
            params["expand[]"] = "books"
        return await self._make_request(f"/api/v1/libraries/{library_id}", params)

    async def get_file(self, file_id: int, limit: int = 20, page: int = 1, expand_pages: bool = False) -> Dict[str, Any]:
        params = {"limit": limit, "page": page}
        if expand_pages:
            params["expand[]"] = "pages"
        return await self._make_request(f"/api/v1/files/{file_id}", params)

    async def get_file_pages(self, file_id: int) -> Dict[str, Any]:
        return await self._make_request(f"/api/v1/files/{file_id}/pages")

    async def search(self, query: str, library: Optional[int] = None, books: Optional[List[int]] = None,
                    authors: Optional[List[int]] = None, categories: Optional[List[int]] = None,
                    limit: int = 20, page: int = 1) -> Dict[str, Any]:
        params = {"q": query, "limit": limit, "page": page}
        if library:
            params["library"] = library
        if books:
            params["books[]"] = books
        if authors:
            params["authors[]"] = authors
        if categories:
            params["categories[]"] = categories
        return await self._make_request("/api/v1/search", params)

# Create client instance
client = Aljam3Client()

@mcp.tool()
async def list_authors(q: str = None, limit: int = 20, page: int = 1) -> dict:
    """List authors from the Aljam3 digital library with optional search."""
    return await client.list_authors(q, limit, page)

@mcp.tool()
async def get_author(author_id: int, q: str = None, limit: int = 20, page: int = 1, expand_books: bool = False) -> dict:
    """Get details of a specific author by ID, optionally with their books."""
    return await client.get_author(author_id, q, limit, page, expand_books)

@mcp.tool()
async def list_books(q: str = None, limit: int = 20, page: int = 1) -> dict:
    """List books from the Aljam3 digital library with optional search."""
    return await client.list_books(q, limit, page)

@mcp.tool()
async def get_book(book_id: int, expand_files: bool = False) -> dict:
    """Get details of a specific book by ID, optionally with its files."""
    return await client.get_book(book_id, expand_files)

@mcp.tool()
async def list_categories() -> dict:
    """List all categories available in the Aljam3 digital library."""
    return await client.list_categories()

@mcp.tool()
async def get_category(category_id: int, q: str = None, limit: int = 20, page: int = 1, expand_books: bool = False) -> dict:
    """Get details of a specific category by ID, optionally with books in that category."""
    return await client.get_category(category_id, q, limit, page, expand_books)

@mcp.tool()
async def list_libraries() -> dict:
    """List all libraries available in the Aljam3 digital library."""
    return await client.list_libraries()

@mcp.tool()
async def get_library(library_id: int, q: str = None, limit: int = 20, page: int = 1, expand_books: bool = False) -> dict:
    """Get details of a specific library by ID, optionally with books in that library."""
    return await client.get_library(library_id, q, limit, page, expand_books)

@mcp.tool()
async def get_file(file_id: int, limit: int = 20, page: int = 1, expand_pages: bool = False) -> dict:
    """Get details of a specific file by ID, optionally with its pages."""
    return await client.get_file(file_id, limit, page, expand_pages)

@mcp.tool()
async def get_file_pages(file_id: int) -> dict:
    """Get all pages of a specific file."""
    return await client.get_file_pages(file_id)

@mcp.tool()
async def search(query: str, library: int = None, books: List[int] = None, authors: List[int] = None, categories: List[int] = None, limit: int = 20, page: int = 1) -> dict:
    """Search across all pages in the Aljam3 digital library with filters."""
    return await client.search(query, library, books, authors, categories, limit, page)

if __name__ == "__main__":
    mcp.run()