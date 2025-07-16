class HitEffect {
    constructor(x, y, bulletSize, duration = 20) {
        this.x = x;
        this.y = y;
        this.maxSize = bulletSize * 6; // roughly twice the width of three bullets
        this.duration = duration;
        this.age = 0;
    }

    update() {
        this.age++;
    }

    draw(ctx) {
        const progress = this.age / this.duration;
        const size = this.maxSize * progress;
        const alpha = 0.5 * (1 - progress);
        ctx.save();
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        ctx.fillRect(this.x - size / 2, this.y - size / 2, size, size);
        ctx.restore();
    }

    isDone() {
        return this.age >= this.duration;
    }
}

export default HitEffect;
