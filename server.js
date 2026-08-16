const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Giao diện HTML/CSS/JavaScript gửi trực tiếp cho người chơi
const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cờ Tỷ Phú Online 4 Người</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
        body { background: #0f172a; color: white; display: flex; flex-direction: column; align-items: center; padding: 20px; min-height: 100vh; }
        h1 { margin-bottom: 15px; color: #38bdf8; }
        
        #login-box { margin-bottom: 20px; display: flex; gap: 10px; }
        input { padding: 10px; border-radius: 6px; border: 1px solid #334155; outline: none; background: #1e293b; color: white; }
        button { padding: 10px 20px; border-radius: 6px; border: none; background: #10b981; color: white; font-weight: bold; cursor: pointer; transition: 0.2s; }
        button:hover { background: #059669; }
        button:disabled { background: #64748b; cursor: not-allowed; }

        .game-layout { display: flex; gap: 20px; margin-top: 10px; flex-wrap: wrap; justify-content: center; }
        
        /* Bàn cờ 6x6 dạng xoay vòng */
        .board { display: grid; grid-template-columns: repeat(6, 65px); grid-template-rows: repeat(6, 65px); gap: 4px; background: #334155; padding: 4px; border-radius: 8px; }
        .tile { background: #f8fafc; color: #000; border-radius: 4px; font-size: 10px; font-weight: bold; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; text-align: center; }
        
        .players-container { display: flex; gap: 2px; position: absolute; bottom: 2px; }
        .p-dot { width: 10px; height: 10px; border-radius: 50%; border: 1px solid white; }

        .center-area { grid-column: 2 / 6; grid-row: 2 / 6; background: #1e293b; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; border-radius: 6px; padding: 10px; }

        .info-panel { width: 260px; background: #1e293b; padding: 15px; border-radius: 8px; display: flex; flex-direction: column; gap: 12px; }
        .log-box { height: 140px; background: #020617; border-radius: 5px; padding: 8px; font-size: 11px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; color: #cbd5e1; }
    </style>
</head>
<body>

    <h1>CỜ TỶ PHÚ MULTIPLAYER</h1>

    <div id="login-box">
        <input type="text" id="nameInput" placeholder="Nhập tên của bạn...">
        <button onclick="joinGame()">Vào Phòng Game</button>
    </div>

    <div class="game-layout">
        <div class="board" id="board">
            <div class="center-area">
                <div id="turnStatus" style="font-size: 13px; text-align: center; font-weight: bold;">Nhập tên để tham gia...</div>
                <button id="rollBtn" onclick="rollDice()" disabled>ĐỔ XÚC XẮC 🎲</button>
            </div>
        </div>

        <div class="info-panel">
            <h3>Danh sách người chơi</h3>
            <div id="playerList">Đang chờ người chơi...</div>
            <h3>Nhật ký trận đấu</h3>
            <div class="log-box" id="logBox"></div>
        </div>
    </div>

    <script>
        const socket = io();
        let myId = "";

        const gridPositions = [
            {r:6,c:6},{r:6,c:5},{r:6,c:4},{r:6,c:3},{r:6,c:2},
            {r:6,c:1},{r:5,c:1},{r:4,c:1},{r:3,c:1},{r:2,c:1},
            {r:1,c:1},{r:1,c:2},{r:1,c:3},{r:1,c:4},{r:1,c:5},
            {r:1,c:6},{r:2,c:6},{r:3,c:6},{r:4,c:6},{r:5,c:6}
        ];

        const boardEl = document.getElementById('board');
        gridPositions.forEach((pos, idx) => {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.style.gridRow = pos.r;
            tile.style.gridColumn = pos.c;
            tile.innerText = idx === 0 ? "BẮT ĐẦU" : \`Ô \${idx}\`;
            
            const pBox = document.createElement('div');
            pBox.className = 'players-container';
            pBox.id = \`tile-p-\${idx}\`;
            tile.appendChild(pBox);

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

        function rollDice() {
            socket.emit('rollDice');
        }

        socket.on('updateGameState', (data) => {
            gridPositions.forEach((_, idx) => {
                document.getElementById(\`tile-p-\${idx}\`).innerHTML = '';
            });

            let listHtml = '';
            data.playerOrder.forEach(id => {
                const p = data.players[id];
                const dot = document.createElement('div');
                dot.className = 'p-dot';
                dot.style.backgroundColor = p.color;
                document.getElementById(\`tile-p-\${p.pos}\`).appendChild(dot);

                listHtml += \`<div style="color:\${p.color}">● <b>\${p.name}</b> - $\${p.money}</div>\`;
            });
            document.getElementById('playerList').innerHTML = listHtml;

            const isMyTurn = data.currentTurn === myId;
            document.getElementById('rollBtn').disabled = !isMyTurn;

            if (data.currentTurn && data.players[data.currentTurn]) {
                document.getElementById('turnStatus').innerText = isMyTurn ? 
                    "👉 ĐẾN LƯỢT BẠN!" : \`Đang chờ: \${data.players[data.currentTurn].name}\`;
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

// Trả về file giao diện khi truy cập link
app.get('/', (req, res) => {
    res.send(htmlContent);
});

let players = {};
let playerOrder = [];
let currentTurnIndex = 0;

io.on('connection', (socket) => {
    socket.on('joinGame', (name) => {
        if (playerOrder.length < 4 && !players[socket.id]) {
            const playerColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];
            players[socket.id] = {
                id: socket.id,
                name: name || `Người chơi ${playerOrder.length + 1}`,
                color: playerColors[playerOrder.length],
                money: 1500,
                pos: 0
            };
            playerOrder.push(socket.id);

            io.emit('updateGameState', {
                players: players,
                playerOrder: playerOrder,
                currentTurn: playerOrder[currentTurnIndex],
                log: `${players[socket.id].name} đã tham gia phòng!`
            });
        }
    });

    socket.on('rollDice', () => {
        if (playerOrder[currentTurnIndex] === socket.id) {
            const dice = Math.floor(Math.random() * 6) + 1;
            const player = players[socket.id];
            
            player.pos = (player.pos + dice) % 20;

            currentTurnIndex = (currentTurnIndex + 1) % playerOrder.length;

            io.emit('updateGameState', {
                players: players,
                playerOrder: playerOrder,
                currentTurn: playerOrder[currentTurnIndex],
                log: `${player.name} đổ được ${dice} nút và đi đến ô số ${player.pos}!`
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
                log: `${name} đã rời khỏi game.`
            });
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server đang chạy ở cổng ${PORT}`);
});
