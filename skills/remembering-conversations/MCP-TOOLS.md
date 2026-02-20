# Episodic Memory Tools Reference

The episodic-memory extension provides two tools for searching and reading past conversations.

## episodic_memory_search

Search your episodic memory of past conversations using semantic or text search.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | `string` or `string[]` | Yes | Search query. String for single-concept search, array of 2-5 strings for multi-concept AND search |
| `mode` | `"vector"` \| `"text"` \| `"both"` | No | Search mode (default: `"both"`). Only used for single-concept searches |
| `limit` | `number` | No | Maximum results to return, 1-50 (default: 10) |
| `after` | `string` | No | Only return conversations after this date (YYYY-MM-DD) |
| `before` | `string` | No | Only return conversations before this date (YYYY-MM-DD) |

### Search Modes

- **`vector`** - Semantic similarity search using embeddings
- **`text`** - Exact text matching (case-insensitive)
- **`both`** - Combined semantic + text search (default, recommended)

### Examples

Single-concept search:
```
episodic_memory_search
  query: "React Router authentication errors"
  mode: "both"
  limit: 10
```

Multi-concept AND search:
```
episodic_memory_search
  query: ["authentication", "React Router", "error handling"]
  limit: 10
```

Date filtering:
```
episodic_memory_search
  query: "refactoring patterns"
  after: "2025-09-01"
  before: "2025-10-01"
```

## episodic_memory_read

Read a full conversation from the archive as markdown.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | `string` | Yes | Absolute path to the JSONL conversation file |
| `startLine` | `number` | No | Starting line number (1-indexed, inclusive) |
| `endLine` | `number` | No | Ending line number (1-indexed, inclusive) |

### Examples

Read entire conversation:
```
episodic_memory_read
  path: "/Users/name/.config/superpowers/conversation-archive/project/uuid.jsonl"
```

Read specific range:
```
episodic_memory_read
  path: "/Users/name/.config/superpowers/conversation-archive/project/uuid.jsonl"
  startLine: 100
  endLine: 200
```

## Performance Notes

- **Search** is fast (< 100ms typically)
- **Read** can be slow for large conversations — use `startLine`/`endLine` to paginate
- Vector search uses sqlite-vec with cached embeddings
- Text search uses SQLite FTS5 full-text index
