import Editor, { DiffEditor, useMonaco, loader } from "@monaco-editor/react";
import React, { useRef, useState } from "react";

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
      height="90vh"
      defaultLanguage="javascript"
      defaultValue={starterCode}
      onMount={handleEditorDidMount}
    />
  );
}
