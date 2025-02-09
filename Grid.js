// Grid.js

class Grid {
    constructor(cellSize) {
        this.cellSize = cellSize; // 셀 크기 설정
        this.gridWidth = window.innerWidth / this.cellSize; // 그리드의 가로 크기
        this.gridHeight = window.innerHeight / this.cellSize; // 그리드의 세로 크기
    }

    draw(ctx) {
        ctx.save();
        ctx.strokeStyle = "red"; // 빨간색 선 설정
        ctx.lineWidth = 1;

        // 가로선 그리기
        for (let x = 0; x <= this.gridWidth; x++) {
            ctx.beginPath();
            ctx.moveTo(x * this.cellSize, 0);
            ctx.lineTo(x * this.cellSize, window.innerHeight);
            ctx.stroke();
        }

        // 세로선 그리기
        for (let y = 0; y <= this.gridHeight; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * this.cellSize);
            ctx.lineTo(window.innerWidth, y * this.cellSize);
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
