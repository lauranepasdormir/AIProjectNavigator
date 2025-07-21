import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Mount the React app to the DOM
createRoot(document.getElementById("root")!).render(<App />);
