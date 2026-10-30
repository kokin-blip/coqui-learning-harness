import { database } from '../../../storage/index.ts';
import { sanitizeUserSettings,type UserSettings } from '../core/settings.ts';
import type { SettingsStore } from '../core/ports.ts';
export function readSettings():UserSettings|null{try{return sanitizeUserSettings(database().preference('settings'));}catch(error){if(error instanceof SyntaxError)return null;throw error;}}
export function writeSettings(raw:unknown):UserSettings{const v=sanitizeUserSettings(raw);if(!v)throw new Error('Invalid settings record');database().setPreference('settings',v);return v;}
export const settingsStore:SettingsStore={readSettings,writeSettings};
