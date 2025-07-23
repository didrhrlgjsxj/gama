import { MineralPiece, Storage } from './Resource.js';

class Worker {
    constructor(x, y, type = 'A') {
        this.x = x;
        this.y = y;
        this.type = type; // 'A' or 'B'
        this.team = 'blue';
        this.size = 20;
        this.speed = 1.5;
        this.carrying = null;
        this.target = null;
        this.buildComplete = false;
        this.ghost = false;
        this.buildOrder = null;
        this.selected = false;
        this.manualTarget = null;
    }

    moveTo(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > this.speed) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
            return false;
        } else {
            this.x = x;
            this.y = y;
            return true;
        }
    }

    update(patches, pieces, storages) {
        if (this.manualTarget) {
            if (this.moveTo(this.manualTarget.x, this.manualTarget.y)) {
                this.manualTarget = null;
            }
            return;
        }
        if (this.type === 'A') {
            this.updateGatherer(patches, pieces, storages);
        } else {
            this.updateBuilder(storages);
        }
        if (this.carrying) {
            this.carrying.x = this.x;
            this.carrying.y = this.y - this.size;
        }
    }

    updateGatherer(patches, pieces, storages) {
        if (!this.carrying) {
            if (!this.target) {
                let closest = null;
                let dist = Infinity;
                patches.forEach(p => {
                    const d = Math.hypot(p.x - this.x, p.y - this.y);
                    if (d < dist) { dist = d; closest = p; }
                });
                this.target = closest;
            }
            if (this.target) {
                if (this.moveTo(this.target.x, this.target.y)) {
                    const piece = new MineralPiece(this.target.x, this.target.y);
                    pieces.push(piece);
                    this.carrying = piece;
                }
            }
        } else {
            const storage = storages[0];
            if (storage) {
                if (this.moveTo(storage.x, storage.y)) {
                    const idx = pieces.indexOf(this.carrying);
                    if (idx !== -1) pieces.splice(idx, 1);
                    this.carrying = null;
                    this.target = null;
                    window.blueMinerals += 1;
                }
            }
        }
    }

    updateBuilder(storages) {
        if (this.buildOrder) {
            const buildPos = this.buildOrder.pos;
            if (this.moveTo(buildPos.x, buildPos.y)) {
                if (this.buildOrder.type === 'storage') {
                    storages.push(new Storage(buildPos.x, buildPos.y));
                }
                this.buildOrder = null;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        if (this.ghost) ctx.globalAlpha = 0.5;
        if (this.selected) {
            ctx.shadowColor = 'blue';
            ctx.shadowBlur = 10;
        }
        ctx.fillStyle = '#3333ff';
        if (this.type === 'A') {
            ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        } else {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - this.size / 2);
            ctx.lineTo(this.x + this.size / 2, this.y + this.size / 2);
            ctx.lineTo(this.x - this.size / 2, this.y + this.size / 2);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }
}

export default Worker;
