# Cena compartilhada (Y para cima, unidades = studs). Gera cena.json usado pelos dois motores.
import json, random
random.seed(3)
o=[]
def box(p,s,c,rot=(0,0,0),round=0,pivot=None): o.append(dict(t='box',p=p,s=s,c=c,r=rot,round=round,pivot=pivot))
def cyl(p,r,h,c): o.append(dict(t='cyl',p=p,rad=r,h=h,c=c))
def sph(p,r,c): o.append(dict(t='sph',p=p,rad=r,c=c))
box([0,-0.1,0],[400,0.2,400],'#4ccd3d')                 # grama
box([0,0.02,-14],[400,0.1,8],'#5c6070')                 # rua
for x in range(-60,61,6): box([x,0.08,-14],[3,0.02,0.3],'#e8e8e8')  # faixa
box([0,0.12,-9],[400,0.25,2],'#c9ccd5')                 # calçada
box([0,0.12,-19],[400,0.25,2],'#c9ccd5')
for hx,col,roof in [(-14,'#e9e6dc','#2f8a3c'),(2,'#d9534f','#5a5a66'),(16,'#f0b446','#3b5ba8')]:
    box([hx,4,-28],[10,8,8],col); box([hx,8.6,-28],[11,1.2,9],roof)
    box([hx-2,1.8,-23.95],[2,3.6,0.1],'#7a4b2a'); box([hx+2.3,4.5,-23.95],[2.4,2,0.1],'#9fd8ff')
for tx,tz in [(-7,-4),(9,-6),(-22,-10),(26,-8)]:
    cyl([tx,1.8,tz],0.5,3.6,'#7b5230'); sph([tx,5,tz],2.6,'#2f9e3a')
box([5,0.9,-8],[0.3,1.8,0.3],'#888'); box([5,1.9,-8],[0.9,0.6,0.6],'#d33')  # caixa de correio
for i in range(7):
    cx,cy,cz=random.uniform(-80,80),random.uniform(45,70),random.uniform(-160,-120)
    for j in range(4): sph([cx+j*7-10,cy+random.uniform(-2,2),cz],random.uniform(5,8),'#ffffff')
# Personagem "noob" R6, de frente para a câmera (+Z). pivot = ponto de rotação.
Y,B,G='#f5cd30','#0d69ac','#a4bd47'
box([0,3,0],[2,2,1],B)
box([-0.5,1,0],[1,2,1],G,rot=(-8,0,0),pivot=[-0.5,2,0]); box([0.5,1,0],[1,2,1],G,rot=(8,0,0),pivot=[0.5,2,0])
box([-1.5,3,0],[1,2,1],Y,rot=(10,0,-4),pivot=[-1.5,3.6,0])
box([1.5,3,0],[1,2,1],Y,rot=(-75,0,0),pivot=[1.5,3.6,0])   # braço segurando celular
box([1.5,3,0.55],[0.65,0.08,1.1],'#151515',rot=(-75,0,0),pivot=[1.5,3.6,0])
box([0,4.62,0],[1.25,1.2,1.2],Y,round=0.28)
o.append(dict(t='face',p=[0,4.62,0.605],s=1.15,tex='face.png'))
cena=dict(obj=o,cam=dict(pos=[3.6,5.2,13.5],alvo=[0.3,3.3,0],fov=42),
          sol=dict(dir=[-0.5,1.1,0.9],cor='#fff4e0',forca=1.0),ceu='#8ec9ff',w=540,h=960)
json.dump(cena,open('cena.json','w'))
print(len(o),'objetos')
