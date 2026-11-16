from PIL import Image, ImageDraw
S=4; W=512*S
im=Image.new('RGBA',(W,W),(0,0,0,0)); d=ImageDraw.Draw(im)
k=(20,20,20,255)
# olhos ovais
for cx in (190,322):
    d.ellipse([(cx-22)*S,(200-40)*S,(cx+22)*S,(200+40)*S],fill=k)
# sorriso
d.arc([150*S,220*S,362*S,370*S],start=20,end=160,fill=k,width=16*S)
im.resize((512,512),Image.LANCZOS).save('face.png')
