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

// 각도를 부드럽게 보간하는 헬퍼 함수
function lerpAngle(start, end, amount) {
    let difference = end - start;
    if (difference > Math.PI) difference -= 2 * Math.PI;
    if (difference < -Math.PI) difference += 2 * Math.PI;
    return start + difference * amount;
}

class NemoSquad {
    constructor(nemos = [], team = 'blue', cellSize = 40) {
        this.nemos = nemos;
        this.team = team;
        this.cellSize = cellSize;
        this.selected = false;
        this.squadDestination = null; // 스쿼드 전체의 목표 지점
        this.formationPositions = new Map(); // 네모 ID별 진형 위치

        this.squadCenter = { x: 0, y: 0 }; // 스쿼드의 가상 중심
        this.squadSpeed = 3; // 스쿼드의 이동 속도
        this.delta = { x: 0, y: 0 }; // 프레임당 이동량

        this.targetDirection = 0; // 목표 이동 방향 (라디안)
        this.lastCenter = { x: 0, y: 0 };

        this.primaryDirection = 0;
        this.secondaryDirections = [
            { currentAngle: -Math.PI / 2, targetOffset: -Math.PI / 2 },
            { currentAngle: Math.PI / 2, targetOffset: Math.PI / 2 }
        ];

        this.type = this.determineSquadSize();
        this.updateBounds(); // 초기 lastCenter 설정
   }

   update() {
       this.updateBounds();
       this.updateSquadMovement();
       this.updateDirections();
       this.updateFormation();
   }

   setDestination(pos) {
       this.squadDestination = pos;
       this.nemos.forEach(n => {
           n.clearAttackMove();
           n.destination = null; // 개별 목적지 초기화
       });
       // 이동 명령 시, 스쿼드의 현재 중심을 가상 중심으로 설정
       this.squadCenter.x = this.bounds.x + this.bounds.w / 2;
       this.squadCenter.y = this.bounds.y + this.bounds.h / 2;
   }

   updateSquadMovement() {
       this.delta = { x: 0, y: 0 };
       if (!this.squadDestination) return;

       const dx = this.squadDestination.x - this.squadCenter.x;
       const dy = this.squadDestination.y - this.squadCenter.y;
       const dist = Math.hypot(dx, dy);

       if (dist > 5) { // 도착 판정 거리
           const step = Math.min(this.squadSpeed, dist);
           this.delta.x = (dx / dist) * step;
           this.delta.y = (dy / dist) * step;

           this.squadCenter.x += this.delta.x;
           this.squadCenter.y += this.delta.y;
       } else {
           // 목표 도착 시 squadDestination 초기화
           this.squadDestination = null;
       }
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

    getRotationSpeed() {
        // 스쿼드 타입에 따라 회전 속도 조절
        switch (this.type) {
            case SquadSizes.COMPANY:
                return 0.08; // 가장 느림
            case SquadSizes.PLATOON:
                return 0.12;
            case SquadSizes.TROOP:
                return 2;
            case SquadSizes.SQUAD:
                return 3; // 가장 빠름
            default:
                return 0.2;
        }
    }

    updateDirections() {
        const rotationSpeed = this.getRotationSpeed();

        const centerX = this.bounds.x + this.bounds.w / 2;
        const centerY = this.bounds.y + this.bounds.h / 2;

        // 목표 지점이 없으면, 스쿼드의 실제 이동 방향(관성)을 따른다.
        const dx = centerX - this.lastCenter.x;
        const dy = centerY - this.lastCenter.y;
        if (Math.hypot(dx, dy) > 1) { // 이동 거리가 충분할 때만 방향 갱신
            this.targetDirection = Math.atan2(dy, dx);
        }
        this.lastCenter = { x: centerX, y: centerY };

        // 주 경계 방향을 부드럽게 회전
        this.primaryDirection = lerpAngle(this.primaryDirection, this.targetDirection, rotationSpeed);

        // 보조 경계 방향들을 부드럽게 회전
        this.secondaryDirections.forEach(dir => {
            const targetAngle = this.targetDirection + dir.targetOffset;
            dir.currentAngle = lerpAngle(dir.currentAngle, targetAngle, rotationSpeed);
        });
    }

    updateFormation() {
        if (!this.squadDestination) {
            if (this.formationPositions.size > 0) this.nemos.forEach(n => n.destination = null);
            this.formationPositions.clear();
            return;
        }

        // 진형의 기준점은 스쿼드의 가상 중심
        const formationCenter = this.squadCenter;
        const direction = this.primaryDirection;
        const spacing = this.cellSize * 1.5; // 유닛 간 간격

        // 리더를 정하고 정렬 (예: ID가 가장 낮은 네모)
        const sortedNemos = [...this.nemos].sort((a, b) => a.id - b.id);

        let leftCount = 0;
        let rightCount = 0;

        for (let i = 0; i < sortedNemos.length; i++) {
            const nemo = sortedNemos[i];
            // 리더는 진형의 중심에 위치
            if (i === 0) {
                this.formationPositions.set(nemo.id, { ...formationCenter });
                continue;
            }

            const sideAngle = Math.PI / 6; // V 모양의 각도

            if (i % 2 === 1) { // 왼쪽
                leftCount++;
                const angle = direction - sideAngle;
                const dist = spacing * leftCount;
                this.formationPositions.set(nemo.id, { x: formationCenter.x + Math.cos(angle) * dist, y: formationCenter.y + Math.sin(angle) * dist });
            } else { // 오른쪽
                rightCount++;
                const angle = direction + sideAngle;
                const dist = spacing * rightCount;
                this.formationPositions.set(nemo.id, { x: formationCenter.x + Math.cos(angle) * dist, y: formationCenter.y + Math.sin(angle) * dist });
            }
        }
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

        // 주/보조 경계 방향 그리기
        if (this.nemos.length > 0) {
            const centerX = x + w / 2;
            const centerY = y + h / 2;
            const lineLength = this.cellSize * 3;

            ctx.save();

            // 이동 방향 (파란색) - 스쿼드의 실제 이동 방향
            ctx.strokeStyle = 'blue';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]); // 점선으로 표시
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX + Math.cos(this.targetDirection) * lineLength * 1.2, centerY + Math.sin(this.targetDirection) * lineLength * 1.2);
            ctx.stroke();

            // 주 경계 방향 (초록색)
            ctx.strokeStyle = 'green';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX + Math.cos(this.primaryDirection) * lineLength, centerY + Math.sin(this.primaryDirection) * lineLength);
            ctx.stroke();

            // 보조 경계 방향 (주황색)
            ctx.strokeStyle = 'orange';
            ctx.lineWidth = 2;
            this.secondaryDirections.forEach(dir => {
                const angle = dir.currentAngle;
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(centerX + Math.cos(angle) * lineLength, centerY + Math.sin(angle) * lineLength);
                ctx.stroke();
            });
            ctx.restore();
        }
        
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
        oldSquads.forEach(s => s.update()); // Draw 전에 방향 업데이트
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
            squad.update(); // 새로 생성된 스쿼드도 방향 업데이트
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
                if (squad.squadDestination) removed[0].setDestination(squad.squadDestination.x, squad.squadDestination.y);
                squad.update();
                const extra = new NemoSquad(removed, nemo.team, this.cellSize);
                extra.idString = extra.nemos.map(n => n.id).sort((a,b) => a-b).join(',');
                const oldExtra = oldSquads.find(s => s.idString === extra.idString);
                if (oldExtra) extra.selected = oldExtra.selected;
                extra.update();
                this.squads.push(extra);
            }
            squad.update();
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
