class Bullet {
    constructor(x, y, angle, speed, range) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.range = range;
        this.traveled = 0;
        this.size = 6;
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.traveled += this.speed;
    }

    draw(ctx) {
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }
}

export default Bullet;
