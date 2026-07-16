import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/variables.css";
import "./styles/app-shell.css";
import "./styles/modules.css";
import "./styles/countable-resource.css";
import "./styles/checkbox-resource.css";
import "./styles/image-field.css";
import "./styles/restricted-markdown.css";
import "./styles/card-table.css";
import "./styles/resource-browser.css";
import "./styles/resource-manager.css";
import "./styles/validation.css";
import "./styles/guide.css";
import "./styles/print.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
