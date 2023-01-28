import React from "react";
import "./App.css";
import { CodeEditor } from "./editor/codeEditor";
import { ModelViewer } from "./viewer/ModelViewer";
import { Nav } from "./Nav";

export function App() {
  return (
    <div className="App">
      <Nav/>
      <div className="flex-container">
        <div className="flex-child">
          <CodeEditor/>
        </div>
        <div className="flex-child">
          <ModelViewer/>
        </div>
      </div>
    </div>
  );
}
