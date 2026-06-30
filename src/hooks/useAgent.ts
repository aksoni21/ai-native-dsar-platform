'use client';

import { useState, useCallback, useRef } from 'react';
import type { AgentMessage, ToolCall } from '@/types';

interface UseAgentReturn {
  messages: AgentMessage[];
  isLoading: boolean;
  sendMessage: (content: string, scenarioContext?: string) => void;
  clearMessages: () => void;
}

export function useAgent(): UseAgentReturn {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string, scenarioContext?: string) => {
    if (isLoading) return;

    // Abort any in-progress stream
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    const userMsg: AgentMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const assistantId = `assistant-${Date.now()}`;
    const assistantMsg: AgentMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      toolCalls: [],
    };

    setMessages((prev) => [...prev, assistantMsg]);

    try {
      // Build history for API (exclude the streaming assistant placeholder)
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, scenario_context: scenarioContext }),
        signal: abort.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          let event: Record<string, unknown>;
          try {
            event = JSON.parse(raw);
          } catch {
            continue;
          }

          if (event.type === 'text_delta') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + (event.text as string) } : m
              )
            );
          } else if (event.type === 'tool_start') {
            const toolCall: ToolCall = {
              id: event.tool_use_id as string,
              name: event.tool_name as string,
              input: {},
              status: 'calling',
              liveToolsUsed: [],
            };
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, toolCalls: [...(m.toolCalls ?? []), toolCall] }
                  : m
              )
            );
          } else if (event.type === 'subagent_tool_start') {
            const parentId = event.parent_tool_use_id as string;
            const childName = event.tool_name as string;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      toolCalls: (m.toolCalls ?? []).map((tc) =>
                        tc.id === parentId
                          ? { ...tc, liveToolsUsed: [...(tc.liveToolsUsed ?? []), childName] }
                          : tc
                      ),
                    }
                  : m
              )
            );
          } else if (event.type === 'tool_result') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      toolCalls: (m.toolCalls ?? []).map((tc) =>
                        tc.id === (event.tool_use_id as string)
                          ? { ...tc, result: event.result, status: 'done' as const }
                          : tc
                      ),
                    }
                  : m
              )
            );
          } else if (event.type === 'error') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + `\n\n_Error: ${event.message}_` }
                  : m
              )
            );
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: m.content || 'Something went wrong. Please try again.' }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages]);

  const clearMessages = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setIsLoading(false);
  }, []);

  return { messages, isLoading, sendMessage, clearMessages };
}
