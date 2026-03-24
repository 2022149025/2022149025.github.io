import { resizeAspectRatio } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');

let shader = null;
let vao = null;
let uOffsetLocation = null;

let offsetX = 0.0;
let offsetY = 0.0;

const moveStep = 0.01;

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    canvas.width = 600;
    canvas.height = 600;

    resizeAspectRatio(gl, canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    return true;
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('vertex.glsl');
    const fragmentShaderSource = await readShaderFile('fragment.glsl');

    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

function setupBuffers() {
    const vertices = new Float32Array([
        -0.1, -0.1, 0.0,
         0.1, -0.1, 0.0,
         0.1,  0.1, 0.0,
        -0.1,  0.1, 0.0
    ]);

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    shader.setAttribPointer(
        'aPos',
        3,
        gl.FLOAT,
        false,
        3 * Float32Array.BYTES_PER_ELEMENT,
        0
    );

    gl.bindVertexArray(null);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    shader.use();
    gl.uniform2f(uOffsetLocation, offsetX, offsetY);

    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    gl.bindVertexArray(null);
}

function setupEvents() {
    window.addEventListener('keydown', (event) => {
        switch (event.key) {
            case 'ArrowUp':
                offsetY += moveStep;
                break;
            case 'ArrowDown':
                offsetY -= moveStep;
                break;
            case 'ArrowLeft':
                offsetX -= moveStep;
                break;
            case 'ArrowRight':
                offsetX += moveStep;
                break;
            default:
                return;
        }

        render();
    });

    window.addEventListener('resize', () => {
        resizeAspectRatio(gl, canvas);
        gl.viewport(0, 0, canvas.width, canvas.height);
        render();
    });
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
        }

        await initShader();
        setupBuffers();

        uOffsetLocation = gl.getUniformLocation(shader.program, 'uOffset');

        setupEvents();
        render();

        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        return false;
    }
}

main().then(success => {
    if (!success) {
        console.log('프로그램을 종료합니다.');
    }
}).catch(error => {
    console.error('프로그램 실행 중 오류 발생:', error);
});