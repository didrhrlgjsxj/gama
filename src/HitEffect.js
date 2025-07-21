// Returns a color string blended with black by the given ratio (0~1)
function mixWithBlack(color, ratio = 0.7) {
    const canvas = document.createElement('canvas');
    const c = canvas.getContext('2d');
    c.fillStyle = color;
    const rgb = c.fillStyle.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!rgb) return color;
    const r = Math.floor(parseInt(rgb[1], 10) * ratio);
    const g = Math.floor(parseInt(rgb[2], 10) * ratio);
    const b = Math.floor(parseInt(rgb[3], 10) * ratio);
    return `rgb(${r},${g},${b})`;
}

class HitEffect {
    constructor(x, y, bulletSize, angle, targetColor, duration = 20) {
        this.squares = [];
        this.size = bulletSize * 1.2;
        this.duration = duration;
        this.age = 0;

        const color = mixWithBlack(targetColor, 0.7);
        for (let i = 0; i < 6; i++) {
            const spread = (Math.random() - 0.5) * Math.PI; // +/-90deg
            this.squares.push({
                x,
                y,
                angle: angle + Math.PI + spread,
                speed: 1 + Math.random() * 1.5,
                color
            });
        }
    }

    update() {
        this.age++;
        this.squares.forEach(s => {
            s.x += Math.cos(s.angle) * s.speed;
            s.y += Math.sin(s.angle) * s.speed;
        });
    }

    draw(ctx) {
        const alpha = 1 - this.age / this.duration;
        ctx.save();
        ctx.globalAlpha = alpha;
        this.squares.forEach(s => {
            ctx.fillStyle = s.color;
            ctx.fillRect(s.x - this.size / 2, s.y - this.size / 2, this.size, this.size);
        });
        ctx.restore();
    }

    isDone() {
        return this.age >= this.duration;
    }
}

export { mixWithBlack };

export default HitEffect;
