// NemoSquadManager.js

// This file provides a small manager that automatically groups Nemos
// by distance. Groups are called "Nemo_squad".  Nemos within
// 5 grid cells from each other (considering chain connection) form a
// squad.  The squad size is limited so that its bounding box does not
// exceed 20 grid cells.
const SquadSizes = {
    SQUAD: 'squad',       // 2-5 Nemos
    TROOP: 'troop',     // 6-12 Nemos
    PLATOON: 'platoon',   // 13-30 Nemos
    COMPANY: 'company'    // 31+ Nemos
};


class NemoSquad {
    constructor(nemos = [], team = 'blue', cellSize = 40) {
        this.nemos = nemos;
        this.team = team;
        this.cellSize = cellSize;
        this.selected = false;

        this.type = this.determineSquadSize();
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

    determineSquadSize() {
        let weightedSize = 0;
        this.nemos.forEach(nemo => {
            if (nemo.unitType === 'army') {
                switch (nemo.armyType) {
                    case 'sqaudio':
                        weightedSize += 3;
                        break;
                    case 'platoon':
                        weightedSize += 10;
                        break;
                    case 'company':
                        weightedSize += 23;
                        break;
                    default:
                        weightedSize += 1; // 다른 army 타입은 1로 계산
                }
            } else {
                weightedSize += 1; // 'unit' 타입은 1로 계산
            }
        });

        if (weightedSize >= 2 && weightedSize <= 5) {
            return SquadSizes.SQUAD;
        } else if (weightedSize >= 6 && weightedSize <= 12) {
            return SquadSizes.TROOP;
        } else if (weightedSize >= 13 && weightedSize <= 30) {
            return SquadSizes.PLATOON;
        } else if (weightedSize >= 31) {
            return SquadSizes.COMPANY;
        }
        return null; // Or handle the case where the size doesn't fit any type

    }

    calculateOrganization() {
        // This is a placeholder, replace with actual combat effectiveness logic
        // For example, consider Nemo's role, distance to other squad members, etc.
        let total = 0;
        this.nemos.forEach(n => {
            total += n.hp / 45; // Assuming max hp is 45, adjust as needed
        });
        return Math.min(1, total / this.nemos.length); // Normalize to 0-1 range
    }

    calculateDurability() {
        let totalHealth = 0;
        this.nemos.forEach(n => {
            totalHealth += n.hp;
        });
        return totalHealth;
    }

    getMaxDurability() {
        return this.nemos.length * 45;
    }

    // Draw translucent rectangle covering all nemos in the squad
    draw(ctx) {

        if (!this.bounds) return;
        const { x, y, w, h } = this.bounds;
        ctx.save();

        const stroke = this.team === 'red' ? 'darkred' : 'darkblue';
        const fill = this.team === 'red'
            ? 'rgba(255,0,0,0.15)'
            : 'rgba(0,0,255,0.15)';
        ctx.strokeStyle = stroke;
        ctx.fillStyle = fill;
        ctx.lineWidth = this.selected ? 4 : 2;
        if (this.selected) {
            ctx.shadowColor = stroke;
            ctx.shadowBlur = 10;
        }
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.restore()
        
        // Display squad type
        if (this.nemos.length) {
            ctx.save();
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';

            ctx.fillText(this.type, x + w / 2, y - 10);
            ctx.restore();
        }

        // Draw Health Bar
        if (this.nemos.length) {
            ctx.save();

            // Health Bar Dimensions
            const barWidth = 8;
            const barHeight = 40;
            const barX = x + w + 5; // Position to the right of the squad
            const barY = y;

            // Calculate health ratios
            const organizationRatio = this.calculateOrganization();
            const durabilityRatio = this.calculateDurability() / this.getMaxDurability();

            // Draw Durability Bar (Light Brown)
            ctx.fillStyle = 'peru'; // Light Brown
            ctx.fillRect(barX + barWidth, barY + (1 - durabilityRatio) * barHeight, barWidth, durabilityRatio * barHeight);

            // Draw Organization Bar (Green)
            ctx.fillStyle = 'green';
            ctx.fillRect(barX, barY + (1 - organizationRatio) * barHeight, barWidth, organizationRatio * barHeight);

            // Health Bar Outline
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barWidth * 2, barHeight);

            ctx.restore();
        }
    }
}

class NemoSquadManager {
    constructor(gridCellSize = 40) {
        this.squads = [];
        this.cellSize = gridCellSize;
        this.linkDist = this.cellSize * 15;
        this.maxGroup = this.cellSize * 40;
    }

    // Get random member of a squad
    getRandomSquadMember(squad) {
        if (!squad || !squad.nemos || squad.nemos.length === 0) {
            return null; // Or handle the case where the squad is empty
        }
        const randomIndex = Math.floor(Math.random() * squad.nemos.length);
        return squad.nemos[randomIndex];
    }

    applyDamageToSquad(squad, damage) {
        const targetMember = this.getRandomSquadMember(squad);
        if (targetMember) {
            // TODO: targetMember.takeDamage(damage);
        }    }

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
            squad.nemos.forEach(n => n.squad = squad);
            squad.idString = squad.nemos.map(n => n.id).sort((a,b) => a-b).join(',');
            const old = oldSquads.find(s => s.idString === squad.idString);
            if (old) squad.selected = old.selected;
            // enforce max group size
            while (squad.bounds && (squad.bounds.w > this.maxGroup || squad.bounds.h > this.maxGroup)) {
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



export { SquadSizes };
export { NemoSquadManager, NemoSquad };
