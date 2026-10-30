export const ARTIFACT_POLICY_VERSION = 1;
export const ARTIFACT_CSP =
  "default-src 'none'; script-src 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com; style-src 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src https://fonts.gstatic.com data:; img-src data: https:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-src 'none'";
export type ArtifactMessage =
  | { channel: "coqui-artifact"; token: string; type: "height"; height: number }
  | {
      channel: "coqui-artifact";
      token: string;
      type: "error";
      message: string;
    };
/** Same dependency policy and bridge in verification and display. The bridge has no host commands. */
export function artifactDocument(html: string, token: string) {
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(token))
    throw new Error("Invalid demonstration identity");
  const bridge = `<meta http-equiv="Content-Security-Policy" content="${ARTIFACT_CSP.replaceAll('"', "&quot;")}"><script>(()=>{const token=${JSON.stringify(token)};const send=(value)=>parent.postMessage({channel:'coqui-artifact',token,...value},'*');let queued=false;const measure=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;const b=document.body;if(!b)return;const s=getComputedStyle(b);send({type:'height',height:Math.max(80,Math.min(2400,Math.ceil(Math.max(b.scrollHeight,b.getBoundingClientRect().height)+(parseFloat(s.marginTop)||0)+(parseFloat(s.marginBottom)||0))))});});};addEventListener('error',e=>send({type:'error',message:String(e.message||'Demonstration error').slice(0,512)}));addEventListener('unhandledrejection',e=>send({type:'error',message:String(e.reason?.message||e.reason||'Demonstration promise failed').slice(0,512)}));addEventListener('DOMContentLoaded',()=>{if(document.body)new ResizeObserver(measure).observe(document.body);measure();});addEventListener('load',measure);})();</script>`;
  if (/<head\b[^>]*>/i.test(html))
    return html.replace(/<head\b[^>]*>/i, (head) => head + bridge);
  if (/<html\b[^>]*>/i.test(html))
    return html.replace(
      /<html\b[^>]*>/i,
      (tag) => tag + "<head>" + bridge + "</head>",
    );
  return (
    "<!doctype html><html><head>" +
    bridge +
    "</head><body>" +
    html +
    "</body></html>"
  );
}
export function artifactMessage(
  value: unknown,
  token: string,
): ArtifactMessage | null {
  if (!value || typeof value !== "object") return null;
  const m = value as Record<string, unknown>;
  if (m.channel !== "coqui-artifact" || m.token !== token) return null;
  if (
    m.type === "height" &&
    typeof m.height === "number" &&
    Number.isFinite(m.height)
  )
    return {
      channel: "coqui-artifact",
      token,
      type: "height",
      height: Math.max(80, Math.min(2400, Math.ceil(m.height))),
    };
  if (m.type === "error" && typeof m.message === "string")
    return {
      channel: "coqui-artifact",
      token,
      type: "error",
      message: m.message.slice(0, 512),
    };
  return null;
}
