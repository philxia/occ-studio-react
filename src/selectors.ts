import { RootState } from "./store";


export const getElements = (state: RootState) => {
  return Object.values(state.model.elements);
};