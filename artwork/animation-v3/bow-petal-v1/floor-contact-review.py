"""Review the nine corrected floor poses; acceptance stays an explicit review step."""
import argparse
import hashlib
import json
from pathlib import Path
from importlib.util import spec_from_file_location,module_from_spec

import numpy as np
from PIL import Image,ImageDraw

SOURCE=Path(__file__).resolve().parent
PROJECT=SOURCE.parents[2]
spec=spec_from_file_location('own_skin',SOURCE/'review-contacts.py')
helper=module_from_spec(spec);spec.loader.exec_module(helper)
SELECTED={
 'man':{'07-hands-floor':'07-hands-floor-v3.png','08-prostrate':'08-prostrate-v3.png','09-lift-head':'09-lift-head-v2.png'},
 'woman':{'07-hands-floor':'07-hands-floor-v2.png','08-prostrate':'08-prostrate-v2.png','09-lift-head':'09-lift-head-v2.png'},
 'granny':{'07-hands-floor':'07-hands-floor-v2.png','08-prostrate':'08-prostrate-v2.png','09-lift-head':'09-lift-head-v2.png'},
}
# Manually chosen on each identity's native forehead/palm grid, not scaled from another person.
FLOOR_POINTS={
 'man':{'headLowerEdge':[930,1040],'nearPalm':[1010,1070],'upperHip':[520,930]},
 'woman':{'headLowerEdge':[925,1050],'nearPalm':[1015,1080],'upperHip':[520,930]},
 'granny':{'headLowerEdge':[930,1040],'nearPalm':[1010,1070],'upperHip':[520,930]},
}


def main(accept):
 annotations=json.loads((SOURCE/'annotations.json').read_text())
 selections=json.loads((SOURCE/'selection.json').read_text())
 candidates={}
 for appearance,poses in SELECTED.items():
  candidates[appearance]={}
  board=Image.new('RGB',(3*600,420),'#eee6d5');draw=ImageDraw.Draw(board)
  for col,(frame_id,filename)in enumerate(poses.items()):
   path=SOURCE/appearance/filename
   with Image.open(path)as raw:
    if raw.mode!='RGBA' or raw.size!=(1254,1254):raise ValueError('Expected fixed1254square RGBA: '+str(path))
    image=raw.copy()
   roi=[440,1120,660,1220];skin=helper.skin(image,roi)
   bottom=max(y for x,y in skin)
   # The visible lower toe-pad boundary is the same landmark used by own kneel-rest.
   contact=[int(np.quantile([x for x,y in skin if y>=bottom-2],.5)),bottom-1]
   entry={'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),
    'support':{'point':contact,'landmark':'frontToeContact','reference':'03-kneel-rest',
     'reviewRoi':roi,'method':'Own visible lower toe contour; native grid and fixed knee/feet silhouette reviewed.'},
    'review':'Corrected floor-contact pose viewed at native size and144LOD. Palms stay down on the floor; the head lowers to the floor for prostration and rises only slightly for the first recovery. Own folded feet remain anchored.'}
   if frame_id=='08-prostrate':
    samples={key:list(image.getpixel(tuple(point)))for key,point in FLOOR_POINTS[appearance].items()}
    if any(color[3]<200 for color in samples.values()):raise ValueError('Floor review landmark has no body pixel.')
    entry['floorPose']={**FLOOR_POINTS[appearance],'sampleRgba':samples,'reviewed':accept,
     'evidence':'forehead-palm-native-grid.jpg',
     'note':'Viewed head-down full prostration; lowest visible head silhouette is at the palm floor plane below the upper hip. HeadLowerEdge is a visible silhouette marker, not an inferred hidden forehead point.'}
   candidates[appearance][frame_id]=entry
   pen=ImageDraw.Draw(image);x,y=contact
   pen.ellipse((x-7,y-7,x+7,y+7),outline='#ff2345',width=3)
   crop=image.crop((350,950,950,1250));board.paste(crop,(col*600,35),crop)
   draw.text((col*600+5,5),frame_id+' '+str(contact),fill='#43351e')
   if accept:
    annotations['appearances'][appearance][frame_id]=entry
    selections[appearance+'/'+frame_id]=appearance+'/'+filename
  board.save(SOURCE/appearance/'floor-corrected-toe-review.jpg',quality=97)
 (SOURCE/'floor-contact-candidates.json').write_text(json.dumps(candidates,indent=2)+'\n')
 if accept:
  (SOURCE/'annotations.json').write_text(json.dumps(annotations,indent=2)+'\n')
  (SOURCE/'selection.json').write_text(json.dumps(selections,indent=2)+'\n')
 print(json.dumps({'poses':sum(map(len,candidates.values())),'accepted':accept}))


if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--accept',action='store_true');args=parser.parse_args()
 main(args.accept)
