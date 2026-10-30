export const ROLES = ['owner', 'editor', 'viewer', 'stranger'] as const

export type Role = (typeof ROLES)[number]

// local stack only, so a constant password is not a secret
export const E2E_PASSWORD = 'saldo-e2e-local-password'

export const emailOf = (role: Role) => `${role}@example.com`

export const authStatePath = (role: Role) => `e2e/.auth/${role}.json`
