from PIL import Image, ImageFilter, ImageDraw
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ATLAS = ROOT / 'assets/buddy/turnaround/layers-atlas.png'
OUTROOT = ROOT / 'assets/buddy/clothing'
VIEWS = [
    'front','left-quarter-front','left-side','left-quarter-rear',
    'rear','right-quarter-rear','right-side','right-quarter-front'
]
LEFT_TO_RIGHT = {
    'right-quarter-front':'left-quarter-front',
    'right-side':'left-side',
    'right-quarter-rear':'left-quarter-rear',
}
W,H = 256,640
INK = (17,19,24,255)
NAVY = (38,53,77,255)
TEE = (248,243,231,255)
DENIM = (139,180,216,255)
DENIM_DARK = (92,130,166,255)
DENIM_STITCH = (111,151,184,255)
SHOE = (250,248,242,255)

atlas = Image.open(ATLAS).convert('RGBA')

def cell(row, idx):
    return atlas.crop((idx*W,row*H,(idx+1)*W,(row+1)*H))

def luminance_mask(im):
    a=np.asarray(im.convert('RGBA'),dtype=np.uint8)
    rgb=a[:,:,:3].astype(np.float32)
    alpha=a[:,:,3].astype(np.float32)/255.0
    lum=(0.2126*rgb[:,:,0]+0.7152*rgb[:,:,1]+0.0722*rgb[:,:,2])*alpha
    frac=(lum>96).mean()
    if frac < 0.002 or frac > 0.75:
        lum=a[:,:,3].astype(np.float32)
    return np.clip(lum,0,255).astype(np.uint8)

def clean_binary(gray, threshold=80, min_area=80):
    b=(gray>=threshold).astype(np.uint8)
    hh,ww=b.shape
    seen=np.zeros_like(b,dtype=bool)
    keep=np.zeros_like(b,dtype=np.uint8)
    for y in range(hh):
        for x in range(ww):
            if not b[y,x] or seen[y,x]:
                continue
            stack=[(x,y)]; seen[y,x]=1; pts=[]
            while stack:
                px,py=stack.pop(); pts.append((px,py))
                for nx,ny in ((px-1,py),(px+1,py),(px,py-1),(px,py+1)):
                    if 0<=nx<ww and 0<=ny<hh and b[ny,nx] and not seen[ny,nx]:
                        seen[ny,nx]=1; stack.append((nx,ny))
            if len(pts)>=min_area:
                for px,py in pts: keep[py,px]=1
    return keep

def smooth_mask(binarr, blur=0.7):
    im=Image.fromarray((binarr*255).astype(np.uint8),'L')
    if blur:
        im=im.filter(ImageFilter.GaussianBlur(blur))
    return im

def dilate(mask, size):
    if size<=1: return mask
    if size%2==0: size+=1
    return mask.filter(ImageFilter.MaxFilter(size))

def erode(mask, size):
    if size<=1: return mask
    if size%2==0: size+=1
    return mask.filter(ImageFilter.MinFilter(size))

def edge_mask(mask, width=2):
    outer=dilate(mask, width*2+1)
    inner=erode(mask, width*2+1)
    a=np.asarray(outer,dtype=np.int16)-np.asarray(inner,dtype=np.int16)
    return Image.fromarray(np.clip(a,0,255).astype(np.uint8),'L')

def paint(mask, color):
    layer=Image.new('RGBA',(W,H),color)
    empty=Image.new('RGBA',(W,H),(0,0,0,0))
    return Image.composite(layer,empty,mask)

def alpha_clip(layer, alpha_mask):
    arr=np.array(layer)
    arr[:,:,3]=np.minimum(arr[:,:,3],np.asarray(alpha_mask))
    return Image.fromarray(arr,'RGBA')

def body_binary(idx):
    return clean_binary(luminance_mask(cell(0,idx)),threshold=72,min_area=500)

