export type Colors = Record<string, string>;
export interface DemoTheme { id: string; name: string; desc: string; defaultMode: 'light' | 'dark'; light: Colors; dark: Colors; draft?: boolean; acceptedLowContrast?: string[] }
export interface DemoLibrary { id: string; name: string; en: string; version: string; summary: string; fitFor: string[]; fitDesc: string; traits: [string, string][] }
export interface DemoData { library: DemoLibrary; themes: DemoTheme[] }
