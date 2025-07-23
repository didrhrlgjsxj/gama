import { Platform, MovePlatform, AttackPlatform } from './Platform.js';  // MovePlatform과 AttackPlatform을 가져옵니다.
import Grid from './Grid.js'; // Grid를 임포트
import { mainGrid, deathEffects } from './main.js';  // mainGrid와 deathEffects를 가져옵니다.
import Gear from './Gear.js';
import ShatterEffect from './ShatterEffect.js';
import { MineralPiece, Storage } from './Resource.js';

class Nemo {
    static nextId = 1;
    static canvasCache = {};
    static shieldCache = {};

    static createOffscreen(unitType, color, size) {
        const key = `${unitType}_${color}`;
        if (!this.canvasCache[key]) {
            const canvas = document.createElement('canvas');
            const margin = 6;
            canvas.width = size + margin;
            canvas.height = size + margin;
            const ctx = canvas.getContext('2d');
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.translate(canvas.width / 2, canvas.height / 2);
            if (unitType === 'unit') {
                const h = size / 2;
                ctx.beginPath();
                ctx.moveTo(0, -h);
                ctx.lineTo(h * 0.6, -h * 0.3);
                ctx.lineTo(h, 0);
                ctx.lineTo(h * 0.6, h);
                ctx.lineTo(-h * 0.6, h);
                ctx.lineTo(-h, 0);
                ctx.lineTo(-h * 0.6, -h * 0.3);
                ctx.closePath();
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
                ctx.stroke();
            }
            this.canvasCache[key] = canvas;
        }
        return this.canvasCache[key];
    }

