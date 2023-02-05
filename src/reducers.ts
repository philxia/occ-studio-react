import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import BRep from "./foundations/providers/BRep";

export interface Model {
  elements: BRep[];
} 

const initialState: Model = {
  elements: []
};

export const modelSlice = createSlice({
  name: "model",
  initialState,
  reducers: {
    updateModel:(state, action: PayloadAction<any>) => {
      const elements: BRep[] = [{
        faces: action.payload.faces[0],
        edges: action.payload.faces[1]
      }];
      return {
        elements
      };
    }
  }
});



export const {
  updateModel
} = modelSlice.actions;

export default modelSlice.reducer;
