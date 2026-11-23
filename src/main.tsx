import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { UserProvider } from "./store/UserContext";
import { initTelegram } from "./lib/telegram";
import { применитьТему as applyTheme } from "./theme";
import "./index.css";

initTelegram(); // ready + expand + тема
applyTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <UserProvider>
        <App />
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);
