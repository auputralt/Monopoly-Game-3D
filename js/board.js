/* ============================================================
   board.js — Tile data, color groups, position helpers
   ============================================================ */

var GROUP_COLORS = {
    brown:     '#7B4B2A',
    lightblue: '#87CEEB',
    pink:      '#D87093',
    orange:    '#E8861A',
    red:       '#CC2233',
    yellow:    '#E8C820',
    green:     '#1A7A3A',
    darkblue:  '#2244AA'
};

var GROUP_HOUSE_COST = {
    brown: 50, lightblue: 50, pink: 100, orange: 100,
    red: 150, yellow: 150, green: 200, darkblue: 200
};

var TILES = [
    { id:0,  name:'BOND', sub:'Bundaran HI', type:'go' },
    { id:1,  name:'Pontianak', type:'property', group:'brown', price:60, rent:[2,10,30,90,160,250] },
    { id:2,  name:'Kas Umum', type:'community' },
    { id:3,  name:'Banjarmasin', type:'property', group:'brown', price:60, rent:[4,20,60,180,320,450] },
    { id:4,  name:'Pajak Penghasilan', type:'tax', amount:2000 },
    { id:5,  name:'KAI', sub:'Kereta Api Indonesia', type:'railroad', price:200 },
    { id:6,  name:'Manado', type:'property', group:'lightblue', price:100, rent:[6,30,90,270,400,550] },
    { id:7,  name:'Keberuntungan', type:'chance' },
    { id:8,  name:'Medan', type:'property', group:'lightblue', price:100, rent:[6,30,90,270,400,550] },
    { id:9,  name:'Makassar', type:'property', group:'lightblue', price:120, rent:[8,40,100,300,450,600] },
    { id:10, name:'PENJARA', sub:'Sedang Berkunjung', type:'jail' },
    { id:11, name:'Semarang', type:'property', group:'pink', price:140, rent:[10,50,150,450,625,750] },
    { id:12, name:'PLN', sub:'Listrik Negara', type:'utility', price:150 },
    { id:13, name:'Palembang', type:'property', group:'pink', price:140, rent:[10,50,150,450,625,750] },
    { id:14, name:'Denpasar', type:'property', group:'pink', price:160, rent:[12,60,180,500,700,900] },
    { id:15, name:'Garuda Indonesia', type:'railroad', price:200 },
    { id:16, name:'Bandung', type:'property', group:'orange', price:180, rent:[14,70,200,550,750,950] },
    { id:17, name:'Kas Umum', type:'community' },
    { id:18, name:'Surabaya', type:'property', group:'orange', price:180, rent:[14,70,200,550,750,950] },
    { id:19, name:'Yogyakarta', type:'property', group:'orange', price:200, rent:[16,80,220,600,800,1000] },
    { id:20, name:'PARKIR GRATIS', type:'freeParking' },
    { id:21, name:'Malang', type:'property', group:'red', price:220, rent:[18,90,250,700,875,1050] },
    { id:22, name:'Keberuntungan', type:'chance' },
    { id:23, name:'Bogor', type:'property', group:'red', price:220, rent:[18,90,250,700,875,1050] },
    { id:24, name:'Solo', type:'property', group:'red', price:240, rent:[20,100,300,750,925,1100] },
    { id:25, name:'Pelni', sub:'Pelayaran Nasional', type:'railroad', price:200 },
    { id:26, name:'Jakarta Utara', type:'property', group:'yellow', price:260, rent:[22,110,330,800,975,1150] },
    { id:27, name:'Jakarta Selatan', type:'property', group:'yellow', price:260, rent:[22,110,330,800,975,1150] },
    { id:28, name:'PDAM', sub:'Air Minum', type:'utility', price:150 },
    { id:29, name:'Jakarta Barat', type:'property', group:'yellow', price:280, rent:[24,120,360,850,1025,1200] },
    { id:30, name:'MASUK PENJARA', type:'goToJail' },
    { id:31, name:'Jakarta Timur', type:'property', group:'green', price:300, rent:[26,130,390,900,1100,1275] },
    { id:32, name:'Tangerang', type:'property', group:'green', price:300, rent:[26,130,390,900,1100,1275] },
    { id:33, name:'Kas Umum', type:'community' },
    { id:34, name:'Bekasi', type:'property', group:'green', price:320, rent:[28,150,450,1000,1200,1400] },
    { id:35, name:'Damri', sub:'Bus Nasional', type:'railroad', price:200 },
    { id:36, name:'Keberuntungan', type:'chance' },
    { id:37, name:'Depok', type:'property', group:'darkblue', price:350, rent:[35,175,500,1100,1300,1500] },
    { id:38, name:'Pajak Mewah', type:'tax', amount:7500 },
    { id:39, name:'Jakarta Pusat', type:'property', group:'darkblue', price:400, rent:[50,200,600,1400,1700,2000] }
];

function getTileGridPos(index) {
    if (index === 0)  return { gx:10, gy:10, side:'bottom' };
    if (index <= 9)   return { gx:10 - index, gy:10, side:'bottom' };
    if (index === 10) return { gx:0, gy:10, side:'bottom' };
    if (index <= 19)  return { gx:0, gy:10 - (index - 10), side:'left' };
    if (index === 20) return { gx:0, gy:0, side:'left' };
    if (index <= 29)  return { gx:index - 20, gy:0, side:'top' };
    if (index === 30) return { gx:10, gy:0, side:'top' };
    return { gx:10, gy:index - 30, side:'right' };
}

function getTileWorldPos(index) {
    var g = getTileGridPos(index);
    return { x:(g.gx - 5) * 2, z:(g.gy - 5) * 2 };
}

function getTokenWorldPos(tileIndex, slot) {
    var g = getTileGridPos(tileIndex);
    var x = (g.gx - 5) * 2;
    var z = (g.gy - 5) * 2;
    var off = 0.55;
    var ox = 0, oz = 0;
    switch (g.side) {
        case 'bottom': oz = -off; break;
        case 'left':   ox =  off; break;
        case 'top':    oz =  off; break;
        case 'right':  ox = -off; break;
    }
    var s = [ {dx:-0.3,dz:-0.3},{dx:0.3,dz:-0.3},{dx:-0.3,dz:0.3},{dx:0.3,dz:0.3},{dx:0,dz:0},{dx:0,dz:-0.5} ][slot % 6];
    return { x: x + ox + s.dx, y: 0.35, z: z + oz + s.dz };
}

function getHouseWorldPos(tileIndex, houseIndex) {
    var g = getTileGridPos(tileIndex);
    var cx = (g.gx - 5) * 2;
    var cz = (g.gy - 5) * 2;
    var inner = 0.2;
    var spread = (houseIndex - 2) * 0.35;
    switch (g.side) {
        case 'bottom': return { x: cx + spread, z: cz - inner };
        case 'left':   return { x: cx + inner, z: cz + spread };
        case 'top':    return { x: cx - spread, z: cz + inner };
        case 'right':  return { x: cx - inner, z: cz - spread };
    }
}
