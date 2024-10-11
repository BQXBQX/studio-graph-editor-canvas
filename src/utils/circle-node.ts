export class CircleNode {
  private gl: WebGL2RenderingContext;
  private x: number;
  private y: number;
  private radius: number;
  private color: [number, number, number, number]; // RGBA
  private vertexBuffer: WebGLBuffer | null = null;
  private numVertices: number = 0; // 用于存储顶点数量

  constructor(
    gl: WebGL2RenderingContext,
    x: number,
    y: number,
    radius: number,
    color: [number, number, number, number]
  ) {
    this.gl = gl;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;

    // 初始化缓冲区用于绘制圆形
    this.initBuffers();
  }

  // 初始化用于圆形绘制的缓冲区
  private initBuffers(): void {
    const numSegments = 100;
    const angleStep = (2 * Math.PI) / numSegments;

    const vertices: number[] = [];

    // 添加圆心点（TRIANGLE_FAN 的起始点）
    vertices.push(this.x, this.y);

    // 添加圆周的顶点
    for (let i = 0; i <= numSegments; i++) {
      const angle = i * angleStep;
      const x = Math.cos(angle) * this.radius + this.x;
      const y = Math.sin(angle) * this.radius + this.y;
      vertices.push(x, y);
    }

    this.numVertices = numSegments + 2; // 圆心 + 100段圆弧 + 闭合顶点

    this.vertexBuffer = this.gl.createBuffer();
    if (!this.vertexBuffer) {
      throw new Error("Failed to create buffer");
    }

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(vertices),
      this.gl.STATIC_DRAW
    );
  }

  // 绘制圆形
  public draw(program: WebGLProgram): void {
    const gl = this.gl;

    // 激活着色器程序
    gl.useProgram(program);

    // 绑定缓冲区并启用顶点属性
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // 设置颜色
    const colorLocation = gl.getUniformLocation(program, "u_color");
    if (colorLocation !== null) {
      gl.uniform4fv(colorLocation, this.color);
    }

    // 绘制圆形，使用 `this.numVertices` 来确保绘制的顶点数量正确
    gl.drawArrays(gl.TRIANGLE_FAN, 0, this.numVertices);
  }
}
