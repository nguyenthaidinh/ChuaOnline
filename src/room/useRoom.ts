import { useEffect, useState, useSyncExternalStore } from 'react';
import { RoomClient } from './client';

export function useRoom() {
  const [client] = useState(() => new RoomClient());
  const view = useSyncExternalStore(client.subscribe, client.getSnapshot);
  useEffect(() => { client.connect(); return () => client.disconnect(); }, [client]);
  return { ...view, join: client.join, leave: client.leave, action: client.action };
}
