// main.js
import Nemo from './Nemo.js';  // Nemo.js에서 Nemo 클래스를 가져옵니다.
import Grid from './Grid.js';
import { NemoSquadManager } from './NemoSquadManager.js';
import MoveIndicator from './MoveIndicator.js';
import { MineralPatch, MineralPiece, Storage } from './Resource.js';
import Worker from './Worker.js';


// Canvas 및 Context 설정
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const blueUnitBtn = document.getElementById("spawnBlueUnitBtn");
const blueArmyBtn = document.getElementById("spawnBlueArmyBtn");
const redUnitBtn = document.getElementById("spawnRedUnitBtn");
const redArmyBtn = document.getElementById("spawnRedArmyBtn");
const workerABtn = document.getElementById("spawnWorkerABtn");
const workerBBtn = document.getElementById("spawnWorkerBBtn");
const mineralSpan = document.getElementById("blueMinerals");

// 배경 이미지 설정
const background = new Image();
background.src = "src/BackGround.webp"; // 배경 이미지 경로
const backgroundWidth = 1600; // 배경 너비 (원하는 크기로 설정)
const backgroundHeight = 1200; // 배경 높이 (원하는 크기로 설정)


// Nemo 보다 약간 작은 크기의 그리드를 생성
const mainGrid = new Grid(40);
const squadManager = new NemoSquadManager(mainGrid.cellSize);

// 자원 및 작업자 관련 변수
window.blueMinerals = 0;
const mineralPatches = [
    new MineralPatch(300, 300),
    new MineralPatch(500, 250),
    new MineralPatch(700, 350),
    new MineralPatch(900, 200)
];
const mineralPieces = [];
const storages = [];
const workers = [];


// 카메라 변수 및 이동 속도
let cameraX = 0;
let cameraY = 0;
const cameraSpeed = 5; // 카메라 이동 속도

// 확대/축소(scale) 변수 (기본값 1 = 100%)
let scale = 1.0;

// 마우스 위치 추적
let mouseX = 0;
let mouseY = 0;

canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
});

// 마우스 휠 이벤트로 카메라 확대/축소 처리
canvas.addEventListener("wheel", (event) => {
    event.preventDefault(); // 기본 스크롤 동작 방지
    const zoomSpeed = 0.001; // 확대/축소 속도 (원하는 값으로 조정)
    // 휠 위로 돌리면 (deltaY < 0) 확대, 아래면 (deltaY > 0) 축소
    scale += -event.deltaY * zoomSpeed;
    // 확대/축소 배율의 최소, 최대 한계값 설정 (예: 0.5배 ~ 3.0배)
    scale = Math.max(0.5, Math.min(scale, 3.0));
});

// 카메라 이동 로직 (마우스가 캔버스 가장자리에 있을 때 이동)
function updateCamera() {
    const edgeMargin = 10; // 화면 가장자리 감지 범위

    if (mouseX < edgeMargin) {
        cameraX -= cameraSpeed; // 왼쪽으로 이동
    }
    if (mouseX > canvas.width - edgeMargin) {
        cameraX += cameraSpeed; // 오른쪽으로 이동
    }
    if (mouseY < edgeMargin) {
        cameraY -= cameraSpeed; // 위로 이동
    }
    if (mouseY > canvas.height - edgeMargin) {
        cameraY += cameraSpeed; // 아래로 이동
    }

    // 카메라가 배경을 벗어나지 않도록 제한
    cameraX = Math.max(0, Math.min(backgroundWidth - canvas.width, cameraX));
    cameraY = Math.max(0, Math.min(backgroundHeight - canvas.height, cameraY));
}

// Nemo 관련 코드

// 임시 배치용 네모
let ghostNemo = null;

const nemos = [];
squadManager.updateSquads(nemos);
let selectedNemos = [];
let selectedSquads = [];
let isSelecting = false;
let selectionStart = null;
let selectionRect = null;
let isMoveDragging = false;
let moveRect = null;
const moveIndicators = [];
const deathEffects = [];
let attackKey = false; // 'A' 키가 눌린 상태 여부

window.addEventListener('keydown', (e) => {
    if (e.key === 'a' || e.key === 'A') {
        attackKey = true;
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'a' || e.key === 'A') {
        attackKey = false;
        e.preventDefault();
    }
});

function getAllSelectedNemos() {
    const set = new Set(selectedNemos);
    selectedSquads.forEach(s => s.nemos.forEach(n => set.add(n)));
    return Array.from(set);
}
//blueUnitNemo

function worldMouse() {
    return {
        x: cameraX + mouseX / scale,
        y: cameraY + mouseY / scale
    };
}

