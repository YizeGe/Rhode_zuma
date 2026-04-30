class Cannon {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.angle = -Math.PI / 2;
        this.shotCount = 0;
        this.specialInterval = 5;
        this.readyMarble = this.generateMarble(this.x, this.y);
        this.nextMarble = this.generateMarble(this.x - 70, this.y + 10);
        this.nextMarble.radius = this.readyMarble.radius * 0.6;
        this.flyingMarble = null;
        this.speed = 22;
        // 穿透模式（龙魂使者技能）
        this.piercingMode = false;
        this.piercingShots = 0;
    }

    generateMarble(x, y) {
        let typeInfo = MARBLE_TYPES[Math.floor(Math.random() * MARBLE_TYPES.length)];
        let m = new Marble(-1, -1, typeInfo, x, y);
        this.shotCount++;
        if (this.shotCount % this.specialInterval === 0) {
            m.isSpecial = true;
        }
        m.triggerBounce();
        return m;
    }

    aim(mouseX, mouseY) {
        let dx = mouseX - this.x;
        let dy = mouseY - this.y;
        this.angle = Math.atan2(dy, dx);

        let minAngle = -Math.PI + 0.1;
        let maxAngle = -0.1;

        if (this.angle > 0 || dy > 0) {
            this.angle = dx > 0 ? maxAngle : minAngle;
        }

        if (this.angle < minAngle) this.angle = minAngle;
        if (this.angle > maxAngle) this.angle = maxAngle;
    }

    fire() {
        if (this.flyingMarble) return;

        this.flyingMarble = this.readyMarble;
        this.flyingMarble.vx = Math.cos(this.angle) * this.speed;
        this.flyingMarble.vy = Math.sin(this.angle) * this.speed;

        // 穿透模式标记
        if (this.piercingMode && this.piercingShots > 0) {
            this.flyingMarble.isPiercing = true;
            this.piercingShots--;
            if (this.piercingShots <= 0) {
                this.piercingMode = false;
            }
        }

        this.readyMarble = this.nextMarble;
        this.readyMarble.radius = GRID_CONFIG.radius;
        this.readyMarble.x = this.x;
        this.readyMarble.y = this.y;
        this.readyMarble.triggerBounce();

        this.nextMarble = this.generateMarble(this.x - 70, this.y + 10);
        this.nextMarble.radius = GRID_CONFIG.radius * 0.6;
    }

    update(dt, grid, onSnap) {
        if (this.readyMarble && !this.flyingMarble) this.readyMarble.update();
        if (this.nextMarble) this.nextMarble.update();
        if (this.flyingMarble) this.flyingMarble.update();

        if (!this.flyingMarble) return;
        let m = this.flyingMarble;
        // 死亡弹珠立即清理
        if (m.dead) { this.flyingMarble = null; return; }
        let steps = 3;
        let stepS = 1 / steps;

        for (let i = 0; i < steps; i++) {
            if (m.dead) { this.flyingMarble = null; return; }
            m.x += m.vx * stepS;
            m.y += m.vy * stepS;

            // 穿透弹碰墙直接消失
            if (m.x - m.radius < 0) {
                if (m.isPiercing) { m.dead = true; this.flyingMarble = null; return; }
                m.x = m.radius;
                m.vx *= -1;
            } else if (m.x + m.radius > 480) { // Screen logical width is always 480
                if (m.isPiercing) { m.dead = true; this.flyingMarble = null; return; }
                m.x = 480 - m.radius;
                m.vx *= -1;
            }

            // 穿透弹碰到顶端直接消失
            if (m.y - m.radius <= GRID_CONFIG.startY - GRID_CONFIG.radius + (window.gameInfo ? (gameInfo.gridOffset || 0) : 0)) {
                if (m.isPiercing) {
                    m.dead = true;
                    this.flyingMarble = null;
                    console.log('[Pierce] 穿透弹到达顶端，消失');
                    return;
                }
                this.snapAndRest(m, grid, onSnap);
                return;
            }

            for (let r = 0; r < grid.cells.length; r++) {
                for (let c = 0; c < grid.cells[r].length; c++) {
                    let target = grid.cells[r][c];
                    if (target && !target.dead && !target.dropping && !target.popping) {
                        let dx = m.x - target.x;
                        let dy = m.y - target.y;
                        let dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < m.radius * 2 * 0.85) {
                            // 穿透模式：摧毁目标球并继续飞行
                            if (m.isPiercing) {
                                // 立即标记目标球为 dead，防止下一帧重复碰撞
                                target.dead = true;
                                target.vx = (Math.random() - 0.5) * 4;
                                target.vy = -Math.random() * 5;
                                // 摧毁周围 2 格内的球
                                const pierceRadius = 2 * GRID_CONFIG.radius * 2;
                                for (let rr = 0; rr < grid.cells.length; rr++) {
                                    for (let cc = 0; cc < grid.cells[rr].length; cc++) {
                                        const t = grid.cells[rr][cc];
                                        if (t && !t.dead && !t.dropping && !t.popping) {
                                            const ddx = t.x - target.x;
                                            const ddy = t.y - target.y;
                                            if (Math.sqrt(ddx * ddx + ddy * ddy) < pierceRadius) {
                                                t.dead = true;
                                                t.vx = (Math.random() - 0.5) * 4;
                                                t.vy = -Math.random() * 5;
                                            }
                                        }
                                    }
                                }
                                if (gameInfo && gameInfo.particles) {
                                    gameInfo.particles.spawn(target.x, target.y + (gameInfo.gridOffset || 0), target.color, 12);
                                }
                                // 穿透完成后触发孤立球检测
                                const floating = Logic.dropFloating(grid, gameInfo);
                                if (floating && floating.length > 0) {
                                    if (gameInfo && gameInfo.particles) {
                                        floating.forEach(fm => {
                                            gameInfo.particles.spawn(fm.x, fm.y + (gameInfo.gridOffset || 0), fm.color, 8);
                                        });
                                    }
                                }
                                continue; // 不停止，继续飞
                            }
                            this.snapAndRest(m, grid, onSnap);
                            return;
                        }
                    }
                }
            }
        }
    }

    snapAndRest(m, grid, onSnap) {
        // Adjust for gridOffset if present
        let gridOffsetY = window.gameInfo ? (gameInfo.gridOffset || 0) : 0;
        let yForGrid = m.y - gridOffsetY;

        let { row, col } = grid.getGridPos(m.x, yForGrid);

        // Sanity check to prevent NaN causing infinite memory allocation
        if (isNaN(row)) row = 0;
        if (isNaN(col)) col = 0;

        if (grid.getMarble(row, col)) {
            let neighbors = grid.getNeighbors(row, col);
            let empty = neighbors.filter(n => !grid.getMarble(n.row, n.col));
            if (empty.length > 0) {
                empty.sort((a, b) => {
                    let pa = grid.getScreenPos(a.row, a.col);
                    let pb = grid.getScreenPos(b.row, b.col);
                    pa.y += gridOffsetY; pb.y += gridOffsetY;
                    return ((pa.x - m.x) ** 2 + (pa.y - m.y) ** 2) - ((pb.x - m.x) ** 2 + (pb.y - m.y) ** 2);
                });
                row = empty[0].row;
                col = empty[0].col;
            } else {
                row += 1;
            }
        }

        m.row = row;
        m.col = col;
        let pos = grid.getScreenPos(row, col);
        m.x = pos.x;
        m.y = pos.y + gridOffsetY;
        m.vx = 0;
        m.vy = 0;

        grid.addMarble(m);
        this.flyingMarble = null;

        if (onSnap) onSnap(m);
    }

    draw(ctx) {
        if (!this.flyingMarble) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            let endX = this.x + Math.cos(this.angle) * 80;
            let endY = this.y + Math.sin(this.angle) * 80;

            ctx.lineTo(endX, endY);
            ctx.setLineDash([8, 8]);
            ctx.strokeStyle = '#ff9a76';
            ctx.lineWidth = 4;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(endX, endY, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#ff9a76';
            ctx.fill();
            ctx.restore();
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, 35, 0, Math.PI * 2);
        ctx.fillStyle = '#ffdfca';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#ff9a76';
        ctx.stroke();

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.PI / 2);
        ctx.fillStyle = '#ff9a76';
        ctx.beginPath();
        ctx.moveTo(-15, -10);
        ctx.lineTo(15, -10);
        ctx.lineTo(10, -40);
        ctx.lineTo(-10, -40);
        ctx.fill();
        ctx.restore();

        this.nextMarble.draw(ctx);

        if (this.readyMarble && !this.flyingMarble) {
            this.readyMarble.draw(ctx);
        }
        if (this.flyingMarble) {
            this.flyingMarble.draw(ctx);
        }
    }
}
