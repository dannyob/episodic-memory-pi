/**
 * Episodic Memory extension for Pi
 *
 * Provides two custom tools:
 *   - episodic_memory_search: Semantic/text search across past conversations
 *   - episodic_memory_read: Read a full conversation from the archive
 *
 * Also syncs conversations from Claude Code and Pi sessions on session start.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
  formatSize,
  truncateHead,
} from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import { StringEnum } from "@mariozechner/pi-ai";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync, readFileSync } from "fs";

// Resolve paths relative to the package root (one level up from extensions/)
const __extensionDir = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__extensionDir, "..");

export default function (pi: ExtensionAPI) {
  // ── Background sync on session start ──────────────────────────────
  pi.on("session_start", async (_event, ctx) => {
    try {
      const cliPath = resolve(PACKAGE_ROOT, "cli", "episodic-memory.js");
      if (!existsSync(cliPath)) {
        return; // CLI not built yet, skip sync
      }
      // Fire-and-forget background sync (mirrors hooks.json behavior)
      pi.exec("node", [cliPath, "sync", "--background"], { timeout: 120_000 }).catch(() => {
        // Silently ignore sync errors — it's best-effort
      });
    } catch {
      // Ignore
    }
  });

  // ── Search tool ───────────────────────────────────────────────────
  pi.registerTool({
    name: "episodic_memory_search",
    label: "Episodic Memory Search",
    description: `Search your episodic memory of past coding conversations using semantic or text search. Gives you memory across sessions — you don't automatically remember past conversations, this tool restores it. Use a single string for semantic search, or an array of 2-5 strings for multi-concept AND matching. Returns ranked results with project, date, snippets, and file paths. Output truncated to ${DEFAULT_MAX_LINES} lines / ${formatSize(DEFAULT_MAX_BYTES)}.`,
    parameters: Type.Object({
      query: Type.Union([
        Type.String({ description: "Search query string (min 2 chars)", minLength: 2 }),
        Type.Array(Type.String({ minLength: 2 }), {
          description: "Array of 2-5 concept strings for AND search",
          minItems: 2,
          maxItems: 5,
        }),
      ]),
      mode: StringEnum(["vector", "text", "both"] as const, {
        description: 'Search mode (default: "both"). Only used for single-concept searches.',
      }),
      limit: Type.Optional(
        Type.Number({
          description: "Max results to return, 1-50 (default: 10)",
          minimum: 1,
          maximum: 50,
        })
      ),
      after: Type.Optional(
        Type.String({ description: "Only conversations after this date (YYYY-MM-DD)" })
      ),
      before: Type.Optional(
        Type.String({ description: "Only conversations before this date (YYYY-MM-DD)" })
      ),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      // Dynamic import so the heavy deps (sqlite, embeddings) only load on use
      const { searchConversations, formatResults, searchMultipleConcepts, formatMultiConceptResults } =
        await import(resolve(PACKAGE_ROOT, "dist", "search.js"));

      const query = params.query;
      const mode = params.mode ?? "both";
      const limit = params.limit ?? 10;
      const after = params.after;
      const before = params.before;

      let resultText: string;

      if (Array.isArray(query)) {
        const results = await searchMultipleConcepts(query, { limit, after, before });
        resultText = await formatMultiConceptResults(results, query);
      } else {
        const results = await searchConversations(query, { mode, limit, after, before });
        resultText = await formatResults(results);
      }

      // Truncate output to avoid blowing up context
      const truncation = truncateHead(resultText, {
        maxLines: DEFAULT_MAX_LINES,
        maxBytes: DEFAULT_MAX_BYTES,
      });

      let text = truncation.content;
      if (truncation.truncated) {
        text += `\n\n[Output truncated: showing ${truncation.outputLines} of ${truncation.totalLines} lines`;
        text += ` (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}).`;
        text += ` Narrow your search with more specific queries or date filters.]`;
      }

      return {
        content: [{ type: "text", text }],
        details: {
          query,
          mode,
          limit,
          truncated: truncation.truncated,
        },
      };
    },

    renderCall(args, theme) {
      let text = theme.fg("toolTitle", theme.bold("episodic_memory_search "));
      const q = Array.isArray(args.query) ? args.query.join(" + ") : args.query;
      text += theme.fg("accent", `"${q}"`);
      if (args.mode && args.mode !== "both") {
        text += theme.fg("dim", ` mode=${args.mode}`);
      }
      if (args.after) text += theme.fg("dim", ` after=${args.after}`);
      if (args.before) text += theme.fg("dim", ` before=${args.before}`);
      return new Text(text, 0, 0);
    },

    renderResult(result, { expanded, isPartial }, theme) {
      if (isPartial) {
        return new Text(theme.fg("warning", "Searching memories..."), 0, 0);
      }

      const content = result.content[0];
      if (!content || content.type !== "text") {
        return new Text(theme.fg("dim", "No results"), 0, 0);
      }

      const lines = content.text.split("\n");
      // First line is usually "Found N relevant conversation(s):"
      const header = lines[0] || "Search complete";
      let text = theme.fg("success", header);

      if (result.details?.truncated) {
        text += theme.fg("warning", " (truncated)");
      }

      if (expanded) {
        // Show first 30 lines of results
        const preview = lines.slice(1, 31);
        for (const line of preview) {
          text += `\n${theme.fg("dim", line)}`;
        }
        if (lines.length > 31) {
          text += `\n${theme.fg("muted", `... ${lines.length - 31} more lines`)}`;
        }
      }

      return new Text(text, 0, 0);
    },
  });

  // ── Read tool ─────────────────────────────────────────────────────
  pi.registerTool({
    name: "episodic_memory_read",
    label: "Episodic Memory Read",
    description: `Read a full conversation from your episodic memory archive as markdown. Use after searching to get detailed context. Supports startLine/endLine pagination for large conversations. Output truncated to ${DEFAULT_MAX_LINES} lines / ${formatSize(DEFAULT_MAX_BYTES)}.`,
    parameters: Type.Object({
      path: Type.String({ description: "Absolute path to the JSONL conversation file" }),
      startLine: Type.Optional(
        Type.Number({ description: "Starting line number (1-indexed, inclusive)", minimum: 1 })
      ),
      endLine: Type.Optional(
        Type.Number({ description: "Ending line number (1-indexed, inclusive)", minimum: 1 })
      ),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const filePath = params.path.replace(/^@/, ""); // Strip leading @ (some models add it)

      if (!existsSync(filePath)) {
        return {
          content: [{ type: "text", text: `File not found: ${filePath}` }],
          isError: true,
          details: { path: filePath },
        };
      }

      const { formatConversationAsMarkdown } = await import(resolve(PACKAGE_ROOT, "dist", "show.js"));

      const jsonlContent = readFileSync(filePath, "utf-8");
      const markdown = formatConversationAsMarkdown(jsonlContent, params.startLine, params.endLine);

      if (!markdown.trim()) {
        return {
          content: [{ type: "text", text: "No conversation content found in the specified range." }],
          details: { path: filePath, startLine: params.startLine, endLine: params.endLine },
        };
      }

      // Truncate
      const truncation = truncateHead(markdown, {
        maxLines: DEFAULT_MAX_LINES,
        maxBytes: DEFAULT_MAX_BYTES,
      });

      let text = truncation.content;
      if (truncation.truncated) {
        text += `\n\n[Output truncated: showing ${truncation.outputLines} of ${truncation.totalLines} lines`;
        text += ` (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}).`;
        text += ` Use startLine/endLine to paginate through the conversation.]`;
      }

      return {
        content: [{ type: "text", text }],
        details: {
          path: filePath,
          startLine: params.startLine,
          endLine: params.endLine,
          truncated: truncation.truncated,
        },
      };
    },

    renderCall(args, theme) {
      let text = theme.fg("toolTitle", theme.bold("episodic_memory_read "));
      // Show just the filename, not the full path
      const filename = args.path?.split("/").pop() || args.path;
      text += theme.fg("accent", filename);
      if (args.startLine || args.endLine) {
        text += theme.fg("dim", ` lines ${args.startLine || 1}-${args.endLine || "end"}`);
      }
      return new Text(text, 0, 0);
    },

    renderResult(result, { expanded, isPartial }, theme) {
      if (isPartial) {
        return new Text(theme.fg("warning", "Loading conversation..."), 0, 0);
      }

      if (result.isError) {
        const content = result.content[0];
        return new Text(
          theme.fg("error", content?.type === "text" ? content.text : "Error reading conversation"),
          0,
          0
        );
      }

      const content = result.content[0];
      if (!content || content.type !== "text") {
        return new Text(theme.fg("dim", "Empty conversation"), 0, 0);
      }

      const lines = content.text.split("\n");
      let text = theme.fg("success", `Conversation loaded (${lines.length} lines)`);

      if (result.details?.truncated) {
        text += theme.fg("warning", " (truncated)");
      }

      if (expanded) {
        const preview = lines.slice(0, 30);
        for (const line of preview) {
          text += `\n${theme.fg("dim", line)}`;
        }
        if (lines.length > 30) {
          text += `\n${theme.fg("muted", `... ${lines.length - 30} more lines`)}`;
        }
      }

      return new Text(text, 0, 0);
    },
  });
}