def tee_asset(idx):
    # The existing atlas tee is the canonical fit mask. Re-rasterize it cleanly instead
    # of approximating the shirt with SVG polygons.
    fillbin=clean_binary(luminance_mask(cell(9,idx)),threshold=72,min_area=180)
    fill=smooth_mask(fillbin,0.55)
    out=paint(fill,TEE)

    linebin=clean_binary(luminance_mask(cell(10,idx)),threshold=60,min_area=3)
    line=smooth_mask(linebin,0.35)
    line=Image.fromarray(np.minimum(np.asarray(line),np.asarray(dilate(fill,5))).astype(np.uint8),'L')
    out.alpha_composite(paint(line,INK))

    edge=edge_mask(fill,2)
    e=np.asarray(edge); yy,xx=np.mgrid[0:H,0:W]
    trim=np.zeros((H,W),dtype=np.uint8)
    trim=np.maximum(trim,np.where((yy>=135)&(yy<=190)&(xx>=88)&(xx<=172),e,0).astype(np.uint8))
    trim=np.maximum(trim,np.where((yy>=205)&(yy<=260)&((xx<=92)|(xx>=164)),e,0).astype(np.uint8))
    trim_im=dilate(Image.fromarray(trim,'L'),3)
    trim_im=Image.fromarray(np.minimum(np.asarray(trim_im),np.asarray(dilate(fill,3))).astype(np.uint8),'L')
    out.alpha_composite(paint(trim_im,NAVY))
    out.alpha_composite(paint(edge_mask(fill,1),INK))
    return out

def component_keep_feet(lower_bin, min_bottom=555, min_area=120):
    b=lower_bin.astype(np.uint8); hh,ww=b.shape
    seen=np.zeros_like(b,dtype=bool); keep=np.zeros_like(b,dtype=np.uint8)
    for y in range(hh):
        for x in range(ww):
            if not b[y,x] or seen[y,x]: continue
            stack=[(x,y)]; seen[y,x]=1; pts=[]; maxy=0
            while stack:
                px,py=stack.pop(); pts.append((px,py)); maxy=max(maxy,py)
                for nx,ny in ((px-1,py),(px+1,py),(px,py-1),(px,py+1)):
                    if 0<=nx<ww and 0<=ny<hh and b[ny,nx] and not seen[ny,nx]:
                        seen[ny,nx]=1; stack.append((nx,ny))
            if len(pts)>=min_area and maxy>=min_bottom:
                for px,py in pts: keep[py,px]=1
    return keep

