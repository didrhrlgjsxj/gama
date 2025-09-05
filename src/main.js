// main.js
import Nemo from './Nemo.js';  // Nemo.js에서 Nemo 클래스를 가져옵니다.
import Grid from './Grid.js';
import { SquadManager, Squad } from './NemoSquadManager.js';
import MoveIndicator from './MoveIndicator.js';
import { MineralPatch, MineralPiece, Storage } from './Resource.js';
import { Worker } from './Nemo.js';
import { TeamManagers } from './TeamManager.js';


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
const commandPanel = document.getElementById("commandPanel");
const unitInfoDiv = document.getElementById("unitInfo");
const commandButtonsDiv = document.getElementById("commandButtons");
const buildMenu = document.getElementById("buildMenu");

// 배경 이미지 설정
const background = new Image();
background.src = "src/BackGround.webp"; // 배경 이미지 경로
const backgroundWidth = 1600; // 배경 너비 (원하는 크기로 설정)
const backgroundHeight = 1200; // 배경 높이 (원하는 크기로 설정)


// Nemo 보다 약간 작은 크기의 그리드를 생성
const mainGrid = new Grid(40);
const squadManager = new SquadManager(mainGrid.cellSize);

// 자원 및 작업자 관련 변수
TeamManagers.blue.minerals = 0;
const mineralPatches = [
    new MineralPatch(...Object.values(mainGrid.snap(320, 320))),
    new MineralPatch(...Object.values(mainGrid.snap(480, 280))),
    new MineralPatch(...Object.values(mainGrid.snap(720, 360))),
    new MineralPatch(...Object.values(mainGrid.snap(920, 200)))
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
    // 현재 화면 중앙의 월드 좌표를 기록
    const prevScale = scale;
    const centerX = cameraX + canvas.width / 2 / prevScale;
    const centerY = cameraY + canvas.height / 2 / prevScale;

    // 휠 위로 돌리면 (deltaY < 0) 확대, 아래면 (deltaY > 0) 축소
    scale += -event.deltaY * zoomSpeed;
    // 확대/축소 배율의 최소, 최대 한계값 설정 (예: 0.5배 ~ 3.0배)
    scale = Math.max(0.5, Math.min(scale, 3.0));

    // 새로운 스케일에 맞춰 카메라 위치 조정 (화면 중앙을 기준으로 확대/축소)
    cameraX = centerX - canvas.width / 2 / scale;
    cameraY = centerY - canvas.height / 2 / scale;
    cameraX = Math.max(0, Math.min(backgroundWidth - canvas.width / scale, cameraX));
    cameraY = Math.max(0, Math.min(backgroundHeight - canvas.height / scale, cameraY));
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

    // 카메라가 배경을 벗어나지 않도록 제한 (확대/축소 고려)
    const maxX = backgroundWidth - canvas.width / scale;
    const maxY = backgroundHeight - canvas.height / scale;
    cameraX = Math.max(0, Math.min(maxX, cameraX));
    cameraY = Math.max(0, Math.min(maxY, cameraY));
}

// Nemo 관련 코드

// 임시 배치용 네모
let ghostNemo = null;
// 임시 배치용 스쿼드
let ghostSquad = null;
// 임시 배치용 작업자
let ghostWorker = null;
// 임시 배치용 건물
let ghostBuilding = null;

const nemos = [];
let selectedNemos = [];
let selectedSquads = [];
let selectedWorkers = [];
let isSelecting = false;
let selectionStart = null;
let selectionRect = null;
let isMoveDragging = false;
let moveRect = null;
const moveIndicators = [];
const deathEffects = [];
const gatherEffects = [];
let pendingBuildWorker = null;
let pendingBuildType = null;
let attackKey = false; // 'A' 키가 눌린 상태 여부
let mineKey = false; // 'M' 키 또는 Mine 버튼 활성화 여부

