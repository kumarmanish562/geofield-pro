import { createContext, useContext, useEffect, useState } from "react";
import * as Network from "expo-network";

const NetworkContext = createContext(true);

export function NetworkProvider({ children }) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let active = true;
    let subscription;
    Network.getNetworkStateAsync().then((state) => {
      if (active) setOnline(Boolean(state.isConnected));
    });
    subscription = Network.addNetworkStateListener((state) => {
      if (active) setOnline(Boolean(state.isConnected));
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
