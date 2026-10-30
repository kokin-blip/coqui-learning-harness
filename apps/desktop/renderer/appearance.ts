/** Custom backgrounds derive readable surfaces; the approved themes remain the CSS defaults. */
export function backgroundPalette(
  hex: string | null | undefined,
): Record<string, string> {
  if (!hex || !/^#(?:[a-f0-9]{3}|[a-f0-9]{6})$/i.test(hex)) return {};
  const full =
    hex.length === 4
      ? hex
          .slice(1)
          .split("")
          .map((x) => x + x)
          .join("")
      : hex.slice(1);
  const rgb = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  const mix = (toward: number, amount: number) =>
    "#" +
    rgb
      .map((c) =>
        Math.round(c + (toward - c) * amount)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("");
  const luminance = (color: string) => {
    const c = [1, 3, 5]
      .map((i) => parseInt(color.slice(i, i + 2), 16) / 255)
      .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return c[0]! * 0.2126 + c[1]! * 0.7152 + c[2]! * 0.0722;
  };
  const light = luminance("#" + full) > 0.179,
    ink = light ? "#000000" : "#ffffff",
    toward = light ? 255 : 0;
  const surface = mix(toward, light ? 0.7 : 0.08),
    soft = mix(light ? 0 : 255, 0.1);
  // Secondary text must retain normal-text contrast even for mid-luminance backgrounds.
  let muted = ink;
  for (const amount of [0.7, 0.8, 0.9, 1]) {
    const candidate = mix(light ? 0 : 255, amount),
      l = luminance(candidate),
      b = luminance("#" + full);
    if ((Math.max(l, b) + 0.05) / (Math.min(l, b) + 0.05) >= 4.5) {
      muted = candidate;
      break;
    }
  }
  return {
    "--canvas": "#" + full,
    "--canvas-override": "#" + full,
    "--surface": surface,
    "--reading": surface,
    "--soft": soft,
    "--ink": ink,
    "--muted": muted,
    "--line": mix(light ? 0 : 255, 0.3),
    "--chrome": mix(toward, 0.16),
    "--mist": surface,
    "--lens": soft,
    "--selected": mix(light ? 0 : 255, 0.18),
    "--accent": light ? "#17472a" : "#c7efb9",
    "--accent-soft": light ? "#d7e8d1" : "#304b42",
    "--on-accent": light ? "#ffffff" : "#17291d",
  };
}
export function applyBackground(
  root: HTMLElement,
  hex: string | null | undefined,
) {
  const previous = JSON.parse(root.dataset.customPalette ?? "[]") as string[];
  const next = backgroundPalette(hex);
  for (const name of previous)
    if (!(name in next)) root.style.removeProperty(name);
  for (const [name, value] of Object.entries(next))
    root.style.setProperty(name, value);
  root.dataset.customPalette = JSON.stringify(Object.keys(next));
}
