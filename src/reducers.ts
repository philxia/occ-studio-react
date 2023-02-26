import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import BRep from "./foundations/providers/BRep";

export interface Model {
  code: string;
  elements: BRep[];
} 

const initialState: Model = {
  code: '',
  elements: []
};

export const modelSlice = createSlice({
  name: "model",
  initialState,
  reducers: {
    updateCode:(state, action:PayloadAction<string>) => {
      return {
        code: action.payload,
        elements: state.elements
      };
    },
    updateModel:(state, action: PayloadAction<any>) => {
      const elements: BRep[] = action.payload;
      return {
        code: state.code,
        elements
      };
    }
  }
});



export const {
  updateCode,
  updateModel
} = modelSlice.actions;

export default modelSlice.reducer;
