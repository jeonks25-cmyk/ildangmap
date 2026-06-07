import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./styles/daangn-shell-mobile.css";
import "./styles/geo-map-mobile.css";
import "./styles/oyaji-product.css";
import "./styles/daangn-shell-desktop.css";
import "./styles/responsive-desktop.css";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));

// StrictMode off in dev: map overlay/marker effects were mounting twice (perf diagnosis).
// Re-enable before release if desired.
root.render(<App />);