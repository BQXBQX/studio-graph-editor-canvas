export class ThrottleHandler<T> {
  private callback: (event?: T) => void;
  private animationFrameId: number | null = null;
  private lastEvent: T | undefined = undefined;

  constructor(callback: (event?: T) => void) {
    this.callback = callback;
  }

  handleEvent(event?: T): void {
    this.lastEvent = event;

    if (!this.animationFrameId) {
      this.animationFrameId = requestAnimationFrame(() => {
        this.callback(this.lastEvent);
        this.animationFrameId = null;
      });
    }
  }
}
