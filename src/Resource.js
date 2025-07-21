class MineralPatch {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 20;
    }

    draw(ctx) {
        ctx.fillStyle = 'skyblue';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

class MineralPiece {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 6;
        this.carried = false;
    }

    draw(ctx) {
        ctx.fillStyle = 'cyan';
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }
}

class Storage {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 40;
    }

    draw(ctx) {
        ctx.fillStyle = 'brown';
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }
}

export { MineralPatch, MineralPiece, Storage };
