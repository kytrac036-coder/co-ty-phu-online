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
    <title>Cờ Tỷ Phú Việt Nam - Full Feature</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background: #0f172a; color: white; display: flex; flex-direction: column; align-items: center; padding: 15px; min-height: 100vh; }
        h1 { margin-bottom: 10px; color: #38bdf8; text-shadow: 0 0 10px rgba(56,189,248,0.3); font-size: 24px; }
        
        #login-box { margin-bottom: 15px; display: flex; gap: 10px; }
        input { padding: 10px 15px; border-radius: 6px; border: 1px solid #334155; outline: none; background: #1e293b; color: white; font-size: 14px; }
        button { padding: 10px 20px; border-radius: 6px; border: none; background: #10b981; color: white; font-weight: bold; cursor: pointer; transition: 0.2s; }
        button:hover { background: #059669; }
        button:disabled { background: #64748b; cursor: not-allowed; }

        .game-layout { display: flex; gap: 20px; margin-top: 5px; flex-wrap: wrap; justify-content: center; }
        
        .board { display: grid; grid-template-columns: repeat(6, 95px); grid-template-rows: repeat(6, 95px); gap: 4px; background: #334155; padding: 6px; border-radius: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .tile { background: #f8fafc; color: #0f172a; border-radius: 6px; font-size: 11px; font-weight: bold; display: flex; flex-direction: column; justify-content: space-between; position: relative; text-align: center; overflow: hidden; padding: 3px; }
        .tile-header { height: 18px; width: 100%; border-radius: 4px 4px 0 0; color: white; font-size: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; }
        .tile-name { margin-top: 2px; line-height: 1.1; font-size: 10px; }
        .tile-price { font-size: 9px; color: #047857; margin-bottom: 2px; }
        .tile-build { font-size: 10px; color: #d97706; }
        .tile-owner { font-size: 9px; font-weight: normal; }

        .players-container { display: flex; gap: 3px; position: absolute; bottom: 3px; left: 50%; transform: translateX(-50%); }
        .p-dot { width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5); }

        .center-area { grid-column: 2 / 6; grid-row: 2 / 6; background: #1e293b; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; border-radius: 8px; padding: 15px; text-align: center; }

        .info-panel { width: 320px; background: #1e293b; padding: 15px; border-radius: 10px; display: flex; flex-direction: column; gap: 12px; }
        .player-card { background: #0f172a; padding: 10px; border-radius: 6px; display: flex; flex-direction: column; gap: 4px; border-left: 4px solid transparent; }
        .log-box { height: 180px; background: #020617; border-radius: 6px; padding: 10px; font-size: 11px; overflow-y: auto; display: flex; flex-direction: column; gap: 5px; color: #cbd5e1; border: 1px solid #334155; }
        
        .action-btns { display: flex; gap: 8px; }
        .btn-pay { background: #eab308; }
        .btn-pay:hover { background: #ca8a04; }
    </style>
</head>
<body>

    <h1>CỜ TỶ PHÚ VIỆT NAM ONLINE</h1>

    <div id="login-box">
        <input type="text" id="nameInput" placeholder="Nhập tên người chơi...">
        <button onclick="joinGame()">VÀO PHÒNG GAME</button>
    </div>

    <div class="game-layout">
        <div class="board" id="board">
            <div class="center-area">
                <div id="turnStatus" style="font-size: 13px; font-weight: bold; color: #38bdf8;">Nhập tên để tham gia bàn chơi</div>
                <div id="cardNotice" style="font-size: 12px; color: #facc15; min-height: 18px;"></div>
                <div class="action-btns">
                    <button id="rollBtn" onclick="rollDice()" disabled>ĐỔ XÚC XẮC 🎲</button>
                    <button id="bailBtn" onclick="payBail()" disabled class="btn-pay" style="display:none;">RA TÙ ($50)</button>
                </div>
            </div>
        </div>

        <div class="info-panel">
            <h3 style="font-size: 14px;">Bảng Người Chơi</h3>
            <div id="playerList">Chờ người chơi...</div>
            <h3 style="font-size: 14px;">Nhật Ký Trận Đấu</h3>
            <div class="log-box" id="logBox"></div>
        </div>
    </div>

    <script>
        const socket = io();
        let myId = "";

        const boardData = [
            { name: "BẮT ĐẦU", type: "start", color: "#10b981" },
            { name: "Hồ Hoàn Kiếm", price: 100, baseRent: 20, color: "#ef4444", type: "property" },
            { name: "Phố Cổ Hà Nội", price: 120, baseRent: 25, color: "#ef4444", type: "property" },
            { name: "CƠ HỘI ❓", type: "chance", color: "#8b5cf6" },
            { name: "Chợ Bến Thành", price: 150, baseRent: 30, color: "#3b82f6", type: "property" },
            { name: "VÀO TÙ 🚔", type: "jail", color: "#64748b" },
            { name: "Phố Bùi Viện", price: 180, baseRent: 35, color: "#3b82f6", type: "property" },
            { name: "Cầu Rồng", price: 200, baseRent: 40, color: "#f59e0b", type: "property" },
            { name: "VẬN KHÍ 🎁", type: "chance", color: "#8b5cf6" },
            { name: "Vịnh Hạ Long", price: 220, baseRent: 45, color: "#f59e0b", type: "property" },
            { name: "BÃI BIỂN 🏖️", type: "park", color: "#06b6d4" },
            { name: "Phú Quốc", price: 260, baseRent: 55, color: "#10b981", type: "property" },
            { name: "Cố Đô Huế", price: 280, baseRent: 60, color: "#10b981", type: "property" },
            { name: "CƠ HỘI ❓", type: "chance", color: "#8b5cf6" },
            { name: "Đà Lạt", price: 300, baseRent: 65, color: "#ec4899", type: "property" },
            { name: "BẮT NHAU VÀO TÙ 🚓", type: "go_jail", color: "#dc2626" },
            { name: "Landmark 81", price: 350, baseRent: 80, color: "#ec4899", type: "property" },
            { name: "THUẾ THU NHẬP 💸", type: "tax", color: "#f43f5e" },
            { name: "Hội An", price: 400, baseRent: 100, color: "#f97316", type: "property" },
            { name: "VẬN KHÍ 🎁", type: "chance", color: "#8b5cf6" }
        ];

        const gridPositions = [
            {r:6,c:6},{r:6,c:5},{r:6,c:4},{r:6,c:3},{r:6,c:2},
            {r:6,c:1},{r:5,c:1},{r:4,c:1},{r:3,c:1},{r:2,c:1},
            {r:1,c:1},{r:1,c:2},{r:1,c:3},{r:1,c:4},{r:1,c:5},
            {r:1,c:6},{r:2,c:6},{r:3,c:6},{r:4,c:6},{r:5,c:6}
        ];

        const boardEl = document.getElementById('board');
        gridPositions.forEach((pos, idx) => {
            const data = boardData[idx];
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.style.gridRow = pos.r;
            tile.style.gridColumn = pos.c;

            let headerHtml = data.color ? \`<div class="tile-header" style="background:\${data.color}">\${data.type === 'property' ? '$' + data.price : ''}</div>\` : '';
            
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

        socket.on('updateGameState', (data) => {
            gridPositions.forEach((_, idx) => {
                document.getElementById(\`tile-p-\${idx}\`).innerHTML = '';
                const ownerEl = document.getElementById(\`owner-\${idx}\`);
                const buildEl = document.getElementById(\`build-\${idx}\`);
                
                if (data.boardState && data.boardState[idx]) {
                    const cell = data.boardState[idx];
                    if (cell.owner && data.players[cell.owner]) {
                        ownerEl.innerText = \`👑 \${data.players[cell.owner].name}\`;
                        ownerEl.style.color = data.players[cell.owner].color;
                    }
                    if (cell.houses > 0) {
                        buildEl.innerText = cell.houses === 4 ? '🏨 Khách sạn' : '🏠 '.repeat(cell.houses);
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

                let jailStatus = p.inJail ? ' 🚔 (Đang ở tù)' : '';

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
                    "👉 ĐẾN LƯỢT BẠN ĐỔ XÚC XẮC!" : \`Đang chờ lượt của: \${data.players[data.currentTurn].name}\`;
            }

            if (data.cardNotice) {
                document.getElementById('cardNotice').innerText = data.cardNotice;
            } else {
                document.getElementById('cardNotice').innerText = '';
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
    1: { name: "Hồ Hoàn Kiếm", price: 100, baseRent: 20, houseCost: 50 },
    2: { name: "Phố Cổ Hà Nội", price: 120, baseRent: 25, houseCost: 50 },
    4: { name: "Chợ Bến Thành", price: 150, baseRent: 30, houseCost: 80 },
    6: { name: "Phố Bùi Viện", price: 180, baseRent: 35, houseCost: 80 },
    7: { name: "Cầu Rồng", price: 200, baseRent: 40, houseCost: 100 },
    9: { name: "Vịnh Hạ Long", price: 220, baseRent: 45, houseCost: 100 },
    11: { name: "Phú Quốc", price: 260, baseRent: 55, houseCost: 120 },
    12: { name: "Cố Đô Huế", price: 280, baseRent: 60, houseCost: 120 },
    14: { name: "Đà Lạt", price: 300, baseRent: 65, houseCost: 150 },
    16: { name: "Landmark 81", price: 350, baseRent: 80, houseCost: 180 },
    18: { name: "Hội An", price: 400, baseRent: 100, houseCost: 200 }
};

const chanceCards = [
    { text: "Trúng vé số độc đắc! Nhận $200", effect: (p) => p.money += 200 },
    { text: "Bị phạt vì vi phạm giao thông! Mất $50", effect: (p) => p.money -= 50 },
    { text: "Được thưởng hiệu suất công việc! Nhận $100", effect: (p) => p.money += 100 },
    { text: "Bị cảnh sát bắt vào tù!", effect: (p) => { p.pos = 5; p.inJail = true; p.jailTurns = 0; } },
    { text: "Dịch chuyển thẳng đến ô Bắt Đầu (Nhận $200)", effect: (p) => { p.pos = 0; p.money += 200; } }
];

io.on('connection', (socket) => {
    socket.on('joinGame', (name) => {
        if (playerOrder.length < 4 && !players[socket.id]) {
            const playerColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];
            players[socket.id] = {
                id: socket.id,
                name: name || `Người chơi ${playerOrder.length + 1}`,
                color: playerColors[playerOrder.length],
                money: 1200,
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
                log: `${player.name} đã đóng $50 tiền bảo lãnh để ra tù!`
            });
        }
    });

    socket.on('rollDice', () => {
        if (playerOrder[currentTurnIndex] === socket.id) {
            const player = players[socket.id];
            let cardNotice = "";

            if (player.inJail) {
                player.jailTurns++;
                if (player.jailTurns >= 3) {
                    player.inJail = false;
                    player.jailTurns = 0;
                    actionLog = `${player.name} đã thụ án đủ 3 lượt và được thả tự do!`;
                } else {
                    currentTurnIndex = (currentTurnIndex + 1) % playerOrder.length;
                    io.emit('updateGameState', {
                        players: players,
                        playerOrder: playerOrder,
                        currentTurn: playerOrder[currentTurnIndex],
                        boardState: boardState,
                        log: `${player.name} đang ở trong tù (Lượt ${player.jailTurns}/3).`
                    });
                    return;
                }
            }

            const dice = Math.floor(Math.random() * 6) + 1;
            const oldPos = player.pos;
            player.pos = (player.pos + dice) % 20;

            if (player.pos < oldPos && player.pos !== 0) {
                player.money += 200;
            }

            let actionLog = `${player.name} đổ ra ${dice} nút -> đến ô ${player.pos}.`;

            if (properties[player.pos]) {
                const prop = properties[player.pos];
                if (!boardState[player.pos]) {
                    if (player.money >= prop.price) {
                        player.money -= prop.price;
                        boardState[player.pos] = { owner: socket.id, houses: 0 };
                        actionLog += ` Mua thành công ${prop.name} ($${prop.price})!`;
                    }
                } else if (boardState[player.pos].owner === socket.id) {
                    let cell = boardState[player.pos];
                    if (cell.houses < 4 && player.money >= prop.houseCost) {
                        player.money -= prop.houseCost;
                        cell.houses++;
                        const houseType = cell.houses === 4 ? "Khách sạn" : `Nhà thứ ${cell.houses}`;
                        actionLog += ` Đã xây thêm ${houseType} tại ${prop.name}!`;
                    }
                } else {
                    const cell = boardState[player.pos];
                    const owner = players[cell.owner];
                    if (owner) {
                        let currentRent = prop.baseRent * (cell.houses + 1);
                        player.money -= currentRent;
                        owner.money += currentRent;
                        actionLog += ` Trả $${currentRent} tiền thuê đất cho ${owner.name}.`;
                    }
                }
            } else if ([3, 8, 13, 19].includes(player.pos)) {
                const card = chanceCards[Math.floor(Math.random() * chanceCards.length)];
                card.effect(player);
                cardNotice = `📢 Thẻ rút được: ${card.text}`;
                actionLog += ` Rút thẻ: ${card.text}`;
            } else if (player.pos === 15) {
                player.pos = 5;
                player.inJail = true;
                player.jailTurns = 0;
                actionLog += ` Bị giải về đồn công an và đi tù!`;
            } else if (player.pos === 17) {
                player.money -= 100;
                actionLog += ` Đóng thuế thu nhập $100.`;
            }

            currentTurnIndex = (currentTurnIndex + 1) % playerOrder.length;

            io.emit('updateGameState', {
                players: players,
                playerOrder: playerOrder,
                currentTurn: playerOrder[currentTurnIndex],
                boardState: boardState,
                cardNotice: cardNotice,
                log: actionLog
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
                log: `${name} đã thoát khỏi bàn chơi.`
            });
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
