// Grid.js

class Grid {
    constructor(cellSize) {
        this.cellSize = cellSize; // 셀 크기 설정
        // 전체 그리드 영역을 기존보다 2배 넓게 설정
        this.gridWidth = (window.innerWidth * 2) / this.cellSize;
        this.gridHeight = (window.innerHeight * 2) / this.cellSize;
    }

    snap(x, y) {
        const sx = Math.round(x / this.cellSize) * this.cellSize;
        const sy = Math.round(y / this.cellSize) * this.cellSize;
        return { x: sx, y: sy };
    }

    draw(ctx) {
        ctx.save();
        ctx.strokeStyle = "green"; // 초록색 선 설정
        ctx.lineWidth = 1;

        // 가로선 그리기
        for (let x = 0; x <= this.gridWidth; x++) {
            ctx.beginPath();
            ctx.moveTo(x * this.cellSize, 0);
            ctx.lineTo(x * this.cellSize, window.innerHeight * 2);
            ctx.stroke();
        }

        // 세로선 그리기
        for (let y = 0; y <= this.gridHeight; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * this.cellSize);
            ctx.lineTo(window.innerWidth * 2, y * this.cellSize);
            ctx.stroke();
        }

        ctx.restore();
    }

    // 주변 엔티티 찾기 (예시로만 구현)
    static getNearbyEntities(x, y) {
        // 실제 구현 시, 그리드 내에 있는 객체들을 반환하도록 구현
        return [];
    }
}

export default Grid;
