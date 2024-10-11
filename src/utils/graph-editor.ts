import { CircleNode } from "./circle-node";
import createProgram from "./shader/createProgram";
import createShader from "./shader/createShader";
import fragment from "../glsl/fragment.glsl?raw";
import vertex from "../glsl/vertex.glsl?raw";

export class graphEditor {
  private canvas: HTMLCanvasElement;
  private isDraggingCanvas = false;
  private isDraggingNode = false;
  private selectedNode: CircleNode | null = null;
  private gl: WebGL2RenderingContext;
  private nodes: CircleNode[] = [];
  private width: number = 0;
  private height: number = 0;
  private program: WebGLProgram;

  constructor(container: HTMLCanvasElement) {
    this.canvas = container;

    const currentWebGL = this.canvas.getContext("webgl2");

    if (!currentWebGL) {
      throw new Error("not support webgl2");
    }
    this.gl = currentWebGL;

    this.isDraggingCanvas = false;
    this.isDraggingNode = false;
    this.selectedNode = null;

    this.gl.clearColor(245, 245, 245, 1);

    // 初始化着色器程序
    this.program = this.initShaderProgram()!;

    this.resizeCanvas();
    window.addEventListener("resize", () => {
      this.resizeCanvas();
    });

    // 添加圆形节点
    this.nodes.push(
      new CircleNode(this.gl, 0, 0, 20, [1.0, 0.0, 0.0, 1.0]) // 红色圆形
    );
    this.nodes.push(
      new CircleNode(this.gl, 200, 200, 30, [0.0, 1.0, 0.0, 1.0]) // 绿色圆形
    );

    // 绘制场景
    this.drawScene();
  }

  // 初始化着色器程序
  private initShaderProgram(): WebGLProgram | null {
    const vertexShaderSource = vertex;
    const fragmentShaderSource = fragment;

    const vertexShader = createShader(
      this.gl,
      this.gl.VERTEX_SHADER,
      vertexShaderSource
    );
    const fragmentShader = createShader(
      this.gl,
      this.gl.FRAGMENT_SHADER,
      fragmentShaderSource
    );

    if (!vertexShader || !fragmentShader) {
      throw new Error("Shader compilation error");
    }

    const program = createProgram(this.gl, vertexShader, fragmentShader);

    return program;
  }

  // 调整 canvas 尺寸
  private resizeCanvas(): void {
    const displayWidth = this.canvas.clientWidth;
    const displayHeight = this.canvas.clientHeight;

    if (
      this.canvas.width !== displayWidth ||
      this.canvas.height !== displayHeight
    ) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
    }

    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.drawScene(); // 调整大小后重新绘制
  }

  // 绘制场景
  public drawScene(): void {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // 绘制所有节点
    for (let node of this.nodes) {
      node.draw(this.program);
    }
  }
}
