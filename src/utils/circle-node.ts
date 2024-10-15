import { BehaviorSubject, combineLatest } from "rxjs";
import { Node } from "../types/node";
import { TextLabel } from "./text-label";
import editorStore from "../store/editor-store";

export class CircleNode<T> {
  private gl: WebGL2RenderingContext;
  private vertexBuffer: WebGLBuffer | null = null;
  private borderBuffer: WebGLBuffer | null = null;
  private numVertices: number = 0;
  private numBorderVertices: number = 0;
  public isSelect: boolean = false;

  // RxJS subjects to manage updates
  private position$: BehaviorSubject<[number, number]>;
  private offset$: BehaviorSubject<[number, number]> = new BehaviorSubject([
    0, 0,
  ]);
  private radius$: BehaviorSubject<number>;
  private backgroundColor$: BehaviorSubject<[number, number, number, number]>;
  private borderColor$: BehaviorSubject<[number, number, number, number]>;
  private borderWidth$: BehaviorSubject<number>;
  private data$: BehaviorSubject<T>;

  private textLabel: TextLabel;
  public isDragging: boolean = false;
  private dragStartOffset: [number, number] = [0, 0];
  private scale: BehaviorSubject<number>; // 硬编码缩放因子为 0.7

  // private program: WebGLProgram;

  constructor(
    gl: WebGL2RenderingContext,
    nodeProps: Node<T>,
    key: string,
    radius: number = 80,
    borderColor: [number, number, number, number] = [0, 0, 0, 1],
    borderWidth: number = 6
  ) {
    this.gl = gl;

    this.scale = editorStore.getEditorState(key)?.scale$!;

    this.position$ = new BehaviorSubject<[number, number]>(nodeProps.position);
    this.offset$ = new BehaviorSubject<[number, number]>([0, 0]);
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
      nodeProps.position[1],
      0,
      0,
      key
    );

    this.borderColor$.subscribe(() => {
      console.log(this.borderColor$.getValue());
      this.updateBuffers();
    });

    combineLatest([this.offset$, this.position$, this.radius$]).subscribe(
      () => {
        this.updateBuffers();
        this.textLabel.setPosition(
          this.position$.getValue()[0],
          this.position$.getValue()[1],
          this.offset$.getValue()[0],
          this.offset$.getValue()[1]
        );
      }
    );

    // this.setScale();
    this.scale.subscribe(() => {
      this.setScale();
      this.updateBuffers();
    });
  }

  private setScale(): void {
    // 更新位置和偏移量
    const currentPosition = this.position$.getValue();
    this.position$.next([
      currentPosition[0] * this.scale.getValue(),
      currentPosition[1] * this.scale.getValue(),
    ]);

    console.log(
      "position",
      currentPosition[0] * this.scale.getValue(),
      currentPosition[1] * this.scale.getValue()
    );

    const currentOffset = this.offset$.getValue();
    this.offset$.next([
      currentOffset[0] * this.scale.getValue(),
      currentOffset[1] * this.scale.getValue(),
    ]);

    const currentRadius = this.radius$.getValue();
    this.radius$.next(currentRadius * this.scale.getValue());
  }

  private updateBuffers(): void {
    const numSegments = 100;
    const angleStep = (2 * Math.PI) / numSegments;

    const vertices: number[] = [];
    const borderVertices: number[] = [];

    const [x, y] = this.position$.getValue();
    const [offsetX, offsetY] = this.offset$.getValue();

    vertices.push(x + offsetX, y + offsetY);

    for (let i = 0; i <= numSegments; i++) {
      const angle = i * angleStep;
      const posX = Math.cos(angle) * this.radius$.getValue() + x + offsetX;
      const posY = Math.sin(angle) * this.radius$.getValue() + y + offsetY;
      vertices.push(posX, posY);
    }

    this.numVertices = numSegments + 2;

    borderVertices.push(x + offsetX, y + offsetY);
    const borderRadius = this.radius$.getValue() + this.borderWidth$.getValue();
    for (let i = 0; i <= numSegments; i++) {
      const angle = i * angleStep;
      const posX = Math.cos(angle) * borderRadius + x + offsetX;
      const posY = Math.sin(angle) * borderRadius + y + offsetY;
      borderVertices.push(posX, posY);
    }

    this.numBorderVertices = numSegments + 2;

    // Create and bind vertex buffer
    this.vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(vertices),
      this.gl.STATIC_DRAW
    );

    // Create and bind border buffer
    this.borderBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.borderBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(borderVertices),
      this.gl.STATIC_DRAW
    );
  }

  public draw(program: WebGLProgram): void {
    const gl = this.gl;

    gl.useProgram(program);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.borderBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const borderColorLocation = gl.getUniformLocation(program, "u_color");
    const borderColor = this.borderColor$.getValue();
    if (borderColorLocation !== null) {
      gl.uniform4fv(borderColorLocation, borderColor);
    }

    gl.drawArrays(gl.TRIANGLE_FAN, 0, this.numBorderVertices);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const colorLocation = gl.getUniformLocation(program, "u_color");
    const color = this.backgroundColor$.getValue();
    if (colorLocation !== null) {
      gl.uniform4fv(colorLocation, color);
    }

    gl.drawArrays(gl.TRIANGLE_FAN, 0, this.numVertices);
  }

  public setOffset(offsetX: number, offsetY: number): void {
    this.offset$.next([offsetX, offsetY]);
  }

  public setPosition(x: number, y: number): void {
    this.position$.next([x, y]);
  }

  public startDragging(mouseX: number, mouseY: number): void {
    this.isDragging = true;
    const [nodeX, nodeY] = this.position$.getValue();
    this.dragStartOffset = [mouseX - nodeX, mouseY - nodeY];
  }

  public stopDragging(): void {
    this.isDragging = false;
  }

  public updatePosition(mouseX: number, mouseY: number): void {
    if (this.isDragging) {
      const [offsetX, offsetY] = this.dragStartOffset;
      this.position$.next([mouseX - offsetX, mouseY - offsetY]);
    }
  }

  public isMouseOver(mouseX: number, mouseY: number): boolean {
    const [nodeX, nodeY] = this.position$.getValue();
    const radius = this.radius$.getValue();
    const [offsetX, offsetY] = this.offset$.getValue();
    const distance = Math.sqrt(
      (mouseX - nodeX - offsetX) ** 2 + (mouseY - nodeY - offsetY) ** 2
    );
    return distance <= radius;
  }

  public setSelect(isSelect: boolean) {
    if (isSelect !== this.isSelect) {
      this.isSelect = isSelect;
      isSelect && this.borderColor$.next([25 / 255, 120 / 255, 255 / 255, 1]);
      !isSelect && this.borderColor$.next([0, 0, 0, 1]);
    }
  }
}
