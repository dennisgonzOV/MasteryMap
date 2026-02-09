import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";


// Debugging: Define EmptyRanges to identify usage and prevent crash
if (typeof (window as any).EmptyRanges === 'undefined') {
    (window as any).EmptyRanges = new Proxy({}, {
        get: (target, prop) => {
            console.warn(`[DEBUG] Accessing EmptyRanges.${String(prop)}`);
            console.trace();
            return (target as any)[prop];
        }
    });
    console.log('[DEBUG] EmptyRanges defined globally for debugging');
}

createRoot(document.getElementById("root")!).render(<App />);
