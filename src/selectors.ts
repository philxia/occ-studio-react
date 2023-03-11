import { RootState } from "./store";


export const getElements = (state: RootState) => {
  return Object.values(state.model.elements);
};

export const getCode = (state: RootState) => {
  return state.model.code;
};

export const getParameters = (state: RootState) => {
  return state.model.parameters;
};