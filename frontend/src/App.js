import { BrowserRouter, Routes, Route } from "react-router-dom";

import MapPage from "./MapPage";
import OAuthPage from "./OAuthPage";

export default function App() {

    return (

        <BrowserRouter>

            <Routes>

                <Route
                    path="/"
                    element={<MapPage />}
                />

                <Route
                    path="/oauth"
                    element={<OAuthPage />}
                />

            </Routes>

        </BrowserRouter>
    );
}