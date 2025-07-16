import { Platform, MovePlatform, AttackPlatform } from './Platform.js';  // MovePlatform과 AttackPlatform을 가져옵니다.
import Grid from './Grid.js'; // Grid를 임포트
import { mainGrid } from './main.js';  // mainGrid를 가져옵니다.

class Nemo {
    static nextId = 1;
    constructor(x, y, team = "blue", platformTypes = ["move"], unitType = "army") {
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
        this.hp = 10;
        this.dead = false;      // 사망 여부
        this.selected = false;  // 선택 여부
        this.destination = null; // 이동 목표 위치

        // unit 타입일 경우 회전 및 이동을 직접 제어하기 위한 프로퍼티
        if (this.unitType === "unit") {
            this.targetAngle = 0;
            this.moving = false;
            this.reverse = false; // 뒤로 이동 여부
        }

        // 팀에 따른 색상 설정: fillColor는 연한 색, borderColor는 진한 색
        if (team === "red") {
            this.fillColor = "lightcoral";
            this.borderColor = "darkred";
        } else {
            this.fillColor = "lightblue";
            this.borderColor = "darkblue";
        }

        // 플랫폼 타입을 파라미터로 받아서 해당 타입에 맞는 플랫폼을 생성
        const attackCount = platformTypes.filter(t => t === "attack").length;
        let attackIndex = 0;
        const step = attackCount > 0 ? (2 * Math.PI / attackCount) : 0;
        const start = attackCount % 2 === 0 ? step / 2 : 0;
        this.platforms = platformTypes.map(type => {
            if (type === "move") return new MovePlatform(this);
            if (type === "attack") {
                if (attackCount === 1) {
                    return new AttackPlatform(this);
                } else {
                    const angle = start + attackIndex * step;
                    attackIndex++;
                    return new AttackPlatform(this, angle);
                }
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

        // 자신을 그리드에 추가할 수 있다면 그리드에 추가
        //MainGrid.addEntity(this); 
    }

    // 적을 찾는 함수
    findNearestEnemy(enemies) {
        let nearestEnemy = null;
        let minDistance = 500;

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

    // 적과의 거리나 HP를 기준으로 상태를 업데이트
    update(enemies) {

        // 현재 시점의 모든 적 목록 저장 (AttackPlatform 등에서 사용)
        this.allEnemies = enemies;

        // 주변의 적을 찾아 nearestEnemy에 저장
        this.nearestEnemy = this.findNearestEnemy(enemies);

        if (this.unitType === "unit" && this.nearestEnemy) {
            // 적을 향해 바라보도록 목표 각도를 설정
            const dx = this.nearestEnemy.x - this.x;
            const dy = this.nearestEnemy.y - this.y;
            this.targetAngle = Math.atan2(dy, dx);
        }

        if (this.destination) {
            const dx = this.destination.x - this.x;
            const dy = this.destination.y - this.y;
            const dist = Math.hypot(dx, dy);
            const ang = Math.atan2(dy, dx);
            this.angle = ang;
            if (this.unitType !== "army") {
                if (dist > this.maxSpeed) {
                    this.x += Math.cos(ang) * this.maxSpeed;
                    this.y += Math.sin(ang) * this.maxSpeed;
                } else {
                    this.x = this.destination.x;
                    this.y = this.destination.y;
                    this.destination = null;
                }
            } else if (dist < this.maxSpeed) {
                // army 타입은 이동이 완료되면 목적지를 해제하고 플랫폼을 복귀시킨다
                this.x = this.destination.x;
                this.y = this.destination.y;
                this.destination = null;
                const moveP = this.platforms.find(p => p instanceof MovePlatform);
                if (moveP) {
                    moveP.destination = null;
                    moveP.mode = "return";
                }
            }
        }


        // 각 플랫폼에 대해 업데이트 (플랫폼 내부에서 네모의 위치를 업데이트합니다)
        this.platforms.forEach(platform => platform.update());

    

        if (this.hp <= 0 && !this.dead) {
            this.destroyed(); // HP가 0이 되면 네모가 죽는다
        }

        if (this.unitType === "army") {
            // 네모의 이동 벡터 업데이트 (MovePlatform에서 계산)
            if (this.moveVector) {
                this.x += this.moveVector.x;
                this.y += this.moveVector.y;
            }
        } else if (this.unitType === "unit") {
            // unit 타입은 직접 회전하고 이동한다
            let angleDiff = this.targetAngle - this.angle;
            angleDiff = ((angleDiff + Math.PI) % (2 * Math.PI)) - Math.PI;

            if (Math.abs(angleDiff) > 0.01) {
                this.angle += angleDiff * 0.1;
            } else {
                this.angle = this.targetAngle;
            }

            if (this.moving && Math.abs(angleDiff) <= 0.01) {
                const dir = this.reverse ? -1 : 1;
                this.x += Math.cos(this.angle) * this.maxSpeed * dir;
                this.y += Math.sin(this.angle) * this.maxSpeed * dir;
            }
        }
    }

    // 네모가 죽을 때 호출되는 함수
    destroyed() {
        console.log(`${this.team} 팀의 네모가 사망했습니다!`);
        this.dead = true; // 사망 플래그 설정
        // 필요한 경우 추가적인 정리 작업을 여기서 수행할 수 있습니다.
    }
    
    draw(ctx) {
        this.platforms.forEach(platform => platform.draw(ctx));

        // 가장 가까운 적이 있으면 그려주기
        if (this.nearestEnemy) {
            ctx.strokeStyle = "yellow";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.nearestEnemy.x, this.nearestEnemy.y);
            ctx.stroke();
        }

        // Nemo 그리기
        ctx.fillStyle = this.fillColor;
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = 3;
        ctx.save();
        if (this.selected) {
            ctx.shadowColor = this.borderColor;
            ctx.shadowBlur = 10;
        }
        ctx.translate(this.x, this.y);
        if (this.unitType === "unit") {
            ctx.rotate(this.angle + Math.PI / 2);
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
            ctx.strokeRect(-this.size / 2, -this.size / 2, this.size, this.size);
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
    }
}

export default Nemo;
