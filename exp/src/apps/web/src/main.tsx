import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./presentation/App";
import "./presentation/styles/global.css";

const root = document.getElementById("root");
if (!root) throw new Error("Elemento raiz da aplicação não encontrado.");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
