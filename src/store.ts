import { configureStore } from "@reduxjs/toolkit";
import modelReducers from './reducers';

export const store = configureStore({
  reducer: {
    model: modelReducers
  }
});
