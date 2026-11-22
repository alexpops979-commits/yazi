/**
 * Single-workspace mode: accounts are removed, the app always works with one
 * seeded workspace. The ids are resolved once at boot and reused by middleware,
 * guards and the public bootstrap endpoint.
 */

export type DefaultWorkspace = {
  tenantId: string;
  userId: string;
  name: string;
};

let current: DefaultWorkspace | null = null;

export function setDefaultWorkspace(workspace: DefaultWorkspace): void {
  current = workspace;
}

export function getDefaultWorkspace(): DefaultWorkspace | null {
  return current;
}
