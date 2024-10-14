import { CircleNode } from "./circle-node";
import { BehaviorSubject, combineLatest, fromEvent } from "rxjs";
import createProgram from "./shader/create-program";
import createShader from "./shader/create-shader";
import fragment from "../glsl/fragment-shader-source.glsl?raw";
import vertex from "../glsl/vertex-shader-source.glsl?raw";
import { Node } from "../types/node";

export class GraphEditor<NodeType> {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;

  // BehaviorSubjects for size and nodes
  private canvasSize$ = new BehaviorSubject<[number, number]>([0, 0]);
  private nodes$ = new BehaviorSubject<CircleNode<NodeType>[]>([]);

  private isDragging = false;
  private lastMousePosition: [number, number] = [0, 0];
  private canvasOffset$ = new BehaviorSubject<[number, number]>([0, 0]);

  constructor(container: HTMLCanvasElement, defaultNodes?: Node<NodeType>[]) {
    this.canvas = container;

    const glContext = this.canvas.getContext("webgl2", {
      preserveDrawingBuffer: true,
    });
    if (!glContext) {
      throw new Error("WebGL2 is not supported");
    }
    this.gl = glContext;

    // Initialize shaders and program
    this.program = this.initShaderProgram()!;

    // Set background color and other configurations
    this.gl.clearColor(245 / 255, 245 / 255, 245 / 255, 1);

    // Add some circle nodes
    this.nodes$.next(
      (defaultNodes ?? []).map(
        (defaultNode) =>
          new CircleNode<NodeType>(this.gl, defaultNode, this.canvas)
      )
    );

    // Initialize resize event handler using RxJS
    fromEvent(window, "resize").subscribe(() => this.resizeCanvas());

    // Combine latest canvas size and nodes to trigger drawScene
    combineLatest([
      this.canvasSize$,
      this.nodes$,
      this.canvasOffset$,
    ]).subscribe(() => {
      this.drawScene();
    });

    this.addDragHandlers();

    // Resize canvas and draw the scene
    this.resizeCanvas();
  }

  // Initialize vertex and fragment shaders
  private initShaderProgram(): WebGLProgram | null {
    const vertexShader = createShader(this.gl, this.gl.VERTEX_SHADER, vertex);
    const fragmentShader = createShader(
      this.gl,
      this.gl.FRAGMENT_SHADER,
      fragment
    );

    if (!vertexShader || !fragmentShader) {
      throw new Error("Failed to create shaders");
    }

    return createProgram(this.gl, vertexShader, fragmentShader);
  }

  // Resize canvas to fit the window dimensions and update BehaviorSubject
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

    // Update WebGL viewport
    this.gl.viewport(0, 0, displayWidth, displayHeight);

    // Update resolution uniform for all nodes
    const resolutionLocation = this.gl.getUniformLocation(
      this.program,
      "u_resolution"
    );
    this.gl.uniform2f(resolutionLocation, displayWidth, displayHeight);

    // Update canvas size
    this.canvasSize$.next([displayWidth, displayHeight]);
  }

  // private transformNodeToCir
  // Draw the scene by rendering all nodes
  private drawScene(): void {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // Get the current nodes and draw them
    const nodes = this.nodes$.getValue();
    for (const node of nodes) {
      node.draw(this.program);
    }
  }

  // Adding mouse event handlers
  private addDragHandlers(): void {
    // Mouse down event to start dragging
    this.canvas.addEventListener("mousedown", (event) => {
      const mouseX = event.clientX - this.canvas.offsetLeft;
      const mouseY = event.clientY - this.canvas.offsetTop;

      this.canvas.style.cursor = "grab";

      let clickedNode: CircleNode<NodeType> | null = null;

      this.nodes$.getValue().forEach((node) => {
        if (node.isMouseOver(mouseX, mouseY)) {
          clickedNode = node;
        }
      });

      console.log(clickedNode);
      if (clickedNode) {
        (clickedNode as CircleNode<NodeType>).startDragging(mouseX, mouseY);
      } else {
        this.isDragging = true;
        this.lastMousePosition = [event.clientX, event.clientY];
      }
    });

    // Mouse move event to update canvas position while dragging
    this.canvas.addEventListener("mousemove", (event) => {
      const mouseX = event.clientX - this.canvas.offsetLeft;
      const mouseY = event.clientY - this.canvas.offsetTop;

      let isNodeDragging = false;

      this.nodes$.getValue().forEach((node) => {
        if (node.isDragging) {
          node.updatePosition(mouseX, mouseY);
          this.drawScene();
        }
      });

      if (!isNodeDragging && this.isDragging) {
        if (this.isDragging) {
          const [lastX, lastY] = this.lastMousePosition;
          const deltaX = event.clientX - lastX;
          const deltaY = event.clientY - lastY;

          const newOffsetX = this.canvasOffset$.getValue()[0] + deltaX;
          const newOffsetY = this.canvasOffset$.getValue()[1] + deltaY;

          this.nodes$.getValue().forEach((node) => {
            node.setOffset(newOffsetX, newOffsetY);
          });

          this.canvasOffset$.next([newOffsetX, newOffsetY]);

          // Update last mouse position
          this.lastMousePosition = [event.clientX, event.clientY];
        }
      }
    });

    // Mouse up event to stop dragging
    this.canvas.addEventListener("mouseup", () => {
      this.isDragging = false;
      this.nodes$.getValue().forEach((node) => node.stopDragging());
      this.canvas.style.cursor = "unset";
    });

    // Optional: stop dragging when mouse leaves the canvas
    this.canvas.addEventListener("mouseleave", () => {
      this.isDragging = false;
      this.nodes$.getValue().forEach((node) => node.stopDragging());
      this.canvas.style.cursor = "unset";
    });
  }
}
