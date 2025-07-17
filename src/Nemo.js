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
        this.targetAngle = 0;
        this.rotationSpeed = Math.PI / (0.4 * 60); // 뒤돌기 약 0.4초 기준
        if (this.unitType === "unit") {
            this.moving = false;
            this.reverse = false; // 뒤로 이동 여부
        }

        // 팀에 따른 색상 설정: fillColor는 연한 색, borderColor는 진한 색
        if (team === "red") {
            this.fillColor = "white";
            this.borderColor = "darkred";
        } else {
            this.fillColor = "white";
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
                    // 단일 공격 플랫폼은 네모가 손에 들고 있는 무기(On-hand)
                    return new AttackPlatform(this, null, true);
                } else {
                    // 다수의 공격 플랫폼은 고정 위치에 배치되는 Off-hand 무기
                    const angle = start + attackIndex * step;
                    attackIndex++;
                    return new AttackPlatform(this, angle, false);
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

        this.rotateTowards = (angle) => {
            let diff = angle - this.angle;
            diff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;
            if (Math.abs(diff) <= this.rotationSpeed) {
                this.angle = angle;
                return true;
            } else {
                this.angle += Math.sign(diff) * this.rotationSpeed;
                return false;
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

        if (this.destination && this.unitType !== "army") {
            const dx = this.destination.x - this.x;
            const dy = this.destination.y - this.y;
            const dist = Math.hypot(dx, dy);
            const ang = Math.atan2(dy, dx);
            this.targetAngle = ang;
            this.rotateTowards(this.targetAngle);
            const step = Math.min(this.maxSpeed, dist);
            this.x += Math.cos(this.angle) * step;
            this.y += Math.sin(this.angle) * step;
            if (dist <= this.maxSpeed) {
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

        // 온핸드 무기가 사격 중인지 확인
        const isShooting = this.platforms.some(p =>
            p instanceof AttackPlatform && p.onHand && p.mode2 === 'attackOn');

    

        if (this.hp <= 0 && !this.dead) {
            this.destroyed(); // HP가 0이 되면 네모가 죽는다
        }

        if (this.unitType === "army") {
            if (!isShooting && this.moveVector) {
                this.x += this.moveVector.x;
                this.y += this.moveVector.y;
                const mag = Math.hypot(this.moveVector.x, this.moveVector.y);
                if (mag > 0.01) {
                    this.targetAngle = Math.atan2(this.moveVector.y, this.moveVector.x);
                }
            }
            if (this.destination) {
                const dist = Math.hypot(this.destination.x - this.x, this.destination.y - this.y);
                if (dist < 5) {
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
        }

        const turned = this.rotateTowards(this.targetAngle);

        if (this.unitType === "unit" && this.moving && turned && !isShooting) {
            const dir = this.reverse ? -1 : 1;
            this.x += Math.cos(this.angle) * this.maxSpeed * dir;
            this.y += Math.sin(this.angle) * this.maxSpeed * dir;
        }
    }

    // 네모가 죽을 때 호출되는 함수
    destroyed() {
        console.log(`${this.team} 팀의 네모가 사망했습니다!`);
        this.dead = true; // 사망 플래그 설정
        // 필요한 경우 추가적인 정리 작업을 여기서 수행할 수 있습니다.
    }
    
    draw(ctx) {
        // 플랫폼 본체와 총알을 먼저 그린다
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

        // Nemo 그리기 - 내부를 채우지 않고 윤곽선만 그린다
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
            const h = this.size / 2;
            // Draw a directional polygon resembling a simple armored unit
            ctx.beginPath();
            ctx.moveTo(0, -h); // front tip
            ctx.lineTo(h * 0.6, -h * 0.3);
            ctx.lineTo(h, 0);
            ctx.lineTo(h * 0.6, h);
            ctx.lineTo(-h * 0.6, h);
            ctx.lineTo(-h, 0);
            ctx.lineTo(-h * 0.6, -h * 0.3);
            ctx.closePath();
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();

        // 네모가 그려진 후 이펙트를 전역 좌표계에서 그려 상위에 보이도록 한다
        this.platforms.forEach(p => {
            if (p.drawEffects) p.drawEffects(ctx);
        });
    }
}

export default Nemo;
