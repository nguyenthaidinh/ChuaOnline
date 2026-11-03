const asset = (path: string) => `${import.meta.env.BASE_URL}assets/${path}`;

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
