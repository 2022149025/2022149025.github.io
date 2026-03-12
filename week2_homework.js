// Global constants
const canvas = document.getElementById('glCanvas'); // Get the canvas element 
const gl = canvas.getContext('webgl2'); // Get the WebGL2 context

if (!gl) {
    console.error('WebGL 2 is not supported by your browser.');
}

// ===============================
// init
// ===============================
const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 500;

const red = [1, 0, 0, 1];
const green = [0, 1, 0, 1];
const blue = [0, 0, 1, 1];
const yellow = [1, 1, 0, 1];

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Initialize WebGL settings: viewport and clear color
gl.viewport(0, 0, canvas.width, canvas.height);

gl.enable(gl.SCISSOR_TEST);

function reColor(x, y, w, h, c){
    gl.scissor(x, y, w, h);
    gl.clearColor(...c);
}

// Start rendering
render(canvas.width, canvas.height);

// Render loop
function render(x, y) {
    w = x/2;
    h = y/2;
    reColor(0, 0+h, w, h, green);
    gl.clear(gl.COLOR_BUFFER_BIT);
    reColor(0, 0, w, h, blue);
    gl.clear(gl.COLOR_BUFFER_BIT);
    reColor(0+w, 0+h, w, h, red);
    gl.clear(gl.COLOR_BUFFER_BIT);
    reColor(0+w, 0, w, h, yellow);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

// ===============================
// 창 크기 바뀌면 비율 유지하면서 resize
// ===============================
window.addEventListener('resize', () => {

    const aspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;

    let newWidth = window.innerWidth;
    let newHeight = window.innerHeight;

    // 너무 가로로 길면 → 세로 기준으로 맞춤
    if (newWidth / newHeight > aspectRatio) {
        newWidth = newHeight * aspectRatio;
    } 
    // 너무 세로로 길면 → 가로 기준으로 맞춤
    else {
        newHeight = newWidth / aspectRatio;
    }

    canvas.width = newWidth;
    canvas.height = newHeight;

    // GPU에게 새 viewport 알려주기
    gl.viewport(0, 0, canvas.width, canvas.height);

    render(canvas.width, canvas.height);
});

