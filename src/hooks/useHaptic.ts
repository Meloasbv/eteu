export function haptic(type: "light" | "medium" | "heavy" = "light") {
  try {
    const ms = type === "light" ? 10 : type === "medium" ? 20 : 30;
    navigator.vibrate?.(ms);
  } catch {}
}
