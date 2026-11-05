export function Icon({ name }: { name: 'lotus' | 'incense' | 'bow' | 'music' | 'bell' | 'expand' | 'exit' | 'close' | 'people' | 'arrow' }) {
  const paths = {
    lotus: <><path d="M12 17C5 12 8 6 12 3c4 3 7 9 0 14Z"/><path d="M12 17C5 18 2 13 2 9c5 0 9 3 10 8Zm0 0c7 1 10-4 10-8-5 0-9 3-10 8ZM5 19q7 5 14 0"/></>,
    incense: <><path d="M7 20V10m5 10V7m5 13V10M4 21h16M7 7c-3-3 3-3 0-6m5 3c-2-2 2-2 0-4m5 7c-3-3 3-3 0-6"/></>,
    bow: <><circle cx="12" cy="4" r="2"/><path d="M8 11l4 3 4-3M12 8v7m0 0-6 5h12l-6-5M8 8l-3 6m11-6 3 6"/></>,
    music: <><path d="M9 17V5l11-2v12M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/></>,
    bell: <><path d="M5 17h14l-2-4V9a5 5 0 0 0-10 0v4l-2 4ZM10 20h4M12 2v2"/></>,
    expand: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>,
    exit: <><path d="M10 4H4v16h6m4-12 4 4-4 4M8 12h12"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    people: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m3 9v-2a6 6 0 0 0-2-4.5"/></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
