import { useEffect, useMemo, useRef, useState } from "react";
import { MoreHorizontal, Search, LoaderCircle } from "lucide-react";
type SessionRow = {
  id: string;
  title: string;
  kind?: string;
  updatedAt: string;
  busy?: boolean;
  phase?: string;
  compacting?: boolean;
  pendingQuestion?: boolean;
};
export function SessionHistory({
  chats,
  activeId,
  onOpen,
  onActions,
}: {
  chats: SessionRow[];
  activeId?: string;
  onOpen: (id: string) => void;
  onActions: (id: string) => void;
}) {
  const [filter, setFilter] = useState(
      () => localStorage.getItem("coqui.session-kind") ?? "all",
    ),
    [query, setQuery] = useState(""),
    [limit, setLimit] = useState(50),
    [walk, setWalk] = useState(0);
  const search = useRef<HTMLInputElement>(null);
  const filtered = useMemo(
    () =>
      chats.filter(
        (c) =>
          (filter === "all" || (c.kind ?? "teach") === filter) &&
          c.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
      ),
    [chats, filter, query],
  );
  useEffect(() => {
    setLimit(50);
    setWalk(0);
    localStorage.setItem("coqui.session-kind", filter);
  }, [filter, query]);
  useEffect(() => {
    const focus = () => search.current?.focus();
    window.addEventListener("coqui:session-search", focus);
    return () => window.removeEventListener("coqui:session-search", focus);
  }, []);
  return (
    <section className="recent session-history" aria-label="Session history">
      <div className="history-heading">
        <span className="caption">Sessions</span>
        <select
          aria-label="Session kind"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="teach">Teach</option>
          <option value="practice">Practice</option>
        </select>
      </div>
      <label className="history-search">
        <Search size={14} />
        <input
          ref={search}
          aria-label="Search sessions"
          placeholder="Search sessions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (["ArrowDown", "ArrowUp"].includes(e.key)) {
              e.preventDefault();
              const n = filtered.length;
              const next = n
                ? (walk + (e.key === "ArrowDown" ? 1 : -1) + n) % n
                : 0;
              setWalk(next);
              setLimit((n) => Math.max(n, next + 1));
            }
            if (e.key === "Enter" && filtered[walk]) {
              e.preventDefault();
              onOpen(filtered[walk].id);
            }
            if (e.key === "Escape" && query) {
              e.preventDefault();
              e.stopPropagation();
              setQuery("");
            }
          }}
        />
      </label>
      <div className="history-results" role="list">
        {filtered.slice(0, limit).map((c, i) => (
          <div
            role="listitem"
            key={c.id}
            className={
              "history-row " +
              (activeId === c.id ? "current " : "") +
              (query && walk === i ? "walked" : "")
            }
            onContextMenu={(e) => {
              e.preventDefault();
              onActions(c.id);
            }}
          >
            <button className="recent-session" onClick={() => onOpen(c.id)}>
              <span>{c.title}</span>
              <small>
                {c.busy || c.compacting ? (
                  <LoaderCircle size={11} className="spin" />
                ) : null}
                {c.compacting
                  ? "Summarizing"
                  : c.busy
                    ? "Working"
                    : c.kind === "practice"
                      ? "Practice"
                      : c.pendingQuestion
                        ? "Your turn"
                        : (c.phase ?? "Learning")}{" "}
                ·{" "}
                {new Date(c.updatedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </small>
            </button>
            <button
              className="history-actions"
              aria-label={"Actions for " + c.title}
              onClick={() => onActions(c.id)}
            >
              <MoreHorizontal size={15} />
            </button>
          </div>
        ))}
        {!filtered.length && (
          <p className="caption no-sessions">
            {chats.length
              ? "No sessions match your search."
              : "Your learning starts with a question."}
          </p>
        )}
        {filtered.length > limit && (
          <button
            className="text-button"
            onClick={() => setLimit((n) => n + 50)}
          >
            Show older sessions ({filtered.length - limit})
          </button>
        )}
      </div>
    </section>
  );
}
