import { useEffect, useState, useSyncExternalStore } from 'react';
import { TempleSession } from '../services/templeSession';
import { ACTION_TIMEOUT_MS } from '../config/ritual';

export function useTempleSession() {
  const [session] = useState(() => new TempleSession());
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  useEffect(() => {
    if (!state.command) return;
    const commandId = state.command.id;
    const timer = window.setTimeout(() => session.fail(commandId, 'Nghi lễ đã dừng do quá thời gian chờ. Bạn có thể thử lại.'), ACTION_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [session, state.command]);
  return { ...state, start: session.start, report: session.report, setSceneStatus: session.setSceneStatus };
}
