"""Source-only review boards and native feet grids; no runtime sprite modifications."""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[3]
GAIT = ROOT/'artwork/animation-v3/variant-gaits-v1/woman'
sys.path.insert(0,str(ROOT/'scripts'))
from pose_canvas import normalize_pose

HEADINGS = ['rear','rearRight','right','frontRight','front','frontLeft','left','rearLeft']


def main():
    selection = json.loads((SOURCE/'selection.json').read_text(encoding='utf-8')) if (SOURCE/'selection.json').exists() else {}
    gait_selection = json.loads((GAIT/'selection.json').read_text(encoding='utf-8'))
    out=SOURCE/'review';out.mkdir(exist_ok=True)
    feet=SOURCE/'feet-review';feet.mkdir(exist_ok=True)
    counts={}
    for heading in HEADINGS:
        cells=[]
        entries=[(GAIT,gait_selection,heading+'/02-passing'),(SOURCE,selection,heading+'/right-gather'),(SOURCE,selection,heading+'/right-close'),(GAIT,gait_selection,heading+'/stand'),(GAIT,gait_selection,heading+'/06-opposite-passing'),(SOURCE,selection,heading+'/left-gather'),(SOURCE,selection,heading+'/left-close'),(GAIT,gait_selection,heading+'/stand')]
        for folder,selected,key in entries:
            path=folder/selected.get(key,key+'.png')
            if path.exists():
                image,audit=normalize_pose(path)
                cells.append(image.resize((144,192),Image.Resampling.LANCZOS))
                if folder==SOURCE:
                    with Image.open(path) as source:
                        crop=source.convert('RGBA').crop((200,900,1050,1254))
                        grid=Image.new('RGBA',crop.size,'#e8e3d9');grid.alpha_composite(crop)
                        draw=ImageDraw.Draw(grid)
                        for x in range(200,1050,25):
                            xx=x-200;draw.line((xx,0,xx,353),fill='#b6a19a',width=1);draw.text((xx+1,1),str(x),fill='#6b3930')
                        for y in range(900,1254,25):
                            yy=y-900;draw.line((0,yy,849,yy),fill='#b6a19a',width=1);draw.text((1,yy+1),str(y),fill='#6b3930')
                        grid.convert('RGB').save(feet/(key.replace('/','-')+'-grid.jpg'),quality=94)
            else:
                cells.append(None)
        board=Image.new('RGB',(144*8,216*2),'#e8e3d9');draw=ImageDraw.Draw(board)
        for row,bg in enumerate(['#e8e3d9','#302318']):
            for col,(entry,img) in enumerate(zip(entries,cells)):
                board.paste(bg,(col*144,row*216,(col+1)*144,(row+1)*216))
                if img:board.paste(img,(col*144,row*216+24),img)
                draw.text((col*144+3,row*216+4),entry[2].split('/')[1],fill='#2a1e17' if row==0 else '#eedfbf')
        board.save(out/(heading+'-144.jpg'),quality=94)
        counts[heading]=sum(1 for p in (SOURCE/heading).glob('*.png')) if (SOURCE/heading).exists() else 0
    print(json.dumps({'sourceFilesByHeading':counts}))


if __name__=='__main__':
    main()