function enemyNemoAt(pos, myTeam) {
    for (const n of nemos) {
        if (n.team === myTeam) continue;
        if (pos.x >= n.x - n.size / 2 && pos.x <= n.x + n.size / 2 &&
            pos.y >= n.y - n.size / 2 && pos.y <= n.y + n.size / 2) {
            return n;
        }
    }
    return null;
}

function enemySquadAt(pos, myTeam) {
    for (const sq of squadManager.squads) {
        if (sq.team === myTeam) continue;
        for (const n of sq.nemos) {
            const half = n.size / 2 + 5; // small margin
            if (pos.x >= n.x - half && pos.x <= n.x + half && pos.y >= n.y - half && pos.y <= n.y + half) {
                return sq;
            }
        }
    }
    return null;
}

function issueAttackMove(targets, pos) {
    const list = getAllSelectedNemos();
    list.forEach(n => n.startAttackMove(targets, pos));
    if (pos) moveIndicators.push(new MoveIndicator(pos.x, pos.y));
}

function createGhost(type, team, hasShield = true) {
    const { x, y } = worldMouse();
    let platformTypes;
    if (type === "army") {
        platformTypes = ["move", "attack", "attack"]; // 공격 플랫폼 2개
    } else {
        platformTypes = ["attack"];
    }
    ghostNemo = new Nemo(x, y, team, platformTypes, type, "sqaudio", "ranged", hasShield);
}

redUnitBtn.addEventListener("click", () => createGhost("unit", "red", false));
redArmyBtn.addEventListener("click", () => createGhost("army", "red", true));
blueUnitBtn.addEventListener("click", () => createGhost("unit", "blue", false));
blueArmyBtn.addEventListener("click", () => createGhost("army", "blue", true));
workerABtn.addEventListener("click", () => {
    const { x, y } = worldMouse();
    workers.push(new Worker(x, y, 'A'));
});
workerBBtn.addEventListener("click", () => {
    const { x, y } = worldMouse();
    workers.push(new Worker(x, y, 'B'));
});

let selectionStartedWithSelection = false;

canvas.addEventListener("mousedown", (e) => {
    const pos = worldMouse();
    const selectedAny = selectedNemos.length > 0 || selectedSquads.length > 0;

    if (e.button === 0) {
        if (attackKey && selectedAny) {
            issueAttackMove([], pos);
            return;
        }
        if (ghostNemo) {
            nemos.push(ghostNemo);
            squadManager.updateSquads(nemos);
            ghostNemo = null;
        } else {
            isSelecting = true;
            selectionStart = pos;
            selectionRect = { x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y };
            selectionStartedWithSelection = selectedAny;
        }
    }
    if (e.button === 2) {
        if (selectedNemos.length > 0 || selectedSquads.length > 0) {
            isMoveDragging = true;
            moveRect = { x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y };
            e.preventDefault();
        }
    }
});

canvas.addEventListener("mousemove", (e) => {
    if (isSelecting && selectionRect) {
        const pos = worldMouse();
        selectionRect.x2 = pos.x;
        selectionRect.y2 = pos.y;
    }
    if (isMoveDragging && moveRect) {
        const pos = worldMouse();
        moveRect.x2 = pos.x;
        moveRect.y2 = pos.y;
    }
});

