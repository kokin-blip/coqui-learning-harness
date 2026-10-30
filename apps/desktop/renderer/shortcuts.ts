import { eventBinding } from "../../../packages/engine/src/core/keyboard.ts";
export const SHORTCUTS = [
  { id: "model", label: "Open model selector", binding: "mod+shift+m" },
  { id: "sessions", label: "Search sessions", binding: "mod+shift+f" },
  { id: "rename", label: "Rename current session", binding: "f2" },
  {
    id: "userThinking",
    label: "Expand or collapse your thinking",
    binding: "mod+t",
  },
  { id: "help", label: "Show keyboard shortcuts", binding: "?" },
  { id: "search", label: "Search your learning", binding: "mod+k" },
  { id: "map", label: "Open knowledge map", binding: "mod+g" },
  { id: "dictation", label: "Toggle dictation", binding: "mod+d" },
  { id: "sidebar", label: "Toggle sidebar", binding: "mod+b" },
  { id: "thinking", label: "Cycle thinking level", binding: "mod+shift+l" },
  { id: "submit", label: "Submit current answer", binding: "mod+enter" },
  { id: "find", label: "Find in transcript", binding: "mod+f" },
] as const;
export const RESERVED = [
  "mod+n",
  "mod+,",
  "mod+o",
  "mod+q",
  "mod+w",
  "mod+c",
  "mod+v",
  "mod+x",
  "mod+a",
  "mod+z",
  "mod+shift+z",
];
export { eventBinding };
export function bindingFor(id: string, overrides: Record<string, string> = {}) {
  return overrides[id] ?? SHORTCUTS.find((s) => s.id === id)?.binding ?? "";
}
export function validateBinding(
  id: string,
  value: string,
  overrides: Record<string, string> = {},
) {
  if (!value) return "";
  if (
    RESERVED.includes(value) ||
    value === "tab" ||
    value === "shift+tab" ||
    value === "escape"
  )
    return "This key belongs to standard macOS navigation.";
  const other = SHORTCUTS.find(
    (s) => s.id !== id && bindingFor(s.id, overrides) === value,
  );
  return other ? "Already assigned to " + other.label.toLowerCase() + "." : "";
}
