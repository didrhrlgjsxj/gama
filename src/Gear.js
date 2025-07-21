class Gear {
    constructor(nemo, size = nemo.size * 0.4 * 1.5) {
        this.nemo = nemo;
        this.size = size;
        this.angle = 0;
    }

    update() {
        // 회전 속도는 네모의 활동량에 비례
        this.angle += this.nemo.activity * 0.2;
    }

    getTeethCount() {
        if (this.nemo.unitType === 'unit') return 2;
        if (this.nemo.unitType === 'army') {
            switch (this.nemo.armyType) {
                case 'squad':
                case 'sqaudio':
                    return 3;
                case 'platoon':
                    return 4;
                case 'company':
                    return 6;
            }
        }
        return 8;
    }

    draw(ctx) {
        ctx.save();
        ctx.rotate(this.angle);
        const r = this.size / 2;
        const inner = r * 0.6;
        const teeth = this.getTeethCount();
        ctx.fillStyle = 'lightgray';
        ctx.strokeStyle = 'gray';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, inner, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < teeth; i++) {
            const a = i * 2 * Math.PI / teeth;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            ctx.stroke();
        }
        ctx.restore();
    }
}

export default Gear;
