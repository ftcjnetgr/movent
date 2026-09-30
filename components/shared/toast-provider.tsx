"use client";

import { useEffect, useState } from "react";

type ToastDetail = { message: string };

export function showToast(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ToastDetail>("movent:toast", { detail: { message } }),
  );
}

export default function ToastProvider() {
  const [message, setMessage] = useState("");
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ToastDetail>).detail;
      if (!detail?.message) return;
      setMessage(detail.message);
      window.setTimeout(() => setMessage(""), 1800);
    };
    window.addEventListener("movent:toast", handler);
    return () => window.removeEventListener("movent:toast", handler);
  }, []);

  if (!message) return null;
  return (
    <div className="movent-toast" role="status" aria-live="polite">
      <span className="movent-toast-icon">✓</span>
      <span>{message}</span>
    </div>
  );
}
