const GRID_CONFIG = {
    cols: 8,
    radius: 30,
    diameter: 60,
    rowHeight: 51.96,
    startX: 30,
    startY: 40
};

const DIRS_ODD = [
    [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, 0], [1, 1]
];

const DIRS_EVEN = [
    [-1, -1], [-1, 0],
    [0, -1], [0, 1],
    [1, -1], [1, 0]
];

class Grid {
    constructor() {
        this.cells = [];
        this.offsetParity = 0;
    }

    isOddRow(row) {
        return (row + this.offsetParity) % 2 !== 0;
    }

    init(rows) {
        this.cells = [];
        this.offsetParity = 0;
        for (let r = 0; r < rows; r++) {
            this.cells[r] = [];
            let cols = this.isOddRow(r) ? GRID_CONFIG.cols - 1 : GRID_CONFIG.cols;
            for (let c = 0; c < cols; c++) {
                this.cells[r][c] = null;
            }
        }
    }

    addMarble(marble) {
        while (this.cells.length <= marble.row) {
            let r = this.cells.length;
            let cols = this.isOddRow(r) ? GRID_CONFIG.cols - 1 : GRID_CONFIG.cols;
            this.cells.push(new Array(cols).fill(null));
        }
        this.cells[marble.row][marble.col] = marble;
    }

    getMarble(row, col) {
        if (row >= 0 && row < this.cells.length && col >= 0 && col < this.cells[row].length) {
            return this.cells[row][col];
        }
        return null;
    }

    getScreenPos(row, col) {
        let x = col * GRID_CONFIG.diameter + GRID_CONFIG.startX;
        if (this.isOddRow(row)) {
            x += GRID_CONFIG.radius;
        }
        let y = row * GRID_CONFIG.rowHeight + GRID_CONFIG.startY;
        return { x, y };
    }

    getGridPos(x, y) {
        let row = Math.round((y - GRID_CONFIG.startY) / GRID_CONFIG.rowHeight);
        row = Math.max(0, row);

        let xOffset = this.isOddRow(row) ? GRID_CONFIG.radius : 0;
        let col = Math.round((x - GRID_CONFIG.startX - xOffset) / GRID_CONFIG.diameter);

        let maxCols = this.isOddRow(row) ? GRID_CONFIG.cols - 1 : GRID_CONFIG.cols;
        col = Math.max(0, Math.min(col, maxCols - 1));

        return { row, col };
    }

    getNeighbors(row, col) {
        const isOdd = this.isOddRow(row);
        const dirs = isOdd ? DIRS_ODD : DIRS_EVEN;

        let neighbors = [];
        for (let d of dirs) {
            let r = row + d[0];
            let c = col + d[1];
            if (r >= 0 && r < this.cells.length) {
                let maxCols = this.isOddRow(r) ? GRID_CONFIG.cols - 1 : GRID_CONFIG.cols;
                if (c >= 0 && c < maxCols) {
                    neighbors.push({ row: r, col: c });
                }
            }
        }
        return neighbors;
    }

    draw(ctx) {
        for (let r = 0; r < this.cells.length; r++) {
            for (let c = 0; c < this.cells[r].length; c++) {
                if (this.cells[r][c]) {
                    this.cells[r][c].draw(ctx);
                }
            }
        }
    }
}
