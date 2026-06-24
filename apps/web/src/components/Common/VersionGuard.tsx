import { useEffect, useState, type ReactNode } from "react";
import type {
  AppVersion,
  AppVersionValidationResult,
  IAppVersionValidator,
} from "@smartsaude/shared";
import styles from "./VersionGuard.module.css";

export interface VersionGuardProps {
  readonly children: ReactNode;
  readonly localVersion: AppVersion;
  readonly validator: IAppVersionValidator;
  readonly downloadUrl: string;
}

type GuardState =
  | { readonly status: "checking" }
  | { readonly status: "ready"; readonly result: AppVersionValidationResult }
  | { readonly status: "error" };

export function VersionGuard({
  children,
  localVersion,
  validator,
  downloadUrl,
}: VersionGuardProps) {
  const [state, setState] = useState<GuardState>({ status: "checking" });

  useEffect(() => {
    let active = true;
    setState({ status: "checking" });
    void validator
      .validarVersaoLocal(localVersion)
      .then((result) => {
        if (active) setState({ status: "ready", result });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [localVersion, validator]);

  if (state.status === "checking") {
    return (
      <main className={styles.splash} aria-busy="true" aria-label="Verificando versão">
        <div className={styles.mark}>S</div>
        <h1>SmartSaúde</h1>
        <p>Preparando seu espaço clínico…</p>
        <span className={styles.loader} aria-hidden="true" />
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className={styles.splash} role="alert">
        <div className={styles.mark}>!</div>
        <h1>Não foi possível verificar a versão</h1>
        <p>Confira sua conexão e tente abrir o aplicativo novamente.</p>
      </main>
    );
  }

  if (state.result.status === "atualizacao_obrigatoria") {
    return (
      <main className={styles.splash}>
        <div className={styles.updateIcon} aria-hidden="true">↑</div>
        <p className={styles.eyebrow}>Atualização necessária</p>
        <h1>Uma versão mais segura está disponível</h1>
        <p className={styles.description}>
          Para continuar protegendo os dados clínicos, atualize o SmartSaúde para
          a versão {state.result.versaoMinimaObrigatoria} ou superior.
        </p>
        <a className={styles.download} href={downloadUrl} rel="noreferrer">
          Baixar atualização
        </a>
        <small>Versão instalada: {state.result.versaoLocal}</small>
      </main>
    );
  }

  return children;
}
