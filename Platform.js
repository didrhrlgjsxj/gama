// Platform.js
class Platform {
    constructor(parent) {
        this.parent = parent;
        this.baseDistance = 50;  // Nemo와의 기본 거리 (원 반지름)
        this.maxDistance = 120;  // 최대 확장 거리 (이전보다 늘어남)
        this.currentDistance = this.baseDistance;
        this.angle = 0;          // 초기 각도 (오른쪽)
        // 모드: "idle" (대기), "orbit" (플랫폼 공전), "extend" (플랫폼 확장)
        this.mode = "idle";
        this.targetAngle = 0;
        this.orbitSpeed = 0.1;   // 공전 시 각속도 (라디안/프레임)
        this.extendSpeed = 1;    // 확장 속도 (픽셀/프레임)
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

    update() {
        if (this.mode === "orbit") {
            // 목표 각도까지 서서히 회전
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
            // 기본거리부터 최대거리까지 선형 확장
            if (this.currentDistance < this.maxDistance) {
                this.currentDistance += this.extendSpeed;
                if (this.currentDistance > this.maxDistance) {
                    this.currentDistance = this.maxDistance;
                }
            }
        } else if (this.mode === "idle") {
            // 입력이 없으면 천천히 기본거리로 복귀
            if (this.currentDistance > this.baseDistance) {
                this.currentDistance -= this.extendSpeed;
                if (this.currentDistance < this.baseDistance) {
                    this.currentDistance = this.baseDistance;
                }
            }
        }

        // Nemo의 현재 위치를 기준으로 플랫폼의 목표 위치 계산
        const targetX = this.parent.x + Math.cos(this.angle) * this.currentDistance;
        const targetY = this.parent.y + Math.sin(this.angle) * this.currentDistance;

        // 보간(lerp)으로 플랫폼의 현재 좌표를 부드럽게 이동
        const lerpFactor = 0.1;
        this.x += (targetX - this.x) * lerpFactor;
        this.y += (targetY - this.y) * lerpFactor;
    }

    draw(ctx) {
        // 매 프레임 업데이트를 먼저 실행
        this.update();

        ctx.fillStyle = "blue";
        ctx.save();
        ctx.translate(this.x, this.y);
        // 플랫폼의 긴 면이 Nemo를 향하도록 90도 회전
        ctx.rotate(this.angle + Math.PI / 2);
        ctx.fillRect(-15, -5, 30, 10);
        ctx.restore();
    }
}

// Export the Platform class so it can be imported in other files
export default Platform;
