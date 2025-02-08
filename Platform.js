// Platform.js

// 기본 Platform 클래스
class Platform {
    constructor(parent, type = "move") {
        this.parent = parent;
        this.baseDistance = 60;  // Nemo와의 기본 거리 (원 반지름)
        this.maxDistance = 150;  // 최대 확장 거리 (이전보다 늘어남)
        this.currentDistance = this.baseDistance;
        this.angle = 0;          // 초기 각도 (오른쪽)
        this.mode = "idle";      // 모드: "idle", "orbit", "extend"
        this.targetAngle = 0;
        this.orbitSpeed = 0.1;   // 공전 시 각속도 (라디안/프레임)
        this.extendSpeed = 1;    // 확장 속도 (픽셀/프레임)
        this.type = type;        // "move" 또는 "attack" 타입 설정
        
        // 플랫폼은 Nemo의 자식이지만 Nemo가 이동해도 바로 따라오지 않고,
        // 자체 좌표(this.x, this.y)를 보간(lerp)하여 이동합니다.
        this.x = this.parent.x + Math.cos(this.angle) * this.currentDistance;
        this.y = this.parent.y + Math.sin(this.angle) * this.currentDistance;
    }

    // 입력받은 방향(라디안)을 기반으로 목표 각도를 설정
    setTargetAngle(newAngle) {
        newAngle = newAngle % (2 * Math.PI);
        if (newAngle < 0) newAngle += 2 * Math.PI;

        let diff = newAngle - this.angle;
        diff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;
        if (Math.abs(diff) > 0.1) {
            this.mode = "orbit";
            this.targetAngle = newAngle;
            this.currentDistance = this.baseDistance;
        } else {
            if (this.mode !== "extend") {
                this.mode = "extend";
                this.currentDistance = this.baseDistance;
            }
        }
    }

    // 입력이 없을 경우 idle 모드로 전환
    reset() {
        this.mode = "idle";
    }

    // 기본적인 업데이트 처리
    update() {
        // 기본 로직을 여기에 넣을 수 있습니다.
    }

    // 기본적인 그리기 처리
    draw(ctx) {
        // 기본 그리기 처리 (이 클래스 자체로는 아무 것도 그리지 않음)
    }
}

// MovePlatform은 Platform을 상속받아 이동 관련 로직을 추가합니다.
class MovePlatform extends Platform {
    constructor(parent) {
        super(parent, "move");
    }

    update() {
        // 이동 관련 로직
        if (this.mode === "orbit") {
            let diff = this.targetAngle - this.angle;
            diff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;
            if (Math.abs(diff) < 0.05) {
                this.angle = this.targetAngle;
                this.mode = "extend";
                this.currentDistance = this.baseDistance;
            } else {
                this.angle += (diff > 0 ? this.orbitSpeed : -this.orbitSpeed);
            }
        } else if (this.mode === "extend") {
            // 이동 모드에서의 확장 처리
            if (this.currentDistance < this.maxDistance) {
                this.currentDistance += this.extendSpeed;
                if (this.currentDistance > this.maxDistance) {
                    this.currentDistance = this.maxDistance;
                }
            }
        }

        // 현재 각도와 거리로 플랫폼의 x, y 좌표를 업데이트
        this.x = this.parent.x + Math.cos(this.angle) * this.currentDistance;
        this.y = this.parent.y + Math.sin(this.angle) * this.currentDistance;
    }

    draw(ctx) {
        super.draw(ctx); // 기본 플랫폼 그리기
        // MovePlatform에 특화된 추가적인 그리기 처리
        ctx.fillStyle = "black";
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.PI / 2);  // 플랫폼의 긴 면이 Nemo를 향하도록 회전
        ctx.fillRect(-15, -5, 30, 10);  // 이동하는 플랫폼 그리기
        ctx.restore();
    }
}

// AttackPlatform은 Platform을 상속받아 공격 관련 로직을 추가합니다.
class AttackPlatform extends Platform {
    constructor(parent) {
        super(parent, "attack");
    }

    update() {
        // 공격 관련 로직 (확장 처리 없음)
        // AttackPlatform은 부모의 위치에 따라만 위치를 업데이트
        this.x = this.parent.x + Math.cos(this.angle) * this.currentDistance;
        this.y = this.parent.y + Math.sin(this.angle) * this.currentDistance;
    }

    draw(ctx) {
        super.draw(ctx); // 기본 플랫폼 그리기
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