canvas.addEventListener("mouseup", (e) => {
    if (isSelecting && e.button === 0) {
        isSelecting = false;
        const pos = worldMouse();
        selectionRect.x2 = pos.x;
        selectionRect.y2 = pos.y;
        const dragWidth = Math.abs(selectionRect.x2 - selectionRect.x1);
        const dragHeight = Math.abs(selectionRect.y2 - selectionRect.y1);

        // 드래그 거리가 거의 없으면 클릭으로 간주
        if (dragWidth < 5 && dragHeight < 5) {
            if (selectionStartedWithSelection) {
                if (!attackKey) {
                    selectedNemos.forEach(n => (n.selected = false));
                    selectedSquads.forEach(s => (s.selected = false));
                    selectedNemos = [];
                    selectedSquads = [];
                } else {
                    const targets = getAllSelectedNemos();
                    targets.forEach(n => {
                        n.clearAttackMove();
                        n.setDestination(pos.x, pos.y);
                        n.ignoreEnemies = true;
                    });
                    moveIndicators.push(new MoveIndicator(pos.x, pos.y, 40, 20, 'yellow'));
                }
            } else {
            let clickedNemo = null;
            for (const nemo of nemos) {
                if (
                    pos.x >= nemo.x - nemo.size / 2 &&
                    pos.x <= nemo.x + nemo.size / 2 &&
                    pos.y >= nemo.y - nemo.size / 2 &&
                    pos.y <= nemo.y + nemo.size / 2
                ) {
                    clickedNemo = nemo;
                    break;
                }
            }

            selectedNemos.forEach(n => (n.selected = false));
            selectedSquads.forEach(s => (s.selected = false));
            selectedNemos = [];
            selectedSquads = [];

            if (clickedNemo) {
                clickedNemo.selected = true;
                selectedNemos.push(clickedNemo);
            } else {
                let clickedSquad = null;
                for (const squad of squadManager.squads) {
                    const b = squad.bounds;
                    if (pos.x >= b.x && pos.x <= b.x + b.w && pos.y >= b.y && pos.y <= b.y + b.h) {
                        clickedSquad = squad;
                        break;
                    }
                }
                if (clickedSquad) {
                    clickedSquad.selected = true;
                    selectedSquads.push(clickedSquad);
                }
            }
            }
        } else {
            const minX = Math.min(selectionRect.x1, selectionRect.x2);
            const maxX = Math.max(selectionRect.x1, selectionRect.x2);
            const minY = Math.min(selectionRect.y1, selectionRect.y2);
            const maxY = Math.max(selectionRect.y1, selectionRect.y2);
            selectedNemos.forEach(n => (n.selected = false));
            selectedSquads.forEach(s => (s.selected = false));
            selectedNemos = [];
            selectedSquads = [];
            nemos.forEach(nemo => {
                if (nemo.x >= minX && nemo.x <= maxX && nemo.y >= minY && nemo.y <= maxY) {
                    nemo.selected = true;
                    selectedNemos.push(nemo);
                }
            });
            squadManager.squads.forEach(squad => {
                const b = squad.bounds;
                if (b.x >= minX && b.x + b.w <= maxX && b.y >= minY && b.y + b.h <= maxY) {
                    const hasSelected = squad.nemos.some(n => selectedNemos.includes(n));
                    if (!hasSelected) {
                        squad.selected = true;
                        selectedSquads.push(squad);
                    }
                }
            });
        }

        selectionRect = null;
        selectionStartedWithSelection = false;
    }

    if (isMoveDragging && e.button === 2) {
        isMoveDragging = false;
        const pos = worldMouse();
        moveRect.x2 = pos.x;
        moveRect.y2 = pos.y;
        const dragW = Math.abs(moveRect.x2 - moveRect.x1);
        const dragH = Math.abs(moveRect.y2 - moveRect.y1);
        const targets = getAllSelectedNemos();
        const team = targets[0] ? targets[0].team : null;
        if (dragW < 5 && dragH < 5) {
            const enemyN = enemyNemoAt(pos, team);
            const enemyS = enemySquadAt(pos, team);
            if (enemyN) {
                issueAttackMove([enemyN], {x: enemyN.x, y: enemyN.y});
            } else if (enemyS) {
                issueAttackMove(enemyS.nemos, pos);
            } else if (selectedSquads.length === 1 && selectedNemos.length === 0) {
                const squad = selectedSquads[0];
                const width = squad.bounds.w;
                const height = squad.bounds.h;
                const minX = pos.x - width / 2;
                const minY = pos.y - height / 2;
                const count = targets.length;
                const cols = Math.ceil(Math.sqrt(count));
                const rows = Math.ceil(count / cols);
                for (let i = 0; i < count; i++) {
                    const col = i % cols;
                    const row = Math.floor(i / cols);
                    const x = minX + (width * (col + 0.5)) / cols;
                    const y = minY + (height * (row + 0.5)) / rows;
                    targets[i].clearAttackMove();
                    targets[i].setDestination(x, y);
                    targets[i].ignoreEnemies = true;
                    moveIndicators.push(new MoveIndicator(x, y, 40, 20, 'yellow'));
                }
            } else {
                targets.forEach(n => {
                    n.clearAttackMove();
                    n.setDestination(pos.x, pos.y);
                    n.ignoreEnemies = true;
                    moveIndicators.push(new MoveIndicator(pos.x, pos.y, 40, 20, 'yellow'));
                });
            }
        } else {
            const minX = Math.min(moveRect.x1, moveRect.x2);
            const minY = Math.min(moveRect.y1, moveRect.y2);
            const width = dragW;
            const height = dragH;
            const count = targets.length;
            const cols = Math.ceil(Math.sqrt(count));
            const rows = Math.ceil(count / cols);
            for (let i = 0; i < count; i++) {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const x = minX + width * (col + 0.5) / cols;
                const y = minY + height * (row + 0.5) / rows;
                targets[i].clearAttackMove();
                targets[i].setDestination(x, y);
                targets[i].ignoreEnemies = true;
                moveIndicators.push(new MoveIndicator(x, y, 40, 20, 'yellow'));
            }
        }
        moveRect = null;
        e.preventDefault();
    }
});

canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
});

