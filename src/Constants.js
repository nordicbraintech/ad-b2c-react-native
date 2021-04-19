const RequestType = {
  PasswordReset: "passwordReset",
  Cancelled: "cancelled",
  Other: "other",
  Code: "code",
  Logout: "logout",
  Ignore: "ignore"
};

/**
 * Error codes for Azure Active Directory B2C
 * https://docs.microsoft.com/en-us/azure/active-directory-b2c/error-codes
 */
const azureErrors = {
  wrongEndpoint: "AADB2C90088"
};

export { RequestType, azureErrors };
