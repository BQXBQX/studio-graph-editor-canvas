import { BehaviorSubject } from "rxjs";
import { Node } from "../types/node";
import { TextLabel } from "./text-label";

export class CircleNode<T> {
  private gl: WebGL2RenderingContext;
  private vertexBuffer: WebGLBuffer | null = null;
  private borderBuffer: WebGLBuffer | null = null;
  private numVertices: number = 0;
  private numBorderVertices: number = 0;

  // RxJS subjects to manage updates
  private position$: BehaviorSubject<[number, number]>;
  private offset$: BehaviorSubject<[number, number]>;
  private radius$: BehaviorSubject<number>;
  private backgroundColor$: BehaviorSubject<[number, number, number, number]>;
  private borderColor$: BehaviorSubject<[number, number, number, number]>;
  private borderWidth$: BehaviorSubject<number>;
  private data$: BehaviorSubject<T>;
  private textLabel: TextLabel;

  constructor(
    gl: WebGL2RenderingContext,
    nodeProps: Node<T>,
    radius: number = 80, // Optional radius defaulting to 100
    borderColor: [number, number, number, number] = [0, 0, 0, 1], // Default black border
    borderWidth: number = 6 // Default border width
  ) {
    this.gl = gl;

    // Initialize subjects for position, radius, color, border color, and width
    this.position$ = new BehaviorSubject<[number, number]>(nodeProps.position);
    this.offset$ = new BehaviorSubject<[number, number]>([0, 0]); // Initialize offset
    this.radius$ = new BehaviorSubject<number>(radius);
    this.backgroundColor$ = new BehaviorSubject<
      [number, number, number, number]
    >(nodeProps.backgroundColor ?? [1, 1, 1, 1]);
    this.borderColor$ = new BehaviorSubject<[number, number, number, number]>(
      borderColor
    );
    this.borderWidth$ = new BehaviorSubject<number>(borderWidth);
    this.data$ = new BehaviorSubject<T>(nodeProps.data);

    this.textLabel = new TextLabel(
      nodeProps.label ?? "",
      nodeProps.position[0],
      nodeProps.position[1]
    );

    // Subscribe to position changes to update the label's position
    this.position$.subscribe(([x, y]) => {
      this.textLabel.setPosition(x, y);
    });

    // Initialize buffer data for the circle vertices
    this.initBuffers();
  }

  // Initialize vertex buffers for drawing the circle and border
  private initBuffers(): void {
    const numSegments = 100; // More segments for smoother circles
    const angleStep = (2 * Math.PI) / numSegments;

    const vertices: number[] = [];
    const borderVertices: number[] = [];

    // Subscribe to position changes and calculate vertices
    this.position$.subscribe(([x, y]) => {
      const [offsetX, offsetY] = this.offset$.getValue(); // Get current offset

      // Add the center point for TRIANGLE_FAN
      vertices.push(x + offsetX, y + offsetY); // Apply offset

      // Compute circle points based on radius
      for (let i = 0; i <= numSegments; i++) {
        const angle = i * angleStep;
        const posX = Math.cos(angle) * this.radius$.getValue() + x + offsetX; // Apply offset
        const posY = Math.sin(angle) * this.radius$.getValue() + y + offsetY; // Apply offset
        vertices.push(posX, posY);
      }

      console.log("center", x + offsetX, y + offsetY);

      this.numVertices = numSegments + 2; // Circle center + points + close loop

      // Compute border points based on radius + border width
      borderVertices.push(x + offsetX, y + offsetY); // Apply offset
      const borderRadius =
        this.radius$.getValue() + this.borderWidth$.getValue();
      for (let i = 0; i <= numSegments; i++) {
        const angle = i * angleStep;
        const posX = Math.cos(angle) * borderRadius + x + offsetX; // Apply offset
        const posY = Math.sin(angle) * borderRadius + y + offsetY; // Apply offset
        borderVertices.push(posX, posY);
      }

      this.numBorderVertices = numSegments + 2; // Close loop
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

    // Create and bind border buffer
    this.borderBuffer = this.gl.createBuffer();
    if (!this.borderBuffer) {
      throw new Error("Failed to create border buffer");
    }

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.borderBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(borderVertices),
      this.gl.STATIC_DRAW
    );
  }

  // Draw the circle and border
  public draw(program: WebGLProgram): void {
    const gl = this.gl;

    console.log("drawing circle", this.offset$.getValue());
    // Activate the shader program
    gl.useProgram(program);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);

    // first draw border, then draw the circle on the border
    // Bind and set up the border buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.borderBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Set the border color from the color stream
    const borderColorLocation = gl.getUniformLocation(program, "u_color");
    const borderColor = this.borderColor$.getValue();
    if (borderColorLocation !== null) {
      gl.uniform4fv(borderColorLocation, borderColor);
    }

    // Draw the border using LINE_LOOP
    gl.drawArrays(gl.TRIANGLE_FAN, 0, this.numBorderVertices);

    // Bind and set up the vertex buffer for the circle
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Set the circle color from the color stream
    const colorLocation = gl.getUniformLocation(program, "u_color");
    const color = this.backgroundColor$.getValue();
    if (colorLocation !== null) {
      gl.uniform4fv(colorLocation, color);
    }

    // Draw the circle using TRIANGLE_FAN
    gl.drawArrays(gl.TRIANGLE_FAN, 0, this.numVertices);
  }

  // Method to update the offset
  public setOffset(offsetX: number, offsetY: number): void {
    this.offset$.next([offsetX, offsetY]);
  }
}
