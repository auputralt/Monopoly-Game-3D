/* ============================================================
   renderer.js — Three.js scene, board, tokens, dice, buildings
   ============================================================ */

var BoardRenderer = (function () {
    'use strict';

    var scene, camera, renderer, controls;
    var boardGroup;
    var tokenMeshes  = [];
    var diceMeshes   = [];
    var houseGroups  = {};
    var CS           = 400;

    var api = {};

    api.init = function (canvas) {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0e14);
        scene.fog = new THREE.Fog(0x0a0e14, 40, 70);

        camera = new THREE.PerspectiveCamera(40, canvas.clientWidth / canvas.clientHeight, 0.1, 200);
        camera.position.set(0, 28, 24);
        camera.lookAt(0, 0, 0);

        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true; controls.dampingFactor = 0.08;
        controls.maxPolarAngle = Math.PI / 2.15; controls.minDistance = 12; controls.maxDistance = 45;
        controls.target.set(0, 0, 0);

        scene.add(new THREE.AmbientLight(0xffffff, 0.55));
        var warm = new THREE.DirectionalLight(0xfff5e0, 0.9);
        warm.position.set(8, 20, 10); warm.castShadow = true;
        warm.shadow.mapSize.set(2048, 2048);
        warm.shadow.camera.left = -16; warm.shadow.camera.right = 16; warm.shadow.camera.top = 16; warm.shadow.camera.bottom = -16;
        var cool = new THREE.DirectionalLight(0x8090ff, 0.25);
        cool.position.set(-6, 12, -8);
        scene.add(warm);
        scene.add(cool);

        var tableMat = new THREE.MeshStandardMaterial({ color: 0x1a1208, roughness: 0.85 });
        var table = new THREE.Mesh(new THREE.BoxGeometry(52, 0.4, 52), tableMat);
        table.position.y = -0.35; table.receiveShadow = true; scene.add(table);

        createBoard(); createDice(); animate();

        window.addEventListener('resize', function () { var w = canvas.clientWidth, h = canvas.clientHeight; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); });
    };

    function createBoard() {
        boardGroup = new THREE.Group();
        var texCanvas = document.createElement('canvas'); texCanvas.width = 11 * CS; texCanvas.height = 11 * CS;
        drawBoardTexture(texCanvas);
        var tex = new THREE.CanvasTexture(texCanvas); tex.minFilter = THREE.LinearFilter;
        var geo = new THREE.BoxGeometry(22, 0.35, 22);
        var mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45, metalness: 0.05 });
        var mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true; mesh.castShadow = true; boardGroup.add(mesh);
        var edgeMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.6 });
        var edges = [ { s:[22.4,0.5,0.3], p:[0,0.08,11.15] }, { s:[22.4,0.5,0.3], p:[0,0.08,-11.15] }, { s:[0.3,0.5,22.4], p:[11.15,0.08,0] }, { s:[0.3,0.5,22.4], p:[-11.15,0.08,0] } ];
        edges.forEach(function (e) { var m = new THREE.Mesh(new THREE.BoxGeometry(e.s[0],e.s[1],e.s[2]), edgeMat); m.position.set(e.p[0],e.p[1],e.p[2]); m.castShadow = true; boardGroup.add(m); });
        scene.add(boardGroup);
    }

    function drawBoardTexture(c) {
        var ctx = c.getContext('2d'); ctx.fillStyle = '#1a5c32'; ctx.fillRect(0,0,c.width,c.height);
        ctx.fillStyle = '#237a42'; ctx.fillRect(CS, CS, 9*CS, 9*CS);
        ctx.strokeStyle = '#2d9a52'; ctx.lineWidth = 3; ctx.strokeRect(CS+8, CS+8, 9*CS-16, 9*CS-16);
        ctx.save(); ctx.fillStyle = '#f0c040'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold '+(CS*0.38)+'px Georgia,serif'; ctx.fillText('MONOPOLY', c.width/2, c.height/2 - CS*0.22); ctx.font = 'bold '+(CS*0.26)+'px Georgia,serif'; ctx.fillStyle = '#e84040'; ctx.fillText('I N D O N E S I A', c.width/2, c.height/2 + CS*0.12); ctx.font = (CS*0.11)+'px sans-serif'; ctx.fillStyle = '#8ab89a'; ctx.fillText('Keliling Nusantara', c.width/2, c.height/2 + CS*0.34); ctx.restore();
        for (var i=0;i<40;i++) drawTile(ctx,i);
    }

    function drawTile(ctx, idx) {
        var g = getTileGridPos(idx); var tile = TILES[idx]; var x = g.gx * CS, y = g.gy * CS; var cx = x + CS/2, cy = y + CS/2; var angle = { bottom:0, left:Math.PI/2, top:Math.PI, right:-Math.PI/2 }[g.side]; ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle); ctx.fillStyle = '#f5f0e0'; ctx.fillRect(-CS/2+1, -CS/2+1, CS-2, CS-2); ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5; ctx.strokeRect(-CS/2+1, -CS/2+1, CS-2, CS-2); var t = tile.type; if (t === 'property') drawProperty(ctx,tile); else if (t === 'railroad') drawRailroad(ctx,tile); else if (t === 'utility') drawUtility(ctx,tile); else if (t === 'go') drawGo(ctx); else if (t === 'jail') drawJail(ctx); else if (t === 'freeParking') drawFreeParking(ctx); else if (t === 'goToJail') drawGoToJail(ctx); else if (t === 'tax') drawTax(ctx,tile); else if (t === 'chance') drawChance(ctx); else if (t === 'community') drawCommunity(ctx); ctx.restore(); }

    function drawProperty(ctx,tile) { var bh = CS * 0.28; ctx.fillStyle = GROUP_COLORS[tile.group]; ctx.fillRect(-CS/2+2, CS/2 - bh, CS-4, bh-1); ctx.fillStyle = '#222'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; var nameLines = tile.name.split('\n'); var fs = nameLines.length > 1 ? CS*0.1 : CS*0.12; ctx.font = 'bold '+fs+'px Georgia,serif'; var ny = CS * 0.08; nameLines.forEach(function(line,i){ctx.fillText(line,0,ny + i * fs * 1.2);}); ctx.font = (CS*0.085)+'px sans-serif'; ctx.fillStyle = '#555'; ctx.fillText('Rp '+tile.price.toLocaleString('id-ID'),0,-CS*0.28); drawLandmark(ctx,tile,0,-CS*0.08,CS*0.22); }

    function drawRailroad(ctx,tile) { ctx.fillStyle = '#222'; ctx.fillRect(-CS/2+2, CS/2 - CS*0.25, CS-4, CS*0.25-1); ctx.fillStyle = '#f5f0e0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold '+(CS*0.09)+'px Georgia,serif'; ctx.fillText(tile.name,0,CS*0.1); ctx.font = (CS*0.07)+'px sans-serif'; ctx.fillStyle = '#aaa'; ctx.fillText('Rp '+tile.price.toLocaleString('id-ID'),0,-CS*0.28); ctx.fillStyle = '#444'; ctx.font = (CS*0.2)+'px sans-serif'; ctx.fillText('🚂',0,-CS*0.05); }

    function drawUtility(ctx,tile) { ctx.fillStyle = '#f5f0e0'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font='bold '+(CS*0.11)+'px Georgia,serif'; ctx.fillStyle='#222'; ctx.fillText(tile.name,0,CS*0.08); ctx.font=(CS*0.07)+'px sans-serif'; ctx.fillStyle='#555'; ctx.fillText(tile.sub||'',0,CS*0.22); ctx.fillText('Rp '+tile.price.toLocaleString('id-ID'),0,-CS*0.28); ctx.font=(CS*0.22)+'px sans-serif'; ctx.fillText(tile.id===12?'⚡':'💧',0,-CS*0.06); }

    function drawGo(ctx) { ctx.fillStyle='#c0392b'; ctx.fillRect(-CS/2+2,-CS/2+2,CS-4,CS-4); ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font='bold '+(CS*0.16)+'px Georgia,serif'; ctx.fillText('BOND',0,-CS*0.12); ctx.font=(CS*0.08)+'px sans-serif'; ctx.fillText('Bundaran HI',0,CS*0.06); ctx.font='bold '+(CS*0.09)+'px sans-serif'; ctx.fillStyle='#f0c040'; ctx.fillText('Terima Rp 2.000',0,CS*0.26); }

    function drawJail(ctx) { ctx.fillStyle='#e8d8c0'; ctx.fillRect(-CS/2+2,-CS/2+2,CS-2,CS-2); ctx.fillStyle='#555'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font='bold '+(CS*0.11)+'px Georgia,serif'; ctx.fillText('PENJARA',0,-CS*0.18); ctx.font=(CS*0.07)+'px sans-serif'; ctx.fillText('Sedang',0,CS*0.02); ctx.fillText('Berkunjung',0,CS*0.14); ctx.strokeStyle='#888'; ctx.lineWidth=3; for(var i=-2;i<=2;i++){ctx.beginPath(); ctx.moveTo(i*CS*0.08,-CS*0.38); ctx.lineTo(i*CS*0.08,CS*0.38); ctx.stroke(); } }

    function drawFreeParking(ctx) { ctx.fillStyle='#2d8c4e'; ctx.fillRect(-CS/2+2,-CS/2+2,CS-2,CS-2); ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font='bold '+(CS*0.12)+'px Georgia,serif'; ctx.fillText('PARKIR',0,-CS*0.1); ctx.fillText('GRATIS',0,CS*0.08); ctx.font=(CS*0.25)+'px sans-serif'; ctx.fillText('🅿',0,-CS*0.3); }

    function drawGoToJail(ctx) { ctx.fillStyle='#2244aa'; ctx.fillRect(-CS/2+2,-CS/2+2,CS-2,CS-2); ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font='bold '+(CS*0.09)+'px Georgia,serif'; ctx.fillText('MASUK',0,CS*0.0); ctx.fillText('PENJARA',0,CS*0.16); ctx.font=(CS*0.25)+'px sans-serif'; ctx.fillText('👮',0,-CS*0.22); }

    function drawTax(ctx,tile) { ctx.fillStyle='#f5f0e0'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font='bold '+(CS*0.09)+'px Georgia,serif'; ctx.fillStyle='#333'; var lines = tile.name.split(' '); var mid = Math.ceil(lines.length/2); ctx.fillText(lines.slice(0,mid).join(' '),0,-CS*0.05); ctx.fillText(lines.slice(mid).join(' '),0,CS*0.08); ctx.font='bold '+(CS*0.11)+'px sans-serif'; ctx.fillStyle='#c0392b'; ctx.fillText('Rp '+tile.amount.toLocaleString('id-ID'),0,CS*0.28); ctx.font=(CS*0.2)+'px sans-serif'; ctx.fillText('💰',0,-CS*0.28); }

    function drawChance(ctx) { ctx.fillStyle='#e67e22'; ctx.fillRect(-CS/2+2,-CS/2+2,CS-2,CS-2); ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font='bold '+(CS*0.28)+'px Georgia,serif'; ctx.fillText('?',0,-CS*0.08); ctx.font='bold '+(CS*0.075)+'px sans-serif'; ctx.fillText('KEBERUNTUNGAN',0,CS*0.24); }

    function drawCommunity(ctx) { ctx.fillStyle='#2980b9'; ctx.fillRect(-CS/2+2,-CS/2+2,CS-2,CS-2); ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font=(CS*0.22)+'px sans-serif'; ctx.fillText('📦',0,-CS*0.1); ctx.font='bold '+(CS*0.075)+'px sans-serif'; ctx.fillText('KAS UMUM',0,CS*0.24); }

    function drawLandmark(ctx,tile,cx,cy,size){ ctx.save(); ctx.translate(cx,cy); ctx.fillStyle='#555'; ctx.strokeStyle='#555'; ctx.lineWidth=2; var s=size; var id=tile.id; if(id===1||id===39){ ctx.beginPath(); ctx.moveTo(0,-s*0.5); ctx.lineTo(s*0.1,-s*0.0); ctx.lineTo(-s*0.1,-s*0.0); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.arc(0,-s*0.5,s*0.06,0,Math.PI*2); ctx.fillStyle='#e8c820'; ctx.fill(); } else { ctx.fillRect(-s*0.12,-s*0.06,s*0.24,s*0.12); } ctx.restore(); }

    api.addToken = function (index, tokenType, color) { var mesh = createTokenMesh(tokenType, color); mesh.castShadow = true; scene.add(mesh); tokenMeshes[index] = mesh; api.positionToken(index, 0); };

    api.positionToken = function (playerIdx, tileIdx) { var mesh = tokenMeshes[playerIdx]; if(!mesh) return; var p = getTokenWorldPos(tileIdx, playerIdx); mesh.position.set(p.x,p.y,p.z); };

    function createTokenMesh(type,color) { var g = new THREE.Group(); var c=new THREE.Color(color); var mat=new THREE.MeshStandardMaterial({color:c,roughness:0.4,metalness:0.2}); switch(type){ case 'becak': g.add(makeBox(0.5,0.15,0.6,mat,0,0.15,0)); g.add(makeBox(0.4,0.35,0.25,mat,0,0.38,-0.12)); g.add(makeCyl(0.1,0.1,0.04,0x333333,0,0.08,0.3)); g.add(makeCyl(0.1,0.1,0.04,0x333333,-0.18,0.08,-0.18)); g.add(makeCyl(0.1,0.1,0.04,0x333333,0.18,0.08,-0.18)); break; case 'wayang': g.add(makeBox(0.08,0.7,0.3,mat,0,0.4,0)); g.add(makeSphere(0.14,mat,0,0.85,0)); g.add(makeBox(0.6,0.08,0.12,mat,0,0.6,0)); break; case 'blangkon': g.add(makeSphere(0.3,mat,0,0.25,0,16,16,0,Math.PI*2,0,Math.PI*0.55)); g.add(makeCyl(0.35,0.35,0.05,mat,0,0.1,0)); break; case 'keris': g.add(makeCyl(0.04,0.06,0.25,mat,0,0.15,0)); g.add(makeCyl(0.01,0.04,0.5,0xc0c0c0,0,0.55,0)); break; case 'angklung': g.add(makeBox(0.5,0.6,0.08,mat,0,0.35,0)); for(var a=-1;a<=1;a++) g.add(makeCyl(0.035,0.035,0.4,0xd4a060,a*0.14,0.5,0.06)); break; case 'komodo': g.add(makeBox(0.6,0.2,0.22,mat,0,0.18,0)); g.add(makeBox(0.2,0.15,0.18,mat,0.35,0.18,0)); for(var k=0;k<4;k++) g.add(makeBox(0.06,0.15,0.06,mat,(k<2?0.15:-0.15),0.06,(k%2===0?0.12:-0.12))); break; default: g.add(makeCyl(0.2,0.2,0.5,mat,0,0.3,0)); } return g; }

    function makeBox(w,h,d,mat,x,y,z){var m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;return m;}
    function makeCyl(rt,rb,h,col,x,y,z){var m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,12),typeof col==='object'?col:new THREE.MeshStandardMaterial({color:col,roughness:0.5}));m.position.set(x,y,z);m.castShadow=true;return m;}
    function makeSphere(r,mat,x,y,z,ws,hs,phiS,phiL,thS,thL){var m=new THREE.Mesh(new THREE.SphereGeometry(r,ws||16,hs||16,phiS,phiL,thS,thL),mat);m.position.set(x,y,z);m.castShadow=true;return m;}
    function makeCone(r,h,mat,x,y,z){var m=new THREE.Mesh(new THREE.ConeGeometry(r,h,12),mat);m.position.set(x,y,z);m.castShadow=true;return m;}

    function createDice(){ var faceVals=[3,4,1,6,2,5]; var mats=faceVals.map(function(v){return new THREE.MeshStandardMaterial({ map: makeDieFaceTex(v), roughness:0.3});}); for(var d=0;d<2;d++){ var die=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.55,0.55),mats); die.castShadow=true; die.position.set(d===0?-0.8:0.8,0.3,4); scene.add(die); diceMeshes.push(die); } }

    function makeDieFaceTex(val){ var c=document.createElement('canvas'); c.width=128; c.height=128; var ctx=c.getContext('2d'); ctx.fillStyle='#fff'; roundRect(ctx,4,4,120,120,14); ctx.fill(); ctx.fillStyle='#1a1a1a'; var dots=dieDots(val); dots.forEach(function(p){ctx.beginPath();ctx.arc(p.x,p.y,10,0,Math.PI*2);ctx.fill();}); return new THREE.CanvasTexture(c); }
    function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
    function dieDots(v){var c=64,o=28;var m={1:[{x:c,y:c}],2:[{x:c-o,y:c-o},{x:c+o,y:c+o}],3:[{x:c-o,y:c-o},{x:c,y:c},{x:c+o,y:c+o}],4:[{x:c-o,y:c-o},{x:c+o,y:c-o},{x:c-o,y:c+o},{x:c+o,y:c+o}],5:[{x:c-o,y:c-o},{x:c+o,y:c-o},{x:c,y:c},{x:c-o,y:c+o},{x:c+o,y:c+o}],6:[{x:c-o,y:c-o},{x:c+o,y:c-o},{x:c-o,y:c},{x:c+o,y:c},{x:c-o,y:c+o},{x:c+o,y:c+o}]}; return m[v]; }

    function dieTargetRot(v){ switch(v){case 1: return {x:0,y:0,z:0}; case 2: return {x:-Math.PI/2,y:0,z:0}; case 3: return {x:0,y:0,z:Math.PI/2}; case 4: return {x:0,y:0,z:-Math.PI/2}; case 5: return {x:Math.PI/2,y:0,z:0}; case 6: return {x:Math.PI,y:0,z:0}; } }

    api.rollDice = function(d1,d2,cb){ var die1=diceMeshes[0],die2=diceMeshes[1]; die1.position.set(-0.8,3.5,0); die2.position.set(0.8,4.0,0); var tr1=dieTargetRot(d1),tr2=dieTargetRot(d2); var v1y=-0.08,v2y=-0.1,grav=-0.012,floor=0.3,damp=0.55; var av1={x:Math.random()*0.4+0.1,y:Math.random()*0.4,z:Math.random()*0.3}; var av2={x:Math.random()*0.4+0.1,y:Math.random()*0.4,z:Math.random()*0.3}; var dur=1400,start=performance.now(); (function anim(now){ var t=Math.min((now-start)/dur,1); if(t<0.72){ v1y+=grav; v2y+=grav; die1.position.y+=v1y; die2.position.y+=v2y; if(die1.position.y<floor){die1.position.y=floor; v1y=Math.abs(v1y)*damp;} if(die2.position.y<floor){die2.position.y=floor; v2y=Math.abs(v2y)*damp;} die1.rotation.x+=av1.x; die1.rotation.y+=av1.y; die1.rotation.z+=av1.z; die2.rotation.x+=av2.x; die2.rotation.y+=av2.y; die2.rotation.z+=av2.z; av1.x*=0.97; av1.y*=0.97; av1.z*=0.97; av2.x*=0.97; av2.y*=0.97; av2.z*=0.97; } else { var s=(t-0.72)/0.28,e=s*s*(3-2*s); lerpRot(die1,tr1,e); lerpRot(die2,tr2,e); die1.position.y+=(floor-die1.position.y)*e*0.2; die2.position.y+=(floor-die2.position.y)*e*0.2; } if(t<1) requestAnimationFrame(anim); else{ snapRot(die1,tr1); snapRot(die2,tr2); die1.position.y=floor; die2.position.y=floor; cb(); } })(performance.now()); };

    function lerpRot(mesh,tgt,t){ mesh.rotation.x += (tgt.x - mesh.rotation.x) * t * 0.15; mesh.rotation.y += (tgt.y - mesh.rotation.y) * t * 0.15; mesh.rotation.z += (tgt.z - mesh.rotation.z) * t * 0.15; }
    function snapRot(mesh,tgt){ mesh.rotation.set(tgt.x,tgt.y,tgt.z); }

    api.moveToken = function(pIdx,startTile,steps,cb){ var mesh=tokenMeshes[pIdx]; if(!mesh){cb((startTile+steps)%40);return;} var cur=startTile,step=0; function oneStep(){ step++; cur=(cur+1)%40; var tgt=getTokenWorldPos(cur,pIdx); var sx=mesh.position.x, sz=mesh.position.z, sy=mesh.position.y; var dur=140,t0=performance.now(); (function hop(now){ var t=Math.min((now-t0)/dur,1); var e=t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2; mesh.position.x=sx+(tgt.x-sx)*e; mesh.position.z=sz+(tgt.z-sz)*e; mesh.position.y=tgt.y+Math.sin(t*Math.PI)*0.45; if(t<1) requestAnimationFrame(hop); else{ mesh.position.y=tgt.y; if(step<steps) setTimeout(oneStep,40); else cb(cur); } })(performance.now()); } oneStep(); };

    api.addBuildings = function(tileId,houses){ api.removeBuildings(tileId); var grp=new THREE.Group(); houseGroups[tileId]=grp; scene.add(grp); if(houses>=5){ var h=makeHotel(); var p=getHouseWorldPos(tileId,2); h.position.set(p.x,0.18,p.z); grp.add(h); } else { for(var i=0;i<houses;i++){ var hm=makeHouse(); var hp=getHouseWorldPos(tileId,i); hm.position.set(hp.x,0.18,hp.z); grp.add(hm); } } };
    api.removeBuildings = function(tileId){ if(houseGroups[tileId]){ scene.remove(houseGroups[tileId]); disposeGroup(houseGroups[tileId]); delete houseGroups[tileId]; } };
    function makeHouse(){ var g=new THREE.Group(); g.add(makeBox(0.22,0.12,0.22,new THREE.MeshStandardMaterial({color:0x228b22,roughness:0.5}),0,0.06,0)); var roof=makeCone(0.18,0.14,new THREE.MeshStandardMaterial({color:0x8b4513,roughness:0.6}),0,0.19,0); roof.rotation.y=Math.PI/4; g.add(roof); return g; }
    function makeHotel(){ var g=new THREE.Group(); g.add(makeBox(0.3,0.35,0.22,new THREE.MeshStandardMaterial({color:0xcc2233,roughness:0.4}),0,0.18,0)); g.add(makeCone(0.05,0.18,new THREE.MeshStandardMaterial({color:0xf0c040,roughness:0.3}),0,0.45,0)); return g; }
    function disposeGroup(g){ g.traverse(function(obj){ if(obj.geometry) obj.geometry.dispose(); if(obj.material){ if(Array.isArray(obj.material)) obj.material.forEach(function(m){m.dispose();}); else obj.material.dispose(); } }); }

    var highlightMesh=null; api.highlightTile=function(tileIdx){ api.clearHighlight(); var p=getTileWorldPos(tileIdx); var geo=new THREE.BoxGeometry(1.8,0.06,1.8); var mat=new THREE.MeshBasicMaterial({color:0xf0c040,transparent:true,opacity:0.45}); highlightMesh=new THREE.Mesh(geo,mat); highlightMesh.position.set(p.x,0.2,p.z); scene.add(highlightMesh); };
    api.clearHighlight=function(){ if(highlightMesh){ scene.remove(highlightMesh); highlightMesh.geometry.dispose(); highlightMesh.material.dispose(); highlightMesh=null; } };

    function animate(){ requestAnimationFrame(animate); controls.update(); renderer.render(scene,camera); }

    return api;
})();
