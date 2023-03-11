import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import BRep from "./foundations/providers/BRep";

export enum ControlledParameterType {
  MEASURABLE_PARAMETER = 'MEASURABLE_PARAMETER',
  BOOLEAN_PARAMETER = 'BOOLEAN_PARAMETER',
}

export interface ControlledMeasurableParameterRange {
  min: number;
  max: number;
}

export interface ControlledMeasurableParameter {
  type: ControlledParameterType;
  name: string;
  value: number | boolean;
  visible?: boolean;
  range?: ControlledMeasurableParameterRange
}

const sourceCodes = [`const stairWidth1 = NewMeasurableParameter('Stair width', 100, 80, 200).value;
const treadDepth = NewMeasurableParameter('Tread depth', 10, 10, 20).value;
const riserHeight = NewMeasurableParameter('Riser height', 10, 10, 20).value;
const run1Steps = NewMeasurableParameter('Run steps', 10, 10, 20).value;;
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
`];

export interface Model {
  code: string;
  elements: BRep[];
  parameters: ControlledMeasurableParameter[];
} 

const initialState: Model = {
  code: sourceCodes[0],
  elements: [],
  parameters: [],
};

export const modelSlice = createSlice({
  name: "model",
  initialState,
  reducers: {
    updateCode:(state, action:PayloadAction<string>) => {
      return {
        ...state,
        code: action.payload
      };
    },
    updateModel:(state, action: PayloadAction<any>) => {
      const elements: BRep[] = action.payload;
      return {
        ...state,
        elements,
      };
    },
    updateParameters: (state, action:PayloadAction<any>) => {
      const parameters: [] = action.payload;
      return {
        ...state,
        parameters,
      };
    }
  }
});

// export const updateParameterAsync = (parameter: any): AppThunk => (
//   dispatch,
//   getState
// ) => {
//   const code = getState(getCode);
//   BRepProvider.evaluate({
//     code,
//     parameters: [parameter]
//   }).then((result: {breps: BRep[]; parameters: []}) => {
//     // console.log(breps);
//     dispatch(updateModel(result.breps));
//     // dispatch(updateParameters(result.parameters));
//   });
// };

export const {
  updateCode,
  updateModel,
  updateParameters
} = modelSlice.actions;

export default modelSlice.reducer;
