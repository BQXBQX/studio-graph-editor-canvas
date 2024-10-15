import { BehaviorSubject } from "rxjs";

class EditorState {
  public zoomStep$: BehaviorSubject<number>;
  public canvas: HTMLCanvasElement;
  public key: string;

  constructor(
    canvas: HTMLCanvasElement,
    key: string,
    initialZoomStep: number = 1
  ) {
    this.zoomStep$ = new BehaviorSubject<number>(initialZoomStep);
    this.canvas = canvas;
    this.key = key;
  }
}

// To achieve multi-instance functionality
class EditorStore {
  private editorStates: EditorState[];

  public constructor() {
    this.editorStates = [];
  }

  public createState(key: string, canvas: HTMLCanvasElement) {
    if (!this.getEditorState(key)) {
      const currentEditorState = new EditorState(canvas, key);
      this.editorStates.push(currentEditorState);
    }
  }

  public getEditorState(key: string): EditorState | undefined {
    return this.editorStates.find((ediorState) => ediorState.key === key);
  }
}

export default new EditorStore();