    static createShieldCanvas(unitType, size) {
        const key = `shield_${unitType}_${size}`;
        if (!this.shieldCache[key]) {
            const canvas = document.createElement('canvas');
            const margin = 10;
            canvas.width = size + margin;
            canvas.height = size + margin;
            const ctx = canvas.getContext('2d');
            ctx.strokeStyle = 'skyblue';
            ctx.lineWidth = 4;
            ctx.translate(canvas.width / 2, canvas.height / 2);
            if (unitType === 'unit') {
                const h = size / 2;
                ctx.beginPath();
                ctx.moveTo(0, -h);
                ctx.lineTo(h * 0.6, -h * 0.3);
                ctx.lineTo(h, 0);
                ctx.lineTo(h * 0.6, h);
                ctx.lineTo(-h * 0.6, h);
                ctx.lineTo(-h, 0);
                ctx.lineTo(-h * 0.6, -h * 0.3);
                ctx.closePath();
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
                ctx.stroke();
            }
            this.shieldCache[key] = canvas;
        }
        return this.shieldCache[key];
    }
    constructor(x, y, team = "blue", platformTypes = ["move"], unitType = "army", armyType = "sqaudio", role = "ranged", hasShield = true) {
        this.id = Nemo.nextId++;
        this.x = x;
        this.y = y;
        this.angle = 0;          // 현재 각도
        this.size = 50;
        this.speed = 0;
        this.maxSpeed = 3;      // Nemo의 최고 속도
        this.team = team;
        this.moveVector = 0;
        this.unitType = unitType;
        this.armyType = armyType;
        this.role = role;
        this.squad = null; // reference to NemoSquad

        this.hp = 45;
        this.shieldMaxHp = hasShield ? 10 : 0;
        this.shieldHp = this.shieldMaxHp;
        this.shieldStrength = 2; //쉴드 강도 (최종 피해 = 받는 피해 - 강도)
        this.dead = false;      // 사망 여부
        this.selected = false;  // 선택 여부
        this.destination = null; // 이동 목표 위치
        this.attackMove = false;
        this.ignoreEnemies = false; // 이동 중 전투 금지 플래그
        this.attackTargets = [];
        this.attackMovePos = null;
        this.shieldFlash = 0; // shield flash timer when shield is depleted

        // 적을 감지하는 범위
        this.recognitionRange = 400;

        // unit 타입일 경우 회전 및 이동을 직접 제어하기 위한 프로퍼티
        this.targetAngle = 0;
        this.rotationSpeed = Math.PI / (0.4 * 60); // 뒤돌기 약 0.4초 기준
        if (this.unitType === "unit") {
            this.moving = false;
            this.reverse = false; // 뒤로 이동 여부
            this.hp = 30;
        }

        // 팀에 따른 색상 설정: fillColor는 연한 색, borderColor는 진한 색
        if (team === "red") {
            this.fillColor = "white";
            this.borderColor = "darkred";
        } else {
            this.fillColor = "white";
            this.borderColor = "darkblue";
        }

        // 오프스크린 캔버스 생성
        this.offscreen = Nemo.createOffscreen(this.unitType, this.borderColor, this.size);
        this.shieldCanvas = Nemo.createShieldCanvas(this.unitType, this.size + 6);

        // 활동량과 기어 초기화
        this.activity = 0;
        this.gear = new Gear(this);

        // 플랫폼 타입을 파라미터로 받아서 해당 타입에 맞는 플랫폼을 생성
        const attackCount = platformTypes.filter(t => t === "attack").length;
        let attackIndex = 0;
        const step = attackCount > 0 ? (2 * Math.PI / attackCount) : 0;
        const start = attackCount % 2 === 0 ? step / 2 : 0;
        this.platforms = platformTypes.map(type => {
            if (type === "move") return new MovePlatform(this);
            if (type === "attack") {
                if (attackCount === 1) {
                    // 단일 공격 플랫폼은 네모가 손에 들고 있는 무기(On-hand)
                    return new AttackPlatform(this, null, true);
                } else {
                    // 다수의 공격 플랫폼은 고정 위치에 배치되는 Off-hand 무기
                    const angle = start + attackIndex * step;
                    attackIndex++;
                    return new AttackPlatform(this, angle, false);
                }
            }
        });

        // 가장 긴 사정거리 저장
        this.maxAttackRange = 0;
        this.platforms.forEach(p => {
            if (p instanceof AttackPlatform && p.attackRange > this.maxAttackRange) {
                this.maxAttackRange = p.attackRange;
            }
        });

        // unit 타입의 이동 명령 관련 메서드
        this.setMoveCommand = (angle, reverse = false) => {
            if (this.unitType === "unit") {
                this.targetAngle = angle;
                this.moving = true;
                this.reverse = reverse;
            }
        };

        this.clearMoveCommand = () => {
            if (this.unitType === "unit") {
                this.moving = false;
                this.reverse = false;
            }
        };

        // 공통 입력 처리 메서드
        this.handleMoveInput = (angle, reverse = false) => {
            if (this.unitType === "army") {
                this.platforms.forEach(p => p.keyInputAngle(angle));
            } else {
                this.setMoveCommand(angle, reverse);
            }
        };

        this.resetMoveInput = () => {
            if (this.unitType === "army") {
                this.platforms.forEach(p => p.reset());
            } else {
                this.clearMoveCommand();
            }
        };

        this.setDestination = (x, y) => {
            this.destination = { x, y };
            const moveP = this.platforms.find(p => p instanceof MovePlatform);
            if (moveP) {
                moveP.destination = { x, y };
            }
        };

        this.startAttackMove = (targets = [], pos = null, propagate = true) => {
            if (propagate && this.squad) {
                this.squad.nemos.forEach(n => {
                    if (n !== this) n.startAttackMove(targets, pos, false);
                });
            }
            this.attackMove = true;
            this.ignoreEnemies = false;
            this.attackTargets = targets;
            this.attackMovePos = pos;
            if (targets.length > 0) {
                const t = targets[0];
                this.setDestination(t.x, t.y);
            } else if (pos) {
                this.setDestination(pos.x, pos.y);
            }
        };

        this.clearAttackMove = () => {
            this.attackMove = false;
            this.attackTargets = [];
            this.attackMovePos = null;
            this.ignoreEnemies = false;
        };

        this.rotateTowards = (angle) => {
            let diff = angle - this.angle;
            diff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;
            if (Math.abs(diff) <= this.rotationSpeed) {
                this.angle = angle;
                return true;
            } else {
                this.angle += Math.sign(diff) * this.rotationSpeed;
                return false;
            }
        };

        // 자신을 그리드에 추가할 수 있다면 그리드에 추가
        //MainGrid.addEntity(this); 
    }