def pants_mask_from_body(idx, side_view=False):
    body=body_binary(idx)
    lower=np.zeros_like(body); lower[318:612,:]=body[318:612,:]
    legs=component_keep_feet(lower,555,100); legs[604:,:]=0
    m=dilate(Image.fromarray((legs*255).astype(np.uint8),'L'),11 if side_view else 13)
    arr=np.asarray(m).copy(); arr[:318]=0; arr[607:]=0

    waist_src=body[320:350,:]
    xs=np.where(waist_src.any(axis=0))[0]
    xs=xs[(xs>=48)&(xs<=208)] if len(xs) else xs
    if len(xs):
        l=max(42,int(xs.min())-3); r=min(214,int(xs.max())+3)
    else:
        l,r=((86,182) if side_view else (69,188))
    arr[324:346,l:r+1]=255

    if not side_view:
        cx=(l+r)//2
        for y in range(390,605):
            gap=max(3,min(8,3+(y-390)//55))
            arr[y,cx-gap:cx+gap+1]=0
    return Image.fromarray(arr.astype(np.uint8),'L').filter(ImageFilter.GaussianBlur(0.8))

def pants_asset(idx, slug):
    side_view=slug in ('left-side','right-side')
    m=pants_mask_from_body(idx,side_view)
    out=paint(m,DENIM)
    out.alpha_composite(paint(edge_mask(m,1),INK))
    d=ImageDraw.Draw(out); bbox=m.getbbox()
    if bbox:
        l,t,r,b=bbox
        d.line((l+4,342,r-4,342),fill=DENIM_DARK,width=2)
        cx=(l+r)//2
        if not side_view: d.line((cx,343,cx,386),fill=DENIM_DARK,width=2)
        if slug in ('front','left-quarter-front','right-quarter-front'):
            d.arc((l+7,344,l+45,380),180,285,fill=DENIM_DARK,width=2)
            d.arc((r-45,344,r-7,380),255,360,fill=DENIM_DARK,width=2)
        elif slug in ('rear','left-quarter-rear','right-quarter-rear'):
            pw=max(20,(r-l)//5); y0=355
            d.rounded_rectangle((l+18,y0,l+18+pw,y0+31),radius=3,outline=DENIM_DARK,width=2)
            d.rounded_rectangle((r-18-pw,y0,r-18,y0+31),radius=3,outline=DENIM_DARK,width=2)
        else:
            d.line((r-7,350,r-7,b-7),fill=DENIM_STITCH,width=2)
        d.line((l+3,b-8,r-3,b-8),fill=DENIM_DARK,width=2)
    return alpha_clip(out,dilate(m,3))

def shoe_mask_from_body(idx):
    body=body_binary(idx)
    feet=np.zeros_like(body); feet[585:,:]=body[585:,:]
    feet=component_keep_feet(feet,610,40)
    m=dilate(Image.fromarray((feet*255).astype(np.uint8),'L'),9)
    arr=np.asarray(m).copy(); arr[:580]=0
    return Image.fromarray(arr.astype(np.uint8),'L').filter(ImageFilter.GaussianBlur(0.65))

def shoes_asset(idx,slug):
    m=shoe_mask_from_body(idx)
    out=paint(m,SHOE)
    out.alpha_composite(paint(edge_mask(m,1),INK))
    a=np.asarray(m); below=np.zeros_like(a); below[:-3]=a[3:]
    bottom=np.clip(a.astype(np.int16)-below.astype(np.int16),0,255).astype(np.uint8)
    out.alpha_composite(paint(Image.fromarray(bottom,'L').filter(ImageFilter.MaxFilter(5)),NAVY))
    d=ImageDraw.Draw(out); bbox=m.getbbox()
    if bbox:
        l,t,r,b=bbox
        if slug in ('left-side','left-quarter-front','left-quarter-rear'):
            d.line((r-24,t+14,r-7,t+12),fill=NAVY,width=4)
        elif slug in ('right-side','right-quarter-front','right-quarter-rear'):
            d.line((l+7,t+12,l+24,t+14),fill=NAVY,width=4)
        else:
            mid=(l+r)//2
            d.line((l+12,t+14,min(mid-5,l+35),t+11),fill=NAVY,width=3)
            d.line((max(mid+5,r-35),t+11,r-12,t+14),fill=NAVY,width=3)
    return alpha_clip(out,dilate(m,3))

def mirror(im):
    return im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

def clean_final(im):
    alpha=np.asarray(im.getchannel('A'))
    clean=clean_binary(alpha,threshold=8,min_area=18)
    arr=np.array(im); arr[:,:,3]=np.minimum(alpha,(clean*255).astype(np.uint8))
    return Image.fromarray(arr,'RGBA')

idx_by_slug={s:i for i,s in enumerate(VIEWS)}
base_slugs=['front','left-quarter-front','left-side','left-quarter-rear','rear']
assets={'tee':{},'pants':{},'shoes':{}}
for slug in base_slugs:
    idx=idx_by_slug[slug]
    assets['tee'][slug]=tee_asset(idx)
    assets['pants'][slug]=pants_asset(idx,slug)
    assets['shoes'][slug]=shoes_asset(idx,slug)
for right,left in LEFT_TO_RIGHT.items():
    assets['tee'][right]=mirror(assets['tee'][left])
    assets['pants'][right]=mirror(assets['pants'][left])
    assets['shoes'][right]=mirror(assets['shoes'][left])

paths={
    'tee':OUTROOT/'tops/tee/classic',
    'pants':OUTROOT/'pants/jeans/wide-leg',
    'shoes':OUTROOT/'shoes/sneakers/low-top',
}
for kind,path in paths.items():
    path.mkdir(parents=True,exist_ok=True)
    for slug in VIEWS:
        im=clean_final(assets[kind][slug])
        if im.size != (W,H): raise RuntimeError(f'{kind}/{slug}: wrong dimensions')
        if not im.getchannel('A').getbbox(): raise RuntimeError(f'{kind}/{slug}: empty asset')
        im.save(path/f'{slug}.png',optimize=True)

print('Regenerated 24 clean, aligned Casual PNG overlays.')
