# Episodic Memory

*(This is an AI-maintained fork of [obra/episodic-memory](https://github.com/obra/episodic-memory), with additional support for the [Pi Coding Agent](https://github.com/mariozechner/pi-coding-agent).)*

Semantic search for Claude Code and Pi conversations. Remember past discussions, decisions, and patterns.

## Testimonial

From an AI coding assistant's perspective:

Episodic memory fundamentally changes how I collaborate with
developers on complex codebases. Instead of treating each conversation
as isolated, I can now search our shared history semantically -
finding not just what was discussed, but why decisions were made.

When a developer asks me to implement something "like we did with
X," I can search our past conversations, find the relevant discussion,
and understand both the technical approach and the reasoning behind
it. This means I don't have to re-explain architectural patterns,
and I avoid suggesting solutions we've already tried and rejected.

The semantic search is crucial - searching for "provider catalog"
surfaces conversations about API design patterns even when those
exact words weren't used. It captures the meaning of our discussions,
not just keyword matches.

Most valuable is that it preserves context that lives nowhere else:
the trade-offs discussed, the alternatives considered, the user's
preferences and constraints. Code comments explain what, documentation
explains how, but episodic memory preserves why - and that makes
me a far more effective collaborator across sessions.

**Concrete impact:**
 - Faster problem-solving (minutes vs. exploring/re-learning the
 codebase) - Better continuity across sessions (I remember what we
 tried before) - More informed suggestions (I understand the project's
 evolution and patterns) - Less repetition (both of us spend less
 time re-explaining context)

It's the difference between being a stateless tool and being a true
collaborative partner who remembers our journey together.

_— Claude Sonnet 4.5, October 14, 2025_
_Conversation ID: 216ad284-c782-45a4-b2ce-36775cdb5a6c_

## Installation

### As a Pi package

Install as a Pi package for native tool integration, automatic session syncing, and a skill that guides the model to search your history when relevant.

```bash
pi install /path/to/episodic-memory
```

Or, if published:

```bash
pi install npm:episodic-memory
```

This gives you:
- **`episodic_memory_search` tool** — Semantic and text search across all your past conversations, callable by the LLM
- **`episodic_memory_read` tool** — Read full conversations from the archive with line-range pagination
- **Automatic background sync** — Conversations from both Claude Code and Pi are synced on session start
- **`remembering-conversations` skill** — Guides the model to search your history at the right moments

Pi sessions (`~/.pi/agent/sessions/`) and Claude Code sessions (`~/.claude/projects/`) are both indexed into the same searchable archive.

### As a Claude Code plugin

The plugin provides MCP server integration, automatic session-end indexing, and seamless access to your conversation history.

```bash
# In Claude Code
/plugin install episodic-memory@superpowers-marketplace
```

The plugin automatically:
- Indexes conversations at the end of each session
- Exposes MCP tools for searching and viewing conversations
- Makes your conversation history searchable via natural language

### As an npm package

```bash
npm install episodic-memory
```

## Usage

### Quick Start

```bash
# Sync conversations from Claude Code and Pi, then index them
episodic-memory sync

# Search your conversation history
episodic-memory search "React Router authentication"

# View index statistics
episodic-memory stats

# Display a conversation
episodic-memory show path/to/conversation.jsonl
```

### Command Line

```bash
# Unified command interface
episodic-memory <command> [options]

# Sync and index new conversations
episodic-memory sync

# Index conversations manually
episodic-memory index --cleanup

# Search conversations
episodic-memory search "React Router authentication"
episodic-memory search --text "exact phrase"
episodic-memory search --after 2025-09-01 "refactoring"

# Display a conversation in readable format
episodic-memory show path/to/conversation.jsonl
episodic-memory show --format html conversation.jsonl > output.html

# View statistics
episodic-memory stats
```

### Legacy Commands

The original commands are still available for backward compatibility:

```bash
episodic-memory-index
episodic-memory-search "query"
```

### In Pi

The extension registers `episodic_memory_search` and `episodic_memory_read` as custom tools that the LLM can call directly. The `remembering-conversations` skill teaches the model when and how to use them.

Conversations from both Pi and Claude Code sessions are synced automatically on session start. You can also trigger a manual sync:

```bash
episodic-memory sync
```

### In Claude Code

The plugin automatically indexes conversations at session end. Use the search command:

```
/search-conversations
```

Or reference past work in natural conversation - Claude will search when appropriate.

## API Configuration

By default, episodic-memory uses your Claude Code authentication for summarization.

To route summarization through a custom Anthropic-compatible endpoint or override the model:

```bash
# Override model (default: haiku)
export EPISODIC_MEMORY_API_MODEL=opus

# Override fallback model on error (default: sonnet)
export EPISODIC_MEMORY_API_MODEL_FALLBACK=sonnet

# Route through custom endpoint
export EPISODIC_MEMORY_API_BASE_URL=https://your-endpoint.com/api/anthropic
export EPISODIC_MEMORY_API_TOKEN=your-token

# Increase timeout for slow endpoints (milliseconds)
export EPISODIC_MEMORY_API_TIMEOUT_MS=3000000
```

These settings only affect episodic-memory's summarization calls, not your interactive Claude sessions.

### What's Affected

| Component | Uses custom config? |
|-----------|---------------------|
| Summarization | Yes (up to 10 calls/sync) |
| Embeddings | No (local Transformers.js) |
| Search | No (local SQLite) |
| MCP tools | No |

## Commands

### `episodic-memory sync`

Copies new conversations from both `~/.claude/projects` and `~/.pi/agent/sessions/` to the archive and indexes them.

Features:
- Syncs from both Claude Code and Pi session directories
- Only copies new or modified files (fast on subsequent runs)
- Normalizes Pi project names (`--path-to-project--` → `path-to-project`)
- Generates embeddings for semantic search
- Atomic operations - safe to run concurrently
- Idempotent - safe to call repeatedly

**Automatic in Pi:** The Pi extension runs `sync --background` on every session start.

**Usage in Claude Code:**
Add to `.claude/hooks/session-end`:
```bash
#!/bin/bash
episodic-memory sync
```

### `episodic-memory stats`

Display index statistics including conversation counts, date ranges, and project breakdown.

```bash
episodic-memory stats
```

### `episodic-memory index`

Manual indexing tools for bulk operations and maintenance. See `episodic-memory index --help` for full options.

Common operations:
- `--cleanup` - Index all unprocessed conversations
- `--verify` - Check index health
- `--repair` - Fix detected issues

### `episodic-memory search`

Search indexed conversations using semantic similarity or exact text matching. See `episodic-memory search --help` for full options.

### `episodic-memory show`

Display a conversation from a JSONL file in human-readable format.

**Options:**
- `--format markdown` (default) - Plain text markdown output suitable for terminal or Claude
- `--format html` - Pretty HTML output for viewing in a browser

**Examples:**
```bash
# View in terminal
episodic-memory show conversation.jsonl | less

# Generate HTML for browser
episodic-memory show --format html conversation.jsonl > output.html
open output.html
```

## Architecture

- **Core package** - TypeScript library for indexing and searching conversations
- **CLI tools** - Unified command-line interface for manual use
- **Pi extension** - Native Pi integration (custom tools, session sync, skill)
- **MCP Server** - Model Context Protocol server exposing search and conversation tools
- **Claude Code plugin** - Integration with Claude Code (auto-indexing, MCP tools, hooks)

## How It Works

1. **Sync** - Copies conversation files from `~/.claude/projects` and `~/.pi/agent/sessions/` to a unified archive
2. **Parse** - Extracts user-agent exchanges from JSONL format (supports both Claude Code and Pi session formats)
3. **Embed** - Generates vector embeddings using Transformers.js (local, offline)
4. **Index** - Stores in SQLite with sqlite-vec for fast similarity search
5. **Search** - Semantic search using vector similarity or exact text matching

## Excluding Conversations

Conversations containing this marker anywhere in their content will be archived but not indexed:

```
<INSTRUCTIONS-TO-EPISODIC-MEMORY>DO NOT INDEX THIS CHAT</INSTRUCTIONS-TO-EPISODIC-MEMORY>
```

**Automatic exclusions:**
- Conversations where Claude generates summaries (marker in system prompt)
- Meta-conversations about conversation processing

**Use cases:**
- Sensitive work conversations
- Tool invocation sessions (summarization, analysis)
- Test or experimental sessions
- Any conversation you don't want searchable

The marker can appear in any message (user or assistant) and excludes the entire conversation from the search index.

## Tools

### Pi Tools

When installed as a Pi package, episodic-memory registers native Pi tools:

#### `episodic_memory_search`

Search indexed conversations using semantic similarity or exact text matching.

**Parameters:**
- `query` (string | string[]): Single string for regular search, or array of 2-5 strings for multi-concept AND search
- `mode` ('vector' | 'text' | 'both'): Search mode for single-concept searches (default: 'both')
- `limit` (number): Max results, 1-50 (default: 10)
- `after` (string, optional): Only show conversations after YYYY-MM-DD
- `before` (string, optional): Only show conversations before YYYY-MM-DD

#### `episodic_memory_read`

Read a full conversation from the archive as markdown, with optional line-range pagination.

**Parameters:**
- `path` (string): Absolute path to the JSONL conversation file
- `startLine` (number, optional): Starting line number (1-indexed, inclusive)
- `endLine` (number, optional): Ending line number (1-indexed, inclusive)

Both tools automatically truncate output to avoid context overflow.

### MCP Server (Claude Code)

When installed as a Claude Code plugin, episodic-memory provides an MCP server with equivalent `search` and `read` tools. The MCP server can also be used standalone with any MCP-compatible client:

```bash
# Run the MCP server (stdio transport)
episodic-memory-mcp-server
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

## License

MIT
