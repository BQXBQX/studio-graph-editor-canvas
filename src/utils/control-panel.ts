export class ControlPanel {
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.createControlPanel();
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
    const zoomInButton = this.createButton("zoom-in.svg", null);
    const zoomOutButton = this.createButton("zoom-out.svg", null);
    const addNodeButton = this.createButton("add-node.svg", null);
    const clearCanvasButton = this.createButton("clear-canvas.svg", null);

    controlPanelContainer.appendChild(zoomInButton);
    controlPanelContainer.appendChild(zoomOutButton);
    controlPanelContainer.appendChild(addNodeButton);
    controlPanelContainer.appendChild(clearCanvasButton);

    // 添加到 body 中
    document.body.appendChild(controlPanelContainer);
  }

  private createButton(
    icon: string,
    callback: (() => void) | null
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.style.width = "40px";
    button.style.height = "40px";
    button.style.border = "none";
    button.style.backgroundColor = "transparent";
    button.style.cursor = "pointer";

    const img = document.createElement("img");
    img.src = `public/${icon}`;
    img.style.width = "100%";
    img.style.height = "100%";

    button.appendChild(img);
    // button.addEventListener("click", callback);

    return button;
  }
}
