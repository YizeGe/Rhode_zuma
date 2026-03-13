class Logic {
    static getConnectedSameColor(grid, startMarble) {
        let visited = new Set();
        let cluster = [];
        let queue = [startMarble];
        let type = startMarble.type;

        visited.add(`${startMarble.row},${startMarble.col}`);

        while (queue.length > 0) {
            let curr = queue.shift();
            cluster.push(curr);

            let neighbors = grid.getNeighbors(curr.row, curr.col);
            for (let n of neighbors) {
                let m = grid.getMarble(n.row, n.col);
                if (m && m.type === type && !m.dead && !m.popping && !m.dropping) {
                    let key = `${m.row},${m.col}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        queue.push(m);
                    }
                }
            }
        }
        return cluster;
    }

    static getFloatingMarbles(grid) {
        let visited = new Set();
        let queue = [];

        if (grid.cells.length === 0) return [];

        for (let c = 0; c < grid.cells[0].length; c++) {
            let m = grid.getMarble(0, c);
            if (m && !m.dead && !m.popping && !m.dropping) {
                queue.push(m);
                visited.add(`${m.row},${m.col}`);
            }
        }

        while (queue.length > 0) {
            let curr = queue.shift();
            let neighbors = grid.getNeighbors(curr.row, curr.col);
            for (let n of neighbors) {
                let m = grid.getMarble(n.row, n.col);
                if (m && !m.dead && !m.popping && !m.dropping) {
                    let key = `${m.row},${m.col}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        queue.push(m);
                    }
                }
            }
        }

        let floating = [];
        for (let r = 0; r < grid.cells.length; r++) {
            for (let c = 0; c < grid.cells[r].length; c++) {
                let m = grid.cells[r][c];
                if (m && !m.dead && !m.popping && !m.dropping) {
                    if (!visited.has(`${m.row},${m.col}`)) {
                        floating.push(m);
                    }
                }
            }
        }
        return floating;
    }

    static processSnap(marble, grid, gameInfo) {
        marble.triggerBounce(); // Bounce when snapping to the grid

        let cluster = this.getConnectedSameColor(grid, marble);
        let matchMade = false;

        if (cluster.length >= 3) {
            matchMade = true;
            this.addScore(cluster.length * 10, gameInfo);
            if (gameInfo && gameInfo.audio) gameInfo.audio.play('match');

            // Screen shake based on burst size
            if (gameInfo.particles) {
                gameInfo.particles.triggerShake(8 + cluster.length * 2);
            }

            cluster.forEach(m => {
                m.popping = true;
                if (gameInfo.particles) {
                    gameInfo.particles.spawn(m.x, m.y + (gameInfo.gridOffset || 0), m.color, 15);
                }
            });

            let floating = this.getFloatingMarbles(grid);
            if (floating.length > 0) {
                if (gameInfo && gameInfo.audio) setTimeout(() => gameInfo.audio.play('drop'), 300);
            }
            floating.forEach(m => {
                m.dropping = true;
                m.vx = (Math.random() - 0.5) * 4;
                m.vy = -Math.random() * 5;
            });
            if (floating.length > 0) {
                this.addScore(floating.length * 20, gameInfo);
            }

            let totalCleared = cluster.length + floating.length;
            if (totalCleared >= 10) {
                if (gameInfo && gameInfo.particles) {
                    gameInfo.particles.spawnText(240, 320, 'AMAZING!', '#ff3366');
                }
            } else if (totalCleared >= 5) {
                if (gameInfo && gameInfo.particles) {
                    gameInfo.particles.spawnText(240, 320, 'GREAT!', '#ffaa00');
                }
            }
        }

        return matchMade;
    }

    static addScore(points, gameInfo) {
        gameInfo.score += points;
        const scoreEl = document.getElementById('score');
        if (scoreEl) {
            scoreEl.innerText = gameInfo.score;
            scoreEl.style.transform = 'scale(1.2)';
            setTimeout(() => scoreEl.style.transform = 'scale(1)', 150);
        }
    }

    static pushDownGrid(grid) {
        if (window.gameInfo && window.gameInfo.audio) window.gameInfo.audio.play('push');

        grid.offsetParity = (grid.offsetParity + 1) % 2;
        let newCells = [];

        let newRow = [];
        let cols = grid.isOddRow(0) ? GRID_CONFIG.cols - 1 : GRID_CONFIG.cols;
        for (let c = 0; c < cols; c++) {
            let typeInfo = MARBLE_TYPES[Math.floor(Math.random() * MARBLE_TYPES.length)];
            let pos = grid.getScreenPos(0, c);
            let m = new Marble(0, c, typeInfo, pos.x, pos.y);
            m.triggerBounce();
            newRow.push(m);
        }
        newCells.push(newRow);

        for (let r = 0; r < grid.cells.length; r++) {
            let nextR = r + 1;
            let nextCols = grid.isOddRow(nextR) ? GRID_CONFIG.cols - 1 : GRID_CONFIG.cols;
            let shiftedRow = new Array(nextCols).fill(null);

            for (let c = 0; c < grid.cells[r].length; c++) {
                let m = grid.cells[r][c];
                if (m && !m.dead && !m.dropping && !m.popping) {
                    let targetC = c;

                    // Logic to handle row shift topology change
                    if (!grid.isOddRow(r)) {
                        // even -> odd (cols -> cols-1). 
                        // the last marble might fall off if we strictly keep col index, 
                        // but let's just make sure we don't exceed nextCols.
                        if (targetC >= nextCols) {
                            targetC = nextCols - 1; // Or implement fall off logic explicitly
                        }
                    }

                    if (targetC < nextCols) {
                        m.row = nextR;
                        m.col = targetC;
                        let p = grid.getScreenPos(m.row, m.col);
                        m.x = p.x;
                        m.y = p.y;
                        m.triggerBounce();
                        shiftedRow[targetC] = m;
                    } else {
                        m.dropping = true;
                        m.vx = 2;
                        m.vy = -2; // fall off the edge
                    }
                }
            }
            newCells.push(shiftedRow);
        }
        grid.cells = newCells;
    }

    static checkGameOver(grid, limitY) {
        for (let r = 0; r < grid.cells.length; r++) {
            for (let c = 0; c < grid.cells[r].length; c++) {
                let m = grid.cells[r][c];
                if (m && !m.dead && !m.popping && !m.dropping) {
                    if (m.y + m.radius > limitY) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}
