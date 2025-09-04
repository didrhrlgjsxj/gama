// SquadManager.js

// This file provides a small manager that automatically groups Nemos
// by distance. Groups are called "squad".  Nemos within
// 5 grid cells from each other (considering chain connection) form a squad.
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

class Squad {
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
        this.primaryCombatTarget = null; // 주 경계 대상
        this.secondaryCombatTargets = []; // 보조 경계 대상 (나를 주 경계 대상으로 삼는 다른 스쿼드들)
        this.isHeadOnBattle = false; // 정면 전투 상태

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

   addNemos(newNemos) {
       this.nemos.push(...newNemos);
       newNemos.forEach(n => n.squad = this);
   }

   update() {
       this.updateBounds();
       this.squadCenter = { x: this.bounds.x + this.bounds.w / 2, y: this.bounds.y + this.bounds.h / 2 };
       this.updateSquadMovement();
       this.updateDirections();
       this.updateFormation();
   }

   setDestination(pos) {
       this.squadDestination = pos;
       this.nemos.forEach(n => {
           n.clearAttackMove();
           n.destination = null; // 개별 목적지 초기화
           n.ignoreEnemies = true; // 이동 명령 시 적 무시
       });
       // 이동 명령 시 기존 전투 상태 초기화
       this.primaryCombatTarget = null;
       this.secondaryCombatTargets = [];
       this.isHeadOnBattle = false;
       // 이동 명령 시, 스쿼드의 현재 중심을 가상 중심으로 설정
       this.squadCenter.x = this.bounds.x + this.bounds.w / 2;
       this.squadCenter.y = this.bounds.y + this.bounds.h / 2;
   }

   updateSquadMovement() {
       this.delta = { x: 0, y: 0 };
       if (!this.squadDestination) return;

       // 스쿼드의 실제 중심(바운딩 박스 기준)이 목표에 도달했는지 확인
       const currentCenterX = this.bounds.x + this.bounds.w / 2;
       const currentCenterY = this.bounds.y + this.bounds.h / 2;
       const dx = this.squadDestination.x - currentCenterX;
       const dy = this.squadDestination.y - currentCenterY;
       const dist = Math.hypot(dx, dy);

       if (dist <= this.squadSpeed * 2) { // 도착 판정 거리 (유닛들이 멈출 수 있도록 여유를 줌)
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
                return 0.3; // 가장 느림
            case SquadSizes.PLATOON:
                return 0.5;
            case SquadSizes.TROOP:
                return 0.9;
            case SquadSizes.SQUAD:
                return 1.3; // 가장 빠름
            default:
                return 1;
        }
    }

