import { createContext, useContext, useEffect, useState } from 'react';
import { getPublicConfig } from '../api/endpoints';

const ConfigContext = createContext(null);

export const useConfig = () => useContext(ConfigContext);

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const domain = window.location.hostname;
        const res = await getPublicConfig(domain);
        setConfig(res.data.data); // data could be null if no config for domain
      } catch (err) {
        console.error('Failed to fetch config', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading branding...</div>;
  }

  return (
    <ConfigContext.Provider value={{ config }}>
      {children}
    </ConfigContext.Provider>
  );
}
