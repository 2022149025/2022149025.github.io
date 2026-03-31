/*-------------------------------------------------------------------------
07_CircleLineIntersection.js

1) 첫 번째 드래그: 원 그리기
   - mouse down 위치 = 중심
   - mouse up 위치 = 원 위의 한 점

2) 두 번째 드래그: 선분 그리기
   - mouse down ~ mouse up = 선분

3) 원과 선분의 교점을 계산해서 화면에 표시
4) 교점은 gl.POINTS 로 그리며, 크기는 vertex shader에서 gl_PointSize = 10.0
---------------------------------------------------------------------------*/
import { resizeAspectRatio, setupText, updateText, Axes } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

// Global variables
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');

let isInitialized = false;
let shader;
let vao;
let positionBuffer;

let isDrawing = false;
let startPoint = null;
let tempPoint = null;

let circle = null;        // { center:[x,y], edge:[x,y] }
let line = null;          // { p1:[x,y], p2:[x,y] }
let intersections = [];   // [[x,y], [x,y], ...]

let textOverlay1;
let textOverlay2;
let textOverlay3;

let axes = new Axes(gl, 0.85);

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) {
        console.log("Already initialized");
        return;
    }

    main().then(success => {
        if (!success) {
            console.log('프로그램을 종료합니다.');
            return;
        }
        isInitialized = true;
    }).catch(error => {
        console.error('프로그램 실행 중 오류 발생:', error);
    });
});

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    canvas.width = 700;
    canvas.height = 700;

    resizeAspectRatio(gl, canvas);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.2, 0.3, 1.0);

    return true;
}

function setupBuffers() {
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    shader.setAttribPointer('a_position', 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
}

function convertToWebGLCoordinates(x, y) {
    return [
        (x / canvas.width) * 2 - 1,
        -((y / canvas.height) * 2 - 1)
    ];
}

function getRadius(center, pointOnCircle) {
    const dx = pointOnCircle[0] - center[0];
    const dy = pointOnCircle[1] - center[1];
    return Math.sqrt(dx * dx + dy * dy);
}

function generateCircleVertices(center, pointOnCircle, segments = 100) {
    const cx = center[0];
    const cy = center[1];
    const radius = getRadius(center, pointOnCircle);

    const vertices = [];
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2.0;
        const x = cx + radius * Math.cos(theta);
        const y = cy + radius * Math.sin(theta);
        vertices.push(x, y);
    }
    return vertices;
}

// 원과 선분의 교점 계산
function computeCircleLineSegmentIntersections(circleObj, lineObj) {
    const cx = circleObj.center[0];
    const cy = circleObj.center[1];
    const r = getRadius(circleObj.center, circleObj.edge);

    const x1 = lineObj.p1[0];
    const y1 = lineObj.p1[1];
    const x2 = lineObj.p2[0];
    const y2 = lineObj.p2[1];

    const dx = x2 - x1;
    const dy = y2 - y1;

    const fx = x1 - cx;
    const fy = y1 - cy;

    const a = dx * dx + dy * dy;
    const b = 2.0 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - r * r;

    const discriminant = b * b - 4.0 * a * c;
    const result = [];

    if (discriminant < 0) {
        return result;
    }

    if (Math.abs(discriminant) < 1e-8) {
        const t = -b / (2.0 * a);
        if (t >= 0.0 && t <= 1.0) {
            result.push([x1 + t * dx, y1 + t * dy]);
        }
        return result;
    }

    const sqrtD = Math.sqrt(discriminant);

    const t1 = (-b - sqrtD) / (2.0 * a);
    const t2 = (-b + sqrtD) / (2.0 * a);

    if (t1 >= 0.0 && t1 <= 1.0) {
        result.push([x1 + t1 * dx, y1 + t1 * dy]);
    }

    if (t2 >= 0.0 && t2 <= 1.0) {
        result.push([x1 + t2 * dx, y1 + t2 * dy]);
    }

    return result;
}

function drawVertices(vertices, mode, color) {
    shader.use();
    shader.setVec4("u_color", color);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    gl.bindVertexArray(vao);
    gl.drawArrays(mode, 0, vertices.length / 2);
}

// 교점 1개를 gl.POINTS로 그림
function drawIntersectionPoint(point, color) {
    shader.use();
    shader.setVec4("u_color", color);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(point), gl.STATIC_DRAW);

    gl.bindVertexArray(vao);
    gl.drawArrays(gl.POINTS, 0, 1);
}

