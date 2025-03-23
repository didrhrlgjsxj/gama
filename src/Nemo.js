import { Platform, MovePlatform, AttackPlatform } from './Platform.js';  // MovePlatform과 AttackPlatform을 가져옵니다.
import Grid from './Grid.js'; // Grid를 임포트
import { mainGrid } from './main.js';  // mainGrid를 가져옵니다.

class Nemo {
    constructor(x, y, team = "blue", platformTypes = ["move"]) {
        this.x = x;
        this.y = y;
        this.angle = 0;          // 현재 각도
        this.size = 50;
        this.speed = 0; 
        this.maxSpeed = 3;      // Nemo의 최고 속도
        this.team = team;
        this.moveVector = 0;

        this.hp = 5;   // 기본 HP 설정

        // 팀에 따른 색상 설정: fillColor는 연한 색, borderColor는 진한 색
        if (team === "red") {
            this.fillColor = "lightcoral";
            this.borderColor = "darkred";
        } else {
            this.fillColor = "lightblue";
            this.borderColor = "darkblue";
        }

        // 플랫폼 타입을 파라미터로 받아서 해당 타입에 맞는 플랫폼을 생성
        this.platforms = platformTypes.map(type => {
            if (type === "move") return new MovePlatform(this);  
            if (type === "attack") return new AttackPlatform(this);  
        });

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

        // 주변의 적을 찾아 nearestEnemy에 저장
        this.nearestEnemy = this.findNearestEnemy(enemies);


        // 각 플랫폼에 대해 업데이트 (플랫폼 내부에서 네모의 위치를 업데이트합니다)
        this.platforms.forEach(platform => platform.update());

    

        if (this.hp <= 0) {
            this.destroyed(); // HP가 0이 되면 네모가 죽는다
        }

        // 네모의 이동 벡터 업데이트
        if (this.moveVector) {
            this.x += this.moveVector.x;
            this.y += this.moveVector.y; // MovePlatform에서 가져옴
        }
    }

    // 네모가 죽을 때 호출되는 함수
    destroyed() {
        console.log(`${this.team} 팀의 네모가 사망했습니다!`);
        // 여기에 네모가 죽었을 때의 추가적인 처리(삭제 등)를 추가할 수 있습니다.
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

        // Nemo 그리기 (회전은 제외하고 그리기)
        ctx.fillStyle = this.fillColor;
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = 3;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        ctx.strokeRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }
}

export default Nemo;
