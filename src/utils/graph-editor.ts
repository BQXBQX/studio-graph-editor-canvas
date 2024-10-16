import { CircleNode } from "./circle-node";
import { BehaviorSubject, combineLatest, fromEvent } from "rxjs";
import createProgram from "./shader/create-program";
import createShader from "./shader/create-shader";
import fragment from "../glsl/fragment-shader-source.glsl?raw";
import vertex from "../glsl/vertex-shader-source.glsl?raw";
import { Node } from "../types/node";
import { ControlPanel } from "./control-panel";
import { ThrottleHandler } from "./animation/throttle-handler";
import editorStore from "../store/editor-store";

export class GraphEditor<NodeType> {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;

  // BehaviorSubjects for size and nodes
  private canvasSize$ = new BehaviorSubject<[number, number]>([0, 0]);
  private nodes$ = new BehaviorSubject<CircleNode<NodeType>[]>([]);

  private isDragging = false;
  private lastMousePosition: [number, number] = [0, 0];
  private canvasOffset$: BehaviorSubject<[number, number]>;
  private key: string;
  // private scale$: BehaviorSubject<number>;

  constructor(
    container: HTMLCanvasElement,
    key: string,
    defaultNodes?: Node<NodeType>[],
  ) {
    editorStore.createState(key, container, defaultNodes ?? []);
    const currentEditorState = editorStore.getEditorState(key)!;
    this.canvas = currentEditorState.canvas;
    this.canvasOffset$ = currentEditorState.offset$;

    this.key = key;

    const glContext = this.canvas.getContext("webgl2", {
      preserveDrawingBuffer: true,
    });
    if (!glContext) {
      throw new Error("WebGL2 is not supported");
    }
    new ControlPanel(this.key);
    this.gl = glContext;

    // Initialize shaders and program
    this.program = this.initShaderProgram()!;

    // Set background color and other configurations
    this.gl.clearColor(245 / 255, 245 / 255, 245 / 255, 1);
    currentEditorState.nodes$.subscribe((currentNodes) => {
      const existingNodes = this.nodes$.getValue();

      // Find nodes that are no longer present in currentNodes
      const removeNodes = existingNodes.filter(
        (circleNode) =>
          !currentNodes.some((node) => node.key === circleNode.key),
      );

      // Dispose removed nodes
      removeNodes.forEach((node) => node.dispose());

      // Filter the nodes that need to be added (new nodes not in existingNodes)
      const newAddNodes = currentNodes.filter(
        (node) =>
          !existingNodes.some((circleNode) => circleNode.key === node.key),
      );

      // Create new CircleNodes for the new nodes and add them to the existing ones
      const updatedNodes = [
        ...existingNodes.filter((node) =>
          currentNodes.some((newNode) => newNode.key === node.key),
        ), // Keep only the nodes that are still in the currentNodes
        ...newAddNodes.map(
          (defaultNode) =>
            new CircleNode<NodeType>(
              this.gl,
              defaultNode,
              this.key,
              editorStore.getEditorState(this.key)?.nodeRadius,
            ),
        ),
      ];

      // Update the nodes$ with the updated list
      this.nodes$.next(updatedNodes);
    });

    // Initialize resize event handler using RxJS
    fromEvent(window, "resize").subscribe(() => this.resizeCanvas());

    // Combine latest canvas size and nodes to trigger drawScene
    combineLatest([
      this.canvasSize$,
      this.nodes$,
      this.canvasOffset$,
      currentEditorState.zoomProps$,
    ]).subscribe(() => {
      this.drawScene();
    });

    this.addDragHandlers();
    this.addWheelHandlers();

    // Resize canvas and draw the scene
    this.resizeCanvas();
  }

  // Initialize vertex and fragment shaders
  private initShaderProgram(): WebGLProgram | null {
    const vertexShader = createShader(this.gl, this.gl.VERTEX_SHADER, vertex);
    const fragmentShader = createShader(
      this.gl,
      this.gl.FRAGMENT_SHADER,
      fragment,
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
      "u_resolution",
    );
    this.gl.uniform2f(resolutionLocation, displayWidth, displayHeight);

    // Update canvas size
    this.canvasSize$.next([displayWidth, displayHeight]);
  }

