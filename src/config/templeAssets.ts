const asset = (path: string) => `${import.meta.env.BASE_URL}assets/${path}`;

// Temporary portrait scene. Desktop/mobile artwork and anchors belong to stage 3.
export const templeAssets = {
  background: asset('bg/chanh-dien-2.webp'),
  music: asset('audio/chill_relax.mp3'),
  models: {
    walk: asset('3d/di.fbx'),
    kneel: asset('3d/khan.fbx'),
    kneelDown: asset('3d/quy.fbx'),
    incense: asset('3d/thaphuong.fbx'),
    character: asset('3d/nguoi.fbx'),
  },
};
