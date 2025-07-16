class MuzzleFlash {
    constructor(platform, color, duration = 10) {
        this.platform = platform;
        this.color = color;
        this.duration = duration;
        this.age = 0;
    }

    update() {
        this.age++;
    }

    draw(ctx) {
        const progress = this.age / this.duration;
        const size = 20 * (1 - progress);
        const alpha = 1 - progress;
        const px = this.platform.x + Math.cos(this.platform.angle) * this.platform.recoilOffset;
        const py = this.platform.y + Math.sin(this.platform.angle) * this.platform.recoilOffset;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(this.platform.angle);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isDone() {
        return this.age >= this.duration;
    }
}

export default MuzzleFlash;
