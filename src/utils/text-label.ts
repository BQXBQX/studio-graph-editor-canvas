import { fromEvent } from "rxjs";
import editorStore from "../store/editor-store";

export class TextLabel {
  private element: HTMLDivElement;
  private containerElement: HTMLDivElement | null = null;
  private canvas: HTMLCanvasElement;

  constructor(
    text: string,
    x: number,
    y: number,
    offsetX: number,
    offsetY: number,
    key: string
  ) {
    this.canvas = editorStore.getEditorState(key)?.canvas!;

    if (!this.containerElement) {
      this.containerElement = document.createElement("div");
      this.containerElement.style.position = "absolute";
      this.containerElement.style.overflow = "hidden";
      this.containerElement.style.pointerEvents = "none";
      document.body.appendChild(this.containerElement);
    }

    // Create a div element for the label
    this.element = document.createElement("div");
    this.containerElement.appendChild(this.element);
    this.element.textContent = text;
    this.element.style.position = "absolute";
    this.element.style.fontSize = "16px";
    this.element.style.color = "black";
    this.element.style.transform = "translate(-50%, -50%)";
    this.element.style.fontFamily = "monospace";
    this.element.style.pointerEvents = "none";
    this.setPosition(x, y, offsetX, offsetY);

    // Append the label to the body (or another container)

    this.updateTextContainerSize();

    fromEvent(window, "resize").subscribe(() => {
      this.updateTextContainerSize();
    });
  }

  private updateTextContainerSize(): void {
    // this.containerElement?.style =
    if (!this.containerElement) {
      throw new Error("Container element not found");
    }

    this.containerElement.style.width = `${this.canvas.clientWidth}px`;
    this.containerElement.style.height = `${this.canvas.clientHeight}px`;
    this.containerElement.style.left = `${this.canvas.offsetLeft}px`;
    this.containerElement.style.top = `${this.canvas.offsetTop}px`;
  }

  // Update the label text
  public setText(text: string): void {
    this.element.textContent = text;
  }

  // Update the label position
  public setPosition(
    x: number,
    y: number,
    offsetX: number,
    offsetY: number
  ): void {
    this.element.style.left = `${x + offsetX}px`;
    this.element.style.top = `${y + offsetY}px`;
  }

  // Remove the label
  public remove(): void {
    this.containerElement!.remove();
  }
}