function setupMouseEvents() {
    function handleMouseDown(event) {
        event.preventDefault();
        event.stopPropagation();

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const [glX, glY] = convertToWebGLCoordinates(x, y);

        // 원과 선분이 모두 있으면 새로 시작
        if (circle && line) {
            circle = null;
            line = null;
            intersections = [];

            updateText(textOverlay1, "");
            updateText(textOverlay2, "");
            updateText(textOverlay3, "");
        }

        if (!isDrawing) {
            startPoint = [glX, glY];
            tempPoint = [glX, glY];
            isDrawing = true;
        }
    }

    function handleMouseMove(event) {
        if (!isDrawing) return;

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const [glX, glY] = convertToWebGLCoordinates(x, y);
        tempPoint = [glX, glY];
        render();
    }

    function handleMouseUp() {
        if (!isDrawing || !startPoint || !tempPoint) return;

        if (!circle) {
            circle = {
                center: [...startPoint],
                edge: [...tempPoint]
            };

            const r = getRadius(circle.center, circle.edge);

            updateText(
                textOverlay1,
                `Circle: center (${circle.center[0].toFixed(2)}, ${circle.center[1].toFixed(2)}) radius = ${r.toFixed(2)}`
            );
            updateText(textOverlay2, "");
            updateText(textOverlay3, "");
        }
        else if (!line) {
            line = {
                p1: [...startPoint],
                p2: [...tempPoint]
            };

            updateText(
                textOverlay2,
                `Line segment: (${line.p1[0].toFixed(2)}, ${line.p1[1].toFixed(2)}) ~ (${line.p2[0].toFixed(2)}, ${line.p2[1].toFixed(2)})`
            );

            intersections = computeCircleLineSegmentIntersections(circle, line);

            if (intersections.length === 0) {
                updateText(textOverlay3, "Intersection Points: 0");
            }
            else if (intersections.length === 1) {
                updateText(
                    textOverlay3,
                    `Intersection Points: 1 Point 1: (${intersections[0][0].toFixed(2)}, ${intersections[0][1].toFixed(2)})`
                );
            }
            else {
                updateText(
                    textOverlay3,
                    `Intersection Points: 2 Point 1: (${intersections[0][0].toFixed(2)}, ${intersections[0][1].toFixed(2)}) ` +
                    `Point 2: (${intersections[1][0].toFixed(2)}, ${intersections[1][1].toFixed(2)})`
                );
            }
        }

        isDrawing = false;
        startPoint = null;
        tempPoint = null;
        render();
    }

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 저장된 원 그리기: 보라색
    if (circle) {
        const circleVertices = generateCircleVertices(circle.center, circle.edge, 100);
        drawVertices(circleVertices, gl.LINE_STRIP, [1.0, 0.0, 1.0, 1.0]);
    }

    // 저장된 선분 그리기: 파란색
    if (line) {
        const lineVertices = [
            line.p1[0], line.p1[1],
            line.p2[0], line.p2[1]
        ];
        drawVertices(lineVertices, gl.LINES, [0.4, 0.6, 1.0, 1.0]);
    }

    // 드래그 중 임시 도형: 회색
    if (isDrawing && startPoint && tempPoint) {
        if (!circle) {
            const tempCircleVertices = generateCircleVertices(startPoint, tempPoint, 100);
            drawVertices(tempCircleVertices, gl.LINE_STRIP, [0.5, 0.5, 0.5, 1.0]);
        }
        else if (!line) {
            const tempLineVertices = [
                startPoint[0], startPoint[1],
                tempPoint[0], tempPoint[1]
            ];
            drawVertices(tempLineVertices, gl.LINES, [0.5, 0.5, 0.5, 1.0]);
        }
    }

    // 교점 표시: 노란색 사각 점
    for (const p of intersections) {
        drawIntersectionPoint(p, [1.0, 1.0, 0.0, 1.0]);
    }

    axes.draw(mat4.create(), mat4.create());
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert4.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag4.glsl');
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
        }

        await initShader();

        setupBuffers();
        shader.use();

        textOverlay1 = setupText(canvas, "", 1);
        textOverlay2 = setupText(canvas, "", 2);
        textOverlay3 = setupText(canvas, "", 3);

        setupMouseEvents();
        render();

        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}