    // 적을 찾는 함수
    findNearestEnemy(enemies) {
        let nearestEnemy = null;
        let minDistance = this.recognitionRange;

        enemies.forEach(enemy => {
            if (enemy !== this && enemy.team !== this.team) {  // 같은 팀이 아닌 경우만 적으로 간주
                let dx = enemy.x - this.x;
                let dy = enemy.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < minDistance) {
                    minDistance = distance;
                    nearestEnemy = enemy;
                }
            }
        });

        return nearestEnemy;
    }

    // 현재 방향에서 공격 플랫폼을 고려한 최대 사거리 계산
    getMaxAttackDistance(angleToEnemy) {
        let maxDist = 0;
        this.platforms.forEach(p => {
            if (p instanceof AttackPlatform) {
                const muzzle = p.getMuzzlePosition();
                const offX = muzzle.x - this.x;
                const offY = muzzle.y - this.y;
                const parallel = offX * Math.cos(angleToEnemy) + offY * Math.sin(angleToEnemy);
                const perpSq = offX * offX + offY * offY - parallel * parallel;
                const reachSq = p.attackRange * p.attackRange - perpSq;
                if (reachSq >= 0) {
                    const candidate = parallel + Math.sqrt(reachSq);
                    if (candidate > maxDist) maxDist = candidate;
                }
            }
        });
        return maxDist;
    }

    // 현재 방향에서 모든 공격 플랫폼이 사정거리에 들기 위한 최대 거리 계산
    getMinAttackDistance(angleToEnemy) {
        let minDist = Infinity;
        this.platforms.forEach(p => {
            if (p instanceof AttackPlatform) {
                const muzzle = p.getMuzzlePosition();
                const offX = muzzle.x - this.x;
                const offY = muzzle.y - this.y;
                const parallel = offX * Math.cos(angleToEnemy) + offY * Math.sin(angleToEnemy);
                const perpSq = offX * offX + offY * offY - parallel * parallel;
                const reachSq = p.attackRange * p.attackRange - perpSq;
                if (reachSq >= 0) {
                    const candidate = parallel + Math.sqrt(reachSq);
                    if (candidate < minDist) minDist = candidate;
                }
            }
        });
        return minDist === Infinity ? 0 : minDist;
    }

    // 적과의 거리나 HP를 기준으로 상태를 업데이트
    update(enemies) {
        const prevX = this.x;
        const prevY = this.y;

        // 현재 시점의 모든 적 목록 저장 (AttackPlatform 등에서 사용)
        this.allEnemies = enemies;

        // 공격 명령이 내려진 경우 우선 공격 대상 목록에서 가장 가까운 적을 찾는다
        if (this.attackMove) {
            this.attackTargets = this.attackTargets.filter(t => !t.dead);
            const pool = this.attackTargets.length > 0
                ? this.attackTargets
                : enemies.filter(e => {
                    if (e === this || e.team === this.team) return false;
                    const d = Math.hypot(e.x - this.x, e.y - this.y);
                    return d <= this.recognitionRange;
                });
            let nearest = null;
            let minDist = Infinity;
            pool.forEach(t => {
                const d = Math.hypot(t.x - this.x, t.y - this.y);
                if (d < minDist) { minDist = d; nearest = t; }
            });
            this.nearestEnemy = nearest;
            if (nearest) {
                // 목표까지 이동하되 사정거리에 도달하면 멈춘다
                const dx = nearest.x - this.x;
                const dy = nearest.y - this.y;
                const dist = Math.hypot(dx, dy);
                this.targetAngle = Math.atan2(dy, dx);

                // 모든 공격 플랫폼이 닿을 수 있는 거리를 고려해 약간 가까이 멈춘다
                const buffer = 20; // 계산 오차를 줄이기 위한 여유 거리
                const desiredRange = this.getMinAttackDistance(this.targetAngle) - buffer;

                if (dist > desiredRange) {
                    this.setDestination(nearest.x, nearest.y);
                } else {
                    this.destination = null;
                }
            } else if (this.attackMovePos) {
                // 지정 위치로 이동
                const dx = this.attackMovePos.x - this.x;
                const dy = this.attackMovePos.y - this.y;
                const dist = Math.hypot(dx, dy);
                this.targetAngle = Math.atan2(dy, dx);
                if (dist > 5) {
                    this.setDestination(this.attackMovePos.x, this.attackMovePos.y);
                } else {
                    this.clearAttackMove();
                }
            } else {
                this.clearAttackMove();
            }
        } else {
            // 일반 상태에서는 주변의 가장 가까운 적을 추적
            this.nearestEnemy = this.findNearestEnemy(enemies);
            if (this.nearestEnemy) {
                const dx = this.nearestEnemy.x - this.x;
                const dy = this.nearestEnemy.y - this.y;
                const dist = Math.hypot(dx, dy);
                if (!this.attackMove && !this.ignoreEnemies && dist <= this.recognitionRange) {
                    this.startAttackMove([this.nearestEnemy], {x: this.nearestEnemy.x, y: this.nearestEnemy.y});
                }
                if (this.unitType === "unit") {
                    this.targetAngle = Math.atan2(dy, dx);
                }
            }
        }

        if (this.destination && this.unitType !== "army") {
            const dx = this.destination.x - this.x;
            const dy = this.destination.y - this.y;
            const dist = Math.hypot(dx, dy);
            const ang = Math.atan2(dy, dx);
            this.targetAngle = ang;
            this.rotateTowards(this.targetAngle);
            const step = Math.min(this.maxSpeed, dist);
            this.x += Math.cos(this.angle) * step;
            this.y += Math.sin(this.angle) * step;
            if (dist <= this.maxSpeed) {
                this.x = this.destination.x;
                this.y = this.destination.y;
                this.destination = null;
                this.ignoreEnemies = false;
                const moveP = this.platforms.find(p => p instanceof MovePlatform);
                if (moveP) {
                    moveP.destination = null;
                    moveP.mode = "return";
                }
                if (this.attackMove && this.attackTargets.length === 0 && !this.attackMovePos) {
                    this.clearAttackMove();
                }
            }
        }


        // 각 플랫폼에 대해 업데이트 (플랫폼 내부에서 네모의 위치를 업데이트합니다)
        this.platforms.forEach(platform => platform.update());

        // 온핸드 무기가 사격 중인지 확인
        const isShooting = this.platforms.some(p =>
            p instanceof AttackPlatform && p.onHand && p.mode2 === 'attackOn');

    

        if (this.hp <= 0 && !this.dead) {
            this.destroyed(); // HP가 0이 되면 네모가 죽는다
        }

        if (this.unitType === "army") {
            if (!isShooting && this.moveVector && (this.moveVector.x || this.moveVector.y)) {
                this.x += this.moveVector.x;
                this.y += this.moveVector.y;
                const mag = Math.hypot(this.moveVector.x, this.moveVector.y);
                if (mag > 0.01) {
                    this.targetAngle = Math.atan2(this.moveVector.y, this.moveVector.x);
                }
            } else if (!isShooting && this.destination) {
                const dx = this.destination.x - this.x;
                const dy = this.destination.y - this.y;
                const dist = Math.hypot(dx, dy);
                const step = Math.min(this.maxSpeed, dist);
                const ang = Math.atan2(dy, dx);
                this.targetAngle = ang;
                this.rotateTowards(this.targetAngle);
                this.x += Math.cos(this.angle) * step;
                this.y += Math.sin(this.angle) * step;
            }
            if (this.destination) {
                const dist = Math.hypot(this.destination.x - this.x, this.destination.y - this.y);
                if (dist < 5) {
                    this.x = this.destination.x;
                    this.y = this.destination.y;
                    this.destination = null;
                    this.ignoreEnemies = false;
                    const moveP = this.platforms.find(p => p instanceof MovePlatform);
                    if (moveP) {
                        moveP.destination = null;
                        moveP.mode = "return";
                    }
                    if (this.attackMove && this.attackTargets.length === 0 && !this.attackMovePos) {
                        this.clearAttackMove();
                    }
                }
            }
        }

        const turned = this.rotateTowards(this.targetAngle);

        if (this.unitType === "unit" && this.moving && turned && !isShooting) {
            const dir = this.reverse ? -1 : 1;
            this.x += Math.cos(this.angle) * this.maxSpeed * dir;
            this.y += Math.sin(this.angle) * this.maxSpeed * dir;
        }

        if (this.shieldFlash > 0) this.shieldFlash--;

        const moved = Math.hypot(this.x - prevX, this.y - prevY) > 0.1;
        const activePlatform = this.platforms.some(p => p.mode !== 'idle' || p.mode2 !== 'idle');
        if (moved || activePlatform) {
            this.activity = Math.min(1, this.activity + 0.05);
        } else {
            this.activity = Math.max(0, this.activity - 0.02);
        }
        this.gear.update();
    }

    takeDamage(amount) {
        const dmg = Math.max(0, amount - this.shieldStrength);
        if (this.shieldHp > 0) {
            if(dmg > 0){
                this.shieldHp -= dmg;
                if (this.shieldHp < 0) {
                    this.hp += this.shieldHp; // apply remaining damage
                    this.shieldHp = 0;
                }
            }
        } else {
            this.hp -= dmg;
        }
        if (this.shieldMaxHp > 0 && this.shieldHp <= 0) {
            this.shieldFlash = 10;
        }
    }

    // 네모가 죽을 때 호출되는 함수
    destroyed() {
        console.log(`${this.team} 팀의 네모가 사망했습니다!`);
        deathEffects.push(new ShatterEffect(this.x, this.y, this.size, this.borderColor));
        deathEffects.push(new ShatterEffect(this.x, this.y, this.gear.size, 'gray', 10));
        this.dead = true; // 사망 플래그 설정
        // 필요한 경우 추가적인 정리 작업을 여기서 수행할 수 있습니다.
    }
    
    draw(ctx) {
        // 플랫폼 본체와 총알을 먼저 그린다
        this.platforms.forEach(platform => platform.draw(ctx));

        // 가장 가까운 적이 있으면 화살표로 표시
        if (this.nearestEnemy) {
            ctx.strokeStyle = this.attackMove ? 'red' : 'yellow';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.nearestEnemy.x, this.nearestEnemy.y);
            ctx.stroke();
        }

        ctx.save();
        if (this.selected) {
            ctx.shadowColor = this.borderColor;
            ctx.shadowBlur = 10;
        }
        ctx.translate(this.x, this.y);
        if (this.unitType === 'unit') {
            ctx.rotate(this.angle + Math.PI / 2);
        }
        this.gear.draw(ctx);
        const img = this.offscreen;
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        // 쉴드는 남은 체력 또는 맞았을 때 잠시 표시된다
        if (this.shieldMaxHp > 0 && (this.shieldHp > 0 || this.shieldFlash > 0)) {
            const ratio = Math.max(0, this.shieldHp) / this.shieldMaxHp;
            const base = 2;
            const width = this.shieldHp > 0 ? base + ratio * 4 : base; // 파괴 후에는 얇게
            const alpha = this.shieldHp > 0 ? 0.6 : 0.3 * (this.shieldFlash / 10);
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = 'skyblue';
            ctx.lineWidth = width;
            ctx.beginPath();
            if (this.unitType === 'unit') {
                const h = this.size / 2 + 3;
                ctx.moveTo(0, -h);
                ctx.lineTo(h * 0.6, -h * 0.3);
                ctx.lineTo(h, 0);
                ctx.lineTo(h * 0.6, h);
                ctx.lineTo(-h * 0.6, h);
                ctx.lineTo(-h, 0);
                ctx.lineTo(-h * 0.6, -h * 0.3);
                ctx.closePath();
            } else {
                ctx.arc(0, 0, this.size / 2 + 3, 0, Math.PI * 2);
            }
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
        ctx.restore();

        // 네모가 그려진 후 이펙트를 전역 좌표계에서 그려 상위에 보이도록 한다
        this.platforms.forEach(p => {
            if (p.drawEffects) p.drawEffects(ctx);
        });
    }
}

export default Nemo;

// 기존 Worker.js의 코드를 통합하여 내보냅니다.

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

export { Worker };
