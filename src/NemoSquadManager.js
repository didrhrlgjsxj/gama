// NemoSquadManager.js

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
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        this.nemos.forEach(n => {
            const half = n.size / 2;
            minX = Math.min(minX, n.x - half);
            maxX = Math.max(maxX, n.x + half);
            minY = Math.min(minY, n.y - half);
            maxY = Math.max(maxY, n.y + half);
        });
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
        const stroke = this.team === 'red' ? 'darkred' : 'darkblue';
        ctx.strokeStyle = stroke;
        ctx.lineWidth = this.selected ? 4 : 2;
        if (this.selected) {
            ctx.shadowColor = stroke;
            ctx.shadowBlur = 10;
        }
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
    }
}

class NemoSquadManager {
    constructor(gridCellSize = 40) {
        this.squads = [];
        this.cellSize = gridCellSize;
        this.linkDist = this.cellSize * 15;
        this.maxGroup = this.cellSize * 40;
    }

    // Build squads from given nemos array
    updateSquads(nemos) {
        const oldSquads = this.squads;
        this.squads = [];
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
            squad.idString = squad.nemos.map(n => n.id).sort((a,b) => a-b).join(',');
            const old = oldSquads.find(s => s.idString === squad.idString);
            if (old) squad.selected = old.selected;
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
                const extra = new NemoSquad(removed, nemo.team, this.cellSize);
                extra.idString = extra.nemos.map(n => n.id).sort((a,b) => a-b).join(',');
                const oldExtra = oldSquads.find(s => s.idString === extra.idString);
                if (oldExtra) extra.selected = oldExtra.selected;
                this.squads.push(extra);
            }
            squad.updateBounds();
            squad.idString = squad.nemos.map(n => n.id).sort((a,b) => a-b).join(',');
            const existing = oldSquads.find(s => s.idString === squad.idString);
            if (existing) squad.selected = existing.selected;
            this.squads.push(squad);
        }
    }

    draw(ctx) {
        this.squads.forEach(g => g.draw(ctx));
    }
}

export { NemoSquadManager, NemoSquad };
