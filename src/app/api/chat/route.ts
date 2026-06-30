import { TOOL_DEFINITIONS, executeTool } from '@/lib/tools';
import { streamToolLoop } from '@/lib/ai/tool-loop';
import { SYSTEM_PROMPT } from '@/lib/system-prompt';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const { messages, scenario_context } = await request.json();

  const systemPrompt = scenario_context
    ? `${SYSTEM_PROMPT}\n\n## Current Demo Context\n${scenario_context}`
    : SYSTEM_PROMPT;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        await streamToolLoop({
          system: systemPrompt,
          messages,
          tools: TOOL_DEFINITIONS,
          executeTool: async (name, input, toolCallId) =>
            executeTool(name, input, {
              onSubAgentToolStart: (toolName: string) => {
                send({
                  type: 'subagent_tool_start',
                  parent_tool_use_id: toolCallId,
                  tool_name: toolName,
                });
              },
            }),
          sendEvent: send,
          // Sub-agent results carry { summary, toolsUsed, iterations }; the
          // pipeline tool carries { summary, manifest }. The UI sees the full
          // result, but the model should only receive the summary.
          modelResultForTool: (result) =>
            result &&
            typeof result === 'object' &&
            'summary' in (result as object) &&
            ('toolsUsed' in (result as object) || 'manifest' in (result as object))
              ? { summary: (result as { summary: unknown }).summary }
              : result,
        });

        send({ type: 'done' });
      } catch (err) {
        send({ type: 'error', message: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
