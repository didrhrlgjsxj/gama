import { MovePlatform, AttackPlatform } from './Platform.js';  // MovePlatform과 AttackPlatform을 가져옵니다.

class Nemo {
    constructor(x, y, team = "blue", platformTypes = ["move"]) {
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

        // 초기 속도 및 위치
        this.vx = 0;
        this.vy = 0;

        // 플랫폼 타입을 파라미터로 받아서 해당 타입에 맞는 플랫폼을 생성
        this.platforms = platformTypes.map(type => {
            if (type === "move") return new MovePlatform(this);  // 'move' 타입일 경우 MovePlatform
            if (type === "attack") return new AttackPlatform(this);  // 'attack' 타입일 경우 AttackPlatform
        });
    }

    update() {
        // 각 플랫폼에 대해 업데이트
        this.platforms.forEach(platform => platform.update());  // MovePlatform과 AttackPlatform의 update 호출
        
        // 각 플랫폼에 대해 개별적으로 이동할 때, 이동은 MovePlatform에서 처리됨
        this.platforms.forEach(platform => {
            if (platform.mode === "extend" && platform.type === "move") {
                // 현재 플랫폼이 extend 모드일 때만 이동 준비 후 이동합니다.
                let extensionRatio = (platform.currentDistance - platform.baseDistance) / (platform.maxDistance - platform.baseDistance);
                extensionRatio = Math.max(0, Math.min(1, extensionRatio));
    
                // 확장 비율에 따라 속도 계산
                let moveSpeed = this.speed * extensionRatio;
    
                // 네모의 이동 속도 계산 (기본값은 0)
                this.vx = Math.cos(platform.angle) * moveSpeed;
                this.vy = Math.sin(platform.angle) * moveSpeed;
    
                // 네모의 위치 갱신
                this.x += this.vx;
                this.y += this.vy;
            }
        });
    }
    

    draw(ctx) {
        // 부착된 플랫폼 그리기
        this.platforms.forEach(platform => platform.draw(ctx));

        // 빔이 Nemo의 네모에 가려지지 않도록 Nemo를 그리기 전에 빔을 그리도록 순서를 바꿉니다.
        this.platforms.forEach(platform => {
            if (platform.type === "move" && platform.mode === "extend" && platform.currentDistance > platform.baseDistance) {
                ctx.save();

                // 속도에 따라 빛의 두께와 강도 조정
                let extensionRatio = (platform.currentDistance - platform.baseDistance) / (platform.maxDistance - platform.baseDistance);
                extensionRatio = Math.max(0, Math.min(1, extensionRatio));
                let lineWidth = 2 + 8 * extensionRatio;  // 빛의 두께 (2에서 10 사이)
                let shadowBlur = 10 + 20 * extensionRatio; // 빛의 흐림 정도 (10에서 30 사이)

                // 초록색 빛 효과 (라인 및 그림자 효과)
                ctx.strokeStyle = "rgba(0, 255, 0, 0.5)"; // 반투명 초록색
                ctx.lineWidth = lineWidth;
                ctx.shadowColor = "lime";
                ctx.shadowBlur = shadowBlur;
                ctx.beginPath();
                ctx.moveTo(platform.x, platform.y);  // platform.x와 platform.y 사용
                ctx.lineTo(this.x, this.y);
                ctx.stroke();
                ctx.restore();
            }
        });

        // Nemo 그리기 (회전은 제외하고 그리기)
        ctx.fillStyle = this.fillColor;
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = 3;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        ctx.strokeRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }
}

export default Nemo;
