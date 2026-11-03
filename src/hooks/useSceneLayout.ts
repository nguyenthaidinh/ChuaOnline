import { useEffect, useState } from 'react';
import { DESKTOP_BREAKPOINT, layoutForWidth } from '../config/sceneLayout';

export function useSceneLayout() {
  const [layout, setLayout] = useState(() => layoutForWidth(window.innerWidth));
  useEffect(() => {
    const media = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    const update = () => setLayout(layoutForWidth(window.innerWidth));
    media.addEventListener('change', update);
    update();
    return () => media.removeEventListener('change', update);
  }, []);
  return layout;
}
