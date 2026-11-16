from PIL import Image, ImageDraw, ImageFont
P=[('ref2.png','REFERÊNCIA','vídeo original (Roblox)'),
   ('three_roblox.png','THREE.JS','padrão · ~1 s/quadro*'),
   ('three_bonito.png','THREE.JS+','AO + tonemap · ~2,5 s*'),
   ('blender_roblox.png','BLENDER','Eevee padrão · ~27 s*'),
   ('blender_bonito.png','BLENDER+','Eevee ray tracing · ~45 s*')]
w,h,top=400,711,96
out=Image.new('RGB',(w*len(P)+12*(len(P)+1),h+top+70),'#111318'); d=ImageDraw.Draw(out)
fb=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',30); fs=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',19)
for i,(f,t,s) in enumerate(P):
    x=12+i*(w+12); im=Image.open(f).convert('RGB').resize((w,h),Image.LANCZOS); out.paste(im,(x,top))
    d.text((x,16),t,font=fb,fill='#ffd23f' if i==0 else 'white'); d.text((x,58),s,font=fs,fill='#aab')
d.text((12,top+h+22),'* tempos medidos aqui SEM placa de vídeo (renderização por software). Na GTX 1050 Ti: three.js ≈ tempo real; Blender ≈ 0,3–1 s por quadro.',font=fs,fill='#aab')
out.save('/home/user/canal-roblox/comparacao_motores.png'); print(out.size)