window.addEventListener('keydown', (e) => {
    if (e.key === 'a' || e.key === 'A') {
        attackKey = true;
        e.preventDefault();
    }
    if (e.key === 'm' || e.key === 'M') {
        mineKey = true;
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'a' || e.key === 'A') {
        attackKey = false;
        e.preventDefault();
    }
    if (e.key === 'm' || e.key === 'M') {
        mineKey = false;
        e.preventDefault();
    }
    if (e.key === 'x' || e.key === 'X') {
        squadManager.mergeSelectedSquads();
        e.preventDefault();
    }
});

function getAllSelectedNemos() {
    const set = new Set(selectedNemos);
    selectedSquads.forEach(s => s.nemos.forEach(n => set.add(n)));
    return Array.from(set);
}

// 명령 패널의 이전 상태를 기록하여 매 프레임 DOM을 다시 만들지 않도록 함
let lastButtonType = null;
let lastInfoText = '';

function updateCommandPanel() {
    const anySelection = selectedNemos.length || selectedWorkers.length || selectedSquads.length;
    if (!anySelection) {
        commandPanel.style.display = 'none';
        buildMenu.style.display = 'none';
        lastButtonType = null;
        lastInfoText = '';
        return;
    }
    commandPanel.style.display = 'block';
    const unit = selectedNemos[0] || selectedWorkers[0] || null;
    if (!unit) return;

    let info = `HP: ${Math.round(unit.hp || 0)}`;
    if (unit.shieldMaxHp) info += ` / Shield: ${Math.round(unit.shieldHp)}`;
    if (info !== lastInfoText) {
        unitInfoDiv.textContent = info;
        lastInfoText = info;
    }

    let buttonType = null;
    if (unit instanceof Worker && unit.type === 'B') {
        buttonType = 'build';
    } else if (unit instanceof Worker && unit.type === 'A') {
        buttonType = 'mine';
    } else if (unit.platforms) {
        buttonType = 'attack';
    }

    if (buttonType !== lastButtonType) {
        commandButtonsDiv.innerHTML = '';
        if (buttonType === 'build') {
            const btn = document.createElement('button');
            btn.textContent = 'Build';
            btn.onclick = () => {
                buildMenu.style.display = buildMenu.style.display === 'none' ? 'block' : 'none';
            };
            commandButtonsDiv.appendChild(btn);
        } else if (buttonType === 'mine') {
            const btn = document.createElement('button');
            btn.textContent = 'Mine';
            btn.onclick = () => {
                mineKey = true;
            };
            commandButtonsDiv.appendChild(btn);
        } else if (buttonType === 'attack') {
            const atkBtn = document.createElement('button');
            atkBtn.textContent = 'Attack Move';
            atkBtn.onclick = () => { attackKey = true; };
            commandButtonsDiv.appendChild(atkBtn);
        }
        lastButtonType = buttonType;
    }
}
//blueUnitNemo

function worldMouse() {
    return {
        x: cameraX + mouseX / scale,
        y: cameraY + mouseY / scale
    };
}

