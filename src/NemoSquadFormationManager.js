// NemoSquadFormationManager.js

export class NemoSquadFormationManager {
    constructor(squad) {
        this.squad = squad; // Reference to the parent squad
        this.formationPositions = new Map(); // 네모 ID별 진형 위치
        this.tactics = 'default'; // 스쿼드의 전술 상태
        this.formationWidth = this.squad.cellSize * 5; // 진형의 기본 너비
        this.lineAssignments = new Map(); // 네모 ID별 라인 할당

        this.lastFormationCheckTime = 0; // 마지막으로 진형을 재계산한 시간
        this.formationCheckInterval = 1000; // 진형 재계산 간격 (ms)

        this.assignFormationLines();
    }

    update() {
        this.updateFormation();

        // 주기적으로 진형을 재할당하여 유닛 손실 등에 대응합니다.
        const now = Date.now();
        if (now - this.lastFormationCheckTime > this.formationCheckInterval) {
            this.reassignFormationLines();
        }
    }

    reassignFormationLines() {
        this.assignFormationLines();
        this.lastFormationCheckTime = Date.now();
    }

    assignFormationLines() {
        this.lineAssignments.clear();
        if (this.tactics === 'default') {
            const line1 = [];
            const line2 = [];
            const remainingNemos = [];

            // 1. 스쿼디오는 무조건 2열로 배치
            this.squad.nemos.forEach(nemo => {
                if (nemo.armyType === 'sqaudio') {
                    line2.push(nemo);
                } else {
                    remainingNemos.push(nemo);
                }
            });

            // 2. 나머지 유닛을 3:1 비율로 1열과 2열에 배치
            for (let i = 0; i < remainingNemos.length; i++) {
                if (i % 4 < 3) { // 0, 1, 2는 1열
                    line1.push(remainingNemos[i]);
                } else { // 3은 2열
                    line2.push(remainingNemos[i]);
                }
            }

            // 3. 최종 할당
            line1.forEach(n => { n.formationLine = 1; this.lineAssignments.set(n.id, 1); });
            line2.forEach(n => { n.formationLine = 2; this.lineAssignments.set(n.id, 2); });
        }
    }

    updateFormation() {
        if (!this.squad.squadDestination) {
            if (this.formationPositions.size > 0) this.squad.nemos.forEach(n => n.destination = null);
            this.formationPositions.clear();
            return;
        }
    
        const formationCenter = this.squad.squadCenter;
        const direction = this.squad.primaryDirection;
        const perpendicular = direction + Math.PI / 2; // 대형의 좌우 방향
        let spacing = this.squad.cellSize * 1.2; // 유닛 간 기본 간격
        const lineDepth = this.squad.cellSize * 2; // 라인 간 깊이
    
        const lines = { 1: [], 2: [], 3: [] };
        this.squad.nemos.forEach(n => {
            if (lines[n.formationLine]) {
                lines[n.formationLine].push(n);
            }
        });
    
        Object.keys(lines).forEach(lineNumber => {
            const lineNemos = lines[lineNumber];
            const lineCount = lineNemos.length;
            if (lineCount === 0) return;
    
            // 진형 너비에 맞춰 유닛 간 간격 동적 조절
            if (lineCount > 1) {
                spacing = this.formationWidth / (lineCount - 1);
            } else {
                spacing = 0;
            }
            const lineOffset = (parseInt(lineNumber) - 1) * -lineDepth;
            const lineCenterX = formationCenter.x + Math.cos(direction) * lineOffset;
            const lineCenterY = formationCenter.y + Math.sin(direction) * lineOffset;
    
            lineNemos.forEach((nemo, index) => {
                const posOffset = (index - (lineCount - 1) / 2) * spacing;
                const x = lineCenterX + Math.cos(perpendicular) * posOffset;
                const y = lineCenterY + Math.sin(perpendicular) * posOffset;
                this.formationPositions.set(nemo.id, { x, y });
            });
        });
    }
}