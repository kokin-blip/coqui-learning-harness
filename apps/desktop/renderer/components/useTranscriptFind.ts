import { useEffect, useRef, useState } from "react";
/** CSS Highlight ranges preserve React's DOM and the lesson's layout. */
export function useTranscriptFind(query: string, revision: unknown) {
  const ranges = useRef<Range[]>([]);
  const [count, setCount] = useState(0),
    [index, setIndex] = useState(0);
  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      const root = document.querySelector(".transcript");
      const found: Range[] = [];
      if (root && query.trim()) {
        const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walk.nextNode())) {
          if (!node.parentElement?.getClientRects().length) continue;
          const text = node.textContent ?? "",
            lower = text.toLocaleLowerCase(),
            needle = query.toLocaleLowerCase();
          for (
            let at = lower.indexOf(needle);
            at !== -1;
            at = lower.indexOf(needle, at + needle.length)
          ) {
            const range = new Range();
            range.setStart(node, at);
            range.setEnd(node, at + needle.length);
            found.push(range);
          }
        }
      }
      ranges.current = found;
      if (found[0] && query && (globalThis as any).Highlight) {
        (CSS as any).highlights?.set(
          "transcript-active",
          new (globalThis as any).Highlight(found[0]),
        );
        found[0].startContainer.parentElement?.scrollIntoView({
          block: "center",
        });
      }
      setCount(found.length);
      setIndex(0);
      if ((globalThis as any).Highlight)
        (CSS as any).highlights.set(
          "transcript-find",
          new (globalThis as any).Highlight(...found),
        );
    });
    return () => {
      cancelAnimationFrame(frame);
      (CSS as any).highlights?.delete("transcript-find");
      (CSS as any).highlights?.delete("transcript-active");
    };
  }, [query, revision]);
  useEffect(() => {
    const range = ranges.current[index];
    if (range && (globalThis as any).Highlight) {
      (CSS as any).highlights.set(
        "transcript-active",
        new (globalThis as any).Highlight(range),
      );
      if (query)
        range.startContainer.parentElement?.scrollIntoView({ block: "center" });
    }
  }, [index, count]);
  return {
    count,
    current: count ? index + 1 : 0,
    next: () => setIndex((i) => (count ? (i + 1) % count : 0)),
    previous: () => setIndex((i) => (count ? (i - 1 + count) % count : 0)),
  };
}
