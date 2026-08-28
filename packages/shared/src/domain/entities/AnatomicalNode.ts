export interface AnatomicalCoordinates {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type YouTubeUrl =
  | `https://www.youtube.com/${string}`
  | `https://youtu.be/${string}`;

/** Hotspot clicável associado a uma articulação do modelo anatômico 3D. */
export interface AnatomicalNode {
  readonly id: string;
  readonly nomeArticulacao: string;
  readonly coordenadas: AnatomicalCoordinates;
  readonly youtubeUrl: YouTubeUrl;
}
