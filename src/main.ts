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
    position: [200, 300],
    data: {},
    label: "Ming Li",
  },
  {
    position: [800, 200],
    data: {},
    label: "Hong Li",
  },
];

new GraphEditor<NodeProps>(canvas, defaultNodes);
