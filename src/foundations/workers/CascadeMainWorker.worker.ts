import initOpenCascade, {
  OpenCascadeInstance,
} from "opencascade.js";
import registerPromiseWorker from "promise-worker/register";
import {
  Extrude,
  ForEachEdge,
  ForEachFace,
  Polygon,
  ShapeToMesh,
} from "./CascadeStudioStandardLibrary";

let oc: OpenCascadeInstance;
const messageHandlers: any = {};
const sceneShapes: any = [];

export const NewSphere = (radius: number) => {
  // Construct a Sphere Primitive
  let spherePlane = new oc.gp_Ax2_3(
    new oc.gp_Pnt_3(0, 0, 0),
    new oc.gp_Dir_3(new oc.gp_XYZ_2(0, 0, 1))
  );
  let sphere = new oc.BRepPrimAPI_MakeSphere_9(spherePlane, radius);
  const sphereShape = sphere.Shape();
  sceneShapes.push(sphereShape);
  return sphereShape;
};

export const NewPolygon = (points: number[][], wire: boolean = false) => {
  return Polygon(oc, points, wire);
};

export const NewExtrude = (face: any, direction: number[]) => {
  const extrude = Extrude(oc, face, direction);
  sceneShapes.push(extrude);
  return extrude;
};

initOpenCascade({
  mainWasm: "opencascade.full.wasm",
}).then((openCascade: OpenCascadeInstance) => {
  // Register the "OpenCascade" WebAssembly Module under the shorthand "oc"
  oc = openCascade;

  // Ping Pong Messages Back and Forth based on their registration in messageHandlers
  onmessage = function (e) {
    if (!e.data.type) return;
    let response = messageHandlers[e.data.type](e.data.payload);
    if (response) {
      postMessage({ type: e.data.type, payload: response });
    }
  };

  // Initial Evaluation after everything has been loaded...
  postMessage({ type: "startupCallback" });
});

registerPromiseWorker(function (payload: any) {
  // let opNumber = 0; // This keeps track of the progress of the evaluation
  // const GUIState = payload.GUIState;
  // let currentShape;
  // let sceneBuilder;
  try {
    // eval the code directly.
    try {
      sceneShapes.length = 0;
      // I have tried to follow the https://esbuild.github.io/content-types/#direct-eval
      // to use `var eval2 = eval; eval2(payload.code);` but the scope doesn't recognize
      // the NewSphere method. So rollback to the original one `eval(payload.code)` with the
      // es-build compile warning.
      eval(payload.code);
      return sceneShapes.map((shape: any) => {
        let fullShapeEdgeHashes: any = {}; let fullShapeFaceHashes: any = {};
        Object.assign(fullShapeEdgeHashes, ForEachEdge(oc, shape, (index, edge) => { }));
        ForEachFace(oc, shape, (index: number, face: any) => {
          fullShapeFaceHashes[face.HashCode(100000000)] = index;
        });
        return ShapeToMesh(oc, shape, 0.1, fullShapeEdgeHashes, fullShapeFaceHashes);
      });
    } catch (e: any) {
      console.log(e);
    }
  } catch (e) {
    setTimeout(() => {
      throw e;
    }, 0);
  } finally {
    postMessage({ type: "resetWorking" });
  }
});
