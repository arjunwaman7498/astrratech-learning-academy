import { useEffect, useRef } from "react";

export default function PublicCursor() {
  const cursorRef = useRef(null);

  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reducedMotion.matches) return undefined;

    const cursor = cursorRef.current;
    const root = document.documentElement;
    root.classList.add("public-cursor-enabled");

    function move(event) {
      if (event.pointerType !== "mouse") return;
      cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      cursor.classList.add("is-visible");
      const target = event.target instanceof Element ? event.target : null;
      cursor.classList.toggle("is-interactive", Boolean(target?.closest("a, button, [role='button'], summary")));
      cursor.classList.toggle("is-form-control", Boolean(target?.closest("input, textarea, select, [contenteditable='true']")));
    }

    function hide() {
      cursor.classList.remove("is-visible", "is-interactive", "is-form-control");
    }

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("blur", hide);
    document.addEventListener("pointerleave", hide);
    return () => {
      root.classList.remove("public-cursor-enabled");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("blur", hide);
      document.removeEventListener("pointerleave", hide);
    };
  }, []);

  return <div className="public-cursor" ref={cursorRef} aria-hidden="true">
    <span className="public-cursor__trail"/>
    <span className="public-cursor__orb"/>
  </div>;
}
