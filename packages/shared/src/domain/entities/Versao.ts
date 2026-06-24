export interface VersaoProps {
  readonly id: string;
  readonly entidadeId: string;
  readonly numero: number;
  readonly criadoEm: string;
  readonly criadoPor: string;
}

export class Versao {
  private constructor(private readonly props: VersaoProps) {}

  static criar(props: VersaoProps): Versao {
    if (!Number.isInteger(props.numero) || props.numero < 1) {
      throw new Error("O número da versão deve ser um inteiro positivo.");
    }
    return new Versao(props);
  }

  get dados(): Readonly<VersaoProps> {
    return this.props;
  }
}
