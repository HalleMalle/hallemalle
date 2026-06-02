import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "@/App.jsx";

import '@/styles/base/_global.scss';

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
