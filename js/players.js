/* ============================================================
   players.js — Token definitions & Player class
   ============================================================ */

var TOKENS = [
    { id:'becak',    name:'Becak',     desc:'Becak tradisional',       color:'#E8C820', emoji:'🛺' },
    { id:'wayang',   name:'Wayang',    desc:'Wayang kulit',            color:'#D4A017', emoji:'🎭' },
    { id:'blangkon', name:'Blangkon',  desc:'Topi tradisional Jawa',   color:'#2244AA', emoji:'🎩' },
    { id:'keris',    name:'Keris',     desc:'Keris pusaka',            color:'#A0A0B0', emoji:'🗡️' },
    { id:'angklung', name:'Angklung',  desc:'Alat musik bambu',        color:'#8B5E3C', emoji:'🎋' },
    { id:'komodo',   name:'Komodo',    desc:'Kadal raksasa',           color:'#4A7A3A', emoji:'🦎' }
];

var PLAYER_COLORS = ['#E84040','#4080E8','#40C060','#E8A020','#C050D0','#40C8C8'];

function Player(name, tokenIndex, seatIndex) {
    this.name       = name;
    this.tokenIndex = tokenIndex;
    this.seatIndex  = seatIndex;
    this.color      = PLAYER_COLORS[seatIndex];
    this.money      = 15000;
    this.position   = 0;
    this.inJail     = false;
    this.jailTurns  = 0;
    this.jailCards  = 0;
    this.bankrupt   = false;
    this.properties = [];
}