  // private transformNodeToCir
  // Draw the scene by rendering all nodes
  private drawScene(): void {
    this.gl.clear(
      this.gl.COLOR_BUFFER_BIT |
        this.gl.DEPTH_BUFFER_BIT |
        this.gl.STENCIL_BUFFER_BIT,
    );
    // Get the current nodes and draw them
    const nodes = this.nodes$.getValue();
    for (const node of nodes) {
      node.draw(this.program);
    }
  }

  private addWheelHandlers(): void {
    this.canvas.addEventListener("wheel", (event: WheelEvent) => {
      event.preventDefault();
      const zoomStep = 1.05; // Adjust zoom step factor as needed
      const delta = Math.sign(event.deltaY); // Get the direction of the scroll
      const zoomFactor = delta > 0 ? 1 / zoomStep : zoomStep; // Invert zoom factor for scroll down

      // Get the current zoom center (mouse position)
      const mouseX = event.clientX - this.canvas.offsetLeft;
      const mouseY = event.clientY - this.canvas.offsetTop;
      console.log(mouseX, mouseY);
      editorStore.getEditorState(this.key)?.zoomProps$.next({
        zoomStep: zoomFactor,
        centerPosition: [mouseX, mouseY],
      });
    });
  }

  // Adding mouse event handlers
  private addDragHandlers(): void {
    const dragCanvas = (event: MouseEvent | undefined) => {
      if (!event) {
        throw new Error("Event is undefined");
      }
      const mouseX = event.clientX - this.canvas.offsetLeft;
      const mouseY = event.clientY - this.canvas.offsetTop;

      let isNodeDragging = false;

      this.nodes$.getValue().forEach((node) => {
        if (node.isDragging) {
          node.updatePosition(mouseX, mouseY);
          this.drawScene();

          this.canvas.style.cursor = "grab";
        }
      });

      if (!isNodeDragging && this.isDragging) {
        if (this.isDragging) {
          this.canvas.style.cursor = "grab";

          const [lastX, lastY] = this.lastMousePosition;
          const deltaX = event.clientX - lastX;
          const deltaY = event.clientY - lastY;

          const newOffsetX = this.canvasOffset$.getValue()[0] + deltaX;
          const newOffsetY = this.canvasOffset$.getValue()[1] + deltaY;

          this.canvasOffset$.next([newOffsetX, newOffsetY]);

          // Update last mouse position
          this.lastMousePosition = [event.clientX, event.clientY];
        }
      }
    };
    // Mouse down event to start dragging
    this.canvas.addEventListener("mousedown", (event) => {
      const mouseX = event.clientX - this.canvas.offsetLeft;
      const mouseY = event.clientY - this.canvas.offsetTop;

      let clickedNode: CircleNode<NodeType> | null = null;

      this.nodes$
        .getValue()
        .slice()
        .reverse()
        .forEach((node) => {
          node.setSelect(false);
          if (node.isMouseOver(mouseX, mouseY) && !clickedNode) {
            clickedNode = node;
            clickedNode.setSelect(true);
          }
        });

      //NOTE: Through array processing, the drag node is always placed on the top
      if (clickedNode) {
        const nodes = this.nodes$.getValue();
        nodes.splice(nodes.indexOf(clickedNode), 1);
        nodes.push(clickedNode);
        this.nodes$.next(nodes);
      }
      // TODO: Here we can optimize the number of data update
      this.drawScene();

      if (clickedNode) {
        (clickedNode as CircleNode<NodeType>).startDragging(mouseX, mouseY);
      } else {
        this.isDragging = true;
        this.lastMousePosition = [event.clientX, event.clientY];
      }
    });

    const dragCanvasThrottleHandler = new ThrottleHandler<MouseEvent>(
      dragCanvas,
    );

    // Mouse move event to update canvas position while dragging
    this.canvas.addEventListener("mousemove", (event) =>
      dragCanvasThrottleHandler.handleEvent(event),
    );

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
