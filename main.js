// main.js
import Nemo from './Nemo.js';  // Nemo.js에서 Nemo 클래스를 가져옵니다.

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const keys = { a: false, d: false, w: false, s: false };

// 두 개의 Nemo 객체 생성
const blueNemo = new Nemo(200, 200, "blue");
const redNemo = new Nemo(300, 300, "red");

document.addEventListener("keydown", (e) => {
    if (['a', 'd', 'w', 's'].includes(e.key)) keys[e.key] = true;
});

document.addEventListener("keyup", (e) => {
    if (['a', 'd', 'w', 's'].includes(e.key)) keys[e.key] = false;
});

function gameLoop() {
    let dx = 0, dy = 0;
    if (keys.a) dx -= 1;
    if (keys.d) dx += 1;
    if (keys.w) dy -= 1;
    if (keys.s) dy += 1;

    if (dx !== 0 || dy !== 0) {
        let inputAngle = Math.atan2(dy, dx);
        blueNemo.platform.setTargetAngle(inputAngle);
    } else {
        blueNemo.platform.reset();
    }

    redNemo.platform.reset();
    blueNemo.platform.update();
    blueNemo.update();

    redNemo.platform.update();
    redNemo.update();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    blueNemo.draw(ctx);
    redNemo.draw(ctx);

    requestAnimationFrame(gameLoop);
}

gameLoop();