    updateDirections() {
        const rotationSpeed = this.getRotationSpeed();

        const centerX = this.bounds.x + this.bounds.w / 2;
        const centerY = this.bounds.y + this.bounds.h / 2;

        if (this.primaryCombatTarget) {
            // 주 경계 대상이 있으면, 대상을 향해 방향을 설정
            const targetCenter = this.primaryCombatTarget.bounds;
            const targetX = targetCenter.x + targetCenter.w / 2;
            const targetY = targetCenter.y + targetCenter.h / 2;
            const dx = targetX - centerX;
            const dy = targetY - centerY;
            this.targetDirection = Math.atan2(dy, dx);
        } else {
            // 주 경계 대상이 없으면, 스쿼드의 실제 이동 방향(관성)을 따른다.
            const dx = centerX - this.lastCenter.x;
            const dy = centerY - this.lastCenter.y;
            if (Math.hypot(dx, dy) > 1) { // 이동 거리가 충분할 때만 방향 갱신
                this.targetDirection = Math.atan2(dy, dx);
            }
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

        // 진형의 기준점은 스쿼드의 실제 중심과 목표 지점을 향하는 가상 중심으로 결정
        const currentCenter = { x: this.bounds.x + this.bounds.w / 2, y: this.bounds.y + this.bounds.h / 2 };
        const dx = this.squadDestination.x - currentCenter.x;
        const dy = this.squadDestination.y - currentCenter.y;
        const dist = Math.hypot(dx, dy);
        const step = Math.min(this.squadSpeed, dist);

        // 각 네모가 이동할 목표 진형의 중심점 (현재 위치에서 목표 방향으로 약간 앞서 나감)
        const formationCenter = { x: currentCenter.x + (dx / dist) * step, y: currentCenter.y + (dy / dist) * step };
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

        // 정면 전투 시 화살표 그리기
        if (this.isHeadOnBattle && this.primaryCombatTarget) {
            const myCenter = { x: this.bounds.x + this.bounds.w / 2, y: this.bounds.y + this.bounds.h / 2 };
            const targetCenter = { x: this.primaryCombatTarget.bounds.x + this.primaryCombatTarget.bounds.w / 2, y: this.primaryCombatTarget.bounds.y + this.primaryCombatTarget.bounds.h / 2 };
            const midPoint = { x: (myCenter.x + targetCenter.x) / 2, y: (myCenter.y + targetCenter.y) / 2 };

            const angle = Math.atan2(targetCenter.y - myCenter.y, targetCenter.x - myCenter.x);
            const arrowLength = 40;
            const arrowWidth = 20;

            ctx.save();
            ctx.strokeStyle = 'white';
            ctx.fillStyle = this.team === 'red' ? 'rgba(255, 100, 100, 0.7)' : 'rgba(100, 100, 255, 0.7)';
            ctx.lineWidth = 8;

            // 내 스쿼드에서 중간 지점으로 향하는 화살표
            ctx.beginPath();
            ctx.moveTo(myCenter.x, myCenter.y);
            ctx.lineTo(midPoint.x, midPoint.y);
            ctx.stroke();

            // 화살표 머리
            ctx.beginPath();
            ctx.moveTo(midPoint.x, midPoint.y);
            ctx.lineTo(midPoint.x - arrowLength * Math.cos(angle - Math.PI / 6), midPoint.y - arrowLength * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(midPoint.x - arrowLength * Math.cos(angle + Math.PI / 6), midPoint.y - arrowLength * Math.sin(angle + Math.PI / 6));
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // 보조 경계 대상 (방어적 교전)에 대한 화살표 그리기
        this.secondaryCombatTargets.forEach(secondaryTarget => {
            const myCenter = { x: this.bounds.x + this.bounds.w / 2, y: this.bounds.y + this.bounds.h / 2 };
            const targetCenter = { x: secondaryTarget.bounds.x + secondaryTarget.bounds.w / 2, y: secondaryTarget.bounds.y + secondaryTarget.bounds.h / 2 };
            
            // 만나는 지점을 내 스쿼드 쪽에 가깝게 (20%)
            const midPoint = { 
                x: myCenter.x * 0.8 + targetCenter.x * 0.2, 
                y: myCenter.y * 0.8 + targetCenter.y * 0.2 
            };

            const angleToMe = Math.atan2(myCenter.y - targetCenter.y, myCenter.x - targetCenter.x);
            const arrowLength = 40;

            ctx.save();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 6; // 정면 전투보다 약간 얇게

            // 상대방(공격자)의 화살표 (뾰족함)
            ctx.fillStyle = secondaryTarget.team === 'red' ? 'rgba(255, 100, 100, 0.7)' : 'rgba(100, 100, 255, 0.7)';
            ctx.beginPath();
            ctx.moveTo(targetCenter.x, targetCenter.y);
            ctx.lineTo(midPoint.x, midPoint.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(midPoint.x, midPoint.y);
            ctx.lineTo(midPoint.x - arrowLength * Math.cos(angleToMe - Math.PI / 6), midPoint.y - arrowLength * Math.sin(angleToMe - Math.PI / 6));
            ctx.lineTo(midPoint.x - arrowLength * Math.cos(angleToMe + Math.PI / 6), midPoint.y - arrowLength * Math.sin(angleToMe + Math.PI / 6));
            ctx.closePath();
            ctx.fill();

            // 내(방어자) 화살표 (둥글게)
            ctx.fillStyle = this.team === 'red' ? 'rgba(255, 100, 100, 0.7)' : 'rgba(100, 100, 255, 0.7)';
            ctx.beginPath();
            ctx.moveTo(myCenter.x, myCenter.y);
            ctx.lineTo(midPoint.x, midPoint.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(midPoint.x, midPoint.y, 15, angleToMe - Math.PI / 2, angleToMe + Math.PI / 2);
            ctx.fill();

            ctx.restore();
        });

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
            ctx.setLineDash([]); // 점선 초기화

            // 주 경계 대상이 없을 때만 주/보조 경계 방향을 그립니다.
            if (!this.primaryCombatTarget) {
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
            }
            ctx.restore();
        }
        
        // Display squad type
        if (this.nemos.length && this.type) {
            ctx.save();
            ctx.fillStyle = 'black';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';

            ctx.fillText(this.type, x + w / 2, y - 12);
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

class SquadManager {
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

    mergeSelectedSquads() {
        const selected = this.squads.filter(s => s.selected);
        if (selected.length < 2) return null;

        const newNemos = [];
        const team = selected[0].team;

        selected.forEach(s => {
            newNemos.push(...s.nemos);
            s.nemos = []; // 기존 스쿼드에서 네모 제거
        });

        // 선택 해제 및 기존 스쿼드 제거
        this.squads = this.squads.filter(s => !s.selected);

        const newSquad = new Squad(newNemos, team, this.cellSize);
        newSquad.nemos.forEach(n => n.squad = newSquad);
        newSquad.selected = true;
        this.squads.push(newSquad);
        return newSquad;
    }

    // Build squads from given nemos array
    updateSquads(nemos) {
        const recognitionRange = 800; // 스쿼드 인식 범위
        this.squads.forEach(s => s.update());

        // 스쿼드별 주 경계 대상 및 정면 전투 상태 설정
        this.squads.forEach(squad => {
            let nearestEnemySquad = null;
            let minDistance = recognitionRange;

            this.squads.forEach(otherSquad => {
                if (squad.team !== otherSquad.team) {
                    const squadCenterX = squad.bounds.x + squad.bounds.w / 2;
                    const squadCenterY = squad.bounds.y + squad.bounds.h / 2;
                    const otherSquadCenterX = otherSquad.bounds.x + otherSquad.bounds.w / 2;
                    const otherSquadCenterY = otherSquad.bounds.y + otherSquad.bounds.h / 2;

                    const distance = Math.hypot(squadCenterX - otherSquadCenterX, squadCenterY - otherSquadCenterY);

                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestEnemySquad = otherSquad;
                    }
                }
            });

            squad.primaryCombatTarget = nearestEnemySquad;
        });

        // 정면 전투 상태 확인
        this.squads.forEach(squad => {
            squad.isHeadOnBattle = false;
            squad.secondaryCombatTargets = [];

            if (squad.primaryCombatTarget && squad.primaryCombatTarget.primaryCombatTarget === squad) {
                squad.isHeadOnBattle = true;
            }

            // 나를 주 경계 대상으로 삼는 다른 스쿼드들을 찾는다.
            this.squads.forEach(otherSquad => {
                if (otherSquad.team !== squad.team && otherSquad.primaryCombatTarget === squad && !squad.isHeadOnBattle) {
                    squad.secondaryCombatTargets.push(otherSquad);
                }
            });
        });
    }

    draw(ctx) {
        this.squads.forEach(g => g.draw(ctx));
    }

}



export { SquadSizes };
export { SquadManager, Squad };
