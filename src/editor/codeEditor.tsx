import Editor, { DiffEditor, useMonaco, loader, Monaco } from "@monaco-editor/react";
import React, { useRef, useState } from "react";
import "opencascade.js";
import { BRepProvider } from "../foundations/providers/BRepProvider";
import BRep from "../foundations/providers/BRep";
import { updateCode, updateModel } from "../reducers";
import { useDispatch } from "react-redux";

export function CodeEditor() {
  const dispatch = useDispatch();

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

// let holeRadius = Slider("Radius", 30 , 20 , 40);

const stairWidth1 = 100;
const treadDepth = 10;
const riserHeight = 10;
const run1Steps = 10;
// 1. stair run 1.
const stepsLeftSideFacePoints = [];
if (run1Steps < 2) {
stepsLeftSideFacePoints.push(
  [-stairWidth1 / 2, treadDepth * run1Steps, riserHeight * run1Steps],
  [-stairWidth1 / 2, treadDepth, 0],
  [-stairWidth1 / 2, 0, 0]
);
} else {
stepsLeftSideFacePoints.push(
  [-stairWidth1 / 2, treadDepth * run1Steps, riserHeight * run1Steps],
  [
    -stairWidth1 / 2,
    treadDepth * run1Steps,
    riserHeight * (run1Steps - 1),
  ],
  [-stairWidth1 / 2, treadDepth, 0],
  [-stairWidth1 / 2, 0, 0]
);
for (let n = 1; n < run1Steps; n++) {
  stepsLeftSideFacePoints.push(
    [-stairWidth1 / 2, treadDepth * (n - 1), riserHeight * n],
    [-stairWidth1 / 2, treadDepth * n, riserHeight * n]
  );
}
}

stepsLeftSideFacePoints.push([
    -stairWidth1 / 2,
    treadDepth * (run1Steps - 1),
    riserHeight * run1Steps,
]);
const stepsLeftSideFace = NewPolygon(stepsLeftSideFacePoints, false);
const stairRun1 = NewExtrude(stepsLeftSideFace, [stairWidth1, 0, 0]);
// let cylinderZ  =                     Cylinder(holeRadius, 200, true);
// let cylinderY  = Rotate([0,1,0], 90, Cylinder(holeRadius, 200, true));
// let cylinderX  = Rotate([1,0,0], 90, Cylinder(holeRadius, 200, true));

// Translate([0, 0, 50], Difference(sphere, [cylinderX, cylinderY, cylinderZ]));

// Translate([-25, 0, 40], Text3D("Hi!", 36, 0.15, 'Consolas'));

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
