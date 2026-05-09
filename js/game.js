/* ============================================================
   game.js — Main game controller, state machine, UI, audio
   ============================================================ */

var Game = (function () {
    'use strict';

    var audioCtx = null;
    function ensureAudio() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    function playTone(freq, dur, type, vol) {
        try {
            ensureAudio();
            var o = audioCtx.createOscillator();
            var g = audioCtx.createGain();
            o.type = type || 'sine';
            o.frequency.value = freq;
            g.gain.setValueAtTime(vol || 0.15, audioCtx.currentTime);
            g.gain.linearRampToValueAtTime(0, audioCtx.currentTime + dur);
            o.connect(g);
            g.connect(audioCtx.destination);
            o.start();
            o.stop(audioCtx.currentTime + dur);
        } catch (e) {
            // ignore audio failures on restrictive browsers
        }
    }
    function sfxDice() { playTone(180, 0.25, 'sawtooth', 0.08); setTimeout(function () { playTone(120, 0.18, 'sawtooth', 0.06); }, 90); }
    function sfxMove() { playTone(600, 0.06, 'sine', 0.08); }
    function sfxBuy() { playTone(520, 0.12, 'sine', 0.12); setTimeout(function () { playTone(780, 0.15, 'sine', 0.12); }, 100); }
    function sfxRent() { playTone(300, 0.2, 'sawtooth', 0.1); }
    function sfxJail() { playTone(200, 0.4, 'square', 0.08); }
    function sfxCard() { playTone(440, 0.1, 'sine', 0.1); setTimeout(function () { playTone(660, 0.12, 'sine', 0.1); }, 80); }
    function sfxWin() { [523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { playTone(f, 0.3, 'sine', 0.12); }, i * 150); }); }

    var state = {
        phase: 'SELECT',
        players: [],
        curIdx: 0,
        dice: [0, 0],
        doublesRun: 0,
        chanceDeck: [],
        communityDeck: [],
        chanceIdx: 0,
        communityIdx: 0,
        tileState: {},
        playerCount: 4,
        selectedTokens: [0, 1, 2, 3, 4, 5],
        pendingAuction: null,
        pendingCard: null,
        lastDiceTotal: 0,
        pendingTile: null
    };

    function cur() { return state.players[state.curIdx]; }
    function fmtRp(n) { return 'Rp ' + Math.max(0, Math.floor(n)).toLocaleString('id-ID'); }
    function shuffle(a) { var b = a.slice(); for (var i = b.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = b[i]; b[i] = b[j]; b[j] = t; } return b; }
    function isBuyable(t) { return t.type === 'property' || t.type === 'railroad' || t.type === 'utility'; }
    function show(ids) { ids.forEach(function (id) { var el = document.getElementById(id); if (el) el.style.display = 'block'; }); }
    function hide(ids) { ids.forEach(function (id) { var el = document.getElementById(id); if (el) el.style.display = 'none'; }); }

    // Escape HTML to prevent XSS
    function escapeHtml(unsafe) {
        return unsafe.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    function activePlayers() { return state.players.filter(function (p) { return !p.bankrupt; }); }

    function getOwner(tileId) {
        return state.tileState[tileId] ? state.tileState[tileId].owner : -1;
    }
    function groupTiles(group) { return TILES.filter(function (t) { return t.group === group; }); }
    function ownsGroup(pi, group) {
        return groupTiles(group).every(function (t) { return getOwner(t.id) === pi; });
    }

    var api = {};

    api.init = function () {
        setupSelectScreen();
        updatePlayerInputs();
        setupKeyboardHandlers();
    };

    function setupKeyboardHandlers() {
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                // Close all modals on Escape
                var modals = document.querySelectorAll('.modal-overlay');
                modals.forEach(function(modal) {
                    modal.style.display = 'none';
                });
            }
        });
    }

    // Global error handler
    function handleError(error, context) {
        console.error('Error in ' + context + ':', error);
        var msgModal = document.getElementById('msg-modal');
        if (msgModal) {
            document.getElementById('msg-text').textContent = 'Terjadi kesalahan: ' + context + '. Muat ulang halaman.';
            msgModal.style.display = 'block';
        }
    }

    function setupSelectScreen() {
        document.querySelectorAll('.count-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                try {
                    document.querySelectorAll('.count-btn').forEach(function (b) { b.classList.remove('active'); });
                    btn.classList.add('active');
                    state.playerCount = parseInt(btn.dataset.n, 10);
                    updatePlayerInputs();
                } catch (e) {
                    handleError(e, 'player count change');
                }
            });
        });
        document.getElementById('start-btn').addEventListener('click', function(e) {
            e.preventDefault();
            startGame();
        });
    }

    function updatePlayerInputs() {
        var wrap = document.getElementById('player-inputs');
        wrap.innerHTML = '';
        for (var i = 0; i < state.playerCount; i++) {
            addPlayerRow(wrap, i);
        }
        if (!previewState.inited) initTokenPreview();
        updatePreview(0);
    }

    function addPlayerRow(wrap, idx) {
        var row = document.createElement('div');
        row.className = 'pi-row';

        var dot = document.createElement('div');
        dot.className = 'pi-color';
        dot.style.background = PLAYER_COLORS[idx];
        row.appendChild(dot);

        var inp = document.createElement('input');
        inp.className = 'pi-name-input';
        inp.placeholder = 'Pemain ' + (idx + 1);
        inp.value = 'Pemain ' + (idx + 1);
        inp.id = 'pi-name-' + idx;
        row.appendChild(inp);

        var nav = document.createElement('div');
        nav.className = 'pi-token-nav';
        var prev = document.createElement('button');
        prev.className = 'pi-arrow';
        prev.textContent = '◀';
        var label = document.createElement('span');
        label.className = 'pi-token-label';
        label.id = 'pi-token-' + idx;
        var next = document.createElement('button');
        next.className = 'pi-arrow';
        next.textContent = '▶';
        nav.appendChild(prev);
        nav.appendChild(label);
        nav.appendChild(next);
        row.appendChild(nav);
        wrap.appendChild(row);

        state.selectedTokens[idx] = idx;
        refreshTokenLabel(idx);

        prev.addEventListener('click', function () { try { cycleToken(idx, -1); } catch(e) { handleError(e, 'token navigation'); } });
        next.addEventListener('click', function () { try { cycleToken(idx, 1); } catch(e) { handleError(e, 'token navigation'); } });
        inp.addEventListener('input', function () { try { if (idx === 0) updatePreview(idx); } catch(e) { handleError(e, 'name input'); } });
    }

    function cycleToken(idx, dir) {
        var used = state.selectedTokens.filter(function (_, i) { return i !== idx; });
        var curTok = state.selectedTokens[idx];
        var next = curTok;
        do {
            next = (next + dir + TOKENS.length) % TOKENS.length;
        } while (used.indexOf(next) !== -1);
        state.selectedTokens[idx] = next;
        refreshTokenLabel(idx);
        updatePreview(idx);
    }

    function refreshTokenLabel(idx) {
        var el = document.getElementById('pi-token-' + idx);
        if (el) {
            var t = TOKENS[state.selectedTokens[idx]];
            el.textContent = t.emoji + ' ' + t.name;
        }
    }

    /* Small token preview renderer */
    var previewState = {
        inited: false,
        renderer: null,
        scene: null,
        camera: null,
        mesh: null
    };

    function initTokenPreview() {
        var canvas = document.getElementById('token-preview-canvas');
        previewState.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        previewState.renderer.setSize(220, 220);
        previewState.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        previewState.scene = new THREE.Scene();
        previewState.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
        previewState.camera.position.set(0, 1.2, 2.2);
        previewState.camera.lookAt(0, 0.35, 0);
        previewState.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        var dl = new THREE.DirectionalLight(0xffffff, 0.8);
        dl.position.set(2, 3, 2);
        previewState.scene.add(dl);

        var pedestal = new THREE.Mesh(
            new THREE.CylinderGeometry(0.55, 0.6, 0.1, 32),
            new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.5 })
        );
        previewState.scene.add(pedestal);

        previewState.inited = true;
        (function loop() {
            requestAnimationFrame(loop);
            if (previewState.mesh) previewState.mesh.rotation.y += 0.018;
            previewState.renderer.render(previewState.scene, previewState.camera);
        })();
    }

    function buildPreviewToken(tokIdx) {
        var tok = TOKENS[tokIdx];
        var g = new THREE.Group();
        var c = new THREE.Color(tok.color);
        var mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.2 });

        function bx(w, h, d, m, x, y, z) {
            var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
            mesh.position.set(x, y, z);
            return mesh;
        }
        function cy(rt, rb, h, col, x, y, z) {
            var mesh = new THREE.Mesh(
                new THREE.CylinderGeometry(rt, rb, h, 12),
                typeof col === 'object' ? col : new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 })
            );
            mesh.position.set(x, y, z);
            return mesh;
        }
        function sp(r, m, x, y, z, ws, hs, phiS, phiL, thS, thL) {
            var mesh = new THREE.Mesh(new THREE.SphereGeometry(r, ws || 16, hs || 16, phiS, phiL, thS, thL), m);
            mesh.position.set(x, y, z);
            return mesh;
        }

        switch (tok.id) {
            case 'becak':
                g.add(bx(0.5, 0.15, 0.6, mat, 0, 0.15, 0));
                g.add(bx(0.4, 0.35, 0.25, mat, 0, 0.38, -0.12));
                g.add(cy(0.1, 0.1, 0.04, 0x333333, 0, 0.08, 0.3));
                g.add(cy(0.1, 0.1, 0.04, 0x333333, -0.18, 0.08, -0.18));
                g.add(cy(0.1, 0.1, 0.04, 0x333333, 0.18, 0.08, -0.18));
                break;
            case 'wayang':
                g.add(bx(0.08, 0.7, 0.3, mat, 0, 0.4, 0));
                g.add(sp(0.14, mat, 0, 0.85, 0));
                g.add(bx(0.6, 0.08, 0.12, mat, 0, 0.6, 0));
                break;
            case 'blangkon':
                g.add(sp(0.3, mat, 0, 0.25, 0, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55));
                g.add(cy(0.35, 0.35, 0.05, mat, 0, 0.1, 0));
                break;
            case 'keris':
                g.add(cy(0.04, 0.06, 0.25, mat, 0, 0.15, 0));
                g.add(cy(0.01, 0.04, 0.5, 0xc0c0c0, 0, 0.55, 0));
                break;
            case 'angklung':
                g.add(bx(0.5, 0.6, 0.08, mat, 0, 0.35, 0));
                for (var a = -1; a <= 1; a++) g.add(cy(0.035, 0.035, 0.4, 0xd4a060, a * 0.14, 0.5, 0.06));
                break;
            case 'komodo':
                g.add(bx(0.6, 0.2, 0.22, mat, 0, 0.18, 0));
                g.add(bx(0.2, 0.15, 0.18, mat, 0.35, 0.18, 0));
                for (var k = 0; k < 4; k++) g.add(bx(0.06, 0.15, 0.06, mat, (k < 2 ? 0.15 : -0.15), 0.06, (k % 2 === 0 ? 0.12 : -0.12)));
                break;
            default:
                g.add(cy(0.2, 0.2, 0.5, mat, 0, 0.3, 0));
        }
        return g;
    }

    function updatePreview(idx) {
        var tok = TOKENS[state.selectedTokens[idx]];
        document.getElementById('preview-token-name').textContent = tok.emoji + ' ' + tok.name;
        document.getElementById('preview-token-desc').textContent = tok.desc;
        if (!previewState.inited) return;
        if (previewState.mesh) previewState.scene.remove(previewState.mesh);
        previewState.mesh = buildPreviewToken(state.selectedTokens[idx]);
        previewState.scene.add(previewState.mesh);
    }

    function startGame() {
        state.players = [];
        for (var i = 0; i < state.playerCount; i++) {
            var name = escapeHtml(document.getElementById('pi-name-' + i).value.trim()) || ('Pemain ' + (i + 1));
            state.players.push(new Player(name, state.selectedTokens[i], i));
        }

        state.chanceDeck = shuffle(CHANCE_CARDS);
        state.communityDeck = shuffle(COMMUNITY_CARDS);
        state.chanceIdx = 0;
        state.communityIdx = 0;
        state.tileState = {};
        TILES.forEach(function (t) {
            if (isBuyable(t)) state.tileState[t.id] = { owner: -1, houses: 0, mortgaged: false };
        });
        state.curIdx = 0;
        state.doublesRun = 0;

        document.getElementById('selection-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'flex';

        BoardRenderer.init(document.getElementById('game-canvas'));
        state.players.forEach(function (p, i) {
            BoardRenderer.addToken(i, TOKENS[p.tokenIndex].id, p.color);
        });

        bindGameUI();
        updateHUD();
        startTurn();
    }

    function bindGameUI() {
        document.getElementById('roll-btn').addEventListener('click', function() { try { rollDice(); } catch(e) { handleError(e, 'roll dice'); } });
        document.getElementById('end-btn').addEventListener('click', function() { try { endTurn(); } catch(e) { handleError(e, 'end turn'); } });
        document.getElementById('build-btn').addEventListener('click', function() { try { showBuildModal(); } catch(e) { handleError(e, 'build modal'); } });
        document.getElementById('trade-btn').addEventListener('click', function() { try { showTradeModal(); } catch(e) { handleError(e, 'trade modal'); } });
        document.getElementById('mortgage-btn').addEventListener('click', function() { try { showMortgageModal(); } catch(e) { handleError(e, 'mortgage modal'); } });
        document.getElementById('deed-buy').addEventListener('click', function() { try { buyProperty(); } catch(e) { handleError(e, 'buy property'); } });
        document.getElementById('deed-auction').addEventListener('click', function() { try { startAuction(); } catch(e) { handleError(e, 'start auction'); } });
        document.getElementById('deed-pay').addEventListener('click', function() { try { payRentAction(); } catch(e) { handleError(e, 'pay rent'); } });
        document.getElementById('deed-ok').addEventListener('click', function() { try { hidePropModal(); afterAction(); } catch(e) { handleError(e, 'close property modal'); } });
        document.getElementById('card-ok').addEventListener('click', function() { try { resolveCard(); } catch(e) { handleError(e, 'resolve card'); } });
        document.getElementById('auction-bid-btn').addEventListener('click', function() { try { auctionBid(); } catch(e) { handleError(e, 'auction bid'); } });
        document.getElementById('auction-pass-btn').addEventListener('click', function() { try { auctionPass(); } catch(e) { handleError(e, 'auction pass'); } });
        document.getElementById('trade-confirm').addEventListener('click', function() { try { executeTrade(); } catch(e) { handleError(e, 'execute trade'); } });
        document.getElementById('trade-cancel').addEventListener('click', function() { try { hideTradeModal(); } catch(e) { handleError(e, 'cancel trade'); } });
        document.getElementById('trade-partner').addEventListener('change', function() { try { buildTradeRight(); } catch(e) { handleError(e, 'build trade'); } });
        document.getElementById('mort-close').addEventListener('click', function() { try { hideMortgageModal(); } catch(e) { handleError(e, 'close mortgage modal'); } });
        document.getElementById('jail-pay').addEventListener('click', function() { try { jailPay(); } catch(e) { handleError(e, 'jail pay'); } });
        document.getElementById('jail-card').addEventListener('click', function() { try { jailUseCard(); } catch(e) { handleError(e, 'jail card'); } });
        document.getElementById('jail-roll').addEventListener('click', function() { try { jailRoll(); } catch(e) { handleError(e, 'jail roll'); } });
        document.getElementById('msg-ok').addEventListener('click', function() { try { hideMsgModal(); } catch(e) { handleError(e, 'close message'); } });
        document.getElementById('build-close').addEventListener('click', function() { try { hideBuildModal(); } catch(e) { handleError(e, 'close build modal'); } });
        document.getElementById('restart-btn').addEventListener('click', function() { try { location.reload(); } catch(e) { handleError(e, 'restart game'); } });
    }

    function startTurn() {
        var p = cur();
        if (p.bankrupt) { endTurn(); return; }
        state.phase = 'ROLL';
        updateHUD();
        show(['roll-btn']);
        hide(['end-btn', 'build-btn', 'trade-btn', 'mortgage-btn']);
        if (p.inJail) showJailModal();
    }

    function rollDice() {
        try {
            if (state.phase !== 'ROLL') return;
            state.phase = 'MOVE';
            hide(['roll-btn']);
            sfxDice();
            var d1 = Math.floor(Math.random() * 6) + 1;
            var d2 = Math.floor(Math.random() * 6) + 1;
            state.dice = [d1, d2];
            state.lastDiceTotal = d1 + d2;
            updateDiceDisplay(d1, d2);
            document.getElementById('die1-box').classList.add('rolling');
            document.getElementById('die2-box').classList.add('rolling');

            BoardRenderer.rollDice(d1, d2, function () {
                document.getElementById('die1-box').classList.remove('rolling');
                document.getElementById('die2-box').classList.remove('rolling');
                afterDiceRoll();
            });
        } catch (e) {
            handleError(e, 'roll dice');
            show(['roll-btn']);
        }
    }

    function afterDiceRoll() {
        var p = cur();
        var d1 = state.dice[0], d2 = state.dice[1];
        var isDoubles = d1 === d2;

        if (p.inJail) {
            if (isDoubles) {
                p.inJail = false;
                p.jailTurns = 0;
                log(p.name + ' lempar double! Keluar penjara!');
            } else {
                p.jailTurns++;
                if (p.jailTurns < 3) {
                    log(p.name + ' gagal lempar double. Tetap di penjara.');
                    endTurn();
                    return;
                }
                if (p.jailTurns >= 3) {
                    p.money -= 500;
                    p.inJail = false;
                    p.jailTurns = 0;
                    log(p.name + ' gagal 3x. Bayar Rp 500, keluar penjara.');
                }
            }
        }

        if (isDoubles) {
            state.doublesRun++;
            if (state.doublesRun >= 3) {
                log(p.name + ' lempar double 3x! Masuk penjara!');
                sendToJail(state.curIdx);
                return;
            }
        }

        var total = d1 + d2;
        var oldPos = p.position;
        var newPos = (oldPos + total) % 40;

        sfxMove();
        BoardRenderer.moveToken(state.curIdx, oldPos, total, function (landed) {
            p.position = landed;
            if (oldPos + total >= 40) {
                p.money += 2000;
                log(p.name + ' lewat BOND! Terima Rp 2.000');
            }
            BoardRenderer.highlightTile(landed);
            landOnTile(landed);
        });
    }

    function landOnTile(tileIdx) {
        var tile = TILES[tileIdx];
        var p = cur();
        state.phase = 'ACTION';

        switch (tile.type) {
            case 'property':
            case 'railroad':
            case 'utility':
                handlePropertyTile(tileIdx);
                break;
            case 'tax':
                p.money -= tile.amount;
                log(p.name + ' bayar pajak ' + fmtRp(tile.amount));
                sfxRent();
                if (checkBankrupt(state.curIdx, 0)) return;
                afterAction();
                break;
            case 'chance':
                drawAndShowCard('chance');
                break;
            case 'community':
                drawAndShowCard('community');
                break;
            case 'goToJail':
                sendToJail(state.curIdx);
                break;
            default:
                afterAction();
        }
    }

    function handlePropertyTile(tileIdx) {
        var tile = TILES[tileIdx];
        var owner = getOwner(tileIdx);
        var p = cur();

        if (owner === -1) {
            showPropertyDeed(tileIdx, 'buy');
        } else if (owner === state.curIdx) {
            log(p.name + ' mendarat di properti sendiri.');
            afterAction();
        } else {
            var ts = state.tileState[tileIdx];
            if (ts.mortgaged) {
                log(tile.name + ' sedang digadai. Tidak ada sewa.');
                afterAction();
            } else {
                var rent = calcRent(tileIdx);
                showPropertyDeed(tileIdx, 'pay', rent);
            }
        }
    }

    function calcRent(tileIdx) {
        var tile = TILES[tileIdx];
        var ts = state.tileState[tileIdx];
        var owner = ts.owner;
        if (tile.type === 'property') {
            if (ts.houses > 0) return tile.rent[ts.houses];
            if (ownsGroup(owner, tile.group)) return tile.rent[0] * 2;
            return tile.rent[0];
        }
        if (tile.type === 'railroad') {
            var count = [5, 15, 25, 35].filter(function (id) { return getOwner(id) === owner; }).length;
            return 25 * Math.pow(2, count - 1);
        }
        if (tile.type === 'utility') {
            var uc = [12, 28].filter(function (id) { return getOwner(id) === owner; }).length;
            return state.lastDiceTotal * (uc >= 2 ? 10 : 4);
        }
        return 0;
    }

    function buyProperty() {
        var tileIdx = state.pendingTile;
        var tile = TILES[tileIdx];
        var p = cur();
        if (p.money < tile.price) {
            showMsg('Uang tidak cukup! Harga: ' + fmtRp(tile.price));
            return;
        }
        p.money -= tile.price;
        p.properties.push(tileIdx);
        state.tileState[tileIdx].owner = state.curIdx;
        log(p.name + ' membeli ' + tile.name + ' seharga ' + fmtRp(tile.price));
        sfxBuy();
        hidePropModal();
        afterAction();
    }

    function payRentAction() {
        var tileIdx = state.pendingTile;
        var rent = state.pendingRent;
        var p = cur();
        var ownerIdx = getOwner(tileIdx);
        p.money -= rent;
        state.players[ownerIdx].money += rent;
        log(p.name + ' membayar sewa ' + fmtRp(rent) + ' ke ' + state.players[ownerIdx].name);
        sfxRent();
        hidePropModal();
        if (checkBankrupt(state.curIdx, rent)) return;
        afterAction();
    }

    function drawAndShowCard(type) {
        var deck, idx;
        if (type === 'chance') {
            deck = state.chanceDeck;
            idx = state.chanceIdx++;
            if (state.chanceIdx >= deck.length) { state.chanceDeck = shuffle(CHANCE_CARDS); state.chanceIdx = 0; }
        } else {
            deck = state.communityDeck;
            idx = state.communityIdx++;
            if (state.communityIdx >= deck.length) { state.communityDeck = shuffle(COMMUNITY_CARDS); state.communityIdx = 0; }
        }
        var card = deck[idx % deck.length];
        state.pendingCard = card;
        state.pendingCardType = type;
        sfxCard();
        showCardModal(card, type);
    }

    function resolveCard() {
        hideCardModal();
        executeCardEffect(state.pendingCard);
    }

    function executeCardEffect(card) {
        var p = cur();
        switch (card.effect) {
            case 'moveToGo':
                p.money += 2000;
                teleportTo(0, false);
                break;
            case 'moveTo':
                teleportTo(card.target, true);
                break;
            case 'moveToNearestUtility':
                teleportTo(findNearest(p.position, [12, 28]), true);
                break;
            case 'moveToNearestRailroad':
                teleportTo(findNearest(p.position, [5, 15, 25, 35]), true);
                break;
            case 'collect':
                p.money += card.amount;
                log(p.name + ' menerima ' + fmtRp(card.amount));
                afterAction();
                break;
            case 'pay':
                p.money -= card.amount;
                log(p.name + ' membayar ' + fmtRp(card.amount));
                if (checkBankrupt(state.curIdx, card.amount)) return;
                afterAction();
                break;
            case 'getOutOfJail':
                p.jailCards++;
                log(p.name + ' mendapat kartu Bebas Penjara!');
                afterAction();
                break;
            case 'goToJail':
                sendToJail(state.curIdx);
                break;
            case 'moveBack3':
                teleportTo((p.position - 3 + 40) % 40, false);
                break;
            case 'payPerHouse':
                var totalHouses = 0, totalHotels = 0;
                p.properties.forEach(function (tid) {
                    var h = state.tileState[tid].houses;
                    if (h === 5) totalHotels++;
                    else totalHouses += h;
                });
                var cost = totalHouses * card.houseAmt + totalHotels * card.hotelAmt;
                p.money -= cost;
                log(p.name + ' bayar perbaikan ' + fmtRp(cost));
                if (checkBankrupt(state.curIdx, cost)) return;
                afterAction();
                break;
            case 'collectFromEach':
                var total = 0;
                state.players.forEach(function (op, i) {
                    if (i !== state.curIdx && !op.bankrupt) {
                        op.money -= card.amount;
                        total += card.amount;
                    }
                });
                p.money += total;
                log(p.name + ' menerima ' + fmtRp(card.amount) + ' dari setiap pemain');
                afterAction();
                break;
            default:
                afterAction();
        }
    }

    function teleportTo(target, passGoCheck) {
        var p = cur();
        var old = p.position;
        p.position = target;
        BoardRenderer.positionToken(state.curIdx, target);
        if (passGoCheck && target < old) {
            p.money += 2000;
            log(p.name + ' lewat BOND! Terima Rp 2.000');
        }
        BoardRenderer.highlightTile(target);
        landOnTile(target);
    }

    function findNearest(pos, targets) {
        var best = targets[0], bestDist = 999;
        targets.forEach(function (t) {
            var d = (t - pos + 40) % 40;
            if (d < bestDist) { bestDist = d; best = t; }
        });
        return best;
    }

    function sendToJail(pi) {
        var p = state.players[pi];
        p.inJail = true;
        p.jailTurns = 0;
        p.position = 10;
        BoardRenderer.positionToken(pi, 10);
        sfxJail();
        log(p.name + ' masuk penjara!');
        if (pi === state.curIdx) afterAction();
    }

    function showJailModal() {
        var p = cur();
        document.getElementById('jail-turns-info').textContent = 'Giliran di penjara: ' + (p.jailTurns + 1) + '/3';
        document.getElementById('jail-card').style.display = p.jailCards > 0 ? 'block' : 'none';
        document.getElementById('jail-modal').style.display = 'flex';
    }
    function hideJailModal() { document.getElementById('jail-modal').style.display = 'none'; }
    function jailPay() { var p = cur(); p.money -= 500; p.inJail = false; p.jailTurns = 0; log(p.name + ' bayar Rp 500 untuk keluar penjara.'); hideJailModal(); state.phase = 'ROLL'; show(['roll-btn']); updateHUD(); }
    function jailUseCard() { var p = cur(); p.jailCards--; p.inJail = false; p.jailTurns = 0; log(p.name + ' gunakan kartu Bebas Penjara.'); hideJailModal(); state.phase = 'ROLL'; show(['roll-btn']); updateHUD(); }
    function jailRoll() { hideJailModal(); state.phase = 'ROLL'; rollDice(); }

    function afterAction() {
        BoardRenderer.clearHighlight();
        updateHUD();
        if (state.phase === 'GAMEOVER') return;
        var d1 = state.dice[0], d2 = state.dice[1];
        if (d1 === d2) {
            log(cur().name + ' lempar double! Giliran lagi.');
            state.phase = 'ROLL';
            show(['roll-btn']);
            hide(['end-btn', 'build-btn', 'trade-btn', 'mortgage-btn']);
        } else {
            state.phase = 'ACTION';
            show(['end-btn', 'build-btn', 'trade-btn', 'mortgage-btn']);
            hide(['roll-btn']);
            updateBuildButton();
        }
    }

    function endTurn() {
        hide(['end-btn', 'build-btn', 'trade-btn', 'mortgage-btn']);
        BoardRenderer.clearHighlight();
        do { state.curIdx = (state.curIdx + 1) % state.players.length; } while (state.players[state.curIdx] && state.players[state.curIdx].bankrupt);
        startTurn();
    }

    function updateBuildButton() {
        var p = cur();
        var canBuild = p.properties.some(function (tid) { return canBuildOn(tid); });
        document.getElementById('build-btn').style.display = canBuild ? 'block' : 'none';
    }

    function canBuildOn(tileId) {
        var tile = TILES[tileId];
        if (tile.type !== 'property') return false;
        var ts = state.tileState[tileId];
        if (ts.owner !== state.curIdx || ts.mortgaged) return false;
        if (!ownsGroup(state.curIdx, tile.group)) return false;
        if (ts.houses >= 5) return false;
        var minH = 99;
        groupTiles(tile.group).forEach(function (t) { minH = Math.min(minH, state.tileState[t.id].houses); });
        if (ts.houses > minH) return false;
        if (cur().money < GROUP_HOUSE_COST[tile.group]) return false;
        return true;
    }

    function showBuildModal() {
        var wrap = document.getElementById('build-list');
        wrap.innerHTML = '';
        cur().properties.forEach(function (tid) {
            var tile = TILES[tid];
            if (tile.type !== 'property') return;
            var ts = state.tileState[tid];
            var row = document.createElement('div');
            row.className = 'build-row';
            var dot = document.createElement('div');
            dot.className = 'build-dot';
            dot.style.background = GROUP_COLORS[tile.group];
            row.appendChild(dot);
            var nm = document.createElement('span');
            nm.className = 'build-name';
            nm.textContent = tile.name;
            row.appendChild(nm);
            var hs = document.createElement('span');
            hs.className = 'build-houses';
            hs.textContent = ts.houses >= 5 ? '🏨 Hotel' : ('🏠'.repeat(ts.houses) + ' (' + ts.houses + '/4)');
            row.appendChild(hs);
            var btns = document.createElement('div');
            btns.className = 'build-btns';
            var plus = document.createElement('button');
            plus.className = 'build-btn'; plus.textContent = '+';
            plus.disabled = !canBuildOn(tid);
            plus.title = 'Bangun (Rp ' + GROUP_HOUSE_COST[tile.group].toLocaleString('id-ID') + ')';
            plus.addEventListener('click', function () { buildOn(tid); showBuildModal(); updateHUD(); });
            var minus = document.createElement('button');
            minus.className = 'build-btn'; minus.textContent = '−';
            minus.disabled = ts.houses <= 0;
            minus.title = 'Jual rumah (Rp ' + Math.floor(GROUP_HOUSE_COST[tile.group] / 2).toLocaleString('id-ID') + ')';
            minus.addEventListener('click', function () { sellOn(tid); showBuildModal(); updateHUD(); });
            btns.appendChild(minus); btns.appendChild(plus);
            row.appendChild(btns);
            wrap.appendChild(row);
        });
        document.getElementById('build-modal').style.display = 'flex';
    }
    function hideBuildModal() { document.getElementById('build-modal').style.display = 'none'; }
    function buildOn(tileId) { var tile = TILES[tileId]; var cost = GROUP_HOUSE_COST[tile.group]; cur().money -= cost; state.tileState[tileId].houses++; BoardRenderer.addBuildings(tileId, state.tileState[tileId].houses); log(cur().name + ' bangun di ' + tile.name); sfxBuy(); }
    function sellOn(tileId) { var tile = TILES[tileId]; var refund = Math.floor(GROUP_HOUSE_COST[tile.group] / 2); cur().money += refund; state.tileState[tileId].houses = Math.max(0, state.tileState[tileId].houses - 1); BoardRenderer.addBuildings(tileId, state.tileState[tileId].houses); log(cur().name + ' jual bangunan di ' + tile.name + ' (+' + fmtRp(refund) + ')'); }

    function showMortgageModal() {
        var wrap = document.getElementById('mort-list');
        wrap.innerHTML = '';
        cur().properties.forEach(function (tid) {
            var tile = TILES[tid];
            var ts = state.tileState[tid];
            var row = document.createElement('div');
            row.className = 'mort-row';
            var dot = document.createElement('div');
            dot.className = 'mort-dot';
            dot.style.background = tile.group ? GROUP_COLORS[tile.group] : '#888';
            row.appendChild(dot);
            var nm = document.createElement('span');
            nm.className = 'mort-name';
            nm.textContent = tile.name;
            row.appendChild(nm);
            var st = document.createElement('span');
            st.className = 'mort-status';
            st.textContent = ts.mortgaged ? 'GADAI' : (ts.houses > 0 ? ts.houses + ' bangunan' : '');
            row.appendChild(st);
            var btn = document.createElement('button');
            btn.className = 'mort-btn ' + (ts.mortgaged ? 'unmortgage' : 'mortgage');
            if (ts.mortgaged) {
                var cost = Math.floor(tile.price / 2 * 1.1);
                btn.textContent = 'Tebus (' + fmtRp(cost) + ')';
                btn.disabled = cur().money < cost || ts.houses > 0;
                btn.addEventListener('click', function () { unmortgage(tid); showMortgageModal(); updateHUD(); });
            } else {
                btn.disabled = ts.houses > 0;
                btn.textContent = 'Gadai (' + fmtRp(Math.floor(tile.price / 2)) + ')';
                btn.addEventListener('click', function () { mortgage(tid); showMortgageModal(); updateHUD(); });
            }
            row.appendChild(btn);
            wrap.appendChild(row);
        });
        document.getElementById('mort-modal').style.display = 'flex';
    }
    function hideMortgageModal() { document.getElementById('mort-modal').style.display = 'none'; }
    function mortgage(tid) { var tile = TILES[tid]; var val = Math.floor(tile.price / 2); state.tileState[tid].mortgaged = true; cur().money += val; log(cur().name + ' gadai ' + tile.name + ' (+' + fmtRp(val) + ')'); }
    function unmortgage(tid) { var tile = TILES[tid]; var cost = Math.floor(tile.price / 2 * 1.1); state.tileState[tid].mortgaged = false; cur().money -= cost; log(cur().name + ' tebus ' + tile.name + ' (-' + fmtRp(cost) + ')'); }

    function startAuction() {
        var tileIdx = state.pendingTile;
        hidePropModal();
        state.phase = 'AUCTION';
        state.pendingAuction = { tileIdx: tileIdx, highBid: 0, highBidder: -1, currentBidder: (state.curIdx + 1) % state.players.length, passed: {}, remaining: activePlayers().length };
        document.getElementById('auction-prop-name').textContent = TILES[tileIdx].name;
        updateAuctionUI();
        document.getElementById('auction-modal').style.display = 'flex';
    }
    function updateAuctionUI() { var a = state.pendingAuction; if (!a) return; document.getElementById('auction-high-bid').textContent = fmtRp(a.highBid); document.getElementById('auction-high-bidder').textContent = a.highBidder >= 0 ? state.players[a.highBidder].name : '-'; document.getElementById('auction-turn-label').textContent = 'Giliran: ' + state.players[a.currentBidder].name; document.getElementById('auction-input').min = a.highBid + 100; document.getElementById('auction-input').value = a.highBid + 100; }
    function auctionBid() { var a = state.pendingAuction; if (!a) return; var bid = parseInt(document.getElementById('auction-input').value, 10) || 0; var p = state.players[a.currentBidder]; if (bid <= a.highBid) { showMsg('Tawaran harus lebih tinggi dari ' + fmtRp(a.highBid)); return; } if (bid > p.money) { showMsg('Uang tidak cukup!'); return; } a.highBid = bid; a.highBidder = a.currentBidder; advanceAuction(); }
    function auctionPass() { var a = state.pendingAuction; if (!a) return; a.passed[a.currentBidder] = true; a.remaining--; advanceAuction(); }
    function advanceAuction() { var a = state.pendingAuction; if (!a) return; if (a.remaining <= 0) { log('Lelang berakhir tanpa penawar.'); hideAuctionModal(); afterAction(); return; } if (a.remaining <= 1 && a.highBidder >= 0) { var winner = state.players[a.highBidder]; var tile = TILES[a.tileIdx]; winner.money -= a.highBid; winner.properties.push(a.tileIdx); state.tileState[a.tileIdx].owner = a.highBidder; log(winner.name + ' memenangkan lelang ' + tile.name + ' seharga ' + fmtRp(a.highBid)); hideAuctionModal(); afterAction(); return; } do { a.currentBidder = (a.currentBidder + 1) % state.players.length; } while (a.passed[a.currentBidder] || state.players[a.currentBidder].bankrupt); updateAuctionUI(); }
    function hideAuctionModal() { document.getElementById('auction-modal').style.display = 'none'; state.pendingAuction = null; }

    function showTradeModal() {
        state.phase = 'TRADE';
        var sel = document.getElementById('trade-partner');
        sel.innerHTML = '';
        state.players.forEach(function (p, i) {
            if (i !== state.curIdx && !p.bankrupt) {
                var opt = document.createElement('option');
                opt.value = i; opt.textContent = p.name;
                sel.appendChild(opt);
            }
        });
        document.getElementById('trade-left-name').textContent = cur().name;
        document.getElementById('trade-left-cash').value = 0;
        document.getElementById('trade-right-cash').value = 0;
        buildTradeLeft(); buildTradeRight();
        document.getElementById('trade-modal').style.display = 'flex';
    }
    function hideTradeModal() { document.getElementById('trade-modal').style.display = 'none'; state.phase = 'ACTION'; }
    function buildTradeLeft() { var wrap = document.getElementById('trade-left-props'); wrap.innerHTML = ''; cur().properties.forEach(function (tid) { var tile = TILES[tid]; var row = document.createElement('div'); row.className = 'trade-prop-row'; var cb = document.createElement('input'); cb.type = 'checkbox'; cb.value = tid; cb.dataset.side = 'left'; row.appendChild(cb); var dot = document.createElement('div'); dot.className = 'trade-prop-dot'; dot.style.background = tile.group ? GROUP_COLORS[tile.group] : '#888'; row.appendChild(dot); var nm = document.createElement('span'); nm.textContent = tile.name; nm.style.fontSize = '13px'; row.appendChild(nm); wrap.appendChild(row); }); }
    function buildTradeRight() { var pi = parseInt(document.getElementById('trade-partner').value, 10); if (isNaN(pi)) return; var wrap = document.getElementById('trade-right-props'); wrap.innerHTML = ''; state.players[pi].properties.forEach(function (tid) { var tile = TILES[tid]; var row = document.createElement('div'); row.className = 'trade-prop-row'; var cb = document.createElement('input'); cb.type = 'checkbox'; cb.value = tid; cb.dataset.side = 'right'; row.appendChild(cb); var dot = document.createElement('div'); dot.className = 'trade-prop-dot'; dot.style.background = tile.group ? GROUP_COLORS[tile.group] : '#888'; row.appendChild(dot); var nm = document.createElement('span'); nm.textContent = tile.name; nm.style.fontSize = '13px'; row.appendChild(nm); wrap.appendChild(row); }); }
    function executeTrade() { var pi = parseInt(document.getElementById('trade-partner').value, 10); if (isNaN(pi)) return; var leftProps = [], rightProps = []; document.querySelectorAll('#trade-left-props input:checked').forEach(function (cb) { leftProps.push(parseInt(cb.value, 10)); }); document.querySelectorAll('#trade-right-props input:checked').forEach(function (cb) { rightProps.push(parseInt(cb.value, 10)); }); var leftCash = parseInt(document.getElementById('trade-left-cash').value, 10) || 0; var rightCash = parseInt(document.getElementById('trade-right-cash').value, 10) || 0; if (leftCash > cur().money || rightCash > state.players[pi].money) { showMsg('Salah satu pihak tidak punya uang cukup!'); return; } var me = cur(), partner = state.players[pi]; leftProps.forEach(function (tid) { me.properties = me.properties.filter(function (x) { return x !== tid; }); partner.properties.push(tid); state.tileState[tid].owner = pi; }); rightProps.forEach(function (tid) { partner.properties = partner.properties.filter(function (x) { return x !== tid; }); me.properties.push(tid); state.tileState[tid].owner = state.curIdx; }); me.money -= leftCash; me.money += rightCash; partner.money += leftCash; partner.money -= rightCash; log('Tukar: ' + me.name + ' ↔ ' + partner.name); hideTradeModal(); updateHUD(); }

    function checkBankrupt(pi) {
        var p = state.players[pi];
        if (p.money >= 0) return false;

        /* Sell all houses automatically first */
        p.properties.forEach(function (tid) {
            var ts = state.tileState[tid];
            while (ts.houses > 0 && p.money < 0) {
                var tile = TILES[tid];
                p.money += Math.floor(GROUP_HOUSE_COST[tile.group] / 2);
                ts.houses--;
                BoardRenderer.addBuildings(tid, ts.houses);
            }
        });

        /* Mortgage any free property */
        p.properties.forEach(function (tid) {
            if (p.money < 0 && !state.tileState[tid].mortgaged && state.tileState[tid].houses === 0) {
                var tile = TILES[tid];
                p.money += Math.floor(tile.price / 2);
                state.tileState[tid].mortgaged = true;
            }
        });

        if (p.money >= 0) { updateHUD(); return false; }

        declareBankrupt(pi, -1);
        return true;
    }

    function declareBankrupt(pi, creditorIdx) {
        var p = state.players[pi];
        p.bankrupt = true;
        log(p.name + ' bangkrut!');
        p.properties.forEach(function (tid) {
            if (creditorIdx >= 0 && creditorIdx !== pi) {
                state.tileState[tid].owner = creditorIdx;
                state.players[creditorIdx].properties.push(tid);
            } else {
                state.tileState[tid].owner = -1;
                state.tileState[tid].houses = 0;
                state.tileState[tid].mortgaged = false;
            }
            BoardRenderer.removeBuildings(tid);
        });
        p.properties = [];
        p.money = 0;

        var alive = state.players.filter(function (pl) { return !pl.bankrupt; });
        if (alive.length === 1) {
            showGameOver(alive[0]);
            return;
        }
        if (pi === state.curIdx) endTurn();
        updateHUD();
    }

    function showGameOver(winner) {
        state.phase = 'GAMEOVER';
        document.getElementById('winner-name').textContent = winner.name;
        document.getElementById('over-modal').style.display = 'flex';
        sfxWin();
    }

    function showPropertyDeed(tileIdx, mode, rent) {
        var tile = TILES[tileIdx];
        state.pendingTile = tileIdx;
        state.pendingRent = rent || 0;
        var band = document.getElementById('deed-band');
        band.style.background = tile.group ? GROUP_COLORS[tile.group] : '#888';
        document.getElementById('deed-name').textContent = tile.name;
        document.getElementById('deed-sub').textContent = tile.sub || (tile.group ? tile.group : '');
        document.getElementById('deed-price').textContent = tile.price ? ('Harga: ' + fmtRp(tile.price)) : '';

        var tbl = document.getElementById('deed-rent-table');
        if (tile.rent) {
            var labels = ['Tanpa rumah', '1 Rumah', '2 Rumah', '3 Rumah', '4 Rumah', '1 Hotel'];
            tbl.innerHTML = '<table style="width:100%"><tr><td>Tingkat Sewa</td><td style="text-align:right">Rp</td></tr>' + tile.rent.map(function (r, i) { return '<tr><td>' + labels[i] + '</td><td style="text-align:right">' + r.toLocaleString('id-ID') + '</td></tr>'; }).join('') + '</table>';
        } else if (tile.type === 'railroad') {
            tbl.innerHTML = '<table style="width:100%"><tr><td>1 kereta</td><td>Rp 25</td></tr><tr><td>2 kereta</td><td>Rp 50</td></tr><tr><td>3 kereta</td><td>Rp 100</td></tr><tr><td>4 kereta</td><td>Rp 200</td></tr></table>';
        } else if (tile.type === 'utility') {
            tbl.innerHTML = '<p style="font-size:13px">1 utilitas: 4× total dadu<br>2 utilitas: 10× total dadu</p>';
        } else {
            tbl.innerHTML = '';
        }

        hide(['deed-buy', 'deed-auction', 'deed-pay', 'deed-ok']);
        if (mode === 'buy') {
            show(['deed-buy', 'deed-auction']);
            document.getElementById('deed-buy').disabled = cur().money < tile.price;
        } else if (mode === 'pay') {
            show(['deed-pay']);
            document.getElementById('deed-pay').textContent = 'BAYAR SEWA ' + fmtRp(rent);
        } else {
            show(['deed-ok']);
        }
        document.getElementById('prop-modal').style.display = 'flex';
    }
    function hidePropModal() { document.getElementById('prop-modal').style.display = 'none'; }

    function showCardModal(card, type) {
        var badge = document.getElementById('card-type-badge');
        badge.textContent = type === 'chance' ? 'Keberuntungan' : 'Kas Umum';
        badge.className = type === 'chance' ? 'chance' : 'community';
        document.getElementById('card-text').textContent = card.text;
        document.getElementById('card-modal').style.display = 'flex';
    }
    function hideCardModal() { document.getElementById('card-modal').style.display = 'none'; }

    function showMsg(text) { document.getElementById('msg-text').textContent = text; document.getElementById('msg-modal').style.display = 'flex'; }
    function hideMsgModal() { document.getElementById('msg-modal').style.display = 'none'; }

    function updateHUD() {
        try {
            var p = cur();
            var hdr = document.getElementById('hud-header');
            hdr.innerHTML = '<div class="pi-color" style="background:' + escapeHtml(p.color) + '"></div>' + '<div><div class="hud-pname">' + TOKENS[p.tokenIndex].emoji + ' ' + escapeHtml(p.name) + '</div>' + '<div class="hud-ptoken">' + TOKENS[p.tokenIndex].name + '</div></div>';
            document.getElementById('hud-balance').textContent = fmtRp(p.money);
            document.getElementById('turn-name').textContent = escapeHtml(p.name);

            var pl = document.getElementById('players-list');
            pl.innerHTML = '';
            state.players.forEach(function (op, i) {
                var div = document.createElement('div');
                div.className = 'pl-item' + (i === state.curIdx ? ' current' : '') + (op.bankrupt ? ' bankrupt' : '');
                div.innerHTML = '<div class="pl-dot" style="background:' + escapeHtml(op.color) + '" aria-hidden="true"></div>' + '<div class="pl-info"><div class="pl-name">' + TOKENS[op.tokenIndex].emoji + ' ' + escapeHtml(op.name) + '</div>' + '<div class="pl-bal">' + fmtRp(op.money) + '</div>' + '<div class="pl-props" aria-label="Properti milik ' + escapeHtml(op.name) + '">' + op.properties.map(function (tid) { var t = TILES[tid]; return '<div class="pl-prop-dot" style="background:' + (t.group ? escapeHtml(GROUP_COLORS[t.group]) : '#888') + '" title="' + escapeHtml(t.name) + '" aria-label="' + escapeHtml(t.name) + '"></div>'; }).join('') + '</div></div>';
                pl.appendChild(div);
            });
            updateDiceDisplay(state.dice[0] || 1, state.dice[1] || 1);
        } catch (e) {
            console.error('Error updating HUD:', e);
        }
    }

    function updateDiceDisplay(d1, d2) { var faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']; document.getElementById('die1-box').textContent = faces[d1 - 1]; document.getElementById('die2-box').textContent = faces[d2 - 1]; }

    function log(text) { var el = document.getElementById('log-content'); var line = document.createElement('div'); line.className = 'log-line'; line.textContent = text; el.appendChild(line); el.scrollTop = el.scrollHeight; }

    return api;
})();

window.addEventListener('DOMContentLoaded', function () {
    try {
        Game.init();
    } catch (e) {
        console.error('Failed to initialize game:', e);
        var errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'display:flex;justify-content:center;align-items:center;height:100%;background:#0a0e14;color:#f0ece4;';
        var innerDiv = document.createElement('div');
        innerDiv.style.textAlign = 'center';
        var title = document.createElement('h1');
        title.textContent = 'Monopoly Indonesia 3D';
        var msg = document.createElement('p');
        msg.textContent = 'Terjadi kesalahan memuat permainan. Muat ulang halaman.';
        innerDiv.appendChild(title);
        innerDiv.appendChild(msg);
        errorDiv.appendChild(innerDiv);
        document.body.innerHTML = '';
        document.body.appendChild(errorDiv);
    }
});
