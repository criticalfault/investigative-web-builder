import { useLayoutEffect, useRef } from "react";

export default function AutoText({ value, onChange, placeholder, className, autoFocus }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.height = "0px"; el.style.height = el.scrollHeight + "px";
  });
  return <textarea ref={ref} rows={1} className={className} value={value} placeholder={placeholder}
    autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)} />;
}
