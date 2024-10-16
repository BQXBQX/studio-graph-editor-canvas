import { BehaviorSubject } from "rxjs";
import { Node } from "../types/node";

class EditorState<NodeType> {
  public canvas: HTMLCanvasElement;
  public key: string;
  public zoomStep$: BehaviorSubject<number>;
  public nodes$: BehaviorSubject<Node<NodeType>[]> = new BehaviorSubject<
    Node<NodeType>[]
  >([]);
  public offset$: BehaviorSubject<[number, number]>;
  public nodeRadius: number;

  constructor(
    canvas: HTMLCanvasElement,
    key: string,
    initialNodes: Node<NodeType>[],
    initialZoomStep: number = 1,
    initialOffset: [number, number] = [0, 0],
    initialNodeRadius: number = 80,
  ) {
    this.canvas = canvas;
    this.key = key;
    this.zoomStep$ = new BehaviorSubject<number>(initialZoomStep);
    this.nodes$.next(initialNodes);
    this.offset$ = new BehaviorSubject<[number, number]>(initialOffset);
    this.nodeRadius = initialNodeRadius;
  }

  public setNodeRadius(radius: number) {
    this.nodeRadius = radius;
  }
}

// To achieve multi-instance functionality
class EditorStore {
  private editorStates: EditorState<any>[];

  public constructor() {
    this.editorStates = [];
  }

  public createState(
    key: string,
    canvas: HTMLCanvasElement,
    defaultNodes: Node<any>[],
  ) {
    if (!this.getEditorState(key)) {
      const currentEditorState = new EditorState(canvas, key, defaultNodes);
      this.editorStates.push(currentEditorState);
    }
  }

  public getEditorState(key: string): EditorState<any> | undefined {
    return this.editorStates.find((editorState) => editorState.key === key);
  }
}

export default new EditorStore();
