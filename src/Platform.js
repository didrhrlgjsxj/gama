// Platform.js
import { mainGrid } from './main.js';  // mainGrid를 가져옵니다.
import HitEffect, { mixWithBlack } from './HitEffect.js';
import MuzzleFlash from './MuzzleFlash.js';

class Platform {
    constructor(parent, type = "move") {
        this.parent = parent;
        this.baseDistance = 60;  // 기본 거리
        this.maxDistance = 120;  // 최대 확장 거리
        this.currentDistance = this.baseDistance;
        this.angle = 0;          // 현재 각도
        this.lastAngle = 0;
        this.targetAngle = 0;
        this.mode2 = "idle";         // 모드: "idle", "moveOn", "return", "attackOn" (상태관련)
        this.type = type;
        this.attackRate = 5; //10초에 x 번
        
        // 물리적 속성 추가
        this.speed = 0;          // 현재 속도
        this.maxSpeed = 5;       // 최대 속도
        this.acceleration = 0.7; // 가속도
        this.deceleration = 0.3; // 감속도
        
        // 플랫폼의 절대 좌표 (Nemo와 독립적)
        this.x = parent.x + Math.cos(this.angle) * this.baseDistance;
        this.y = parent.y + Math.sin(this.angle) * this.baseDistance;
    }
    

    // 입력 방향 설정 (라디안)
    keyInputAngle(newAngle) {
        this.angle = newAngle;
        this.lastAngle = this.angle;
    }

    reset() {
        this.mode = "return"; // 복귀 모드 활성화
    }

    update() {
        // 공통 업데이트 로직
        const dx = this.parent.x - this.x;
        const dy = this.parent.y - this.y;
        this.currentDistance = Math.hypot(dx, dy);
        const baseAngle = Math.atan2(dy, dx) + Math.PI; //실시간 네모의 이동방향 결정

        if (this.mode === "moveOn") {
            // 가속 구간 ==========================================
            this.speed += this.acceleration;
            if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;

            // 직선 운동 계산
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;

        } else if (this.mode === "return") {
            // 감속 및 복귀 구간 ==================================
            this.speed -= this.deceleration;
            if (this.speed < 0) this.speed = 0;

            // Nemo 주변 기본 위치 계산

            const targetX = this.parent.x + Math.cos(this.lastAngle) * this.baseDistance;
            const targetY = this.parent.y + Math.sin(this.lastAngle) * this.baseDistance;

            // 부드러운 복귀
            this.x += (targetX - this.x) * 0.1;
            this.y += (targetY - this.y) * 0.1;

            if (Math.hypot(targetX - this.x, targetY - this.y) < 2) {
                this.mode = "idle"; // 복귀 완료
            }
        }
    }

    draw(ctx) { /* 기존 코드 유지 */ }
}

class MovePlatform extends Platform {
    constructor(parent) {
        super(parent, "move");
        this.width = 30;
        this.height = 10;
        this.moveMagnitude = 0; // moveVector 크기를 저장할 프로퍼티 추가
        this.destination = null; // 이동 목표 지점
        if (!MovePlatform.offCanvas) {
            const c = document.createElement('canvas');
            c.width = this.width;
            c.height = this.height;
            const ictx = c.getContext('2d');
            ictx.fillStyle = 'black';
            ictx.fillRect(0, 0, this.width, this.height);
            MovePlatform.offCanvas = c;
        }
    }

    update() {
        super.update(); // 플랫폼 공통 업데이트

        // 목적지가 설정된 경우 그 방향으로 이동
        if (this.destination) {
            const dx = this.destination.x - this.x;
            const dy = this.destination.y - this.y;
            const dist = Math.hypot(dx, dy);
            // 플랫폼이 목표 지점에 근접하면 더 이상 끌지 않고 복귀
            const haltRange = 10;
            if (dist < haltRange) {
                this.destination = null;
                this.mode = "return";
            } else {
                this.angle = Math.atan2(dy, dx);
                this.mode = "moveOn";
            }
        }

        // 거리 제한 (Nemo로부터 최대 거리 초과 방지)
        const distance = Math.hypot(this.x - this.parent.x, this.y - this.parent.y);
        if (distance > this.maxDistance) {
            const angle = Math.atan2(this.y - this.parent.y, this.x - this.parent.x);
            this.x = this.parent.x + Math.cos(angle) * this.maxDistance;
            this.y = this.parent.y + Math.sin(angle) * this.maxDistance;
        }

    }

