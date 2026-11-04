import { useEffect, useState } from 'react';
import { parseStudyAtlas, studyImageUrl, type StudyAtlas } from './studyAtlas';

export const WALK_STUDY_ROOT = '/artwork/animation-v3/walk-v1/';
export const TRANSITION_STUDY_ROOT = '/artwork/animation-v3/transitions-v2/';
type StudyRoot = typeof WALK_STUDY_ROOT | typeof TRANSITION_STUDY_ROOT;

/** Authoring assets stay outside public/. Late loads cannot overwrite a new attempt. */
export function useStudyAtlas(root: StudyRoot) {
  const [atlas, setAtlas] = useState<StudyAtlas | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    const timeout = window.setTimeout(() => {
      abort.abort();
      setError('Tải bản thử quá lâu. Kiểm tra máy chủ rồi tải lại.');
    }, 15000);
    setAtlas(null);
    setError('');
    void (async () => {
      const response = await fetch(`${root}review.json`, { signal: abort.signal, cache: 'no-store' });
      if (!response.ok) throw new Error('Chưa có atlas thử. Hãy xuất tài nguyên rồi tải lại.');
      const manifest = parseStudyAtlas(await response.json());
      const image = new Image();
      image.src = studyImageUrl(root, manifest);
      await image.decode();
      if (image.naturalWidth !== manifest.width * manifest.columns || image.naturalHeight !== manifest.height * manifest.rows) {
        throw new Error('Kích thước ảnh thật không khớp manifest.');
      }
      if (!abort.signal.aborted) setAtlas(manifest);
    })().catch(reason => {
      if (!abort.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không đọc được atlas thử.');
    }).finally(() => window.clearTimeout(timeout));
    return () => { window.clearTimeout(timeout); abort.abort(); };
  }, [root, attempt]);
  return { atlas, error, retry: () => setAttempt(value => value + 1) };
}
