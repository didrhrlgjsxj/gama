class Nemo {
    constructor(x, y, team = "blue") {
        this.x = x;
        this.y = y;
        this.size = 50;
        this.speed = 3; // Nemo의 최고 속도
        this.team = team;
        this.color = (team === "red") ? "red" : "blue";
        this.vx = 0;
        this.vy = 0;
        // Nemo에 부착된 플랫폼 객체
        this.platform = new Platform(this);
    }
    
    update() {
        // 플랫폼이 extend 모드일 때 Nemo는 플랫폼이 가리키는 방향으로 움직임.
        if (this.platform.mode === "extend") {
            // 기본거리(baseDistance)에서 최대거리(maxDistance)까지의 확장 비율 (0~1)
            let extensionRatio = (this.platform.currentDistance - this.platform.baseDistance) / (this.platform.maxDistance - this.platform.baseDistance);
            extensionRatio = Math.max(0, Math.min(1, extensionRatio));
            // Nemo의 이동 방향은 플랫폼의 angle 방향.
            this.vx = Math.cos(this.platform.angle) * this.speed * extensionRatio;
            this.vy = Math.sin(this.platform.angle) * this.speed * extensionRatio;
            this.x += this.vx;
            this.y += this.vy;
        } else {
            this.vx = 0;
            this.vy = 0;
        }
    }
    
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        this.platform.draw(ctx);
    }
}

class Platform {
    constructor(parent) {
        this.parent = parent;
        this.baseDistance = 50;  // Nemo와의 기본 거리 (원 반지름)
        this.maxDistance = 80;   // 최대 확장 거리
        this.currentDistance = this.baseDistance;
        this.angle = 0; // 초기 각도 (오른쪽)
        this.mode = "idle"; // 모드: "idle", "orbit", "extend"
        this.targetAngle = 0;
        this.orbitSpeed = 0.1; // 공전 시 각속도 (라디안/프레임)
        this.extendSpeed = 1;  // 확장 속도 (픽셀/프레임)
        // 플랫폼은 Nemo의 자식이지만 Nemo가 움직여도 즉시 따라오지 않고 자체 좌표를 유지합니다.
        // 초기 위치는 Nemo 기준 상대 위치 (baseDistance 방향)
        this.x = this.parent.x + Math.cos(this.angle) * this.currentDistance;
        this.y = this.parent.y + Math.sin(this.angle) * this.currentDistance;
    }
    
    // 입력된 방향(라디안)을 받아 목표 각도를 설정합니다.
    setTargetAngle(newAngle) {
        newAngle = newAngle % (2 * Math.PI);
        if (newAngle < 0) newAngle += 2 * Math.PI;
        
        let diff = newAngle - this.angle;
        diff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;
        
        if (Math.abs(diff) > 0.1) {
            // 목표 각도와 충분히 차이가 있다면 orbit 모드로 전환하여 회전
            this.mode = "orbit";
            this.targetAngle = newAngle;
            // 방향 전환 시 확장은 기본거리부터 시작
            this.currentDistance = this.baseDistance;
        } else {
            // 이미 거의 맞춰져 있다면 바로 extend 모드로 전환
            if (this.mode !== "extend") {
                this.mode = "extend";
                this.currentDistance = this.baseDistance;
            }
        }
    }
    
    // 입력이 없을 때 idle 모드로 전환
    reset() {
        this.mode = "idle";
    }
    
    update() {
        if (this.mode === "orbit") {
            // 현재 angle을 목표 angle로 서서히 회전
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
            // idle 모드일 때는 천천히 기본거리로 복귀
            if (this.currentDistance > this.baseDistance) {
                this.currentDistance -= this.extendSpeed;
                if (this.currentDistance < this.baseDistance) {
                    this.currentDistance = this.baseDistance;
                }
            }
            // idle 상태에서는 angle은 그대로 유지
        }
        
        // 플랫폼의 목표 위치는 Nemo의 현재 위치 기준으로 (angle, currentDistance)만큼 떨어진 위치입니다.
        const targetX = this.parent.x + Math.cos(this.angle) * this.currentDistance;
        const targetY = this.parent.y + Math.sin(this.angle) * this.currentDistance;
        
        // 기존의 플랫폼 위치(this.x, this.y)와 목표 위치(targetX, targetY)를 보간하여 천천히 이동
        const lerpFactor = 0.1; // 보간 속도 (값을 조정하여 원하는 속도로 변경 가능)
        this.x += (targetX - this.x) * lerpFactor;
        this.y += (targetY - this.y) * lerpFactor;
    }
    
    draw(ctx) {
        ctx.fillStyle = "blue";
        ctx.save();
        ctx.translate(this.x, this.y);
        // 긴 면이 Nemo를 향하도록 90도 회전
        ctx.rotate(this.angle + Math.PI / 2);
        ctx.fillRect(-15, -5, 30, 10);
        ctx.restore();
    }
}

// =======================================
// 캔버스 및 입력, 게임 루프 설정
// =======================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const keys = { a: false, d: false, w: false, s: false };

let nemo = new Nemo(200, 200, "blue");

document.addEventListener("keydown", (e) => {
    if (['a', 'd', 'w', 's'].includes(e.key)) keys[e.key] = true;
});

document.addEventListener("keyup", (e) => {
    if (['a', 'd', 'w', 's'].includes(e.key)) keys[e.key] = false;
});

function gameLoop() {
    let dx = 0, dy = 0;
    if (keys.a) dx -= 1;
    if (keys.d) dx += 1;
    if (keys.w) dy -= 1;
    if (keys.s) dy += 1;
    
    if (dx !== 0 || dy !== 0) {
        // 입력된 키에 따라 이동 방향의 각도 (라디안)를 계산
        let inputAngle = Math.atan2(dy, dx);
        nemo.platform.setTargetAngle(inputAngle);
    } else {
        nemo.platform.reset();
    }
    
    // 먼저 플랫폼을 업데이트한 후 Nemo 업데이트
    nemo.platform.update();
    nemo.update();
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    nemo.draw(ctx);
    
    requestAnimationFrame(gameLoop);
}

gameLoop();