    draw(ctx) {

        // 무브 플랫폼 빔(선) 그리기: moveMagnitude가 0보다 클 때, Nemo와 플랫폼 사이를 연결
        if (this.moveMagnitude > 0) {
            ctx.save();
            // 연한 초록색(투명도 포함)로 선을 설정
            ctx.strokeStyle = "rgba(134, 221, 134, 0.75)"; // lightgreen with 50% opacity
            // 선의 두께는 moveMagnitude에 비례 (필요에 따라 배율 조절)

            ctx.lineWidth = this.moveMagnitude * 3; 
            ctx.beginPath();
            ctx.moveTo(this.parent.x, this.parent.y);
            ctx.lineTo(this.x, this.y);
            ctx.stroke();
            ctx.restore();
        }


        ctx.save();
        ctx.translate(this.x, this.y);
        const angleToNemo = Math.atan2(
            this.parent.y - this.y,
            this.parent.x - this.x
        );
        ctx.rotate(angleToNemo + Math.PI/2); // 항상 Nemo를 향하도록 회전
        ctx.drawImage(MovePlatform.offCanvas, -this.width/2, -this.height/2);
        ctx.restore();
    }
}

MovePlatform.offCanvas = null;


// AttackPlatform은 Platform을 상속받아 공격 관련 로직을 추가합니다.
class AttackPlatform extends Platform {
    constructor(parent, slotAngle = null, onHand = false) {
        super(parent, "attack");
        this.onHand = onHand;
        if (this.onHand) {
            // 손에 들린 무기는 네모와 거의 붙어있으므로 기본 거리를 축소
            this.baseDistance = this.parent.size / 2;
            this.maxDistance = this.baseDistance;
        }
        this.enemyAngle = 0; // 적의 방향 저장

        // 공격 관련 설정
        this.attackSpeed = 1; // 초당 발사 수
        this.attackPower = 4; // 공격력
        this.baseMaxRange = 1000; // 최대 사거리
        this.baseEffectiveRange = 500; // 유효 사거리
        this.accuracyWeight = 0.5; // 명중률 보간 가중치 (0~1, 높을수록 근거리에서 강해짐)
        this.lastShot = 0;
        this.hitSize = 6;

        // 이펙트 관리용 배열
        this.effects = [];
        this.hitEffectDuration = 20;
        this.muzzleColor = this.parent.team === 'red'
            ? 'rgba(60,0,0,0.7)'
            : 'rgba(0,0,60,0.7)';

        // 유닛 무기의 기본 위치를 네모 중심 기준 오른쪽으로 살짝 이동
        this.rightOffset = (this.parent.size / 10) * 3;

        // 발사 반동 효과를 위한 오프셋 값
        this.recoilOffset = 0;

        // 팀 색상에 따른 오프스크린 무기 이미지 생성
        this.gunCanvas = AttackPlatform.getGunCanvas(this.parent.team);
        this.gunLength = this.gunCanvas.width;

        // 고정 배치 각도(라디안). null이면 기존 동작 유지
        this.slotAngle = slotAngle;
    }

    getMuzzlePosition() {
        const len = this.gunLength / 2;
        return {
            x: this.x + Math.cos(this.angle) * (len + this.recoilOffset),
            y: this.y + Math.sin(this.angle) * (len + this.recoilOffset)
        };
    }

    // On-hand 무기의 위치를 부모 기준으로 계산하여 업데이트합니다.
    _updateOnHandPosition() {
        this.angle = this.parent.angle;
        this.x = this.parent.x + Math.cos(this.angle) * this.baseDistance
            + Math.cos(this.angle + Math.PI / 2) * this.rightOffset;
        this.y = this.parent.y + Math.sin(this.angle) * this.baseDistance
            + Math.sin(this.angle + Math.PI / 2) * this.rightOffset;
    }

    keyInputAngle(newAngle) {
        if (!this.parent.nearestEnemy) {
            this.angle = newAngle;
            this.mode = "moveOn";
            this.lastAngle = this.angle;
        }
    }

    update() {
        let targetAngle;
        const enemy = this.parent.nearestEnemy;

        // 1. 위치 및 목표 각도 결정
        if (this.onHand) { // 손에 든 무기 (unit)
            this._updateOnHandPosition();
            targetAngle = enemy ? Math.atan2(enemy.y - this.parent.y, enemy.x - this.parent.x) : this.parent.angle;
        } else { // 고정된 무기 (army)
            const baseAngle = this.parent.angle + this.slotAngle;
            this.x = this.parent.x + Math.cos(baseAngle) * this.baseDistance;
            this.y = this.parent.y + Math.sin(baseAngle) * this.baseDistance;
            targetAngle = enemy ? Math.atan2(enemy.y - this.y, enemy.x - this.x) : this.parent.angle;
        }

        // 2. 각도 보간 및 조준 상태(mode2) 업데이트
        let angleDiff = targetAngle - this.angle;
        // 각도 차이를 -PI ~ PI 범위로 정규화하여 최단 경로로 회전
        angleDiff = ((angleDiff + Math.PI) % (2 * Math.PI)) - Math.PI;

        const aimTolerance = Math.PI / 30; // 조준 허용 오차 (약 6도)
        if (enemy && Math.abs(angleDiff) < aimTolerance) {
            this.mode2 = 'attackOn';
            this.angle = targetAngle; // 조준 완료 시 각도 고정
        } else {
            this.mode2 = 'idle';
            // 부드러운 회전
            this.angle += angleDiff * 0.1;
        }

        // 3. 공격 및 이펙트 처리
        this.handleShooting(enemy);
        this.updateEffects();
    }

