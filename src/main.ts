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
    key: "hello1",
  },
  {
    position: [200, 300],
    data: {},
    label: "Ming Li",
    key: "hello1",
  },
];

new GraphEditor<NodeProps>(canvas, "hello", defaultNodes);
