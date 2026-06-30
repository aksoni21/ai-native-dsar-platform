import { runToolLoop } from '@/lib/ai/tool-loop';

const MAX_ITERATIONS = 8;

// Tools is loaded lazily to break the static-import cycle:
// tools.ts → identity-resolver.ts → runner.ts → tools.ts
// At call time, tools.ts has fully resolved, so the dynamic import is safe.
async function loadTools() {
  const mod = await import('@/lib/tools');
  return { TOOL_DEFINITIONS: mod.TOOL_DEFINITIONS, executeTool: mod.executeTool };
}

interface RunSubAgentArgs {
  systemPrompt: string;
  allowedToolNames: string[];
  userMessage: string;
  onToolStart?: (toolName: string) => void;
}

export interface SubAgentResult {
  summary: string;
  toolsUsed: string[];
  iterations: number;
}

export async function runSubAgent({
  systemPrompt,
  allowedToolNames,
  userMessage,
  onToolStart,
}: RunSubAgentArgs): Promise<SubAgentResult> {
  const { TOOL_DEFINITIONS, executeTool } = await loadTools();

  const allowed = new Set(allowedToolNames);
  const tools = TOOL_DEFINITIONS.filter((tool) => allowed.has(tool.name));

  return runToolLoop({
    system: systemPrompt,
    userMessage,
    tools,
    maxIterations: MAX_ITERATIONS,
    executeTool,
    onToolStart,
  });
}
