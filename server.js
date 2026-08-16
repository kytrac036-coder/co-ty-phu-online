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
    <title>Cờ Tỷ Phú Việt Nam Standard 40 Ô</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background: #0f172a; color: white; display: flex; flex-direction: column; align-items: center; padding: 10px; min-height: 100vh; }
        h1 { margin-bottom: 8px; color: #38bdf8; font-size: 22px; text-transform: uppercase; }
        
        #login-box { margin-bottom: 12px; display: flex; gap: 8px; }
        input { padding: 8px 12px; border-radius: 6px; border: 1px solid #334155; outline: none; background: #1e293b; color: white; font-size: 13px; }
        button { padding: 8px 16px; border-radius: 6px; border: none; background: #10b981; color: white; font-weight: bold; cursor: pointer; }
        button:hover { background: #059669; }
        button:disabled { background: #64748b; cursor: not-allowed; }

        .game-layout { display: flex; gap: 15px; margin-top: 5px; justify-content: center; align-items: flex-start; }
        
        .board { display: grid; grid-template-columns: repeat(11, 62px); grid-template-rows: repeat(11, 62px); gap: 2px; background: #1e293b; padding: 4px; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .tile { background: #f8fafc; color: #0f172a; border-radius: 4px; font-size: 8px; font-weight: bold; display: flex; flex-direction: column; justify-content: space-between; position: relative; text-align: center; overflow: hidden; padding: 1px; }
        .tile-header { height: 12px; width: 100%; color: white; font-size: 8px; display: flex; align-items: center; justify-content: center; }
        .tile-name { margin-top: 1px; line-height: 1; font-size: 8px; }
        .tile-build { font-size: 8px; color: #d97706; }
        .tile-owner { font-size: 8px; }

        .players-container { display: flex; gap: 2px; position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%); }
        .p-dot { width: 10px; height: 10px; border-radius: 50%; border: 1px solid white; }

        .center-area { grid-column: 2 / 11; grid-row: 2 / 11; background: #0f172a; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; border-radius: 6px; padding: 10px; text-align: center; border: 1px solid #334155; }

        .info-panel { width: 280px; background: #1e293b; padding: 12px; border-radius: 8px; display: flex; flex-direction: column; gap: 10px; }
        .player-card { background: #0f172a; padding: 8px; border-radius: 4px; display: flex; flex-direction: column; gap: 2px; border-left: 4px solid transparent; font-size: 11px; }
        .log-box { height: 260px; background: #020617; border-radius: 4px; padding: 8px; font-size: 10px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; color: #cbd5e1; border: 1px solid #334155; }
        
        .action-btns { display: flex; gap: 6px; }
        .btn-pay { background: #eab308; }
    </style>
</head>
<body>

    <h1>CỜ TỶ PHÚ VIỆT NAM (CHUẨN 40 Ô)</h1>

    <div id="login-box">
        <input type="text" id="nameInput" placeholder="Nhập tên người chơi...">
        <button onclick="joinGame()">VÀO PHÒNG</button>
    </div>

    <div class="game-layout">
        <div class="board" id="board">
            <div class="center-area">
                <div id="turnStatus" style="font-size: 12px; font-weight: bold; color: #38bdf8;">Tham gia phòng để bắt đầu</div>
                <div id="cardNotice" style="font-size: 11px; color: #facc15; min-height: 16px;"></div>
                <div class="action-btns">
                    <button id="rollBtn" onclick="rollDice()" disabled>ĐỔ XÚC XẮC 🎲</button>
                    <button id="bailBtn" onclick="payBail()" disabled class="btn-pay" style="display:none;">RA TÙ ($50)</button>
                </div>
            </div>
        </div>

        <div class="info-panel">
            <h3 style="font-size: 13px;">Người Chơi & Tài Sản</h3>
            <div id="playerList">Chờ tham gia...</div>
            <h3 style="font-size: 13px;">Nhật Ký Trận Đấu</h3>
            <div class="log-box" id="logBox"></div>
        </div>
    </div>

    <script>
        const socket = io();
        let myId = "";

        const boardData = [
            { name: "BẮT ĐẦU", type: "start", color: "#10b981" },
            { name: "Phố Cổ HN", price: 60, baseRent: 2, color: "#78350f", type: "property" },
            { name: "KHÍ VẬN 🎁", type: "community", color: "#38bdf8" },
            { name: "Hàng Bạc", price: 60, baseRent: 4, color: "#78350f", type: "property" },
            { name: "Thuế TN", type: "tax", price: 200 },
            { name: "Ga Hà Nội", price: 200, baseRent: 25, type: "station" },
            { name: "Bến Thành", price: 100, baseRent: 6, color: "#06b6d4", type: "property" },
            { name: "CƠ HỘI ❓", type: "chance", color: "#8b5cf6" },
            { name: "Bùi Viện", price: 100, baseRent: 6, color: "#06b6d4", type: "property" },
            { name: "Nguyễn Huệ", price: 120, baseRent: 8, color: "#06b6d4", type: "property" },
            { name: "VÀO TÙ 🚔", type: "jail", color: "#64748b" },
            { name: "Cầu Rồng", price: 140, baseRent: 10, color: "#ec4899", type: "property" },
            { name: "Cty Điện", price: 150, baseRent: 10, type: "utility" },
            { name: "Bà Nà Hills", price: 140, baseRent: 10, color: "#ec4899", type: "property" },
            { name: "Hội An", price: 160, baseRent: 12, color: "#ec4899", type: "property" },
            { name: "Ga Đà Nẵng", price: 200, baseRent: 25, type: "station" },
            { name: "Đà Lạt", price: 180, baseRent: 14, color: "#f97316", type: "property" },
            { name: "KHÍ VẬN 🎁", type: "community", color: "#38bdf8" },
            { name: "Nha Trang", price: 180, baseRent: 14, color: "#f97316", type: "property" },
            { name: "Phú Quốc", price: 200, baseRent: 16, color: "#f97316", type: "property" },
            { name: "BÃI BIỂN 🏖️", type: "park", color: "#10b981" },
            { name: "Vịnh Hạ Long", price: 220, baseRent: 18, color: "#ef4444", type: "property" },
            { name: "CƠ HỘI ❓", type: "chance", color: "#8b5cf6" },
            { name: "Sapa", price: 220, baseRent: 18, color: "#ef4444", type: "property" },
            { name: "Ninh Bình", price: 240, baseRent: 20, color: "#ef4444", type: "property" },
            { name: "Ga Sài Gòn", price: 200, baseRent: 25, type: "station" },
            { name: "Cố Đô Huế", price: 260, baseRent: 22, color: "#eab308", type: "property" },
            { name: "Phong Nha", price: 260, baseRent: 22, color: "#eab308", type: "property" },
            { name: "Cty Nước", price: 150, baseRent: 10, type: "utility" },
            { name: "Mũi Né", price: 280, baseRent: 24, color: "#eab308", type: "property" },
            { name: "VÀO TÙ 🚓", type: "go_jail", color: "#dc2626" },
            { name: "Cần Thơ", price: 300, baseRent: 26, color: "#22c55e", type: "property" },
            { name: "Vũng Tàu", price: 300, baseRent: 26, color: "#22c55e", type: "property" },
            { name: "KHÍ VẬN 🎁", type: "community", color: "#38bdf8" },
            { name: "Quy Nhơn", price: 320, baseRent: 28, color: "#22c55e", type: "property" },
            { name: "Ga Huế", price: 200, baseRent: 25, type: "station" },
            { name: "CƠ HỘI ❓", type: "chance", color: "#8b5cf6" },
            { name: "Landmark 81", price: 350, baseRent: 35, color: "#1d4ed8", type: "property" },
            { name: "Thuế Xa Xỉ", type: "tax", price: 100 },
            { name: "Bitexco", price: 400, baseRent: 50, color: "#1d4ed8", type: "property" }
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

// Tổng số nhà/khách sạn tối đa trong kho theo luật gốc
let totalHousesAvailable = 32;
let totalHotelsAvailable = 12;

const properties = {
    1: { name: "Phố Cổ HN", price: 60, baseRent: 2, houseCost: 50 },
    3: { name: "Hàng Bạc", price: 60, baseRent: 4, houseCost: 50 },
    5: { name: "Ga Hà Nội", price: 200, baseRent: 25, type: "station" },
    6: { name: "Bến Thành", price: 100, baseRent: 6, houseCost: 50 },
    8: { name: "Bùi Viện", price: 100, baseRent: 6, houseCost: 50 },
    9: { name: "Nguyễn Huệ", price: 120, baseRent: 8, houseCost: 50 },
    11: { name: "Cầu Rồng", price: 140, baseRent: 10, houseCost: 100 },
    12: { name: "Cty Điện", price: 150, baseRent: 10, type: "utility" },
    13: { name: "Bà Nà Hills", price: 140, baseRent: 10, houseCost: 100 },
    14: { name: "Hội An", price: 160, baseRent: 12, houseCost: 100 },
    15: { name: "Ga Đà Nẵng", price: 200, baseRent: 25, type: "station" },
    16: { name: "Đà Lạt", price: 180, baseRent: 14, houseCost: 100 },
    18: { name: "Nha Trang", price: 180, baseRent: 14, houseCost: 100 },
    19: { name: "Phú Quốc", price: 200, baseRent: 16, houseCost: 100 },
    21: { name: "Vịnh Hạ Long", price: 220, baseRent: 18, houseCost: 150 },
    23: { name: "Sapa", price: 220, baseRent: 18, houseCost: 150 },
    24: { name: "Ninh Bình", price: 240, baseRent: 20, houseCost: 150 },
    25: { name: "Ga Sài Gòn", price: 200, baseRent: 25, type: "station" },
    26: { name: "Cố Đô Huế", price: 260, baseRent: 22, houseCost: 150 },
    27: { name: "Phong Nha", price: 260, baseRent: 22, houseCost: 150 },
    28: { name: "Cty Nước", price: 150, baseRent: 10, type: "utility" },
    29: { name: "Mũi Né", price: 280, baseRent: 24, houseCost: 150 },
    31: { name: "Cần Thơ", price: 300, baseRent: 26, houseCost: 200 },
    32: { name: "Vũng Tàu", price: 300, baseRent: 26, houseCost: 200 },
    34: { name: "Quy Nhơn", price: 320, baseRent: 28, houseCost: 200 },
    35: { name: "Ga Huế", price: 200, baseRent: 25, type: "station" },
    37: { name: "Landmark 81", price: 350, baseRent: 35, houseCost: 200 },
    39: { name: "Bitexco", price: 400, baseRent: 50, houseCost: 200 }
};

// 16 Thẻ Cơ Hội chuẩn
const chanceCards = [
    { text: "Tiến thẳng đến ô BẮT ĐẦU (Nhận $200)", effect: (p) => { p.pos = 0; p.money += 200; } },
    { text: "Tiến đến ô Bitexco", effect: (p) => { p.pos = 39; } },
    { text: "Tiến đến Ga Hà Nội", effect: (p) => { p.pos = 5; } },
    { text: "Ngân hàng trả cổ tức! Nhận $50", effect: (p) => { p.money += 50; } },
    { text: "Lùi lại 3 ô", effect: (p) => { p.pos = (p.pos - 3 + 40) % 40; } },
    { text: "Bị bắt đi tù!", effect: (p) => { p.pos = 10; p.inJail = true; p.jailTurns = 0; } },
    { text: "Bảo trì tất cả bất động sản: Nộp $25 mỗi căn nhà", effect: (p) => { p.money -= 50; } },
    { text: "Phạt chạy quá tốc độ: Nộp $15", effect: (p) => { p.money -= 15; } },
    { text: "Bị phạt tiền học phí: Nộp $150", effect: (p) => { p.money -= 150; } },
    { text: "Trúng thưởng cuộc thi sắc đẹp: Nhận $10", effect: (p) => { p.money += 10; } },
    { text: "Nhận tiền hoàn thuế: Nhận $100", effect: (p) => { p.money += 100; } },
    { text: "Mãi xá đi tù (Thẻ bảo lưu)", effect: (p) => { p.money += 50; } },
    { text: "Chuyến du lịch gia đình: Nhận $100", effect: (p) => { p.money += 100; } },
    { text: "Được thưởng hiệu suất làm việc: Nhận $100", effect: (p) => { p.money += 100; } },
    { text: "Tiến đến ô Bến Thành", effect: (p) => { p.pos = 6; } },
    { text: "Đến ô BÃI BIỂN nghỉ dưỡng", effect: (p) => { p.pos = 20; } }
];

// 16 Thẻ Khí Vận chuẩn
const communityCards = [
    { text: "Tiến thẳng đến ô BẮT ĐẦU (Nhận $200)", effect: (p) => { p.pos = 0; p.money += 200; } },
    { text: "Lỗi ngân hàng có lợi cho bạn! Nhận $200", effect: (p) => { p.money += 200; } },
    { text: "Phí bác sĩ! Nộp $50", effect: (p) => { p.money -= 50; } },
    { text: "Bán cổ phiếu: Nhận $50", effect: (p) => { p.money += 50; } },
    { text: "Bảo hiểm nhân thọ đáo hạn: Nhận $100", effect: (p) => { p.money += 100; } },
    { text: "Nộp tiền viện phí: Nộp $100", effect: (p) => { p.money -= 100; } },
    { text: "Nộp phí học sinh: Nộp $50", effect: (p) => { p.money -= 50; } },
    { text: "Nhận tiền dịch vụ cố vấn: Nhận $25", effect: (p) => { p.money += 25; } },
    { text: "Bị cảnh sát giải về đồn đi tù!", effect: (p) => { p.pos = 10; p.inJail = true; p.jailTurns = 0; } },
    { text: "Tất cả người chơi mừng sinh nhật bạn: Nhận $50", effect: (p) => { p.money += 50; } },
    { text: "Thu hồi vốn đầu tư: Nhận $100", effect: (p) => { p.money += 100; } },
    { text: "Bán đất được giá: Nhận $150", effect: (p) => { p.money += 150; } },
    { text: "Trúng xổ số địa phương: Nhận $20", effect: (p) => { p.money += 20; } },
    { text: "Thuế đường bộ: Nộp $40", effect: (p) => { p.money -= 40; } },
    { text: "Chi phí thừa kế: Nhận $100", effect: (p) => { p.money += 100; } },
    { text: "Thưởng đóng góp quỹ: Nhận $100", effect: (p) => { p.money += 100; } }
];

io.on('connection', (socket) => {
    socket.on('joinGame', (name) => {
        if (playerOrder.length < 4 && !players[socket.id]) {
            const playerColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];
            players[socket.id] = {
                id: socket.id,
                name: name || `Người chơi ${playerOrder.length + 1}`,
                color: playerColors[playerOrder.length],
                money: 1500, // Tiền khởi điểm tiêu chuẩn $1500
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
                log: `${players[socket.id].name} đã tham gia bàn cờ!`
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
                log: `${player.name} đóng $50 tiền bảo lãnh để ra tù!`
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

            const dice1 = Math.floor(Math.random() * 6) + 1;
            const dice2 = Math.floor(Math.random() * 6) + 1;
            const dice = dice1 + dice2;
            const oldPos = player.pos;
            player.pos = (player.pos + dice) % 40;

            if (player.pos < oldPos && player.pos !== 0) {
                player.money += 200; // Qua ô Bắt Đầu nhận $200
            }

            let actionLog = `${player.name} đổ 🎲 (${dice1}+${dice2}=${dice}) -> đến ô ${player.pos}.`;

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
                    if (cell.houses < 4 && totalHousesAvailable > 0 && player.money >= prop.houseCost) {
                        player.money -= prop.houseCost;
                        cell.houses++;
                        totalHousesAvailable--;
                        actionLog += ` Xây thêm nhà thứ ${cell.houses} tại ${prop.name}!`;
                    } else if (cell.houses === 4 && totalHotelsAvailable > 0 && player.money >= prop.houseCost) {
                        player.money -= prop.houseCost;
                        cell.houses = 5; // 5 tương ứng với Khách sạn
                        totalHousesAvailable += 4;
                        totalHotelsAvailable--;
                        actionLog += ` Nâng cấp lên Khách Sạn tại ${prop.name}!`;
                    }
                } else {
                    const cell = boardState[player.pos];
                    const owner = players[cell.owner];
                    if (owner) {
                        let currentRent = prop.baseRent * (cell.houses === 5 ? 10 : cell.houses + 1);
                        player.money -= currentRent;
                        owner.money += currentRent;
                        actionLog += ` Trả $${currentRent} tiền thuê cho ${owner.name}.`;
                    }
                }
            } else if ([7, 22, 36].includes(player.pos)) {
                const card = chanceCards[Math.floor(Math.random() * chanceCards.length)];
                card.effect(player);
                cardNotice = `❓ Cơ Hội: ${card.text}`;
                actionLog += ` Rút thẻ Cơ Hội: ${card.text}`;
            } else if ([2, 17, 33].includes(player.pos)) {
                const card = communityCards[Math.floor(Math.random() * communityCards.length)];
                card.effect(player);
                cardNotice = `🎁 Khí Vận: ${card.text}`;
                actionLog += ` Rút thẻ Khí Vận: ${card.text}`;
            } else if (player.pos === 30) {
                player.pos = 10;
                player.inJail = true;
                player.jailTurns = 0;
                actionLog += ` Bị bắt đi tù!`;
            } else if (player.pos === 4) {
                player.money -= 200;
                actionLog += ` Đóng thuế thu nhập $200.`;
            } else if (player.pos === 38) {
                player.money -= 100;
                actionLog += ` Đóng thuế xa xỉ $100.`;
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
                log: `${name} đã thoát bàn chơi.`
            });
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
