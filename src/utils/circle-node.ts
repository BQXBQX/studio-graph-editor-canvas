import { BehaviorSubject } from "rxjs";

export class CircleNode {
  private gl: WebGL2RenderingContext;
  private vertexBuffer: WebGLBuffer | null = null;
  private numVertices: number = 0;

  // RxJS subjects to manage updates
  private position$: BehaviorSubject<[number, number]>;
  private radius$: BehaviorSubject<number>;
  private color$: BehaviorSubject<[number, number, number, number]>;

  constructor(
    gl: WebGL2RenderingContext,
    x: number,
    y: number,
    color: [number, number, number, number],
    radius: number = 100 // Optional radius defaulting to 30
  ) {
    this.gl = gl;

    // Initialize subjects for position, radius, and color
    this.position$ = new BehaviorSubject<[number, number]>([x, y]);
    this.radius$ = new BehaviorSubject<number>(radius);
    this.color$ = new BehaviorSubject<[number, number, number, number]>(color);

    // Initialize buffer data for the circle vertices
    this.initBuffers();
  }

  // Initialize vertex buffers for drawing the circle
  private initBuffers(): void {
    const numSegments = 100; // More segments for smoother circles
    const angleStep = (2 * Math.PI) / numSegments;

    const vertices: number[] = [];

    // Subscribe to position changes
    this.position$.subscribe(([x, y]) => {
      // Add the center point for TRIANGLE_FAN
      vertices.push(x, y);

      // Compute circle points based on radius
      for (let i = 0; i <= numSegments; i++) {
        const angle = i * angleStep;
        const posX = Math.cos(angle) * this.radius$.getValue() + x;
        const posY = Math.sin(angle) * this.radius$.getValue() + y;
        vertices.push(posX, posY);
      }

      this.numVertices = numSegments + 2; // Circle center + points + close loop
    });

    // Create and bind vertex buffer
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

  // Draw the circle
  public draw(program: WebGLProgram): void {
    const gl = this.gl;

    // Activate the shader program
    gl.useProgram(program);

    // Bind and set up the vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Set the circle color from the color stream
    const colorLocation = gl.getUniformLocation(program, "u_color");
    const color = this.color$.getValue();
    if (colorLocation !== null) {
      gl.uniform4fv(colorLocation, color);
    }

    // Draw the circle using TRIANGLE_FAN
    gl.drawArrays(gl.TRIANGLE_FAN, 0, this.numVertices);
  }
}
