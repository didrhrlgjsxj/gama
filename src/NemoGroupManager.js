// NemoGroupManager.js

// This file provides a small manager that automatically groups Nemos
// by distance. Groups are called "Nemo_squad".  Nemos within
// 5 grid cells from each other (considering chain connection) form a
// squad.  The squad size is limited so that its bounding box does not
// exceed 20 grid cells.

class NemoSquad {
    constructor(nemos = [], team = 'blue', cellSize = 40) {
        this.nemos = nemos;
        this.team = team;
        this.cellSize = cellSize;
        this.selected = false;
        this.updateBounds();
    }

    updateBounds() {
        if (this.nemos.length === 0) {
            this.bounds = {x:0, y:0, w:0, h:0};
            return;
        }
        const xs = this.nemos.map(n => n.x);
        const ys = this.nemos.map(n => n.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        this.bounds = {
            x: minX,
            y: minY,
            w: maxX - minX,
            h: maxY - minY
        };
    }

    // Draw translucent rectangle covering all nemos in the squad
    draw(ctx) {
        if (!this.bounds) return;
        const {x, y, w, h} = this.bounds;
        ctx.save();
        const fill = this.team === 'red'
            ? 'rgba(255, 0, 0, 0.1)'
            : 'rgba(0, 0, 255, 0.1)';
        const stroke = this.team === 'red' ? 'darkred' : 'darkblue';
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = this.selected ? 4 : 2;
        if (this.selected) {
            ctx.shadowColor = stroke;
            ctx.shadowBlur = 10;
        }
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
    }
}

class NemoGroupManager {
    constructor(gridCellSize = 40) {
        this.groups = [];
        this.cellSize = gridCellSize;
        this.linkDist = this.cellSize * 5;
        this.maxGroup = this.cellSize * 20;
    }

    // Build squads from given nemos array
    updateGroups(nemos) {
        this.groups = [];
        const visited = new Set();
        for (const nemo of nemos) {
            if (visited.has(nemo)) continue;
            const queue = [nemo];
            const squadNemos = [];
            visited.add(nemo);
            while (queue.length) {
                const current = queue.pop();
                squadNemos.push(current);
                for (const other of nemos) {
                    if (!visited.has(other) && other.team === nemo.team) {
                        const dist = Math.hypot(current.x - other.x, current.y - other.y);
                        if (dist <= this.linkDist) {
                            queue.push(other);
                            visited.add(other);
                        }
                    }
                }
            }
            const squad = new NemoSquad(squadNemos, nemo.team, this.cellSize);
            // enforce max group size
            while (squad.bounds.w > this.maxGroup || squad.bounds.h > this.maxGroup) {
                // remove farthest nemo until size fits
                let cx = squad.bounds.x + squad.bounds.w / 2;
                let cy = squad.bounds.y + squad.bounds.h / 2;
                let farIndex = -1;
                let farDist = -1;
                squad.nemos.forEach((n, idx) => {
                    const d = Math.hypot(n.x - cx, n.y - cy);
                    if (d > farDist) { farDist = d; farIndex = idx; }
                });
                const removed = squad.nemos.splice(farIndex, 1);
                squad.updateBounds();
                this.groups.push(new NemoSquad(removed, nemo.team, this.cellSize));
            }
            squad.updateBounds();
            this.groups.push(squad);
        }
    }

    draw(ctx) {
        this.groups.forEach(g => g.draw(ctx));
    }
}

export { NemoGroupManager, NemoSquad };
