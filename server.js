const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cờ Tỷ Phú Việt Nam - Meme Edition</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background: #0f172a; color: white; display: flex; flex-direction: column; align-items: center; padding: 10px; min-height: 100vh; overflow-x: hidden; }
        h1 { margin-bottom: 8px; color: #38bdf8; font-size: 22px; text-transform: uppercase; text-shadow: 0 0 10px rgba(56,189,248,0.5); }
        
        #login-box { margin-bottom: 12px; display: flex; gap: 8px; z-index: 10; }
        input { padding: 8px 12px; border-radius: 6px; border: 1px solid #334155; outline: none; background: #1e293b; color: white; font-size: 13px; }
        button { padding: 8px 16px; border-radius: 6px; border: none; background: #10b981; color: white; font-weight: bold; cursor: pointer; transition: 0.2s; }
        button:hover { transform: scale(1.05); }
        button:disabled { background: #64748b; cursor: not-allowed; transform: none; }

        .game-layout { display: flex; gap: 15px; margin-top: 5px; justify-content: center; align-items: flex-start; }
        
        .board { display: grid; grid-template-columns: repeat(11, 62px); grid-template-rows: repeat(11, 62px); gap: 2px; background: #1e293b; padding: 4px; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); position: relative; }
        .tile { background: #f8fafc; color: #0f172a; border-radius: 4px; font-size: 8px; font-weight: bold; display: flex; flex-direction: column; justify-content: space-between; position: relative; text-align: center; overflow: hidden; padding: 1px; }
        .tile-header { height: 12px; width: 100%; color: white; font-size: 8px; display: flex; align-items: center; justify-content: center; }
        .tile-name { margin-top: 1px; line-height: 1; font-size: 8px; }
        .tile-build { font-size: 8px; color: #d97706; }
        .tile-owner { font-size: 8px; }

        .players-container { display: flex; gap: 2px; position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%); }
        .p-dot { width: 10px; height: 10px; border-radius: 50%; border: 1px solid white; transition: all 0.3s ease; }

        .center-area { grid-column: 2 / 11; grid-row: 2 / 11; background: #0f172a; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; border-radius: 6px; padding: 10px; text-align: center; border: 1px solid #334155; position: relative; }

        .info-panel { width: 280px; background: #1e293b; padding: 12px; border-radius: 8px; display: flex; flex-direction: column; gap: 10px; }
        .player-card { background: #0f172a; padding: 8px; border-radius: 4px; display: flex; flex-direction: column; gap: 2px; border-left: 4px solid transparent; font-size: 11px; }
        .log-box { height: 260px; background: #020617; border-radius: 4px; padding: 8px; font-size: 10px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; color: #cbd5e1; border: 1px solid #334155; }
        
        /* Modal & Popup Overlay */
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.75); display: none; justify-content: center; align-items: center; z-index: 999; }
        .modal-box { background: #1e293b; border: 2px solid #38bdf8; padding: 20px; border-radius: 12px; text-align: center; max-width: 350px; width: 90%; box-shadow: 0 0 20px rgba(56,189,248,0.4); animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .modal-title { font-size: 18px; color: #facc15; margin-bottom: 10px; font-weight: bold; }
        .modal-desc { font-size: 14px; margin-bottom: 15px; color: #f1f5f9; line-height: 1.4; }
        .modal-btns { display: flex; justify-content: center; gap: 10px; }
        .btn-cancel { background: #ef4444; }
        .btn-cancel:hover { background: #dc2626; }

        /* Meme Banners */
        .meme-banner { position: fixed; top: 20%; left: 50%; transform: translate(-50%, -50%); background: rgba(225, 29, 72, 0.95); border: 3px solid #fecdd3; color: white; padding: 20px 40px; border-radius: 15px; font-size: 24px; font-weight: bold; text-align: center; z-index: 1000; display: none; box-shadow: 0 0 30px rgba(225, 29, 72, 0.8); animation: shake 0.5s ease-in-out infinite; }

        @keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes shake { 0%, 100% { transform: translate(-50%, -50%) rotate(0deg); } 25% { transform: translate(-52%, -48%) rotate(-3deg); } 75% { transform: translate(-48%, -52%) rotate(3deg); } }
    </style>
</head>
<body>

    <h1>CỜ TỶ PHÚ VIỆT NAM (MEME EDITION) 🎲</h1>

    <div id="login-box">
        <input type="text" id="nameInput" placeholder="Nhập tên người chơi...">
        <button onclick="joinGame()">VÀO PHÒNG GAME</button>
    </div>

    <div class="game-layout">
        <div class="board" id="board">
            <div class="center-area">
                <div id="turnStatus" style="font-size: 13px; font-weight: bold; color: #38bdf8;">Nhập tên để tham gia phòng</div>
                <button id="rollBtn" onclick="rollDice()" disabled style="font-size: 14px; padding: 10px 20px;">ĐỔ XÚC XẮC 🎲</button>
                <button id="bailBtn" onclick="payBail()" disabled class="btn-pay" style="display:none; background:#eab308;">RA TÙ ($50)</button>
            </div>
        </div>

        <div class="info-panel">
            <h3 style="font-size: 13px;">Người Chơi & Tài Sản</h3>
            <div id="playerList">Chờ tham gia...</div>
            <h3 style="font-size: 13px;">Nhật Ký Trận Đấu</h3>
            <div class="log-box" id="logBox"></div>
        </div>
    </div>

    <!-- Modal Lựa Chọn Mua/Xây Nhà -->
    <div class="modal-overlay" id="actionModal">
        <div class="modal-box">
            <div class="modal-title" id="modalTitle">MUA ĐẤT?</div>
            <div class="modal-desc" id="modalDesc">Bạn có muốn mua ô đất này với giá $100?</div>
            <div class="modal-btns">
                <button id="modalYesBtn">ĐỒNG Ý 👍</button>
                <button class="btn-cancel" onclick="closeModal()">BỎ QUA ❌</button>
            </div>
        </div>
    </div>

    <!-- Modal Bốc Thẻ Cơ Hội / Khí Vận -->
    <div class="modal-overlay" id="cardModal">
        <div class="modal-box" style="border-color: #a855f7;">
            <div class="modal-title" style="color: #c084fc;" id="cardModalTitle">❓ THẺ CƠ HỘI</div>
            <div class="modal-desc" id="cardModalDesc">Nhấn nút bên dưới để rút lá thẻ định mệnh!</div>
            <button id="drawCardBtn" style="background:#a855f7;">RÚT THẺ NGAY 🃏</button>
        </div>
    </div>

    <!-- Meme Banner Pop-up -->
    <div class="meme-banner" id="memeBanner">
        <div id="memeText">💸 NỘP TIỀN RA ĐÂY KHÔNG NÓ MẮT ĐẦU CẮT! 💸</div>
    </div>

    <script>
        const socket = io();
        let myId = "";

        const boardData = [
            { name: "BẮT ĐẦU", type: "start", color: "#10b981" },
            { name: "Phố Cổ HN", price: 60, baseRent: 10, houseCost: 50, color: "#78350f", type: "property" },
            { name: "KHÍ VẬN 🎁", type: "community", color: "#38bdf8" },
            { name: "Hàng Bạc", price: 60, baseRent: 12, houseCost: 50, color: "#78350f", type: "property" },
            { name: "Thuế TN", type: "tax", price: 200 },
            { name: "Ga Hà Nội", price: 200, baseRent: 25, type: "station" },
            { name: "Bến Thành", price: 100, baseRent: 20, houseCost: 50, color: "#06b6d4", type: "property" },
            { name: "CƠ HỘI ❓", type: "chance", color: "#8b5cf6" },
            { name: "Bùi Viện", price: 100, baseRent: 20, houseCost: 50, color: "#06b6d4", type: "property" },
            { name: "Nguyễn Huệ", price: 120, baseRent: 25, houseCost: 50, color: "#06b6d4", type: "property" },
            { name: "VÀO TÙ 🚔", type: "jail", color: "#64748b" },
            { name: "Cầu Rồng", price: 140, baseRent: 30, houseCost: 100, color: "#ec4899", type: "property" },
            { name: "Cty Điện", price: 150, baseRent: 15, type: "utility" },
            { name: "Bà Nà Hills", price: 140, baseRent: 30, houseCost: 100, color: "#ec4899", type: "property" },
            { name: "Hội An", price: 160, baseRent: 35, houseCost: 100, color: "#ec4899", type: "property" },
            { name: "Ga Đà Nẵng", price: 200, baseRent: 25, type: "station" },
            { name: "Đà Lạt", price: 180, baseRent: 40, houseCost: 100, color: "#f97316", type: "property" },
            { name: "KHÍ VẬN 🎁", type: "community", color: "#38bdf8" },
            { name: "Nha Trang", price: 180, baseRent: 40, houseCost: 100, color: "#f97316", type: "property" },
            { name: "Phú Quốc", price: 200, baseRent: 45, houseCost: 100, color: "#f97316", type: "property" },
            { name: "BÃI BIỂN 🏖️", type: "park", color: "#10b981" },
            { name: "Vịnh Hạ Long", price: 220, baseRent: 50, houseCost: 150, color: "#ef4444", type: "property" },
            { name: "CƠ HỘI ❓", type: "chance", color: "#8b5cf6" },
            { name: "Sapa", price: 220, baseRent: 50, houseCost: 150, color: "#ef4444", type: "property" },
            { name: "Ninh Bình", price: 240, baseRent: 55, houseCost: 150, color: "#ef4444", type: "property" },
            { name: "Ga Sài Gòn", price: 200, baseRent: 25, type: "station" },
            { name: "Cố Đô Huế", price: 260, baseRent: 60, houseCost: 150, color: "#eab308", type: "property" },
            { name: "Phong Nha", price: 260, baseRent: 60, houseCost: 150, color: "#eab308", type: "property" },
            { name: "Cty Nước", price: 150, baseRent: 15, type: "utility" },
            { name: "Mũi Né", price: 280, baseRent: 65, houseCost: 150, color: "#eab308", type: "property" },
            { name: "VÀO TÙ 🚓", type: "go_jail", color: "#dc2626" },
            { name: "Cần Thơ", price: 300, baseRent: 70, houseCost: 200, color: "#22c55e", type: "property" },
            { name: "Vũng Tàu", price: 300, baseRent: 70, houseCost: 200, color: "#22c55e", type: "property" },
            { name: "KHÍ VẬN 🎁", type: "community", color: "#38bdf8" },
            { name: "Quy Nhơn", price: 320, baseRent: 75, houseCost: 200, color: "#22c55e", type: "property" },
            { name: "Ga Huế", price: 200, baseRent: 25, type: "station" },
            { name: "CƠ HỘI ❓", type: "chance", color: "#8b5cf6" },
            { name: "Landmark 81", price: 350, baseRent: 90, houseCost: 200, color: "#1d4ed8", type: "property" },
            { name: "Thuế Xa Xỉ", type: "tax", price: 100 },
            { name: "Bitexco", price: 400, baseRent: 120, houseCost: 200, color: "#1d4ed8", type: "property" }
        ];

        const gridPositions = [
            {r:11,c:11},{r:11,c:10},{r:11,c:9},{r:11,c:8},{r:11,c:7},{r:11,c:6},{r:11,c:5},{r:11,c:4},{r:11,c:3},{r:11,c:2},
            {r:11,c:1},{r:10,c:1},{r:9,c:1},{r:8,c:1},{r:7,c:1},{r:6,c:1},{r:5,c:1},{r:4,c:1},{r:3,c:1},{r:2,c:1},
            {r:1,c:1},{r:1,c:2},{r:1,c:3},{r:1,c:4},{r:1,c:5},{r:1,c:6},{r:1,c:7},{r:1,c:8},{r:1,c:9},{r:1,c:10},
            {r:1,c:11},{r:2,c:11},{r:3,c:11},{r:4,c:11},{r:5,c:11},{r:6,c:11},{r:7,c:11},{r:8,c:11},{r:9,c:11},{r:10,c:11}
        ];

        const boardEl = document.getElementById('board');
        gridPositions.forEach((pos, idx) => {
            const data = boardData[idx];
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.style.gridRow = pos.r;
            tile.style.gridColumn = pos.c;

            let headerHtml = data.color ? \`<div class="tile-header" style="background:\${data.color}">\${data.price ? '$' + data.price : ''}</div>\` : '';
            
            tile.innerHTML = \`
                \${headerHtml}
                <div class="tile-name">\${data.name}</div>
                <div class="tile-build" id="build-\${idx}"></div>
                <div class="tile-owner" id="owner-\${idx}"></div>
                <div class="players-container" id="tile-p-\${idx}"></div>
            \`;

            boardEl.appendChild(tile);
        });

        socket.on('connect', () => { myId = socket.id; });

        function joinGame() {
            const name = document.getElementById('nameInput').value.trim();
            if (name) {
                socket.emit('joinGame', name);
                document.getElementById('login-box').style.display = 'none';
            }
        }

        function rollDice() { socket.emit('rollDice'); }
        function payBail() { socket.emit('payBail'); }
        function closeModal() { document.getElementById('actionModal').style.display = 'none'; }

        function showMemeBanner(text, duration = 3000) {
            const banner = document.getElementById('memeBanner');
            document.getElementById('memeText').innerText = text;
            banner.style.display = 'block';
            setTimeout(() => { banner.style.display = 'none'; }, duration);
        }

        socket.on('promptBuyProperty', (data) => {
            if (socket.id === data.playerId) {
                const modal = document.getElementById('actionModal');
                document.getElementById('modalTitle').innerText = "🏛️ MUA BẤT ĐỘNG SẢN";
                document.getElementById('modalDesc').innerText = \`Bạn có muốn đầu tư mua \${data.tileName} với giá $\${data.price} không?\`;
                const yesBtn = document.getElementById('modalYesBtn');
                yesBtn.onclick = () => {
                    socket.emit('buyPropertyConfirm', { pos: data.pos });
                    closeModal();
                };
                modal.style.display = 'flex';
            }
        });

        socket.on('promptBuildHouse', (data) => {
            if (socket.id === data.playerId) {
                const modal = document.getElementById('actionModal');
                const buildName = data.currentHouses === 4 ? "Khách Sạn 🏨" : \`Nhà thứ \${data.currentHouses + 1} 🏠\`;
                document.getElementById('modalTitle').innerText = "🔨 NÂNG CẤP BẤT ĐỘNG SẢN";
                document.getElementById('modalDesc').innerText = \`Bạn có muốn xây thêm \${buildName} tại \${data.tileName} với giá $\${data.cost} để tăng tiền thuê đất không?\`;
                const yesBtn = document.getElementById('modalYesBtn');
                yesBtn.onclick = () => {
                    socket.emit('buildHouseConfirm', { pos: data.pos });
                    closeModal();
                };
                modal.style.display = 'flex';
            }
        });

        socket.on('promptDrawCard', (data) => {
            if (socket.id === data.playerId) {
                const modal = document.getElementById('cardModal');
                document.getElementById('cardModalTitle').innerText = data.cardType === 'chance' ? "❓ THẺ CƠ HỘI" : "🎁 THẺ KHÍ VẬN";
                document.getElementById('cardModalDesc').innerText = "Lá thẻ định mệnh đang chờ bạn bốc. Bấm để xem vận may!";
                const drawBtn = document.getElementById('drawCardBtn');
                drawBtn.onclick = () => {
                    socket.emit('drawCardConfirm', { cardType: data.cardType });
                    modal.style.display = 'none';
                };
                modal.style.display = 'flex';
            }
        });

        socket.on('triggerMeme', (data) => {
            if (socket.id === data.playerId) {
                showMemeBanner(data.message, 3500);
            }
        });

        socket.on('updateGameState', (data) => {
            gridPositions.forEach((_, idx) => {
                document.getElementById(\`tile-p-\${idx}\`).innerHTML = '';
                const ownerEl = document.getElementById(\`owner-\${idx}\`);
                const buildEl = document.getElementById(\`build-\${idx}\`);
                
                if (data.boardState && data.boardState[idx]) {
                    const cell = data.boardState[idx];
                    if (cell.owner && data.players[cell.owner]) {
                        ownerEl.innerText = \`👑\${data.players[cell.owner].name.substring(0,4)}\`;
                        ownerEl.style.color = data.players[cell.owner].color;
                    }
                    if (cell.houses > 0) {
                        buildEl.innerText = cell.houses === 5 ? '🏨' : '🏠'.repeat(cell.houses);
                    } else {
                        buildEl.innerText = '';
                    }
                }
            });

            let listHtml = '';
            data.playerOrder.forEach(id => {
                const p = data.players[id];
                const dot = document.createElement('div');
                dot.className = 'p-dot';
                dot.style.backgroundColor = p.color;
                document.getElementById(\`tile-p-\${p.pos}\`).appendChild(dot);

                let jailStatus = p.inJail ? ' 🚔' : '';

                listHtml += \`
                    <div class="player-card" style="border-left-color: \${p.color}">
                        <div style="display:flex; justify-content:space-between;">
                            <span style="color:\${p.color}"><b>\${p.name}</b>\${jailStatus}</span>
                            <span style="color:#10b981; font-weight:bold;">$\${p.money}</span>
                        </div>
                    </div>
                \`;
            });
            document.getElementById('playerList').innerHTML = listHtml;

            const isMyTurn = data.currentTurn === myId;
            const me = data.players[myId];

            document.getElementById('rollBtn').disabled = !isMyTurn;
            
            const bailBtn = document.getElementById('bailBtn');
            if (isMyTurn && me && me.inJail && me.money >= 50) {
                bailBtn.style.display = 'inline-block';
                bailBtn.disabled = false;
            } else {
                bailBtn.style.display = 'none';
            }

            if (data.currentTurn && data.players[data.currentTurn]) {
                document.getElementById('turnStatus').innerText = isMyTurn ? 
                    "👉 ĐẾN LƯỢT BẠN ĐỔ XÚC XẮC!" : \`Chờ lượt của: \${data.players[data.currentTurn].name}\`;
            }

            if (data.log) {
                const logBox = document.getElementById('logBox');
                const logEntry = document.createElement('div');
                logEntry.innerText = data.log;
                logBox.appendChild(logEntry);
                logBox.scrollTop = logBox.scrollHeight;
            }
        });
    </script>
</body>
</html>
`;

app.get('/', (req, res) => { res.send(htmlContent); });

let players = {};
let playerOrder = [];
let currentTurnIndex = 0;
let boardState = {};

const properties = {
    1: { name: "Phố Cổ HN", price: 60, baseRent: 10, houseCost: 50 },
    3: { name: "Hàng Bạc", price: 60, baseRent: 12, houseCost: 50 },
    5: { name: "Ga Hà Nội", price: 200, baseRent: 25, type: "station" },
    6: { name: "Bến Thành", price: 100, baseRent: 20, houseCost: 50 },
    8: { name: "Bùi Viện", price: 100, baseRent: 20, houseCost: 50 },
    9: { name: "Nguyễn Huệ", price: 120, baseRent: 25, houseCost: 50 },
    11: { name: "Cầu Rồng", price: 140, baseRent: 30, houseCost: 100 },
    12: { name: "Cty Điện", price: 150, baseRent: 15, type: "utility" },
    13: { name: "Bà Nà Hills", price: 140, baseRent: 30, houseCost: 100 },
    14: { name: "Hội An", price: 160, baseRent: 35, houseCost: 100 },
    15: { name: "Ga Đà Nẵng", price: 200, baseRent: 25, type: "station" },
    16: { name: "Đà Lạt", price: 180, baseRent: 40, houseCost: 100 },
    18: { name: "Nha Trang", price: 180, baseRent: 40, houseCost: 100 },
    19: { name: "Phú Quốc", price: 200, baseRent: 45, houseCost: 100 },
    21: { name: "Vịnh Hạ Long", price: 220, baseRent: 50, houseCost: 150 },
    23: { name: "Sapa", price: 220, baseRent: 50, houseCost: 150 },
    24: { name: "Ninh Bình", price: 240, baseRent: 55, houseCost: 150 },
    25: { name: "Ga Sài Gòn", price: 200, baseRent: 25, type: "station" },
    26: { name: "Cố Đô Huế", price: 260, baseRent: 60, houseCost: 150 },
    27: { name: "Phong Nha", price: 260, baseRent: 60, houseCost: 150 },
    28: { name: "Cty Nước", price: 150, baseRent: 15, type: "utility" },
    29: { name: "Mũi Né", price: 280, baseRent: 65, houseCost: 150 },
    31: { name: "Cần Thơ", price: 300, baseRent: 70, houseCost: 200 },
    32: { name: "Vũng Tàu", price: 300, baseRent: 70, houseCost: 200 },
    34: { name: "Quy Nhơn", price: 320, baseRent: 75, houseCost: 200 },
    35: { name: "Ga Huế", price: 200, baseRent: 25, type: "station" },
    37: { name: "Landmark 81", price: 350, baseRent: 90, houseCost: 200 },
    39: { name: "Bitexco", price: 400, baseRent: 120, houseCost: 200 }
};

const chanceCards = [
    { text: "Tiến thẳng đến ô BẮT ĐẦU (Nhận $200 🤑)", effect: (p) => { p.pos = 0; p.money += 200; } },
    { text: "Trúng số giải khuyến khích! Nhận $100 💸", effect: (p) => { p.money += 100; } },
    { text: "Chạy quá tốc độ bị công an phạt! Nộp $50 🚓", effect: (p) => { p.money -= 50; } },
    { text: "Bị cảnh sát bế đi tù ngay lập tức! 🚔", effect: (p) => { p.pos = 10; p.inJail = true; p.jailTurns = 0; } },
    { text: "Lùi lại 3 ô cho chừa cái tội đi nhanh! 🔄", effect: (p) => { p.pos = (p.pos - 3 + 40) % 40; } }
];

const communityCards = [
    { text: "Mừng sinh nhật bạn! Nhận $100 từ ngân hàng 🎂", effect: (p) => { p.money += 100; } },
    { text: "Sơ suất làm mất ví! Mất $50 😭", effect: (p) => { p.money -= 50; } },
    { text: "Được hoàn tiền thuế! Nhận $150 💰", effect: (p) => { p.money += 150; } },
    { text: "Đi nhậu trả tiền cho cả bàn! Nộp $100 🍻", effect: (p) => { p.money -= 100; } }
];

io.on('connection', (socket) => {
    socket.on('joinGame', (name) => {
        if (playerOrder.length < 4 && !players[socket.id]) {
            const playerColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];
            players[socket.id] = {
                id: socket.id,
                name: name || `Người chơi ${playerOrder.length + 1}`,
                color: playerColors[playerOrder.length],
                money: 1500,
                pos: 0,
                inJail: false,
                jailTurns: 0
            };
            playerOrder.push(socket.id);

            io.emit('updateGameState', {
                players: players,
                playerOrder: playerOrder,
                currentTurn: playerOrder[currentTurnIndex],
                boardState: boardState,
                log: `${players[socket.id].name} đã gia nhập bàn cờ!`
            });
        }
    });

    socket.on('payBail', () => {
        const player = players[socket.id];
        if (player && player.inJail && player.money >= 50 && playerOrder[currentTurnIndex] === socket.id) {
            player.money -= 50;
            player.inJail = false;
            player.jailTurns = 0;
            io.emit('updateGameState', {
                players: players,
                playerOrder: playerOrder,
                currentTurn: playerOrder[currentTurnIndex],
                boardState: boardState,
                log: `${player.name} đã đút lót $50 để ra tù!`
            });
        }
    });

    socket.on('rollDice', () => {
        if (playerOrder[currentTurnIndex] === socket.id) {
            const player = players[socket.id];

            if (player.inJail) {
                player.jailTurns++;
                if (player.jailTurns >= 3) {
                    player.inJail = false;
                    player.jailTurns = 0;
                } else {
                    currentTurnIndex = (currentTurnIndex + 1) % playerOrder.length;
                    io.emit('updateGameState', {
                        players: players,
                        playerOrder: playerOrder,
                        currentTurn: playerOrder[currentTurnIndex],
                        boardState: boardState,
                        log: `${player.name} vẫn đang bóc lịch trong tù (Lượt ${player.jailTurns}/3).`
                    });
                    return;
                }
            }

            const dice1 = Math.floor(Math.random() * 6) + 1;
            const dice2 = Math.floor(Math.random() * 6) + 1;
            const dice = dice1 + dice2;
            const oldPos = player.pos;
            player.pos = (player.pos + dice) % 40;

            let actionLog = `${player.name} đổ 🎲 (${dice1}+${dice2}=${dice}) -> đến ô ${player.pos}.`;

            if (player.pos < oldPos && player.pos !== 0) {
                player.money += 200;
                socket.emit('triggerMeme', { playerId: socket.id, message: "💰 VỪA QUA TRẠM! CỘNG NGAY $200 TIỀN LƯƠNG! 💰" });
            }

            if (properties[player.pos]) {
                const prop = properties[player.pos];
                if (!boardState[player.pos]) {
                    if (player.money >= prop.price) {
                        socket.emit('promptBuyProperty', { playerId: socket.id, pos: player.pos, tileName: prop.name, price: prop.price });
                    }
                } else if (boardState[player.pos].owner === socket.id) {
                    const cell = boardState[player.pos];
                    if (cell.houses < 5 && player.money >= prop.houseCost) {
                        socket.emit('promptBuildHouse', { playerId: socket.id, pos: player.pos, tileName: prop.name, currentHouses: cell.houses, cost: prop.houseCost });
                    }
                } else {
                    const cell = boardState[player.pos];
                    const owner = players[cell.owner];
                    if (owner) {
                        let currentRent = prop.baseRent * (cell.houses === 5 ? 8 : cell.houses + 1);
                        player.money -= currentRent;
                        owner.money += currentRent;
                        actionLog += ` Nộp $${currentRent} tiền thuê cho ${owner.name}.`;
                        socket.emit('triggerMeme', { playerId: socket.id, message: `💸 MẤT $${currentRent}! NỘP TIỀN THUÊ CHO ${owner.name.toUpperCase()} NGAY! 💸` });
                    }
                }
            } else if ([7, 22, 36].includes(player.pos)) {
                socket.emit('promptDrawCard', { playerId: socket.id, cardType: 'chance' });
            } else if ([2, 17, 33].includes(player.pos)) {
                socket.emit('promptDrawCard', { playerId: socket.id, cardType: 'community' });
            } else if (player.pos === 30) {
                player.pos = 10;
                player.inJail = true;
                player.jailTurns = 0;
                actionLog += ` Bị cảnh sát bế đi tù!`;
                socket.emit('triggerMeme', { playerId: socket.id, message: "🚔 BỊ CẢNH SÁT BẾ VÀO TÙ VÌ CỦA THIÊN TRẢ ĐỊA! 🚔" });
            } else if (player.pos === 4) {
                player.money -= 200;
                actionLog += ` Nộp thuế thu nhập $200.`;
            } else if (player.pos === 38) {
                player.money -= 100;
                actionLog += ` Nộp thuế xa xỉ $100.`;
            }

            currentTurnIndex = (currentTurnIndex + 1) % playerOrder.length;

            io.emit('updateGameState', {
                players: players,
                playerOrder: playerOrder,
                currentTurn: playerOrder[currentTurnIndex],
                boardState: boardState,
                log: actionLog
            });
        }
    });

    socket.on('buyPropertyConfirm', (data) => {
        const player = players[socket.id];
        const prop = properties[data.pos];
        if (player && prop && player.money >= prop.price && !boardState[data.pos]) {
            player.money -= prop.price;
            boardState[data.pos] = { owner: socket.id, houses: 0 };
            io.emit('updateGameState', {
                players: players,
                playerOrder: playerOrder,
                currentTurn: playerOrder[currentTurnIndex],
                boardState: boardState,
                log: `${player.name} đã vung tiền mua ${prop.name} với giá $${prop.price}!`
            });
        }
    });

    socket.on('buildHouseConfirm', (data) => {
        const player = players[socket.id];
        const prop = properties[data.pos];
        const cell = boardState[data.pos];
        if (player && prop && cell && cell.owner === socket.id && player.money >= prop.houseCost && cell.houses < 5) {
            player.money -= prop.houseCost;
            cell.houses++;
            const buildText = cell.houses === 5 ? "Khách Sạn 🏨" : `Nhà thứ ${cell.houses} 🏠`;
            io.emit('updateGameState', {
                players: players,
                playerOrder: playerOrder,
                currentTurn: playerOrder[currentTurnIndex],
                boardState: boardState,
                log: `${player.name} vừa xây thành công ${buildText} tại ${prop.name}!`
            });
        }
    });

    socket.on('drawCardConfirm', (data) => {
        const player = players[socket.id];
        if (player) {
            const deck = data.cardType === 'chance' ? chanceCards : communityCards;
            const card = deck[Math.floor(Math.random() * deck.length)];
            card.effect(player);
            
            socket.emit('triggerMeme', { playerId: socket.id, message: `🃏 BỐC THẺ: ${card.text}` });
            
            io.emit('updateGameState', {
                players: players,
                playerOrder: playerOrder,
                currentTurn: playerOrder[currentTurnIndex],
                boardState: boardState,
                log: `${player.name} bốc được thẻ: ${card.text}`
            });
        }
    });

    socket.on('disconnect', () => {
        if (players[socket.id]) {
            const name = players[socket.id].name;
            delete players[socket.id];
            playerOrder = playerOrder.filter(id => id !== socket.id);
            if (currentTurnIndex >= playerOrder.length) currentTurnIndex = 0;

            io.emit('updateGameState', {
                players: players,
                playerOrder: playerOrder,
                currentTurn: playerOrder[currentTurnIndex] || null,
                boardState: boardState,
                log: `${name} đã thoát bàn chơi.`
            });
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
