import { deskTools } from '../ops/tool-definitions.mjs';
type WebTool = { name: string; title: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute: (input: unknown) => Promise<unknown> };
type Context = { registerTool: (tool: WebTool, options: { signal: AbortSignal }) => void | Promise<void> };
export function registerMissionTools(context: Context | undefined, invoke: (name: string, input: unknown) => Promise<unknown>, refresh: () => Promise<void>) {
  const lifecycle = new AbortController();
  if (context?.registerTool) for (const tool of deskTools) {
    try {
      void Promise.resolve(context.registerTool({ name: tool.name, title: tool.title, description: tool.description, inputSchema: tool.inputSchema,
        annotations: { readOnlyHint: tool.annotations.readOnlyHint, untrustedContentHint: true },
        async execute(input) { const result = await invoke(tool.name, input); try { await refresh(); } catch { console.warn('Gespeichert; die Ansicht konnte nicht aktualisiert werden.'); } return result; },
      }, { signal: lifecycle.signal })).catch(() => console.warn('WebMCP-Werkzeug konnte nicht registriert werden.'));
    } catch { console.warn('WebMCP ist in diesem Browser nicht verfügbar.'); }
  }
  return () => lifecycle.abort();
}
export function browserModelContext() { return (document as Document & { modelContext?: Context }).modelContext; }
