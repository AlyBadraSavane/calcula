#!/usr/bin/env python3
"""Génère les icônes Android (adaptative + classiques) dans android-res/res.
Dessin fidèle à icons/icon-maskable-512.png : fond acier sombre, carré or avec « = »."""
import os
from PIL import Image, ImageDraw
OUT=os.path.join(os.path.dirname(__file__),'..','android-res','res')
SS=4
def lerp(a,b,t):return tuple(int(a[i]+(b[i]-a[i])*t) for i in range(3))
def gradient_bg(n):
    im=Image.new('RGB',(n,n))
    px=im.load()
    top,bot=(26,35,53),(9,11,16)
    for y in range(n):
        c=lerp(top,bot,y/(n-1))
        for x in range(n):px[x,y]=c
    return im
def gold_square(n,frac):
    """Carré or + barres « = » sur fond transparent ; frac = taille du carré / n."""
    big=n*SS
    s=int(big*frac);x0=(big-s)//2
    sq=Image.new('RGB',(s,s));px=sq.load()
    a,b=(242,212,134),(190,140,58)
    for y in range(s):
        for x in range(s):px[x,y]=lerp(a,b,(x+y)/(2*s-2))
    m=Image.new('L',(s,s),0);ImageDraw.Draw(m).rounded_rectangle((0,0,s-1,s-1),radius=int(s*0.28),fill=255)
    layer=Image.new('RGBA',(big,big),(0,0,0,0));layer.paste(sq,(x0,x0),m)
    d=ImageDraw.Draw(layer)
    bw=s*0.50;bh=s*0.088;cx=big/2
    for cy in (big/2-s*0.10,big/2+s*0.10):
        d.rounded_rectangle((cx-bw/2,cy-bh/2,cx+bw/2,cy+bh/2),radius=bh/2,fill=(46,32,8,255))
    return layer.resize((n,n),Image.LANCZOS)
def save(im,path):
    os.makedirs(os.path.dirname(path),exist_ok=True);im.save(path,optimize=True)
dens={'mdpi':1,'hdpi':1.5,'xhdpi':2,'xxhdpi':3,'xxxhdpi':4}
for name,k in dens.items():
    d=os.path.join(OUT,'mipmap-'+name)
    n=round(108*k)
    # couche adaptative : zone visible = 72/108 ; le carré occupe 56 % de la zone visible
    save(gold_square(n,0.56*72/108),os.path.join(d,'ic_launcher_foreground.png'))
    save(gradient_bg(n),os.path.join(d,'ic_launcher_background.png'))
    # icônes classiques (API < 26)
    m=round(48*k)
    base=gradient_bg(m*SS).convert('RGBA');base.alpha_composite(gold_square(m*SS,0.56))
    base=base.resize((m,m),Image.LANCZOS)
    sq=Image.new('L',(m*SS,m*SS),0);ImageDraw.Draw(sq).rounded_rectangle((0,0,m*SS-1,m*SS-1),radius=int(m*SS*0.22),fill=255)
    rd=Image.new('L',(m*SS,m*SS),0);ImageDraw.Draw(rd).ellipse((0,0,m*SS-1,m*SS-1),fill=255)
    sq=sq.resize((m,m),Image.LANCZOS);rd=rd.resize((m,m),Image.LANCZOS)
    a=base.copy();a.putalpha(sq);save(a,os.path.join(d,'ic_launcher.png'))
    b=base.copy();b.putalpha(rd);save(b,os.path.join(d,'ic_launcher_round.png'))
any26=os.path.join(OUT,'mipmap-anydpi-v26');os.makedirs(any26,exist_ok=True)
xml='''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
'''
for f in ('ic_launcher.xml','ic_launcher_round.xml'):open(os.path.join(any26,f),'w').write(xml)
print('icônes générées')
