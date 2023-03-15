import Editor, { Monaco } from "@monaco-editor/react";
import React, { useRef } from "react";
import "opencascade.js";
import { updateCode } from "../reducers";
import { useDispatch, useSelector } from "react-redux";
import { getCode } from "../selectors";

export function CodeEditor() {
  const dispatch = useDispatch();
  const sourceCode = useSelector(getCode);
  const editorRef = useRef(null);

  function handleEditorDidMount(editor: null, monaco: any) {
    editorRef.current = editor;
  }

  return (
    <Editor
      defaultLanguage="javascript"
      value={sourceCode}
      onMount={handleEditorDidMount}
      language="typescript"
      theme="vs-dark"
      onChange={(value, ev) => {
        console.log(value);
        if (value !== undefined)
          dispatch(updateCode(value));
      }}
      beforeMount={(monaco: Monaco) => {
        // Import Typescript Intellisense Definitions for the relevant libraries...
        const extraLibs: any = [];
        const prefix = window.location.href.startsWith("https://philxia.github.io/") ? "/opencascade-studio" : "";

        // Three.js Typescript definitions...
        fetch(prefix + "/node_modules/three/build/three.d.ts").then((response) => {
          response.text().then(function (text) {
              extraLibs.push({ content: text, filePath: 'file://' + prefix + '/node_modules/three/build/three.d.ts' });
          });
        }).catch(error => console.log(error.message));
        // opencascade.js Typescript Definitions...
        fetch(prefix + "/node_modules/opencascade.js/dist/opencascade.d.ts").then((response) => {
            response.text().then(function (text) {
                extraLibs.push({ content: text, filePath: 'file://' + prefix + '/node_modules/opencascade.js/dist/opencascade.d.ts' });
                monaco.editor.createModel("", "typescript"); //text
                monaco.languages.typescript.typescriptDefaults.setExtraLibs(extraLibs);
            });
        }).catch(error => console.log(error.message));
      }}
    />
  );
}
