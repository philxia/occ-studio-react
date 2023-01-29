import Editor, { DiffEditor, useMonaco, loader, Monaco } from "@monaco-editor/react";
import React, { useRef, useState } from "react";
import "opencascade.js";

export function CodeEditor() {
  const editorRef = useRef(null);

  function handleEditorDidMount(editor: null, monaco: any) {
    editorRef.current = editor;
  }

  // function showValue() {
  //   alert(editorRef.current?.getValue());
  // }

  const starterCode = `// Welcome to Cascade Studio!   Here are some useful functions:
//  Translate(), Rotate(), Scale(), Mirror(), Union(), Difference(), Intersection()
//  Box(), Sphere(), Cylinder(), Cone(), Text3D(), Polygon()
//  Offset(), Extrude(), RotatedExtrude(), Revolve(), Pipe(), Loft(), 
//  FilletEdges(), ChamferEdges(),
//  Slider(), Checkbox(), TextInput(), Dropdown()

let holeRadius = Slider("Radius", 30 , 20 , 40);

let sphere     = Sphere(50);
let cylinderZ  =                     Cylinder(holeRadius, 200, true);
let cylinderY  = Rotate([0,1,0], 90, Cylinder(holeRadius, 200, true));
let cylinderX  = Rotate([1,0,0], 90, Cylinder(holeRadius, 200, true));

Translate([0, 0, 50], Difference(sphere, [cylinderX, cylinderY, cylinderZ]));

Translate([-25, 0, 40], Text3D("Hi!", 36, 0.15, 'Consolas'));

// Don't forget to push imported or oc-defined shapes into sceneShapes to add them to the workspace!`;

  return (
    <Editor
      defaultLanguage="javascript"
      defaultValue={starterCode}
      onMount={handleEditorDidMount}
      language="typescript"
      theme="vs-dark"
      onChange={(value, ev) => {
        console.log(value);
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
