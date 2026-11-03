const asset = (path: string) => `${import.meta.env?.BASE_URL ?? '/'}assets/${path}`;

export const MUSIC_TRACKS = [
  { id: 'bamboo', name: 'Trăng trên rừng trúc', url: asset('tanphat/music/music1.mp3') },
  { id: 'morning', name: 'Hơi thở ban mai', url: asset('tanphat/music/music2.mp3') },
  { id: 'relax', name: 'Nhạc thư giãn', url: asset('audio/chill_relax.mp3') },
] as const;
export type MusicTrackId = typeof MUSIC_TRACKS[number]['id'];

// Layout drafts. Replace the pair with approved artwork matching sceneLayout.ts anchors.
export const templeAssets = {
  backgrounds: {
    desktop: asset('web/temple-layout-desktop.svg'),
    mobile: asset('web/temple-layout-mobile.svg'),
  },
  music: asset('audio/chill_relax.mp3'),
  models: {
    walk: asset('3d/di.fbx'),
    kneel: asset('3d/khan.fbx'),
    kneelDown: asset('3d/quy.fbx'),
    incense: asset('3d/thaphuong.fbx'),
    character: asset('3d/nguoi.fbx'),
  },
};
