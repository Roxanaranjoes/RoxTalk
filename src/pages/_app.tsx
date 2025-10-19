
import "../styles/globals.css";
import type { AppProps } from "next/app";
import React from "react";
import { AuthProvider } from "../context/AuthContext";
import { SocketProvider } from "../context/SocketContext";

const App = ({ Component, pageProps }: AppProps): React.ReactElement => {
  return (
    <AuthProvider>
      <SocketProvider>
        <Component {...pageProps} />
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;
