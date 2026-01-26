import CryptoJS from "crypto-js";

const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef";

/**
 * Encrypt sensitive data before storing in session
 */
export function encryptCredentials(credentials) {
  const jsonStr = JSON.stringify(credentials);
  return CryptoJS.AES.encrypt(jsonStr, ENCRYPTION_KEY).toString();
}

/**
 * Decrypt credentials from session
 */
export function decryptCredentials(encryptedData) {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedStr);
  } catch (error) {
    throw new Error("Failed to decrypt credentials");
  }
}

/**
 * Middleware to check if credentials exist in session
 */
export function requireCredentials(provider) {
  return (req, res, next) => {
    const credentialKey = `${provider}_credentials`;

    if (!req.session[credentialKey]) {
      return res.status(401).json({
        error: `${provider.toUpperCase()} credentials not configured`,
        message: "Please configure your cloud credentials first",
      });
    }

    try {
      req.credentials = decryptCredentials(req.session[credentialKey]);
      next();
    } catch (error) {
      return res.status(401).json({
        error: "Invalid credentials",
        message: "Please reconfigure your cloud credentials",
      });
    }
  };
}
