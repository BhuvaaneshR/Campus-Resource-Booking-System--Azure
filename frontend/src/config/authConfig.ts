import { Configuration } from '@azure/msal-browser';

// Microsoft Entra ID configuration
export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.REACT_APP_AZURE_CLIENT_ID || 'your-client-id',
    authority: `https://login.microsoftonline.com/${process.env.REACT_APP_AZURE_TENANT_ID || 'your-tenant-id'}`,
    redirectUri: process.env.REACT_APP_REDIRECT_URI || window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

// Login request configuration
export const loginRequest = {
  scopes: ['User.Read', 'openid', 'profile', 'email'],
};

// API request configuration
export const apiRequest = {
  scopes: ['User.Read'],
};

// Domain validation for college emails
export const ALLOWED_DOMAINS = ['rajalakshmi.edu.in'];

// Validate if the email domain is allowed
export const isAllowedDomain = (email: string): boolean => {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
};