function resolveCollisions() {
    for (let i = 0; i < nemos.length; i++) {
        for (let j = i + 1; j < nemos.length; j++) {
            const a = nemos[i];
            const b = nemos[j];
            const minDist = (a.size / 2) + (b.size / 2);
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 0 && dist < minDist) {
                const overlap = minDist - dist;
                const nx = dx / dist;
                const ny = dy / dist;
                a.x -= nx * overlap / 2;
                a.y -= ny * overlap / 2;
                b.x += nx * overlap / 2;
                b.y += ny * overlap / 2;
            }
        }
    }
}

// 게임 루프
function gameLoop() {
    // 카메라 업데이트 (마우스 위치에 따라 이동)
    updateCamera();

    // 캔버스 클리어
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    
    // (기존의 배경 그리기 호출은 제거합니다.)


    // Nemo 업데이트 (플랫폼 업데이트 및 Nemo 이동)
    const enemies = nemos;
    nemos.forEach(nemo => nemo.update(enemies));
    resolveCollisions();

    workers.forEach(w => w.update(mineralPatches, mineralPieces, storages));

    // 사망한 네모 제거 및 선택 목록 정리
    for (let i = nemos.length - 1; i >= 0; i--) {
        if (nemos[i].dead) {
            const dead = nemos[i];
            nemos.splice(i, 1);
            const idx = selectedNemos.indexOf(dead);
            if (idx !== -1) selectedNemos.splice(idx, 1);
        }
    }
    selectedSquads = selectedSquads.filter(sq =>
        sq.nemos.some(n => !n.dead)
    );
    squadManager.updateSquads(nemos);
    selectedSquads = selectedSquads.map(old => {
        return squadManager.squads.find(s => s.idString === old.idString) || null;
    }).filter(s => s);

    // 고스트 네모 위치 갱신
    if (ghostNemo) {
        const { x, y } = worldMouse();
        ghostNemo.x = x;
        ghostNemo.y = y;
        ghostNemo.platforms.forEach(p => {
            p.x = ghostNemo.x + Math.cos(p.angle) * p.baseDistance;
            p.y = ghostNemo.y + Math.sin(p.angle) * p.baseDistance;
        });
    }

    // ★ 카메라 변환 및 확대/축소 적용 ★  
    // ctx.scale(scale, scale)와 ctx.translate(-cameraX, -cameraY)를 통해
    // 모든 드로잉 작업(배경, Nemo 등)이 확대/축소 및 카메라 이동의 영향을 받습니다.
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-cameraX, -cameraY);

    // 배경 그리기 (월드 좌표 기준)
    ctx.drawImage(background, 0, 0, backgroundWidth, backgroundHeight);

    mainGrid.draw(ctx);

    mineralPatches.forEach(p => p.draw(ctx));
    storages.forEach(s => s.draw(ctx));
    mineralPieces.forEach(p => p.draw(ctx));
    workers.forEach(w => w.draw(ctx));

    // Nemo 객체들을 배경 위에 그리기
    nemos.forEach(nemo => nemo.draw(ctx));
    // 그룹 하이라이트를 네모 위에 그려 선택 효과가 잘 보이도록 함
    squadManager.draw(ctx);
    moveIndicators.forEach(ind => {
        ind.update();
        ind.draw(ctx);
    });
    for (let i = moveIndicators.length - 1; i >= 0; i--) {
        if (moveIndicators[i].isDone()) moveIndicators.splice(i, 1);
    }
    deathEffects.forEach(e => {
        e.update();
        e.draw(ctx);
    });
    for (let i = deathEffects.length - 1; i >= 0; i--) {
        if (deathEffects[i].isDone()) deathEffects.splice(i, 1);
    }
    if (ghostNemo) ghostNemo.draw(ctx);
    if (selectionRect) {
        ctx.strokeStyle = 'rgba(0,255,0,0.5)';
        ctx.lineWidth = 1;
        const x = Math.min(selectionRect.x1, selectionRect.x2);
        const y = Math.min(selectionRect.y1, selectionRect.y2);
        const w = Math.abs(selectionRect.x2 - selectionRect.x1);
        const h = Math.abs(selectionRect.y2 - selectionRect.y1);
        ctx.strokeRect(x, y, w, h);
    }
    if (moveRect) {
        ctx.strokeStyle = 'rgba(0,0,255,0.5)';
        ctx.lineWidth = 1;
        const x = Math.min(moveRect.x1, moveRect.x2);
        const y = Math.min(moveRect.y1, moveRect.y2);
        const w = Math.abs(moveRect.x2 - moveRect.x1);
        const h = Math.abs(moveRect.y2 - moveRect.y1);
        ctx.strokeRect(x, y, w, h);
    }

    ctx.restore();

    if (attackKey) {
        ctx.save();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    mineralSpan.textContent = window.blueMinerals;

    requestAnimationFrame(gameLoop);
}

// 배경 이미지 로드 완료 후 게임 루프 시작
background.onload = () => {
    gameLoop();
};


export { mainGrid, deathEffects };
