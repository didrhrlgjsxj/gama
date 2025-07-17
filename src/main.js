// main.js
import Nemo from './Nemo.js';  // Nemo.js에서 Nemo 클래스를 가져옵니다.
import Grid from './Grid.js';
import { NemoSquadManager } from './NemoSquadManager.js';


// Canvas 및 Context 설정
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const blueUnitBtn = document.getElementById("spawnBlueUnitBtn");
const blueArmyBtn = document.getElementById("spawnBlueArmyBtn");
const redUnitBtn = document.getElementById("spawnRedUnitBtn");
const redArmyBtn = document.getElementById("spawnRedArmyBtn");

// 배경 이미지 설정
const background = new Image();
background.src = "src/BackGround.webp"; // 배경 이미지 경로
const backgroundWidth = 1600; // 배경 너비 (원하는 크기로 설정)
const backgroundHeight = 1200; // 배경 높이 (원하는 크기로 설정)


// Nemo 보다 약간 작은 크기의 그리드를 생성
const mainGrid = new Grid(40);
const squadManager = new NemoSquadManager(mainGrid.cellSize);


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

function createGhost(type, team) {
    const { x, y } = worldMouse();
    let platformTypes;
    if (type === "army") {
        platformTypes = ["move", "attack", "attack"]; // 공격 플랫폼 2개
    } else {
        platformTypes = ["attack"];
    }
    ghostNemo = new Nemo(x, y, team, platformTypes, type);
}

blueUnitBtn.addEventListener("click", () => createGhost("unit", "blue"));
blueArmyBtn.addEventListener("click", () => createGhost("army", "blue"));
redUnitBtn.addEventListener("click", () => createGhost("unit", "red"));
redArmyBtn.addEventListener("click", () => createGhost("army", "red"));

canvas.addEventListener("mousedown", (e) => {
    const pos = worldMouse();
    if (e.button === 0) {
        if (ghostNemo) {
            nemos.push(ghostNemo);
            squadManager.updateSquads(nemos);
            ghostNemo = null;
        } else {
            isSelecting = true;
            selectionStart = pos;
            selectionRect = { x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y };
            selectedNemos.forEach(n => n.selected = false);
            selectedSquads.forEach(s => s.selected = false);
            selectedNemos = [];
            selectedSquads = [];
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
    }

    if (isMoveDragging && e.button === 2) {
        isMoveDragging = false;
        const pos = worldMouse();
        moveRect.x2 = pos.x;
        moveRect.y2 = pos.y;
        const dragW = Math.abs(moveRect.x2 - moveRect.x1);
        const dragH = Math.abs(moveRect.y2 - moveRect.y1);
        const targets = getAllSelectedNemos();
        if (dragW < 5 && dragH < 5) {
            if (selectedSquads.length === 1 && selectedNemos.length === 0) {
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
                    targets[i].setDestination(x, y);
                }
            } else {
                targets.forEach(n => n.setDestination(pos.x, pos.y));
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
                targets[i].setDestination(x, y);
            }
        }
        moveRect = null;
        e.preventDefault();
    }
});

canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
});

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
    squadManager.updateSquads(nemos);

    // 사망한 네모 제거
    for (let i = nemos.length - 1; i >= 0; i--) {
        if (nemos[i].dead) {
            nemos.splice(i, 1);
        }
    }

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
    squadManager.draw(ctx);

    // Nemo 객체들을 배경 위에 그리기
    nemos.forEach(nemo => nemo.draw(ctx));
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

    requestAnimationFrame(gameLoop);
}

// 배경 이미지 로드 완료 후 게임 루프 시작
background.onload = () => {
    gameLoop();
};


export { mainGrid };
