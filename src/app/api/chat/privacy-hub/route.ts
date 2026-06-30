// Privacy Hub agent (Gemma) streaming endpoint.
//
// Intentionally isolated from /api/chat (the DSAR agent):
//   - own tool set (PRIVACY_HUB_TOOL_DEFINITIONS, executePrivacyHubTool)
//   - own system prompt (PRIVACY_HUB_SYSTEM_PROMPT)
//   - same provider-neutral AI streaming loop

import { NextRequest } from 'next/server';
import { streamToolLoop } from '@/lib/ai/tool-loop';
import {
  PRIVACY_HUB_TOOL_DEFINITIONS,
  executePrivacyHubTool,
} from '@/features/privacy-hub/lib/tools';
import { PRIVACY_HUB_SYSTEM_PROMPT } from '@/features/privacy-hub/lib/system-prompt';

export async function POST(request: NextRequest) {
  const { messages } = await request.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        await streamToolLoop({
          system: PRIVACY_HUB_SYSTEM_PROMPT,
          messages,
          tools: PRIVACY_HUB_TOOL_DEFINITIONS,
          executeTool: (name, input) => executePrivacyHubTool(name, input),
          sendEvent: send,
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
