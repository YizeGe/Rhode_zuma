class Logic {
    static getConnectedSameColor(grid, startMarble) {
        let visited = new Set();
        let cluster = [];
        let queue = [startMarble];
        let type = startMarble.type;

        visited.add(startMarble.row * 100 + startMarble.col);

        let qi = 0;
        while (qi < queue.length) {
            let curr = queue[qi++];
            cluster.push(curr);

            let neighbors = grid.getNeighbors(curr.row, curr.col);
            for (let n of neighbors) {
                let m = grid.getMarble(n.row, n.col);
                if (m && m.type === type && !m.dead && !m.popping && !m.dropping) {
                    let key = m.row * 100 + m.col;
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
                visited.add(m.row * 100 + m.col);
            }
        }

        let qi = 0;
        while (qi < queue.length) {
            let curr = queue[qi++];
            let neighbors = grid.getNeighbors(curr.row, curr.col);
            for (let n of neighbors) {
                let m = grid.getMarble(n.row, n.col);
                if (m && !m.dead && !m.popping && !m.dropping) {
                    let key = m.row * 100 + m.col;
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
                    if (!visited.has(m.row * 100 + m.col)) {
                        floating.push(m);
                    }
                }
            }
        }
        return floating;
    }

    static processSnap(marble, grid, gameInfo) {
        marble.triggerBounce(); // Bounce when snapping to the grid
        return this.processNormalSnap(marble, grid, gameInfo);
    }

    static executeDestruction(initialSet, grid, gameInfo) {
        let toProcess = Array.from(initialSet);
        let allDestroyed = new Set();
        
        while(toProcess.length > 0) {
            let m = toProcess.shift();
            
            if (!m || m.dead || m.popping || allDestroyed.has(m)) continue;
            
            allDestroyed.add(m);
            m.popping = true;
            
            if (m.isSpecial) {
                let newlyDestroyed = this.getSkillTargets(m, grid, gameInfo);
                for (let t of newlyDestroyed) {
                    if (t && !t.dead && !t.popping && !allDestroyed.has(t)) {
                        toProcess.push(t);
                    }
                }
            }
        }
        
        if (allDestroyed.size > 0) {
            this.addScore(allDestroyed.size * 10, gameInfo);
            if (gameInfo && gameInfo.audio) gameInfo.audio.play('match');
            
            if (gameInfo && gameInfo.particles) {
                gameInfo.particles.triggerShake(8 + Math.min(allDestroyed.size * 2, 20));
                
                allDestroyed.forEach(m => {
                    gameInfo.particles.spawn(m.x, m.y + (gameInfo.gridOffset || 0), m.color, Math.random() > 0.5 ? 20 : 15);
                });
            }
            
            let floating = this.dropFloating(grid, gameInfo);
            
            let totalCleared = allDestroyed.size + floating.length;
            if (totalCleared >= 10) {
                if (gameInfo && gameInfo.particles) {
                    gameInfo.particles.spawnText(240, 320, 'AMAZING!', '#ff3366');
                }
            } else if (totalCleared >= 5) {
                if (gameInfo && gameInfo.particles) {
                    gameInfo.particles.spawnText(240, 320, 'GREAT!', '#ffaa00');
                }
            }
            return totalCleared;
        }
        return 0;
    }

    static getSkillTargets(marble, grid, gameInfo) {
        let targets = new Set();
        
        if (gameInfo && gameInfo.particles) {
            gameInfo.particles.spawnText(marble.x, marble.y + (gameInfo.gridOffset || 0), 'SKILL!', '#ff00ff');

            let offsetY = gameInfo.gridOffset || 0;
            if (marble.type === 1) { // Row Clear
                gameInfo.particles.spawnHorizontalWave(marble.y + offsetY, marble.color, 50);
            } else if (marble.type === 3) { // Column Clear
                gameInfo.particles.spawnVerticalWave(marble.x, marble.color, 0 + offsetY, 640 + offsetY, 50);
            }
        }

        switch (marble.type) {
            case 0: // Red: Bomb
                let rNeighbors = grid.getNeighbors(marble.row, marble.col);
                for (let n of rNeighbors) {
                    let m = grid.getMarble(n.row, n.col);
                    if (m && !m.dead) targets.add(m);
                }
                break;
            case 1: // Blue: Row Clear
                for (let c = 0; c < grid.cells[marble.row].length; c++) {
                    let m = grid.cells[marble.row][c];
                    if (m && !m.dead) targets.add(m);
                }
                break;
            case 2: // Yellow: Color Splash
                let yNeighbors = grid.getNeighbors(marble.row, marble.col);
                for (let n of yNeighbors) {
                    let m = grid.getMarble(n.row, n.col);
                    if (m && !m.dead && m.type !== 2) {
                        m.type = 2;
                        m.color = MARBLE_TYPES[2].color;
                        if (MARBLE_TYPES[2].imageSrc) {
                            m.imageSrc = MARBLE_TYPES[2].imageSrc;
                            m.imageObj = new Image();
                            m.imageObj.src = m.imageSrc;
                        } else {
                            m.imageObj = null;
                        }
                        m.triggerBounce();
                        targets.add(m); // Splashed neighbors are instantly popped as part of the combo wave
                    }
                }
                break;
            case 3: // Black (Deep Purple): Column Clear
                for (let r = 0; r < grid.cells.length; r++) {
                    for (let c = 0; c < grid.cells[r].length; c++) {
                        let m = grid.cells[r][c];
                        if (m && !m.dead && Math.abs(m.x - marble.x) < GRID_CONFIG.radius * 1.5) {
                            targets.add(m);
                        }
                    }
                }
                break;
            case 4: // Brown (Orange): Grid Push-up
                if (grid.cells.length > 0) {
                    let topRow = grid.cells.shift();
                    for (let c = 0; c < topRow.length; c++) {
                        if (topRow[c]) topRow[c].dead = true;
                    }
                    for (let r = 0; r < grid.cells.length; r++) {
                        for (let c = 0; c < grid.cells[r].length; c++) {
                            let m = grid.cells[r][c];
                            if (m) {
                                m.row--;
                                m.y -= GRID_CONFIG.rowHeight;
                            }
                        }
                    }
                    grid.offsetParity = (grid.offsetParity + 1) % 2;
                }
                break;
            case 5: // Green: Sniper
                let allMarbles = [];
                for (let r = 0; r < grid.cells.length; r++) {
                    for (let c = 0; c < grid.cells[r].length; c++) {
                        let m = grid.cells[r][c];
                        if (m && m !== marble && !m.dead && !m.popping && !m.dropping) allMarbles.push(m);
                    }
                }
                let count = Math.min(allMarbles.length, 5);
                for (let i = 0; i < count; i++) {
                    if (allMarbles.length === 0) break;
                    let idx = Math.floor(Math.random() * allMarbles.length);
                    targets.add(allMarbles[idx]);
                    allMarbles.splice(idx, 1);
                }
                break;
        }
        return targets;
    }

    static dropFloating(grid, gameInfo) {
        let floating = this.getFloatingMarbles(grid);
        if (floating.length > 0) {
            if (gameInfo && gameInfo.audio) setTimeout(() => gameInfo.audio.play('drop'), 300);
            this.addScore(floating.length * 20, gameInfo);
        }
        floating.forEach(m => {
            m.dropping = true;
            m.vx = (Math.random() - 0.5) * 4;
            m.vy = -Math.random() * 5;
        });
        return floating;
    }

    static processNormalSnap(marble, grid, gameInfo) {
        let cluster = this.getConnectedSameColor(grid, marble);
        if (cluster.length >= 3) {
            return this.executeDestruction(cluster, grid, gameInfo);
        }
        return 0;
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
