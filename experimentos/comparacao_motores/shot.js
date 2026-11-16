const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const modo of ['roblox','bonito']){const p=await b.newPage({viewport:{width:540,height:960}});
p.on('console',m=>console.log(modo,m.text())); p.on('pageerror',e=>console.log('ERR',e.message));
const t=Date.now(); await p.goto('http://127.0.0.1:8765/three.html?modo='+modo);
await p.waitForFunction(()=>window.PRONTO,null,{timeout:120000});
await p.locator('canvas').screenshot({path:'three_'+modo+'.png'}); console.log(modo,(Date.now()-t)+'ms');}
await b.close();})();
