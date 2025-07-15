// Platform.js
import { mainGrid } from './main.js';  // mainGrid를 가져옵니다.
import Bullet from './Bullet.js';

class Platform {
    constructor(parent, type = "move") {
        this.parent = parent;
        this.baseDistance = 60;  // 기본 거리
        this.maxDistance = 120;  // 최대 확장 거리
        this.currentDistance = this.baseDistance;
        this.angle = 0;          // 현재 각도
        this.lastAngle = 0;
        this.targetAngle = 0;
        this.mode = "idle";      // 모드: "idle", "moveOn", "return", "attackOn" (이동관련)
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
        this.mode = "moveOn"; // 이동 모드 활성화
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

        if (this.mode === "moveOn" ||  this.mode2 === "moveOn") {
            // 가속 구간 ==========================================
            this.speed += this.acceleration;
            if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;

            // 직선 운동 계산
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;

        } else if (this.mode === "return" || this.mode2 === "return") {
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
                this.mode2 = "idle";
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
    }

    update() {
        super.update(); // 플랫폼 공통 업데이트

        // 거리 제한 (Nemo로부터 최대 거리 초과 방지)
        const distance = Math.hypot(this.x - this.parent.x, this.y - this.parent.y);
        if (distance > this.maxDistance) {
            const angle = Math.atan2(this.y - this.parent.y, this.x - this.parent.x);
            this.x = this.parent.x + Math.cos(angle) * this.maxDistance;
            this.y = this.parent.y + Math.sin(angle) * this.maxDistance;
        }

        // 네모 이동: currentDistance가 기본거리보다 클 경우
        if (this.currentDistance > this.baseDistance) { // 네모 이동
            const moveMagnitude = (this.currentDistance - this.baseDistance) * this.parent.maxSpeed / 50;
            const pullAngle = Math.atan2(this.y - this.parent.y, this.x - this.parent.x);
            this.parent.moveVector = {
                x: Math.cos(pullAngle) * moveMagnitude,
                y: Math.sin(pullAngle) * moveMagnitude
            };
            this.moveMagnitude = moveMagnitude; // moveMagnitude를 저장 (선 두께 결정에 사용)
        } else {
            this.parent.moveVector = { x: 0, y: 0 };
            this.moveMagnitude = 0;
        }
        
    }

    draw(ctx) {

        // 빔(선) 그리기: moveMagnitude가 0보다 클 때, Nemo와 플랫폼 사이를 연결
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


        ctx.fillStyle = "black"; //플랫폼 그리기
        ctx.save();
        ctx.translate(this.x, this.y);
        const angleToNemo = Math.atan2(
            this.parent.y - this.y,
            this.parent.x - this.x
        );
        ctx.rotate(angleToNemo + Math.PI/2); // 항상 Nemo를 향하도록 회전
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        ctx.restore();
    }
}


// AttackPlatform은 Platform을 상속받아 공격 관련 로직을 추가합니다.
class AttackPlatform extends Platform {
    constructor(parent) {
        super(parent, "attack");
        this.enemyAngle = 0; // 적의 방향 저장

        // 공격 관련 설정
        this.attackSpeed = 1;    // 초당 발사 수
        this.attackRange = 800;  // 사정거리
        this.attackPower = 1;    // 공격력
        this.bulletSpeed = 30;
        this.lastShot = 0;
        this.bullets = [];

        // 팀에 따른 이미지 로드
        const prefix = this.parent.team === 'red' ? 'Red' : 'Blue';
        this.inImage = new Image();
        this.outImage = new Image();
        this.inImage.src = `images/${prefix}_in_gun.png`;
        this.outImage.src = `images/${prefix}_out_gun.png`;
    }

    keyInputAngle(newAngle) {
        if (!this.parent.nearestEnemy) {
            this.angle = newAngle;
            this.mode = "moveOn";
            this.lastAngle = this.angle;
        }
    }

    update() {
        // 공통 위치 업데이트
        super.update();

        if (this.parent.unitType === "unit") {
            // 유닛 타입은 부모의 각도를 그대로 따른다
            this.angle = this.parent.angle;
            this.x = this.parent.x + Math.cos(this.angle) * this.baseDistance;
            this.y = this.parent.y + Math.sin(this.angle) * this.baseDistance;

            if (this.parent.nearestEnemy) {
                const dx = this.parent.nearestEnemy.x - this.parent.x;
                const dy = this.parent.nearestEnemy.y - this.parent.y;
                const enemyAngle = Math.atan2(dy, dx);
                let diff = enemyAngle - this.angle;
                diff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;
                this.mode2 = Math.abs(diff) < Math.PI / 30 ? "attackOn" : "idle";
            } else {
                this.mode2 = "idle";
            }
            // 이후 로직 진행 가능
        }

        let targetAngle;

        if (this.parent.nearestEnemy) {
            // 적이 있으면 적 방향으로만 회전
            const dx = this.parent.nearestEnemy.x - this.parent.x;
            const dy = this.parent.nearestEnemy.y - this.parent.y;
            targetAngle = Math.atan2(dy, dx);
        } else {
            // 적이 없으면 네모의 현재 angle을 그대로 따라감
            this.angle = this.parent.angle; // 즉시 갱신
            this.x = this.parent.x + Math.cos(this.angle) * this.baseDistance;
            this.y = this.parent.y + Math.sin(this.angle) * this.baseDistance;
            this.mode2 = "idle";
            return; // 조기 종료 (아래 회전 로직 생략)
        }

        // 적이 있을 경우에만 회전 로직 실행
        let angleDiff = targetAngle - this.angle;
        angleDiff = ((angleDiff + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;

        if (Math.abs(angleDiff) < Math.PI / 30) {
            this.mode2 = "attackOn";
        } else {
            this.mode2 = "idle";
        }

        this.angle += angleDiff * 0.1;

        this.x = this.parent.x + Math.cos(this.angle) * this.baseDistance;
        this.y = this.parent.y + Math.sin(this.angle) * this.baseDistance;

        // 공격 처리: 사정거리 내 적이 있고 조준이 완료되었을 때 총알 발사
        if (this.parent.nearestEnemy && this.mode2 === 'attackOn') {
            const now = Date.now();
            const dx = this.parent.nearestEnemy.x - this.x;
            const dy = this.parent.nearestEnemy.y - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist <= this.attackRange && (now - this.lastShot) >= 1000 / this.attackSpeed) {
                this.bullets.push(new Bullet(this.x, this.y, this.angle, this.bulletSpeed, this.attackRange));
                this.lastShot = now;
            }
        }

        // 총알 업데이트 및 충돌 처리
        this.bullets = this.bullets.filter(bullet => {
            bullet.update();
            // 적 충돌 검사
            for (const enemy of this.parent.allEnemies || []) {
                if (enemy.team !== this.parent.team) {
                    const dx = bullet.x - enemy.x;
                    const dy = bullet.y - enemy.y;
                    if (Math.hypot(dx, dy) < enemy.size / 2) {
                        enemy.hp -= this.attackPower;
                        return false;
                    }
                }
            }
            return bullet.traveled < bullet.range;
        });
    }

    draw(ctx) {
        super.draw(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        if (this.outImage.complete) {
            ctx.drawImage(this.outImage, -this.outImage.width / 2, -this.outImage.height / 2);
        }
        if (this.inImage.complete) {
            ctx.drawImage(this.inImage, -this.inImage.width / 2, -this.inImage.height / 2);
        }
        ctx.restore();

        // 총알 그리기
        this.bullets.forEach(b => b.draw(ctx));
    }
}

export { Platform, MovePlatform, AttackPlatform };
