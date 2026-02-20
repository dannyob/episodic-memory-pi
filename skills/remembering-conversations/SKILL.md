---
name: remembering-conversations
description: Use when user asks 'how should I...' or 'what's the best approach...' after exploring code, OR when you've tried to solve something and are stuck, OR for unfamiliar workflows, OR when user references past work. Searches conversation history.
---

# Remembering Conversations

**Core principle:** Search before reinventing. Searching costs nothing; reinventing or repeating mistakes costs everything.

## How to Search

Use the `episodic_memory_search` tool directly:

```
episodic_memory_search
  query: "your search query"
  mode: "both"
```

Then read top 2-5 results with `episodic_memory_read`:

```
episodic_memory_read
  path: "/path/to/conversation.jsonl"
  startLine: 100
  endLine: 200
```

Synthesize findings into actionable insights (200-1000 words) before applying them.

## When to Use

Search memory in these situations:

**After understanding the task:**
- User asks "how should I..." or "what's the best approach..."
- You've explored current codebase and need to make architectural decisions
- User asks for implementation approach after describing what they want

**When you're stuck:**
- You've investigated a problem and can't find the solution
- Facing a complex problem without obvious solution in current code
- Need to follow an unfamiliar workflow or process

**When historical signals are present:**
- User says "last time", "before", "we discussed", "you implemented"
- User asks "why did we...", "what was the reason..."
- User says "do you remember...", "what do we know about..."

**Don't search first:**
- For current codebase structure (use Grep/Read to explore first)
- For info in current conversation
- Before understanding what you're being asked to do

## Search Workflow

1. **Search** with `episodic_memory_search` — use descriptive queries, try multiple if needed
2. **Read** top 2-5 results with `episodic_memory_read` — use startLine/endLine for large conversations
3. **Synthesize** — extract decisions, patterns, gotchas, and rationale (200-1000 words)
4. **Apply** — use insights to inform the current task

## Search Tips

- **Semantic search** (`mode: "both"`, default): Best for conceptual queries like "authentication error handling"
- **Text search** (`mode: "text"`): Best for exact strings like error messages, SHAs, function names
- **Multi-concept AND search**: Pass an array of 2-5 query strings to find conversations matching ALL concepts
- **Date filtering**: Use `after` and `before` (YYYY-MM-DD) to narrow by time range
- **Pagination**: Use `startLine`/`endLine` in `episodic_memory_read` for large conversations

## What to Look For

When reading past conversations, focus on:
- What was the problem or question?
- What solution was chosen and why?
- What alternatives were considered and rejected?
- Any gotchas, edge cases, or lessons learned?
- Relevant code patterns, APIs, or approaches used
- Architectural decisions and rationale
