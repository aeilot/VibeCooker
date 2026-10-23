"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export function CustomSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const expanded = open && !disabled;

  useEffect(() => {
    if (!expanded) return;
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [expanded]);

  function choose(index: number) {
    setOpen(false);
    onChange(options[index].value);
    trigger.current?.focus();
  }

  return (
    <div
      className="custom-select"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="select-trigger"
        role="combobox"
        aria-label={label}
        aria-expanded={expanded}
        aria-haspopup="listbox"
        aria-controls={expanded ? id : undefined}
        aria-activedescendant={expanded ? `${id}-${active}` : undefined}
        disabled={disabled}
        onClick={() => {
          setActive(selected);
          setOpen(!expanded);
        }}
        onKeyDown={(event) => {
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            setOpen(true);
            setActive(
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? options.length - 1
                  : !expanded
                    ? selected
                    : (active +
                        (event.key === "ArrowDown" ? 1 : -1) +
                        options.length) %
                      options.length,
            );
          } else if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
          } else if ((event.key === "Enter" || event.key === " ") && expanded) {
            event.preventDefault();
            choose(active);
          } else if (event.key === "Tab") {
            setOpen(false);
          } else if (event.key.length === 1 && event.key !== " ") {
            const index = options.findIndex((option) =>
              option.label
                .toLocaleLowerCase()
                .startsWith(event.key.toLocaleLowerCase()),
            );
            if (index >= 0) {
              event.preventDefault();
              setActive(index);
              setOpen(true);
            }
          }
        }}
      >
        <span className="select-value">{options[selected].label}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {expanded && (
        <div
          className="select-options"
          role="listbox"
          aria-label={label}
          id={id}
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              id={`${id}-${index}`}
              role="option"
              aria-selected={option.value === value}
              className={`select-option ${index === active ? "highlighted" : ""}`}
              onPointerMove={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              <span>{option.label}</span>
              {option.value === value && <Check size={15} aria-hidden="true" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
