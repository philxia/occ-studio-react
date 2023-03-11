const CascadeMainWorker = require('../workers/CascadeMainWorker.worker.ts').default;
import PromiseWorker from "promise-worker";
import { ControlledMeasurableParameter } from "../../reducers";
import BRep from "./BRep";

export class BRepProvider {
  // key is the element index, value is the BRep.
  // static instances: Record<string, BRepType> = {};

  static messageHandlers: any;
  static cascadeStudioWorker: any;
  static GUIState: any;
  static promiseWorker: PromiseWorker | undefined;

  constructor() {
    // Begins loading the CAD Kernel Web Worker
    if (window.Worker) {
      BRepProvider.cascadeStudioWorker = new CascadeMainWorker();
      BRepProvider.promiseWorker = new PromiseWorker(
        BRepProvider.cascadeStudioWorker
      );
      // Ping Pong Messages Back and Forth based on their registration in messageHandlers
      BRepProvider.messageHandlers = {};
      BRepProvider.cascadeStudioWorker.onmessage = function (e: any) {
        if (e.data.type in BRepProvider.messageHandlers) {
          const response = BRepProvider.messageHandlers[e.data.type](
            e.data.payload
          );
          if (response) {
            BRepProvider.cascadeStudioWorker.postMessage({
              type: e.data.type,
              payload: response,
            });
          }
        }
      };

      BRepProvider.GUIState = {
        MeshRes: 0.08,
        MeshResRange: [0.01, 2],
        Radius: 34.63,
        RadiusRange: [20, 40],
        componentName: "cascadeView",
      };
    }
  }

  
  static evaluate = (data: {
    code: string;
    parameters: ControlledMeasurableParameter[];
  }): Promise<{ breps: BRep[]; parameters: any}> => {
    if (!BRepProvider.promiseWorker) {
      throw new Error();
    }
    return BRepProvider.promiseWorker
      .postMessage<BRep, any>({
        data,
        GUIState: BRepProvider.GUIState,
      })
      .then((response: {shapes: any; parameters: any;}) => {
        if (!Array.isArray(response.shapes)) {
          return {
            breps: [{
              faces: [],
              edges: []
            }], 
            parameters: []
          };
        }
        return {
          breps: response.shapes.map((res) => ({
            faces: res[0],
            edges: res[1],
          })),
          parameters: response.parameters
        };
      });
  };
}