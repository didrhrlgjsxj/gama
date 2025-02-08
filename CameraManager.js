const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const background = new Image();
background.src = "BackGround.webp"; // 배경 이미지
const backgroundWidth = 1000; // 배경 너비 (더 크게 설정)
const backgroundHeight = 1000; // 배경 높이 (더 크게 설정)

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

// 카메라 이동 로직
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

// 게임 루프
function gameLoop() {
    updateCamera();

    // 배경 그리기 (카메라 좌표 적용)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(background, -cameraX, -cameraY, backgroundWidth, backgroundHeight); // 배경을 먼저 그림

    // 오브젝트들을 그리는 코드 (배경이 뒤에 오도록)
    // blueNemo.draw(ctx);
    // redNemo.draw(ctx);

    requestAnimationFrame(gameLoop);
}

background.onload = () => {
    gameLoop();
};
