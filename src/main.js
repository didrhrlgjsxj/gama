// main.js
import Nemo from './Nemo.js';  // Nemo.js에서 Nemo 클래스를 가져옵니다.
import Grid from './Grid.js';


// Canvas 및 Context 설정
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const unitBtn = document.getElementById("spawnUnitBtn");
const armyBtn = document.getElementById("spawnArmyBtn");

// 배경 이미지 설정
const background = new Image();
background.src = "src/BackGround.webp"; // 배경 이미지 경로
const backgroundWidth = 1600; // 배경 너비 (원하는 크기로 설정)
const backgroundHeight = 1200; // 배경 높이 (원하는 크기로 설정)


const mainGrid = new Grid(200)


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
const keys = {
    a: false, d: false, w: false, s: false,
    ArrowLeft: false, ArrowRight: false,
    ArrowUp: false, ArrowDown: false,
    Shift: false
};

// 임시 배치용 네모
let ghostNemo = null;

// 초기 네모들 생성
const blueArmyNemo = new Nemo(200, 200, "blue", ["move", "attack"], "army");
const nemos = [blueArmyNemo];

// 레드팀 유닛 5기 배치
for (let i = 0; i < 5; i++) {
    nemos.push(new Nemo(300 + i * 60, 300, "red", ["attack"], "unit"));
}
//blueUnitNemo
document.addEventListener("keydown", (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
});

document.addEventListener("keyup", (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

function worldMouse() {
    return {
        x: cameraX + mouseX / scale,
        y: cameraY + mouseY / scale
    };
}

function createGhost(type) {
    const { x, y } = worldMouse();
    const platformTypes = type === "army" ? ["move", "attack"] : ["attack"];
    ghostNemo = new Nemo(x, y, "blue", platformTypes, type);
}

unitBtn.addEventListener("click", () => createGhost("unit"));
armyBtn.addEventListener("click", () => createGhost("army"));

canvas.addEventListener("mousedown", (e) => {
    if (e.button === 0 && ghostNemo) {
        nemos.push(ghostNemo);
        ghostNemo = null;
    }
});

// 게임 루프
function gameLoop() {
    // 카메라 업데이트 (마우스 위치에 따라 이동)
    updateCamera();

    // 캔버스 클리어
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    
    // (기존의 배경 그리기 호출은 제거합니다.)

    // Nemo 이동 입력 처리
    let dx = 0, dy = 0;
    if (keys.a || keys.ArrowLeft) dx -= 1;
    if (keys.d || keys.ArrowRight) dx += 1;
    if (keys.w || keys.ArrowUp) dy -= 1;
    if (keys.s || keys.ArrowDown) dy += 1;

    const reverse = keys.Shift;

    if (dx !== 0 || dy !== 0) {
        const inputAngle = Math.atan2(dy, dx);
        nemos.forEach(nemo => nemo.handleMoveInput(inputAngle, reverse));
    } else {
        nemos.forEach(nemo => nemo.resetMoveInput());
    }

    // Nemo 업데이트 (플랫폼 업데이트 및 Nemo 이동)
    const enemies = nemos;
    nemos.forEach(nemo => nemo.update(enemies));

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

    // Nemo 객체들을 배경 위에 그리기
    nemos.forEach(nemo => nemo.draw(ctx));
    if (ghostNemo) ghostNemo.draw(ctx);

    ctx.restore();

    requestAnimationFrame(gameLoop);
}

// 배경 이미지 로드 완료 후 게임 루프 시작
background.onload = () => {
    gameLoop();
};


export { mainGrid };