import React from "react";
import { App } from "./App";
import "./index.css";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { initializeIcons } from "@fluentui/font-icons-mdl2";
import { store } from "./store";

// initialize icons service.
initializeIcons();

const container: any = document.getElementById("root");
const root = createRoot(container!); // createRoot(container!) if you use TypeScript
root.render(
  <Provider store={store}>
    <App />
  </Provider>
);
