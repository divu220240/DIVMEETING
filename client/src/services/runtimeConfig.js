const API_PORT = import.meta.env.VITE_API_PORT || '5000';
const configuredServerUrl = import.meta.env.VITE_SERVER_URL;
const configuredAppUrl = import.meta.env.VITE_PUBLIC_APP_URL;

let configPromise;

const isLocalHost = (hostname) => ['localhost', '127.0.0.1', '::1'].includes(hostname);

export const getServerUrl = () => {
  if (configuredServerUrl) {
    const serverUrl = new URL(configuredServerUrl);

    if (isLocalHost(serverUrl.hostname) && !isLocalHost(window.location.hostname)) {
      serverUrl.hostname = window.location.hostname;
    }

    return serverUrl.toString().replace(/\/$/, '');
  }

  return `${window.location.protocol}//${window.location.hostname}:${API_PORT}`;
};

export const getAppUrl = async () => {
  if (configuredAppUrl) return configuredAppUrl;

  if (!configPromise) {
    configPromise = fetch(`${getServerUrl()}/api/config`)
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);
  }

  const config = await configPromise;
  return config?.appUrl || window.location.origin;
};
