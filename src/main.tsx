import { createRoot } from 'react-dom/client';
import './index.css';

const root = createRoot(document.getElementById('root')!);
if (import.meta.env.DEV && new URLSearchParams(location.search).has('animation-lab')) {
  if (new URLSearchParams(location.search).get('animation-lab') === 'transitions') {
    void import('./dev/TransitionLab').then(({ default: TransitionLab }) => root.render(<TransitionLab />));
  } else {
    void import('./dev/AnimationLab').then(({ default: AnimationLab }) => root.render(<AnimationLab />));
  }
} else {
  void import('./App').then(({ default: App }) => root.render(<App />));
}
