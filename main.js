class Nemo {
    constructor(x, y, team = "blue") {
        this.x = x;
        this.y = y;
        this.size = 50;
        this.speed = 3;       // Nemo의 최고 속도
        this.team = team;
        // 팀에 따른 색상 설정: fillColor는 연한 색, borderColor는 진한 색
        if (team === "red") {
            this.fillColor = "lightcoral"; // 연한 빨강
            this.borderColor = "darkred";   // 진한 빨강
        } else {
            this.fillColor = "lightblue";   // 연한 파랑
            this.borderColor = "darkblue";  // 진한 파랑
        }
        // Nemo의 회전각 (라디안)
        this.angle = 0;
        // 현재 이동 속도
        this.vx = 0;
        this.vy = 0;
        // Nemo에 부착된 플랫폼 객체
        this.platform = new Platform(this);
    }
    
    update() {
        // 플랫폼이 extend 모드일 때만 Nemo가 이동 준비(회전) 후 이동합니다.
        if (this.platform.mode === "extend") {
            // (1) 플랫폼의 angle에 맞춰 Nemo도 서서히 회전
            let targetAngle = this.platform.angle;
            let angleDiff = ((targetAngle - this.angle + Math.PI) % (2 * Math.PI)) - Math.PI;
            const rotationSpeed = 0.1; // 회전 속도 (라디안/프레임)
            if (Math.abs(angleDiff) > 0.01) {
                this.angle += rotationSpeed * (angleDiff > 0 ? 1 : -1);
            } else {
                this.angle = targetAngle;
            }
            
            // (2) Nemo의 회전이 거의 완료되었을 때만 이동 시작
            // 기존 0.05 대신 0.2(라디안, 약 11.5°) 범위 내이면 회전 완료로 간주합니다.
            const rotationTolerance = 0.2;
            if (Math.abs(angleDiff) < rotationTolerance) {
                // 플랫폼의 확장 비율에 따라 Nemo의 이동 속도 결정
                let extensionRatio = (this.platform.currentDistance - this.platform.baseDistance) / (this.platform.maxDistance - this.platform.baseDistance);
                extensionRatio = Math.max(0, Math.min(1, extensionRatio));
                let moveSpeed = this.speed * extensionRatio;
                // Nemo의 이동 방향은 회전 각도(this.angle)와 동일
                this.vx = Math.cos(this.angle) * moveSpeed;
                this.vy = Math.sin(this.angle) * moveSpeed;
                this.x += this.vx;
                this.y += this.vy;
            } else {
                this.vx = 0;
                this.vy = 0;
            }
        } else {
            this.vx = 0;
            this.vy = 0;
        }
    }
    
    draw(ctx) {
        // Nemo 그리기 (회전 적용)
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.fillColor;
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(-this.size / 2, -this.size / 2, this.size, this.size);
        ctx.restore();
        
        // 부착된 플랫폼 그리기
        this.platform.draw(ctx);
        
        // 플랫폼이 extend 모드(즉, 이동이 시작된 상태)라면 초록색 빛 효과 추가
        if (this.platform.mode === "extend" && this.platform.currentDistance > this.platform.baseDistance) {
            ctx.save();
            // 초록색 빛 효과 (라인 및 그림자 효과)
            ctx.strokeStyle = "lime";
            ctx.lineWidth = 5;
            ctx.shadowColor = "lime";
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.moveTo(this.platform.x, this.platform.y);
            ctx.lineTo(this.x, this.y);
            ctx.stroke();
            ctx.restore();
        }
    }
}

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

// =======================================
// 캔버스, 입력, 게임 루프 설정
// =======================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const keys = { a: false, d: false, w: false, s: false };

// blue팀 Nemo(플레이어)와 red팀 Nemo(예시용)를 생성합니다.
const blueNemo = new Nemo(200, 200, "blue");
const redNemo = new Nemo(300, 300, "red");

document.addEventListener("keydown", (e) => {
    if (['a', 'd', 'w', 's'].includes(e.key)) keys[e.key] = true;
});

document.addEventListener("keyup", (e) => {
    if (['a', 'd', 'w', 's'].includes(e.key)) keys[e.key] = false;
});

function gameLoop() {
    // WASD 입력에 따라 방향 결정 (blueNemo 제어)
    let dx = 0, dy = 0;
    if (keys.a) dx -= 1;
    if (keys.d) dx += 1;
    if (keys.w) dy -= 1;
    if (keys.s) dy += 1;
    
    if (dx !== 0 || dy !== 0) {
        let inputAngle = Math.atan2(dy, dx);
        blueNemo.platform.setTargetAngle(inputAngle);
    } else {
        blueNemo.platform.reset();
    }
    
    // red팀 Nemo는 항상 idle 상태 (제자리)
    redNemo.platform.reset();
    
    // 업데이트 순서: 플랫폼 먼저 업데이트 → Nemo 업데이트
    blueNemo.platform.update();
    blueNemo.update();
    
    redNemo.platform.update();
    redNemo.update();
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    blueNemo.draw(ctx);
    redNemo.draw(ctx);
    
    requestAnimationFrame(gameLoop);
}

gameLoop();