function enemyNemoAt(pos, myTeam) {
    const list = [...nemos, ...workers];
    for (const n of list) {
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

function nemoAt(pos) {
    for (const nemo of nemos) {
        if (
            pos.x >= nemo.x - nemo.size / 2 &&
            pos.x <= nemo.x + nemo.size / 2 &&
            pos.y >= nemo.y - nemo.size / 2 &&
            pos.y <= nemo.y + nemo.size / 2
        ) {
            return nemo;
        }
    }
    return null;
}

function workerAt(pos) {
    for (const w of workers) {
        if (
            pos.x >= w.x - w.size / 2 &&
            pos.x <= w.x + w.size / 2 &&
            pos.y >= w.y - w.size / 2 &&
            pos.y <= w.y + w.size / 2
        ) {
            return w;
        }
    }
    return null;
}

function squadAt(pos) {
    for (const squad of squadManager.squads) {
        const b = squad.bounds;
        if (pos.x >= b.x && pos.x <= b.x + b.w && pos.y >= b.y && pos.y <= b.y + b.h) {
            return squad;
        }
    }
    return null;
}

function createGhostSquad(squadType, team) {
    ghostWorker = null;
    ghostBuilding = null;

    const { x, y } = worldMouse();
    const squadNemos = [];
    const numUnits = 3;

    for (let i = 0; i < numUnits; i++) {
        // 유닛들을 소환 위치 주변에 약간 흩어지게 배치
        const offsetX = (Math.random() - 0.5) * 80;
        const offsetY = (Math.random() - 0.5) * 80;
        let newNemo;

        if (squadType === 'A') { // A형: unit 3기
            newNemo = new Nemo(x + offsetX, y + offsetY, team, ["attack"], "unit", "sqaudio", "ranged", false);
        } else { // B형: sqaudio 3기
            newNemo = new Nemo(x + offsetX, y + offsetY, team, ["move", "attack", "attack"], "army", "sqaudio", "ranged", true);
        }
        newNemo.ghost = true;
        squadNemos.push(newNemo);
    }

    ghostSquad = new Squad(squadNemos, team, mainGrid.cellSize);
    ghostSquad.squadType = squadType; // 스폰 시 타입을 알기 위해 저장
    squadNemos.forEach(n => n.squad = ghostSquad);
}


redUnitBtn.addEventListener("click", () => createGhostSquad("A", "red"));
redArmyBtn.addEventListener("click", () => createGhostSquad("B", "red"));
blueUnitBtn.addEventListener("click", () => createGhostSquad("A", "blue"));
blueArmyBtn.addEventListener("click", () => createGhostSquad("B", "blue"));

function createWorkerGhost(type) {
    ghostNemo = null; // 다른 고스트 객체 비활성화
    ghostBuilding = null;
    ghostSquad = null;
    const { x, y } = worldMouse();
    ghostWorker = new Worker(x, y, type);
    ghostWorker.ghost = true;
}

workerABtn.addEventListener("click", () => createWorkerGhost('A'));
workerBBtn.addEventListener("click", () => createWorkerGhost('B'));
document.querySelectorAll('.buildBtn').forEach(btn => {
    btn.addEventListener('click', () => {
        ghostNemo = null; // 다른 고스트 객체 비활성화
        ghostSquad = null;
        ghostWorker = null;
        const type = btn.getAttribute('data-type');
        const { x, y } = worldMouse();
        const pos = mainGrid.snap(x, y);
        ghostBuilding = new Storage(pos.x, pos.y, true);
        buildMenu.style.display = 'none';
        if (selectedWorkers[0]) {
            pendingBuildWorker = selectedWorkers[0];
            pendingBuildType = type;
        }
        buildMenu.style.display = 'none';
        pendingBuildWorker = selectedWorkers.find(w => w.type === 'B') || null;
    });
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
        if (mineKey && selectedWorkers.some(w => w.type === 'A')) {
            let patch = null;
            for (const p of mineralPatches) {
                if (Math.hypot(p.x - pos.x, p.y - pos.y) <= p.radius) { patch = p; break; }
            }
            if (patch) {
                selectedWorkers.forEach(w => { if (w.type === 'A') w.toggleAutoMine(patch); });
            }
            mineKey = false;
            return;
        }
        if (ghostWorker) {
            ghostWorker.ghost = false;
            workers.push(ghostWorker);
            ghostWorker = null;
        } else if (ghostBuilding && pendingBuildWorker) {
            const buildPos = { x: ghostBuilding.x, y: ghostBuilding.y };
            const type = pendingBuildType || 'storage';
            pendingBuildWorker.startBuilding(type, buildPos);
            ghostBuilding = null;
            pendingBuildWorker = null;
            pendingBuildType = null;
        } else if (ghostSquad) {
            const squadNemos = [];
            ghostSquad.nemos.forEach(ghostNemo => {
                ghostNemo.ghost = false;
                squadNemos.push(ghostNemo);
                nemos.push(ghostNemo);
            });

            const newSquad = new Squad(squadNemos, ghostSquad.team, mainGrid.cellSize);
            squadNemos.forEach(n => n.squad = newSquad);
            squadManager.squads.push(newSquad);

            ghostSquad = null;
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
        } else if (selectedWorkers.length > 0) {
            selectedWorkers.forEach(w => {
                w.manualTarget = pos;
            });
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
                // Shift 키를 누르지 않고, 공격 명령도 아닌 상태에서 빈 공간을 클릭하면 모든 선택 해제
                if (!attackKey && !e.shiftKey && !enemyNemoAt(pos) && !enemySquadAt(pos) && !nemoAt(pos) && !workerAt(pos) && !squadAt(pos)) {
                    selectedNemos.forEach(n => (n.selected = false));
                    selectedWorkers.forEach(w => (w.selected = false));
                    selectedSquads.forEach(s => (s.selected = false));
                    selectedNemos = [];
                    selectedWorkers = [];
                    selectedSquads = [];
                    return; // 선택 해제 후 추가 동작 방지
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
            let clickedWorker = null;
            for (const w of workers) {
                if (
                    pos.x >= w.x - w.size / 2 &&
                    pos.x <= w.x + w.size / 2 &&
                    pos.y >= w.y - w.size / 2 &&
                    pos.y <= w.y + w.size / 2
                ) {
                    clickedWorker = w;
                    break;
                }
            }

            // Shift 키를 누르지 않았을 때만 기존 선택을 해제합니다.
            if (!e.shiftKey) {
                selectedNemos.forEach(n => (n.selected = false));
                selectedWorkers.forEach(w => (w.selected = false));
                selectedSquads.forEach(s => (s.selected = false));
                selectedNemos = [];
                selectedWorkers = [];
                selectedSquads = [];
            }

            if (clickedNemo) {
                clickedNemo.selected = true;
                selectedNemos.push(clickedNemo);
            } else if (clickedWorker) {
                clickedWorker.selected = true;
                selectedWorkers.push(clickedWorker);
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
            // Shift 키를 누르지 않았을 때만 기존 선택을 해제합니다.
            if (!e.shiftKey) {
                selectedNemos.forEach(n => (n.selected = false));
                selectedWorkers.forEach(w => (w.selected = false));
                selectedSquads.forEach(s => (s.selected = false));
                selectedNemos = [];
                selectedWorkers = [];
                selectedSquads = [];
            }
            workers.forEach(w => {
                if (w.x >= minX && w.x <= maxX && w.y >= minY && w.y <= maxY) {
                    w.selected = true;
                    selectedWorkers.push(w);
                }
            });
            // 스쿼드를 먼저 선택하고, 스쿼드에 포함되지 않은 네모를 나중에 선택합니다.
            const selectedInSquads = new Set();
            squadManager.squads.forEach(squad => {
                const b = squad.bounds;
                if (b.x >= minX && b.x + b.w <= maxX && b.y >= minY && b.y + b.h <= maxY) {
                    const hasSelected = squad.nemos.some(n => selectedNemos.includes(n));
                    if (!hasSelected) {
                        squad.selected = true;
                        selectedSquads.push(squad);
                        squad.nemos.forEach(n => selectedInSquads.add(n.id));
                    }
                }
            });
            nemos.forEach(nemo => {
                if (!selectedInSquads.has(nemo.id) && nemo.x >= minX && nemo.x <= maxX && nemo.y >= minY && nemo.y <= maxY) {
                    nemo.selected = true;
                    selectedNemos.push(nemo);
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

        // 드래그 거리가 거의 없으면(클릭), 유닛들이 현재 포메이션을 유지한 채로 이동하도록 처리합니다.
        // 드래그를 하면 해당 드래그 영역에 맞춰 유닛들이 배치됩니다.
        if (dragW < 5 && dragH < 5) { // 클릭으로 간주
            const enemyN = enemyNemoAt(pos, team);
            const enemyS = enemySquadAt(pos, team);

            if (enemyN) {
                issueAttackMove([enemyN], {x: enemyN.x, y: enemyN.y});
            } else if (enemyS) {
                issueAttackMove(enemyS.nemos, pos);
            } else {
                // 클릭 지점을 중심으로 유닛들의 현재 상대적 위치를 유지하며 목표 지점 설정
                if (targets.length > 0) {
                    // 유닛들의 현재 위치의 중심점을 계산합니다.
                    const currentCenter = targets.reduce((acc, n) => ({ x: acc.x + n.x, y: acc.y + n.y }), { x: 0, y: 0 });
                    currentCenter.x /= targets.length;
                    currentCenter.y /= targets.length;

                    // 각 유닛에 대해 새로운 목표 지점을 계산합니다.
                    targets.forEach(n => {
                        // 현재 중심점으로부터의 상대적 위치
                        const relX = n.x - currentCenter.x;
                        const relY = n.y - currentCenter.y;
                        // 클릭 지점을 새로운 중심으로 하여 목표 위치 설정
                        const destX = pos.x + relX;
                        const destY = pos.y + relY;

                        n.clearAttackMove();
                        n.setDestination(destX, destY);
                        n.ignoreEnemies = true;
                    });
                    moveIndicators.push(new MoveIndicator(pos.x, pos.y, 40, 20, 'yellow'));
                }
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
            const distSq = dx * dx + dy * dy;
            const minDistSq = minDist * minDist;
            if (distSq > 0 && distSq < minDistSq) {
                const dist = Math.sqrt(distSq);
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
    const enemies = [...nemos, ...workers];
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
    for (let i = workers.length - 1; i >= 0; i--) {
        if (workers[i].dead) {
            const dead = workers[i];
            workers.splice(i, 1);
            const idx = selectedWorkers.indexOf(dead);
            if (idx !== -1) selectedWorkers.splice(idx, 1);
        }
    }
    // 죽은 네모가 포함된 스쿼드 정리
    squadManager.squads.forEach(squad => {
        squad.nemos = squad.nemos.filter(n => !n.dead);
    });
    squadManager.squads = squadManager.squads.filter(squad => squad.nemos.length > 0);
    squadManager.updateSquads(nemos);

    // 고스트 네모 및 작업자 위치 갱신
    if (ghostSquad) {
        const { x, y } = worldMouse();
        const currentCenter = ghostSquad.squadCenter;
        const dx = x - currentCenter.x;
        const dy = y - currentCenter.y;

        ghostSquad.nemos.forEach(n => {
            n.x += dx;
            n.y += dy;
        });
        ghostSquad.update(); // 바운드 및 중심 업데이트
    }
    if (ghostWorker) {
        const { x, y } = worldMouse();
        ghostWorker.x = x;
        ghostWorker.y = y;
    }
    if (ghostBuilding) {
        const { x, y } = worldMouse();
        const snapped = mainGrid.snap(x, y);
        ghostBuilding.x = snapped.x;
        ghostBuilding.y = snapped.y;
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
    gatherEffects.forEach(e => {
        e.update();
        e.draw(ctx);
    });
    for (let i = gatherEffects.length - 1; i >= 0; i--) {
        if (gatherEffects[i].isDone()) gatherEffects.splice(i, 1);
    }
    deathEffects.forEach(e => {
        e.update();
        e.draw(ctx);
    });
    for (let i = deathEffects.length - 1; i >= 0; i--) {
        if (deathEffects[i].isDone()) deathEffects.splice(i, 1);
    }
    if (ghostSquad) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ghostSquad.nemos.forEach(n => n.draw(ctx));
        ghostSquad.draw(ctx);
        ctx.restore();
    }
    if (ghostWorker) ghostWorker.draw(ctx);
    if (ghostBuilding) ghostBuilding.draw(ctx);
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
    if (mineKey) {
        ctx.save();
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    mineralSpan.textContent = TeamManagers.blue.getMinerals();
    updateCommandPanel();
    requestAnimationFrame(gameLoop);
}

// 배경 이미지 로드 완료 후 게임 루프 시작
background.onload = () => {
    gameLoop();
};


export { mainGrid, deathEffects, gatherEffects };
