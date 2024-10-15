import { BehaviorSubject, fromEvent } from "rxjs";
import editorStore from "../store/editor-store";

export class ControlPanel {
  private canvas: HTMLCanvasElement;
  private controlPanelWrapper: HTMLDivElement = document.createElement("div");
  private scale$: BehaviorSubject<number>;
  private zoomLevel = 0;

  constructor(key: string) {
    const currentEditorState = editorStore.getEditorState(key)!;
    this.canvas = currentEditorState.canvas;
    this.scale$ = currentEditorState.scale$;

    this.controlPanelWrapper.style.position = "absolute";
    this.controlPanelWrapper.style.pointerEvents = "none";
    this.updateControlPanelSize();

    const statementText = document.createElement("span");
    statementText.textContent = "Graph Editor for @GraphScope based on WebGL2";
    statementText.style.position = "absolute";
    statementText.style.bottom = "10px";
    statementText.style.right = "10px";
    statementText.style.fontFamily = "monospace";
    statementText.style.fontSize = "1rem";

    this.controlPanelWrapper.appendChild(statementText);

    fromEvent(window, "resize").subscribe(() => {
      this.updateControlPanelSize();
    });

    this.createControlPanel();
  }

  private zoomIn() {
    console.log(this.zoomLevel);
    if (this.zoomLevel >= -2 && this.scale$.getValue() > 0.6) {
      this.scale$.next(0.8);
      this.zoomLevel--;
    }
  }

  private ZoomOut() {
    if (this.zoomLevel <= 2 && this.scale$.getValue() < 1.4) {
      this.scale$.next(1.25);
      this.zoomLevel++;
    }
  }

  private createControlPanel() {
    // 创建控制面板容器
    const controlPanelContainer = document.createElement("div");
    controlPanelContainer.style.position = "absolute";
    controlPanelContainer.style.top = "10px";
    controlPanelContainer.style.right = "10px";
    controlPanelContainer.style.display = "flex";
    controlPanelContainer.style.gap = "10px";
    controlPanelContainer.style.zIndex = "100";

    // 添加按钮到面板
    const zoomOutButton = this.createButton(
      "zoom-out.svg",
      this.ZoomOut.bind(this)
    );
    const zoomInButton = this.createButton(
      "zoom-in.svg",
      this.zoomIn.bind(this)
    );
    const addNodeButton = this.createButton("add-node.svg", null);
    const clearCanvasButton = this.createButton("clear-canvas.svg", null);

    controlPanelContainer.appendChild(zoomInButton);
    controlPanelContainer.appendChild(zoomOutButton);
    controlPanelContainer.appendChild(addNodeButton);
    controlPanelContainer.appendChild(clearCanvasButton);

    this.controlPanelWrapper.appendChild(controlPanelContainer);
    // 添加到 body 中
    document.body.appendChild(this.controlPanelWrapper);
  }

  private updateControlPanelSize(): void {
    // this.containerElement?.style =
    if (!this.controlPanelWrapper) {
      throw new Error("Container element not found");
    }

    this.controlPanelWrapper.style.width = `${this.canvas.clientWidth}px`;
    this.controlPanelWrapper.style.height = `${this.canvas.clientHeight}px`;
    this.controlPanelWrapper.style.left = `${this.canvas.offsetLeft}px`;
    this.controlPanelWrapper.style.top = `${this.canvas.offsetTop}px`;
  }

  private createButton(
    icon: string,
    callback: (() => void) | null
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.style.width = "2.5rem";
    button.style.height = "2.5rem";
    button.style.border = "none";
    button.style.backgroundColor = "white";
    button.style.cursor = "pointer";
    button.style.boxShadow =
      "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)";
    button.style.borderRadius = "1rem";
    button.style.pointerEvents = "auto";

    const img = document.createElement("img");
    img.src = `${icon}`;
    img.style.width = "100%";
    img.style.height = "100%";

    button.appendChild(img);

    callback && button.addEventListener("click", () => callback());

    return button;
  }
}
