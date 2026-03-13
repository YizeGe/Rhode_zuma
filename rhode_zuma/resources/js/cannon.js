class Cannon {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.angle = -Math.PI / 2;
        this.readyMarble = this.generateMarble(this.x, this.y);
        this.nextMarble = this.generateMarble(this.x - 70, this.y + 10);
        // Shrink next marble for UI appeal
        this.nextMarble.radius = this.readyMarble.radius * 0.6;
        this.flyingMarble = null;
        this.speed = 22;
    }

    generateMarble(x, y) {
        let typeInfo = MARBLE_TYPES[Math.floor(Math.random() * MARBLE_TYPES.length)];
        let m = new Marble(-1, -1, typeInfo, x, y);
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

        this.readyMarble = this.nextMarble;
        this.readyMarble.radius = GRID_CONFIG.radius; // Restore scale
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
        let steps = 3;
        let stepS = 1 / steps;

        for (let i = 0; i < steps; i++) {
            m.x += m.vx * stepS;
            m.y += m.vy * stepS;

            if (m.x - m.radius < 0) {
                m.x = m.radius;
                m.vx *= -1;
            } else if (m.x + m.radius > 480) { // Screen logical width is always 480
                m.x = 480 - m.radius;
                m.vx *= -1;
            }

            // Ceiling collision based on game grid system (add grid offset support later)
            if (m.y - m.radius <= GRID_CONFIG.startY - GRID_CONFIG.radius + (window.gameInfo ? gameInfo.gridOffset : 0)) {
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
        let gridOffsetY = window.gameInfo ? gameInfo.gridOffset : 0;
        let yForGrid = m.y - gridOffsetY;

        let { row, col } = grid.getGridPos(m.x, yForGrid);

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
