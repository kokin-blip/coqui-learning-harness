import { database } from '../../../storage/index.ts';
/**
 * Server-side persistence for the graph render settings (the settings-panel
 * controls): data/render-settings.json — read-modify-write, NOT a ledger.
 *
 * The shape, defaults, and sanitizer live in src/core/render-settings.ts
 * (pure, shared with the client); this module only moves bytes. Whatever
 * comes off disk is sanitized by the caller on load — and we sanitize on
 * write too, so the file can never hold an out-of-range value that would
 * silently shift a slider.
 */

import fs from "node:fs";
import path from "node:path";
import { RENDER_SETTINGS_FILE } from "../../config.ts";
import { DEFAULT_RENDER_SETTINGS, sanitizeRenderSettings, type GraphRenderSettings } from "../core/render-settings.ts";
import { assertGraphFormat, ensureGraphFormat } from "./graph-format.ts";

/** The persisted settings, or null when no file exists yet (first boot). */
export function readRenderSettings():GraphRenderSettings|null{return database().preference('render-settings');}
export function writeRenderSettings(raw:unknown):GraphRenderSettings{const settings=sanitizeRenderSettings(raw);database().setPreference('render-settings',settings);return settings;}

export { DEFAULT_RENDER_SETTINGS };
