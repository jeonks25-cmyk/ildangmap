import React, { createContext, useState } from "react";

export const ModeContext = createContext();

export const ModeProvider = ({ children }) => {
    const [mode, setMode] = useState("worker"); // worker / boss

    return (
        <ModeContext.Provider value={{ mode, setMode }}>
            {children}
        </ModeContext.Provider>
    );
};