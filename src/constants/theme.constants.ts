// user_settings.theme check constraint (supabase/migrations/*_foundation.sql); system follows the device
export const THEMES = ['light', 'dark', 'system'] as const

export type AppTheme = (typeof THEMES)[number]
