// Platform.js
import { mainGrid } from './main.js';  // mainGrid를 가져옵니다.

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
    }

    // 🛠 사용자의 방향 입력을 무시하도록 변경
    keyInputAngle(newAngle) {
        if (!this.parent.nearestEnemy) { // 적이 없을 때만 동작
            this.angle = newAngle;
            this.mode = "moveOn";
            this.lastAngle = this.angle;
        }
    }

    update() {
        let targetAngle;

        if (this.parent.nearestEnemy) {
            // 적이 있으면 적 방향으로만 회전
            const dx = this.parent.nearestEnemy.x - this.parent.x;
            const dy = this.parent.nearestEnemy.y - this.parent.y;
            targetAngle = Math.atan2(dy, dx);
        } else {
            // 적이 없으면 네모의 방향을 따름
            targetAngle = this.parent.angle;
        }

        //  `angleDiff`를 -π ~ π 범위로 정규화
        let angleDiff = targetAngle - this.angle;
        angleDiff = ((angleDiff + Math.PI) % (2 * Math.PI)) - Math.PI;

        //  공격 모드 활성화 (±6도 이내면 "attackOn")
        if (Math.abs(angleDiff) < Math.PI / 30 && this.parent.nearestEnemy) {
            this.mode2 = "attackOn";
        } else {
            this.mode2 = "idle";
        }

        //  부드러운 회전 (Lerp 적용)
        this.angle += angleDiff * 0.1;

        //  네모를 중심으로 목표 위치 설정
        this.x = this.parent.x + Math.cos(this.angle) * this.baseDistance;
        this.y = this.parent.y + Math.sin(this.angle) * this.baseDistance;
    }

    draw(ctx) {
        super.draw(ctx);
        ctx.fillStyle = this.mode2 == "attackOn" ? "rgb(139, 0, 0)" : "red";

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.beginPath();
        ctx.moveTo(-15, 15);
        ctx.lineTo(-15, -15);
        ctx.lineTo(15, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

export { Platform, MovePlatform, AttackPlatform };
