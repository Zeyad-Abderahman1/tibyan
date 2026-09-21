import { registerReadOnlyTools } from './read-only.tools.js';
import { registerMutationTools } from './mutation.tools.js';

export function registerAllAssistantTools(): void {
  registerReadOnlyTools();
  registerMutationTools();
}

export { registerReadOnlyTools } from './read-only.tools.js';
export { registerMutationTools } from './mutation.tools.js';
