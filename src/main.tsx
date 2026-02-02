import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import App from "./App.tsx";
import { SiteLoader } from "./components/SiteLoader.tsx";
import "./index.css";

function Root() {
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoader(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {showLoader && <SiteLoader />}
      <App />
    </>
  );
}

createRoot(document.getElementById("root")!).render(<Root />);
