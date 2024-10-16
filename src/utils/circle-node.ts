import { BehaviorSubject, combineLatest, Subscription } from "rxjs";
import { Node } from "../types/node";
import { TextLabel } from "./text-label";
import editorStore from "../store/editor-store";

export class CircleNode<T> {
  private gl: WebGL2RenderingContext;
  private vertexBuffer: WebGLBuffer | null = null;
  private borderBuffer: WebGLBuffer | null = null;
  private numVertices: number = 0;
  private numBorderVertices: number = 0;
  private graphEditorKey: string;
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

  private subscriptions: Subscription[] = []; // Subscription array to collect all subscriptions
  private hasZoomStepChangedOnce: boolean = false; // Add this flag

  public textLabel: TextLabel;
  public isDragging: boolean = false;
  private dragStartOffset: [number, number] = [0, 0];
  public key: string;

  constructor(
    gl: WebGL2RenderingContext,
    nodeProps: Node<T>,
    key: string,
    radius: number = 80,
    borderColor: [number, number, number, number] = [0, 0, 0, 1],
    borderWidth: number = 6,
  ) {
    this.gl = gl;
    this.graphEditorKey = key;

    this.key = nodeProps.key;

    this.position$ = new BehaviorSubject<[number, number]>(nodeProps.position);
    this.offset$ = editorStore.getEditorState(key)!.offset$;
    this.radius$ = new BehaviorSubject<number>(radius);
    console.log("半径", radius);
    this.backgroundColor$ = new BehaviorSubject<
      [number, number, number, number]
    >(nodeProps.backgroundColor ?? [1, 1, 1, 1]);
    this.borderColor$ = new BehaviorSubject<[number, number, number, number]>(
      borderColor,
    );
    this.borderWidth$ = new BehaviorSubject<number>(borderWidth);
    this.data$ = new BehaviorSubject<T>(nodeProps.data);

    this.textLabel = new TextLabel(
      nodeProps.label ?? "",
      nodeProps.position[0],
      nodeProps.position[1],
      0,
      0,
      key,
    );

    // Subscribe to border color changes
    this.subscriptions.push(
      this.borderColor$.subscribe(() => {
        // console.log("border color changed", this.borderColor$.getValue());
        this.updateBuffers();
      }),
    );

    // Combine offset, position, and radius to update buffers and text label position
    this.subscriptions.push(
      combineLatest([this.offset$, this.position$, this.radius$]).subscribe(
        () => {
          this.updateBuffers();
          this.textLabel.setPosition(
            this.position$.getValue()[0],
            this.position$.getValue()[1],
            this.offset$.getValue()[0],
            this.offset$.getValue()[1],
          );
        },
      ),
    );

    // Subscribe to radius changes
    this.subscriptions.push(
      this.radius$.subscribe(() => {
        console.log("radius changed", this.radius$.getValue());
        editorStore
          .getEditorState(this.graphEditorKey)
          ?.setNodeRadius(this.radius$.getValue());
      }),
    );

    this.subscriptions.push(
      editorStore.getEditorState(key)!.zoomStep$.subscribe((value) => {
        if (this.hasZoomStepChangedOnce) {
          console.log("zoom step changed", value);
          this.updateZoomLevel();
          this.updateBuffers();
        } else {
          this.hasZoomStepChangedOnce = true;
        }
      }),
    );
  }

  private updateZoomLevel(
    zoomCenter: [number, number] = [
      editorStore.getEditorState(this.graphEditorKey)?.canvas.clientWidth! / 2,
      editorStore.getEditorState(this.graphEditorKey)?.canvas.clientHeight! / 2,
    ],
  ): void {
    const zoomStep = editorStore
      .getEditorState(this.graphEditorKey)!
      .zoomStep$.getValue();
    const currentPosition = this.position$.getValue();
    const currentOffset = this.offset$.getValue();
    const currentRadius = this.radius$.getValue();

    zoomCenter = [
      zoomCenter[0] * zoomStep - currentOffset[0] * zoomStep,
      zoomCenter[1] * zoomStep - currentOffset[1] * zoomStep,
    ];

    // console.log("视图的中心", zoomCenter);

    // 计算新的 position，基于 zoom center

    this.position$.next([
      zoomCenter[0] + (currentPosition[0] - zoomCenter[0]) * zoomStep,
      zoomCenter[1] + (currentPosition[1] - zoomCenter[1]) * zoomStep,
    ]);

    // 更新 offset 和 radius
    this.offset$.next([currentOffset[0], currentOffset[1]]);
    this.radius$.next(currentRadius * zoomStep);
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
      this.gl.STATIC_DRAW,
    );

    // Create and bind border buffer
    this.borderBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.borderBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(borderVertices),
      this.gl.STATIC_DRAW,
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
      (mouseX - nodeX - offsetX) ** 2 + (mouseY - nodeY - offsetY) ** 2,
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

  public dispose(): void {
    this.textLabel.remove();
    // Unsubscribe from all RxJS subscriptions
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions = []; // Clear the array to avoid keeping references
  }
}
