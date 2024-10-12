import "./style.css";
import { Node } from "./types/node";
import { GraphEditor } from "./utils/graph-editor";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <canvas id="canvas"></canvas>
`;

const canvas = document.getElementById("canvas") as HTMLCanvasElement;

interface NodeProps {}

const defaultNodes: Node<NodeProps>[] = [
  {
    position: [100, 100],
    data: {},
  },
  {
    position: [500, 500],
    data: {},
  },
];

new GraphEditor<NodeProps>(canvas, defaultNodes);
