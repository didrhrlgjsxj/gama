// 캔버스 가져오기
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 캔버스가 제대로 가져와졌는지 확인
if (!canvas || !ctx) {
    console.error("캔버스를 찾을 수 없습니다!");
} else {
    console.log("캔버스 로드 완료!");
}

// 검정색 네모 그리기
ctx.fillStyle = "black";
ctx.fillRect(200, 200, 50, 50); // (x=200, y=200, width=50, height=50)
