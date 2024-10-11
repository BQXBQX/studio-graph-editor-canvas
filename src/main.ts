import "./style.css";
import createProgram from "./utils/shader/createProgram";
import createShader from "./utils/shader/createShader";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <canvas id="canvas"></canvas>
`;

// 顶点着色器代码
const vertexShaderSource = `
 attribute vec2 a_position;
 void main() {
     gl_Position = vec4(a_position, 0.0, 1.0);
 }`;

// 片段着色器代码
const fragmentShaderSource = `
 precision mediump float;
 uniform vec4 u_color;
 void main() {
     gl_FragColor = u_color;
 }`;

function generateCircleVertices(
  radius: number,
  numSegments: number,
  centerX: number,
  centerY: number
) {
  const vertices = [centerX, centerY]; // 圆心
  const angleStep = (Math.PI * 2) / numSegments;

  for (let i = 0; i <= numSegments; i++) {
    const angle = i * angleStep;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    vertices.push(x, y);
  }

  return new Float32Array(vertices);
}

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const gl: WebGL2RenderingContext = canvas.getContext("webgl2")!;

if (!gl) {
  console.error("WebGL 2 is not available");
  throw new Error("WebGL 2 is not available");
}

// 创建和编译着色器
const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(
  gl,
  gl.FRAGMENT_SHADER,
  fragmentShaderSource
);

const program = createProgram(gl, vertexShader, fragmentShader);

// 查找属性和一致性变量位置
const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
const colorUniformLocation = gl.getUniformLocation(program, "u_color");

// 圆的初始属性
let radius = 0.2;
let centerX = 0.0;
let centerY = 0.0;
let isDragging = false;
let numSegments = 3;
let dragOffsetX = 0,
  dragOffsetY = 0;

// 创建缓冲区
const positionBuffer = gl.createBuffer();

function drawCircle() {
  const circleVertices = generateCircleVertices(
    radius,
    numSegments,
    centerX,
    centerY
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, circleVertices, gl.STATIC_DRAW);

  gl.useProgram(program);
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  // 设置颜色
  gl.uniform4f(colorUniformLocation, 0.2, 0.6, 1.0, 1.0); // 蓝色

  // 清屏并绘制
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, numSegments + 2);
}

// 将鼠标坐标转换为 WebGL 坐标
function getMousePosition(event: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = ((event.clientY - rect.top) / rect.height) * -2 + 1;
  return { x, y };
}

// 鼠标按下事件，开始拖拽
canvas.addEventListener("mousedown", (event) => {
  const { x, y } = getMousePosition(event);
  const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
  if (distance <= radius) {
    isDragging = true;
    dragOffsetX = x - centerX;
    dragOffsetY = y - centerY;
  }
});

// 鼠标移动事件，拖动圆形
canvas.addEventListener("mousemove", (event) => {
  if (isDragging) {
    const { x, y } = getMousePosition(event);
    centerX = x - dragOffsetX;
    centerY = y - dragOffsetY;
    drawCircle();
  }
});

// 鼠标释放事件，结束拖拽
canvas.addEventListener("mouseup", () => {
  isDragging = false;
});

// 初始绘制
drawCircle();
