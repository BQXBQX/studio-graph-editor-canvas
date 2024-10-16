import { BehaviorSubject, fromEvent } from "rxjs";
import editorStore from "../store/editor-store";
import { Node } from "../types/node";
import { v4 as uuidv4 } from "uuid";

export class ControlPanel {
  private canvas: HTMLCanvasElement;
  private controlPanelWrapper: HTMLDivElement = document.createElement("div");
  private zoomStep$: BehaviorSubject<number>;
  private nodes$: BehaviorSubject<Node<any>[]>;
  private animationFrameId: number | null = null; // 用于存储上一次动画的 ID
  private key: string;

  private speedFactor = 20; // 每次缩放分为 20 步完成

  constructor(key: string) {
    const currentEditorState = editorStore.getEditorState(key)!;
    this.canvas = currentEditorState.canvas;
    this.zoomStep$ = currentEditorState.zoomStep$;
    this.nodes$ = currentEditorState.nodes$;
    this.key = key;

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
    statementText.style.color = "black";
    statementText.style.fontWeight = "bold";

    this.controlPanelWrapper.appendChild(statementText);

    fromEvent(window, "resize").subscribe(() => {
      this.updateControlPanelSize();
    });

    this.createControlPanel();
  }

  // 平滑缩放逻辑，目标 scale 是 targetScale，分为 speedFactor 步进行缩放
  private smoothZoom(targetScale: number) {
    // 如果有之前的动画正在进行，取消它
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    const step = (targetScale - 1) / this.speedFactor;

    let count = 0;

    const zoomStep = () => {
      if (count < this.speedFactor) {
        const newScale = 1 + step;
        this.zoomStep$.next(newScale);
        count++;
        this.animationFrameId = requestAnimationFrame(zoomStep);
      } else {
        this.animationFrameId = null;
      }
    };

    zoomStep();
  }

  private createControlPanel() {
    const controlPanelContainer = document.createElement("div");
    controlPanelContainer.style.position = "absolute";
    controlPanelContainer.style.top = "10px";
    controlPanelContainer.style.right = "10px";
    controlPanelContainer.style.display = "flex";
    controlPanelContainer.style.gap = "10px";
    controlPanelContainer.style.zIndex = "100";

    const zoomOutButton = this.createButton("zoom-out.svg", () =>
      this.smoothZoom(1.25),
    );
    const zoomInButton = this.createButton("zoom-in.svg", () =>
      this.smoothZoom(0.8),
    );
    const addNodeButton = this.createButton("add-node.svg", () => {
      const randomX = Math.floor(Math.random() * window.innerWidth);
      const randomY = Math.floor(Math.random() * window.innerHeight);
      const offset = editorStore.getEditorState(this.key)!.offset$.getValue();
      console.log(offset);
      this.nodes$.next([
        ...this.nodes$.getValue(),
        {
          key: uuidv4(),
          position: [randomX - offset[0], randomY - offset[1]],
          data: {},
          label: "",
        },
      ]);
    });
    const clearCanvasButton = this.createButton("clear-canvas.svg", () =>
      this.nodes$.next([]),
    );

    controlPanelContainer.appendChild(zoomInButton);
    controlPanelContainer.appendChild(zoomOutButton);
    controlPanelContainer.appendChild(addNodeButton);
    controlPanelContainer.appendChild(clearCanvasButton);

    this.controlPanelWrapper.appendChild(controlPanelContainer);
    document.body.appendChild(this.controlPanelWrapper);
  }

  private updateControlPanelSize(): void {
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
    callback: (() => void) | null,
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

    if (callback) {
      button.addEventListener("click", () => callback());
    }

    return button;
  }
}
