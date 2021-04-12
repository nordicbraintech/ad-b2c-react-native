const RequestType = {
  PasswordReset: "passwordReset",
  Cancelled: "cancelled",
  Other: "other",
  Code: "code",
  Logout: "logout",
  Ignore: "ignore"
};

const azureErrors = {
  wrongEndpoint: "AADB2C90088"
};

export { RequestType, azureErrors };
