// main.js
import Nemo from './Nemo.js';  // Nemo.js에서 Nemo 클래스를 가져옵니다.

// Canvas 및 Context 설정
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 배경 이미지 설정
const background = new Image();
background.src = "BackGround.webp"; // 배경 이미지 경로
const backgroundWidth = 1600; // 배경 너비 (원하는 크기로 설정)
const backgroundHeight = 1200; // 배경 높이 (원하는 크기로 설정)

// 카메라 변수 및 이동 속도
let cameraX = 0;
let cameraY = 0;
const cameraSpeed = 5; // 카메라 이동 속도

// 마우스 위치 추적
let mouseX = 0;
let mouseY = 0;

canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
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
const keys = { a: false, d: false, w: false, s: false };

// 두 개의 Nemo 객체 생성
const blueNemo = new Nemo(200, 200, "blue", ["move", "attack"]);
const redNemo = new Nemo(300, 300, "red", ["move", "attack"]);

document.addEventListener("keydown", (e) => {
    if (['a', 'd', 'w', 's'].includes(e.key)) keys[e.key] = true;
});

document.addEventListener("keyup", (e) => {
    if (['a', 'd', 'w', 's'].includes(e.key)) keys[e.key] = false;
});

// 게임 루프
function gameLoop() {
    // 카메라 업데이트 (마우스 위치에 따라 이동)
    updateCamera();

    // 캔버스 클리어
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 배경 그리기 (월드 좌표에 기반하여 카메라 오프셋 적용)
    ctx.drawImage(background, -cameraX, -cameraY, backgroundWidth, backgroundHeight);

    // Nemo 이동 입력 처리
    let dx = 0, dy = 0;
    if (keys.a) dx -= 1;
    if (keys.d) dx += 1;
    if (keys.w) dy -= 1;
    if (keys.s) dy += 1;

    if (dx !== 0 || dy !== 0) {
        let inputAngle = Math.atan2(dy, dx);
        // blueNemo의 각 플랫폼에 목표 각도 설정
        blueNemo.platforms.forEach(platform => platform.setTargetAngle(inputAngle));
    } else {
        blueNemo.platforms.forEach(platform => platform.reset());
    }
    
    // redNemo 플랫폼 리셋
    redNemo.platforms.forEach(platform => platform.reset());

    // Nemo 업데이트 (플랫폼 업데이트 및 Nemo 이동)
    blueNemo.platforms.forEach(platform => platform.update());
    blueNemo.update();
    
    redNemo.platforms.forEach(platform => platform.update());
    redNemo.update();

    // ★ 카메라 변환 적용 ★  
    // 오브젝트들의 월드 좌표(this.x, this.y)는 그대로 유지되고,  
    // ctx.translate(-cameraX, -cameraY)를 통해 화면상에 그릴 위치만 변환됩니다.
    ctx.save();
    ctx.translate(-cameraX, -cameraY);

    // Nemo 객체들을 배경 위에 그리기
    blueNemo.draw(ctx);
    redNemo.draw(ctx);

    ctx.restore();

    requestAnimationFrame(gameLoop);
}

// 배경 이미지 로드 완료 후 게임 루프 시작
background.onload = () => {
    gameLoop();
};