    handleShooting(targetEnemy) {

        // 공격 처리: 사정거리 내 적이 있고 조준이 완료되었을 때 즉발 공격
        if (targetEnemy && this.mode2 === 'attackOn') {
            const now = Date.now();
            const dx = targetEnemy.x - this.x;
            const dy = targetEnemy.y - this.y;
            const distanceToTarget = Math.hypot(dx, dy);

            if (distanceToTarget <= this.parent.calculatedMaxRange && (now - this.lastShot) >= 1000 / this.attackSpeed) {
                if (targetEnemy.team !== this.parent.team && targetEnemy.takeDamage) {
                    // 거리에 따른 데미지 보간 계산
                    let damageMultiplier = 1.0;
                    if (distanceToTarget > this.parent.calculatedEffectiveRange) {
                        // 유효 사거리를 벗어나면 데미지가 감소
                        const rangeRatio = (distanceToTarget - this.parent.calculatedEffectiveRange) / (this.parent.calculatedMaxRange - this.parent.calculatedEffectiveRange);
                        const clampedRatio = Math.max(0, Math.min(1, rangeRatio));
                        damageMultiplier = 1 - (clampedRatio * this.accuracyWeight);
                    }
                    const finalDamage = this.attackPower * damageMultiplier;
                    targetEnemy.takeDamage(finalDamage);
                }

                const hitAngle = Math.atan2(targetEnemy.y - this.y, targetEnemy.x - this.x);
                const perp = hitAngle + Math.PI / 2;
                const offset = targetEnemy.size / 2;
                const rand = (Math.random() - 0.5) * targetEnemy.size * 0.8;
                const hx = targetEnemy.x - Math.cos(hitAngle) * offset + Math.cos(perp) * rand;
                const hy = targetEnemy.y - Math.sin(hitAngle) * offset + Math.sin(perp) * rand;
                const color = mixWithBlack(targetEnemy.borderColor || targetEnemy.fillColor || 'black', 0.5);
                this.effects.push(new HitEffect(hx, hy, this.hitSize, hitAngle, color, this.hitEffectDuration));
                this.lastShot = now;
                // 발사 시 총구가 뒤로 밀리는 효과
                this.recoilOffset = -15;
                // 총구 섬광 이펙트 생성
                this.effects.push(new MuzzleFlash(this, this.muzzleColor, 10));
            }
        }
    }

    updateEffects() {
        this.effects = this.effects.filter(e => {
            e.update();
            return !e.isDone();
        });

        // 반동으로 밀린 총구가 원위치하도록 회복
        if (this.recoilOffset < 0) {
            this.recoilOffset += this.attackSpeed;
            if (this.recoilOffset > 0) this.recoilOffset = 0;
        }
    }

    draw(ctx) {
        super.draw(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.drawImage(this.gunCanvas, -this.gunCanvas.width / 2 + this.recoilOffset, -this.gunCanvas.height / 2);
        ctx.restore();
    }

    drawEffects(ctx) {
        this.effects.forEach(e => e.draw(ctx));
    }
}

AttackPlatform.gunCache = {};
AttackPlatform.getGunCanvas = function(team) {
    const key = team;
    if (!this.gunCache[key]) {
        const canvas = document.createElement('canvas');
        const width = 40;
        const height = 16;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const color = team === 'red' ? 'darkred' : 'darkblue';
        ctx.fillStyle = color;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        const bodyW = width * 0.6;
        const bodyH = height * 0.6;
        ctx.fillRect(0, (height - bodyH) / 2, bodyW, bodyH);
        ctx.strokeRect(0, (height - bodyH) / 2, bodyW, bodyH);
        const barrelW = width * 0.4;
        const barrelH = height * 0.25;
        ctx.fillRect(bodyW, (height - barrelH) / 2, barrelW, barrelH);
        ctx.strokeRect(bodyW, (height - barrelH) / 2, barrelW, barrelH);
        this.gunCache[key] = canvas;
    }
    return this.gunCache[key];
};

export { Platform, MovePlatform, AttackPlatform };