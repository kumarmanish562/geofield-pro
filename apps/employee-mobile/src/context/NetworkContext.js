import { createContext, useContext, useEffect, useState } from "react";
import * as Network from "expo-network";
import { synchronizeOfflineData } from "../services/syncEngine.js";

const NetworkContext = createContext(true);

export function NetworkProvider({ children }) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let active = true;
    let subscription;
    Network.getNetworkStateAsync().then((state) => {
      if (active) {
        const connected = Boolean(state.isConnected);
        setOnline(connected);
        if (connected) synchronizeOfflineData().catch(() => {});
      }
    });
    subscription = Network.addNetworkStateListener((state) => {
      if (active) {
        const connected = Boolean(state.isConnected);
        setOnline(connected);
        if (connected) synchronizeOfflineData().catch(() => {});
      }
    });
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);

  return (
    <NetworkContext.Provider value={online}>{children}</NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
