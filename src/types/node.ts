export interface Node<T> {
  position: [number, number];
  data: T;
  backgroundColor?: [number, number, number, number];
}
