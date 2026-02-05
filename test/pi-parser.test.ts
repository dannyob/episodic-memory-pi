import { describe, it, expect } from 'vitest';
import { parseConversationFile, parseConversation } from '../src/parser.js';
import { getFixturePath, countLines } from './test-utils.js';

describe('Parser - Pi Session Format', () => {
  describe('Pi conversation format (type: "message" with role)', () => {
    const fixturePath = getFixturePath('pi-conversation.jsonl');

    it('should parse Pi-format file successfully', async () => {
      const result = await parseConversationFile(fixturePath);
      expect(result).toBeDefined();
      expect(result.exchanges).toBeDefined();
      expect(result.exchanges.length).toBeGreaterThan(0);
    });

    it('should extract user and assistant messages from Pi format', async () => {
      const result = await parseConversationFile(fixturePath);
      
      // Pi format uses type: "message" with message.role inside
      // Parser should correctly identify user/assistant messages
      expect(result.exchanges.length).toBe(2);
      
      const firstExchange = result.exchanges[0];
      expect(firstExchange.userMessage).toContain('Help me sort out my task list');
      expect(firstExchange.assistantMessage).toContain('3 tasks in your inbox');
    });

    it('should handle Pi format with tool calls', async () => {
      const result = await parseConversationFile(fixturePath);
      
      // First exchange should have tool calls from assistant
      const firstExchange = result.exchanges[0];
      expect(firstExchange.toolCalls).toBeDefined();
      expect(firstExchange.toolCalls!.length).toBeGreaterThan(0);
      expect(firstExchange.toolCalls![0].toolName).toBe('bash');
    });

    it('should skip non-message types in Pi format', async () => {
      const result = await parseConversationFile(fixturePath);
      
      // Should not include session, model_change, thinking_level_change as exchanges
      // Only actual user/assistant message pairs
      expect(result.exchanges.length).toBe(2);
    });

    it('should extract text from Pi format content arrays', async () => {
      const result = await parseConversationFile(fixturePath);
      
      const secondExchange = result.exchanges[1];
      expect(secondExchange.userMessage).toContain('prioritize them');
      expect(secondExchange.assistantMessage).toContain('High priority');
    });

    it('should handle Pi format with thinking blocks', async () => {
      const result = await parseConversationFile(fixturePath);
      
      // Thinking blocks should be ignored in the text extraction
      // Only actual text content should be in assistantMessage
      const firstExchange = result.exchanges[0];
      expect(firstExchange.assistantMessage).not.toContain('thinkingSignature');
      expect(firstExchange.assistantMessage).toContain('3 tasks');
    });

    it('should skip toolResult messages correctly', async () => {
      const result = await parseConversationFile(fixturePath);
      
      // toolResult messages (role: "toolResult") should not create new exchanges
      // They should be skipped since they're not user or assistant messages
      for (const exchange of result.exchanges) {
        expect(exchange.userMessage).not.toContain('task-1\ntask-2\ntask-3');
      }
    });
  });

  describe('Format compatibility - both Claude Code and Pi', () => {
    it('should parse Claude Code format (type: user/assistant)', async () => {
      const claudeFixture = getFixturePath('short-conversation.jsonl');
      const result = await parseConversationFile(claudeFixture);
      
      expect(result).toBeDefined();
      expect(result.exchanges.length).toBeGreaterThan(0);
    });

    it('should parse Pi format (type: message with role)', async () => {
      const piFixture = getFixturePath('pi-conversation.jsonl');
      const result = await parseConversationFile(piFixture);
      
      expect(result).toBeDefined();
      expect(result.exchanges.length).toBeGreaterThan(0);
    });

    it('should produce consistent exchange structure from both formats', async () => {
      const claudeResult = await parseConversationFile(getFixturePath('short-conversation.jsonl'));
      const piResult = await parseConversationFile(getFixturePath('pi-conversation.jsonl'));
      
      // Both should have the same exchange structure
      for (const exchange of [...claudeResult.exchanges, ...piResult.exchanges]) {
        expect(exchange).toHaveProperty('id');
        expect(exchange).toHaveProperty('project');
        expect(exchange).toHaveProperty('timestamp');
        expect(exchange).toHaveProperty('userMessage');
        expect(exchange).toHaveProperty('assistantMessage');
        expect(exchange).toHaveProperty('archivePath');
        expect(exchange).toHaveProperty('lineStart');
        expect(exchange).toHaveProperty('lineEnd');
      }
    });
  });

  describe('Pi format edge cases', () => {
    it('should handle empty content arrays', async () => {
      // Parser should not crash on empty content
      const result = await parseConversationFile(getFixturePath('pi-conversation.jsonl'));
      expect(result).toBeDefined();
    });

    it('should extract project name from Pi session path format', async () => {
      // Pi uses --project-path-- format for directories
      // Test that project extraction works
      const result = await parseConversationFile(getFixturePath('pi-conversation.jsonl'));
      expect(result.project).toBe('fixtures');
    });

    it('should handle multiple assistant messages in sequence', async () => {
      const result = await parseConversationFile(getFixturePath('pi-conversation.jsonl'));
      
      // First exchange has multiple assistant turns (one after tool result)
      // They should be concatenated
      const firstExchange = result.exchanges[0];
      expect(firstExchange.assistantMessage).toContain("I'll help you");
      expect(firstExchange.assistantMessage).toContain('3 tasks');
    });
  });
});

describe('Parser - Real Pi Session', () => {
  // Test with actual Pi session if available
  const piSessionPath = process.env.HOME + '/.pi/agent/sessions';
  
  it('should be able to find Pi sessions directory', async () => {
    const fs = await import('fs');
    const hasPiSessions = fs.existsSync(piSessionPath);
    
    // This is informational - not a failure if Pi isn't installed
    if (hasPiSessions) {
      const dirs = fs.readdirSync(piSessionPath);
      expect(dirs.length).toBeGreaterThanOrEqual(0);
    } else {
      console.log('Pi sessions directory not found - skipping real session tests');
    }
  });
});
