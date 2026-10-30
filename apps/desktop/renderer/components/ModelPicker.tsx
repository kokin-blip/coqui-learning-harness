import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Search } from "lucide-react";
import { fuzzyScore } from "../../../../packages/engine/src/core/fuzzy.ts";
export function ModelPicker({
  models,
  value,
  onChange,
  label,
  placeholder = "Use default model",
}: {
  models: any[];
  value?: { provider: string; id: string };
  onChange: (model: any | null) => void;
  label: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [index, setIndex] = useState(0),
    [position, setPosition] = useState({ left: 0, top: 0, width: 380 });
  const trigger = useRef<HTMLButtonElement>(null),
    popover = useRef<HTMLDivElement>(null),
    search = useRef<HTMLInputElement>(null);
  const uid = useId();
  const chosen = models.find(
    (m) => m.provider === value?.provider && m.id === value?.id,
  );
  const matches = useMemo(
    () =>
      models
        .map((m) => ({ m, score: fuzzyScore(query, m.name, m.id, m.provider) }))
        .filter((v) => v.score !== null)
        .sort(
          (a, b) =>
            (b.score ?? 0) - (a.score ?? 0) || a.m.name.localeCompare(b.m.name),
        )
        .slice(0, 60)
        .map((v) => v.m),
    [models, query],
  );
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current!.getBoundingClientRect();
      const width = Math.min(400, innerWidth - 32);
      const height = popover.current!.offsetHeight;
      const below = innerHeight - rect.bottom - 8;
      const above = rect.top - 8;
      const top =
        below >= height || below >= above
          ? rect.bottom + 8
          : rect.top - height - 8;
      setPosition({
        left: Math.max(16, Math.min(rect.left, innerWidth - width - 16)),
        top: Math.max(16, Math.min(top, innerHeight - height - 16)),
        width,
      });
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(popover.current!);
    observer.observe(trigger.current!);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    setTimeout(() => search.current?.focus(), 0);
    const outside = (event: PointerEvent) => {
      if (
        !popover.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    window.addEventListener("pointerdown", outside);
    return () => window.removeEventListener("pointerdown", outside);
  }, [open]);
  function choose(model: any | null) {
    onChange(model);
    setOpen(false);
    setQuery("");
    trigger.current?.focus();
  }
  return (
    <>
      <button
        ref={trigger}
        className="model-picker-trigger"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          setIndex(0);
        }}
      >
        <span>{chosen?.name ?? value?.id ?? placeholder}</span>
        <ChevronDown size={14} />
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={popover}
              className="model-picker-popover glass mist"
              style={position}
              initial={{ opacity: 0, y: 4, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ type: "spring", stiffness: 240, damping: 30 }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                  trigger.current?.focus();
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setIndex((i) => Math.min(matches.length - 1, i + 1));
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setIndex((i) => Math.max(0, i - 1));
                }
                if (
                  e.key === "Enter" &&
                  document.activeElement === search.current
                ) {
                  e.preventDefault();
                  if (matches[index]) choose(matches[index]);
                }
              }}
            >
              <div className="search-input">
                <Search size={17} />
                <input
                  ref={search}
                  value={query}
                  aria-label={"Search " + label.toLowerCase()}
                  aria-controls={uid}
                  aria-activedescendant={
                    matches[index] ? uid + "-" + index : undefined
                  }
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setIndex(0);
                  }}
                  placeholder="Search by model or provider…"
                />
              </div>
              <button className="text-button" onClick={() => choose(null)}>
                {placeholder}
              </button>
              <div
                id={uid}
                role="listbox"
                aria-label={label}
                className="model-picker-results"
              >
                {matches.map((m, i) => (
                  <button
                    id={uid + "-" + i}
                    key={m.provider + ":" + m.id}
                    role="option"
                    aria-selected={i === index}
                    className={i === index ? "highlighted" : ""}
                    onPointerMove={() => setIndex(i)}
                    onClick={() => choose(m)}
                  >
                    <span>
                      <strong>{m.name}</strong>
                      <small>
                        {m.provider}
                        {m.input?.includes("image") ? " · Vision" : ""}
                        {m.contextWindow
                          ? " · " +
                            Math.round(m.contextWindow / 1000) +
                            "k context"
                          : ""}
                      </small>
                    </span>
                    {value?.provider === m.provider && value?.id === m.id && (
                      <Check size={15} />
                    )}
                  </button>
                ))}
                {!matches.length && (
                  <p className="caption">
                    No available models match. Check your connections or try
                    another term.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
