import { useState, useEffect, useRef } from "react";

export function useScrollDirection(threshold = 10) {
  const [direction, setDirection] = useState<"up" | "down" | "idle">("idle");
  const [isAtTop, setIsAtTop] = useState(true);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setIsAtTop(y < 10);
        const diff = y - lastY.current;
        if (Math.abs(diff) > threshold) {
          setDirection(diff > 0 ? "down" : "up");
          lastY.current = y;
        }
        ticking.current = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return { direction, isAtTop };
}
