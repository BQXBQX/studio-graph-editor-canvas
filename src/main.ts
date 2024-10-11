import "./style.css";
import { GraphEditor } from "./utils/graph-editor";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <canvas id="canvas"></canvas>
`;

const canvas = document.getElementById("canvas") as HTMLCanvasElement;

new GraphEditor(canvas);
