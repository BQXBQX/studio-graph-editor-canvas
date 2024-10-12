export class TextLabel {
  private element: HTMLDivElement;

  constructor(
    text: string,
    x: number,
    y: number,
    offsetX: number,
    offsetY: number
  ) {
    // Create a div element for the label
    this.element = document.createElement("div");
    this.element.textContent = text;
    this.element.style.position = "absolute";
    this.element.style.fontSize = "16px";
    this.element.style.color = "black";
    this.element.style.transform = "translate(-50%, -50%)";
    this.element.style.fontFamily = "monospace";
    this.setPosition(x, y, offsetX, offsetY);

    // Append the label to the body (or another container)
    document.body.appendChild(this.element);
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
    this.element.remove();
  }
}
