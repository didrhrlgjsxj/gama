// Platform.js

class Platform {
    constructor(parent, type = "move") {
        this.parent = parent;
        this.baseDistance = 60;  // 기본 거리
        this.maxDistance = 120;  // 최대 확장 거리
        this.currentDistance = this.baseDistance;
        this.angle = 0;          // 현재 각도
        this.lastAngle = 0;
        this.mode = "idle";      // 모드: "idle", "move", "return", "pull"
        this.type = type;
        
        // 물리적 속성 추가
        this.speed = 0;          // 현재 속도
        this.maxSpeed = 5;       // 최대 속도
        this.acceleration = 0.2; // 가속도
        this.deceleration = 0.1; // 감속도
        
        // 플랫폼의 절대 좌표 (Nemo와 독립적)
        this.x = parent.x + Math.cos(this.angle) * this.baseDistance;
        this.y = parent.y + Math.sin(this.angle) * this.baseDistance;
    }

    // 입력 방향 설정 (라디안)
    setTargetAngle(newAngle) {
        this.angle = newAngle;
        this.mode = "move"; // 이동 모드 활성화
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
        //const baseAngle = Math.atan2(dy, dx); // Nemo를 향하는 기본 각도

        if (this.mode === "move") {
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
    }

    update() {
        super.update(); // 기본 물리 업데이트

        // 거리 제한 (Nemo로부터 최대 거리 초과 방지)
        const distance = Math.hypot(this.x - this.parent.x, this.y - this.parent.y);
        if (distance > this.maxDistance) {
            const angle = Math.atan2(this.y - this.parent.y, this.x - this.parent.x);
            this.x = this.parent.x + Math.cos(angle) * this.maxDistance;
            this.y = this.parent.y + Math.sin(angle) * this.maxDistance;
        }

        if (this.currentDistance > this.baseDistance) { // 네모 이동
            this.mode = "pull"
            const moveMagnitude = (this.currentDistance - this.baseDistance) * this.parent.maxSpeed / 5;
            this.parent.moveVector = {
                x: Math.cos(this.angle) * moveMagnitude,
                y: Math.sin(this.angle) * moveMagnitude
            }
        } else {
            this.parent.moveVector = { x: 0, y: 0 };
        }
        
    }

    draw(ctx) {
        ctx.fillStyle = "black";
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

// AttackPlatform 클래스는 기존 코드 유지

// AttackPlatform은 Platform을 상속받아 공격 관련 로직을 추가합니다.
class AttackPlatform extends Platform {
    constructor(parent) {
        super(parent, "attack");
    }

    update() {
        // 공격 관련 로직 (확장 처리 없음)
        // AttackPlatform은 부모의 위치에 따라만 위치를 업데이트
        
    }

    draw(ctx) {
        super.draw(ctx); // 기본 플랫폼 그리기 (여기서는 아무 처리 없음)
        // AttackPlatform에 특화된 추가적인 그리기 처리
        ctx.fillStyle = "red";
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);  // 공격 방향으로 회전
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.lineTo(15, 0);
        ctx.lineTo(0, -30);  // 삼각형 모양의 공격 플랫폼 그리기
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

export { Platform, MovePlatform, AttackPlatform };
