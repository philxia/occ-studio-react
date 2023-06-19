import initOpenCascade, {
  OpenCascadeInstance,
} from "opencascade.js";
import registerPromiseWorker from "promise-worker/register";
import {
  Extrude,
  ForEachEdge,
  ForEachFace,
  Polygon,
  ArcWithCurveData,
  LineWithCurveData,
  FaceWithCurveLoop,
  ShapeToMesh,
  Union,
} from "./CascadeStudioStandardLibrary";
import _ from "lodash";
import { Vector3 } from "three";

let oc: OpenCascadeInstance;
const messageHandlers: any = {};
const sceneShapes: any = [];
const controlledParameters: any = [];

export enum CurveType {
  ARC = 'ARC',
  LINE = 'LINE'
}

export class Arc {
  public curveType = CurveType.ARC;
  public center: Vector3 = new Vector3();
  public radius = 1;
  public startAngle = 0;
  public endAngle = Math.PI;
  public mainDirection: Vector3 = new Vector3(0,0,1);
  public clockWise = false;
}


export class Line {
  public curveType = CurveType.LINE;
  public start: Vector3 = new Vector3();
  public end: Vector3 = new Vector3();
}

export const NewSphere = (radius: number) => {
  // Construct a Sphere Primitive
  const spherePlane = new oc.gp_Ax2_3(
    new oc.gp_Pnt_3(0, 0, 0),
    new oc.gp_Dir_3(new oc.gp_XYZ_2(0, 0, 1))
  );
  const sphere = new oc.BRepPrimAPI_MakeSphere_9(spherePlane, radius);
  const sphereShape = sphere.Shape();
  sceneShapes.push(sphereShape);
  return sphereShape;
};

export const NewPolygon = (points: number[][], wire = false) => {
  return Polygon(oc, points, wire);
};

export const MakeFaceWithCurveLoop = (curveLoop: Array<Arc | Line>) => {
  return FaceWithCurveLoop(oc, curveLoop)
}

export const MakeLineWithCurveData = (curveData: Line ) => {
  const line = LineWithCurveData(oc, curveData);
  sceneShapes.push(line);
  return line;
}

export const MakeArcWithCurveData = (curveData: Arc ) => {
  const arc = ArcWithCurveData(oc, curveData);
  sceneShapes.push(arc);
  return arc;
}

export const NewExtrude = (face: any, direction: number[]) => {
  const extrude = Extrude(oc, face, direction);
  sceneShapes.push(extrude);
  return extrude;
};

export const NewUnion = (objectsToJoin: any) => {
  const union = Union(oc, objectsToJoin);
  objectsToJoin.forEach((obj: any) => _.remove(sceneShapes, obj));
  sceneShapes.push(union);
  return union;
}

export const NewMeasurableParameter = (name: string, value: number, min: number, max: number, visible: boolean) =>{
  let newParam = controlledParameters.find((param: any) => param.name === name);
  if (newParam === undefined) {
    newParam = {
      type: 'MEASURABLE_PARAMETER',
      name: name,
      value,
      range: {
        min,
        max
      },
      visible,
    };
    controlledParameters.push(newParam);
  }   
  if (visible !== undefined) newParam.visible = visible;
  return newParam;
}

export const NewBooleanParameter = (name: string, value: boolean, visible: boolean) =>{
  let newParam = controlledParameters.find((param: any) => param.name === name);
  if (newParam === undefined) {
    newParam = {
      type: 'BOOLEAN_PARAMETER',
      name: name,
      value,
      visible,
    };
    controlledParameters.push(newParam);
  }   
  return newParam;
}

initOpenCascade({
  mainWasm: "opencascade.full.wasm",
}).then((openCascade: OpenCascadeInstance) => {
  // Register the "OpenCascade" WebAssembly Module under the shorthand "oc"
  oc = openCascade;

  // Ping Pong Messages Back and Forth based on their registration in messageHandlers
  onmessage = function (e) {
    if (!e.data.type) return;
    const response = messageHandlers[e.data.type](e.data.payload);
    if (response) {
      postMessage({ type: e.data.type, payload: response });
    }
  };

  // Initial Evaluation after everything has been loaded...
  postMessage({ type: "startupCallback" });
});

registerPromiseWorker(function (payload: {data: {code: string, parameters: any}}) {
  // let opNumber = 0; // This keeps track of the progress of the evaluation
  // const GUIState = payload.GUIState;
  const parameters = payload.data.parameters;
  // let currentShape;
  // let sceneBuilder;
  try {
    // eval the code directly.
    try {
      sceneShapes.length = 0;
      if (Array.isArray(parameters) && parameters.length > 0) {
        parameters.forEach((param: any) => {
          const parameter = controlledParameters.find((p: any) => param.name === p.name);
          if (parameter) {
            parameter.value = param.value;
            parameter.visible = param.visible;
          }
        });
      } else {
        controlledParameters.length = 0;
      }
      // I have tried to follow the https://esbuild.github.io/content-types/#direct-eval
      // to use `var eval2 = eval; eval2(payload.code);` but the scope doesn't recognize
      // the NewSphere method. So rollback to the original one `eval(payload.code)` with the
      // es-build compile warning.
      eval(payload.data.code);
      return {
        shapes: sceneShapes.map((shape: any) => {
          const fullShapeEdgeHashes: any = {}; const fullShapeFaceHashes: any = {};
          Object.assign(fullShapeEdgeHashes, ForEachEdge(oc, shape, (index, edge) => { }));
          ForEachFace(oc, shape, (index: number, face: any) => {
            fullShapeFaceHashes[face.HashCode(100000000)] = index;
          });
          return ShapeToMesh(oc, shape, 0.1, fullShapeEdgeHashes, fullShapeFaceHashes);
        }),
        parameters: controlledParameters
      };
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
