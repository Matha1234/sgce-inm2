import { configureStore } from "@reduxjs/toolkit";

import authReducer from "./authSlice";
import notificationsReducer from "./notificationsSlice";
import themeReducer from "./themeSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    notifications: notificationsReducer,
    theme: themeReducer,
  },
});

export default store;
