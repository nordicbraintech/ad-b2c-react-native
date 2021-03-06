/* eslint-disable camelcase */
import { RequestType, azureErrors } from "./Constants";
import Result from "./Result";

class ADService {
  init = props => {
    this.tenant = props.tenant;
    this.appId = props.appId;
    this.loginPolicy = props.loginPolicy;
    this.passwordResetPolicy = props.passwordResetPolicy;
    this.profileEditPolicy = props.profileEditPolicy;
    this.redirectURI = encodeURI(props.redirectURI);
    this.scope = encodeURI(
      props.scope ? props.scope : `${this.appId} offline_access`
    );

    this.response_mode = "query";
    this.tokenResult = {};

    this.setTokenState = props.setTokenState;
    this.resetTokenState = props.resetTokenState;
    this.tokenState = props.tokenState;

    this.baseUri = `https://${this.tenant}.b2clogin.com/${this.tenant}.onmicrosoft.com`;

    this.TokenTypeKey = "tokenType";
    this.AccessTokenKey = "accessToken";
    this.IdTokenKey = "idToken";
    this.RefreshTokenKey = "refreshToken";
    this.ExpiresOnKey = "expiresOn";
  };

  logoutAsync = async () => {
    this.tokenResult = {};
    this.resetTokenState();
  };

  isAuthenticAsync = async () => {
    const { tokenType, access, refresh, expiresOn } = this.tokenState;

    this.tokenResult = {
      tokenType: tokenType,
      accessToken: access,
      idToken: "",
      refreshToken: refresh,
      expiresOn: parseInt(expiresOn)
    };

    return this._isTokenValid(this.tokenResult);
  };

  _isTokenValid = tokenResult =>
    tokenResult &&
    "expiresOn" in tokenResult &&
    new Date().getTime() < tokenResult.expiresOn * 1000;

  getAccessTokenAsync = async () => {
    try {
      // Additional is valid to store result from second request
      let isValid = false;
      if (!this._isTokenValid(this.tokenResult)) {
        const resultSignin = await this.fetchAndSetTokenAsync(
          this.tokenResult.refreshToken,
          this.loginPolicy,
          true
        );

        // If wrong endpoint try with reset password endpoint
        if (
          resultSignin.data &&
          resultSignin.data.match(azureErrors.wrongEndpoint)
        ) {
          const resultReset = await this.fetchAndSetTokenAsync(
            this.tokenResult.refreshToken,
            this.passwordResetPolicy,
            true
          );
          isValid = resultReset.isValid;
        }

        // Only return result if token is invalid.
        // If token is valid it is not returned in the result response from the fetch function.
        // (see end of fetchAndSetTokenAsync)
        if (!resultSignin.isValid && !isValid) {
          return resultSignin;
        }
      }
    } catch (e) {
      return Result(false, e.message);
    }

    // Collect and return access token
    return Result(
      true,
      `${this.tokenResult.tokenType} ${this.tokenResult.accessToken}`
    );
  };

  getIdToken = () =>
    this.tokenResult?.idToken === undefined ? "" : this.tokenResult.idToken;

  fetchAndSetTokenAsync = async (authCode, policy, isRefreshTokenGrant) => {
    if (!authCode) {
      return Result(
        false,
        `Empty ${
          isRefreshTokenGrant
            ? "refresh token or user not logged in"
            : "auth code"
        }`
      );
    }

    try {
      let body = `client_id=${this.appId}&scope=${this.scope}&redirect_uri=${this.redirectURI}`;

      if (isRefreshTokenGrant) {
        body += "&grant_type=refresh_token";
        body += `&refresh_token=${authCode}`;
      } else {
        body += "&grant_type=authorization_code";
        body += `&code=${authCode}`;
      }

      const url = this._getStaticURI(policy, "token");
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error_description);
      }

      await this._setTokenDataAsync(response);
      // Returns only true response of token is valid after setting the internal state.
      return Result(true);
    } catch (error) {
      return Result(false, error.message);
    }
  };

  _setTokenDataAsync = async response => {
    const res = await response.json();
    this.tokenResult = {
      tokenType: res.token_type,
      accessToken: res.access_token,
      idToken: res.id_token,
      refreshToken: res.refresh_token,
      expiresOn: res.expires_on
    };

    this.setTokenState({
      tokenType: res.token_type,
      access: res.access_token,
      refresh: res.refresh_token,
      expiresOn: res.expires_on.toString()
    });
  };

  _getStaticURI = (policy, endPoint) => {
    let uri = `${this.baseUri}/${policy}/oauth2/v2.0/${endPoint}?`;
    if (endPoint === "authorize") {
      uri += `client_id=${this.appId}&response_type=code`;
      uri += `&redirect_uri=${this.redirectURI}`;
      uri += "&response_mode=query";
      uri += `&scope=${this.scope}`;
    }
    return uri;
  };

  getLoginURI = () => this._getStaticURI(this.loginPolicy, "authorize");

  getLogoutURI = () =>
    `${this.baseUri}/${this.loginPolicy}/oauth2/v2.0/logout?post_logout_redirect_uri=${this.redirectURI}`;

  getPasswordResetURI = () =>
    `${this._getStaticURI(this.passwordResetPolicy, "authorize")}`;

  getProfileEditURI = () =>
    `${this._getStaticURI(this.profileEditPolicy, "authorize")}`;

  getLoginFlowResult = url => {
    const params = this._getQueryParams(url);
    const { error_description, code } = params;

    let data = "";
    if (code) {
      data = code;
    } else {
      data = error_description;
    }

    return {
      requestType: this._getRequestType(url, params),
      data
    };
  };

  _getRequestType = (
    url,
    { error_description, code, post_logout_redirect_uri }
  ) => {
    if (code && url.indexOf(this.redirectURI) > -1) {
      return RequestType.Code;
    }

    if (post_logout_redirect_uri === this.redirectURI) {
      return RequestType.Logout;
    }
    if (error_description) {
      if (error_description.indexOf("AADB2C90118") !== -1) {
        return RequestType.PasswordReset;
      }

      if (error_description.indexOf("AADB2C90091") !== -1) {
        return RequestType.Cancelled;
      }
    }

    // always keep this check last
    if (url.indexOf(this.redirectURI) === 0) {
      return RequestType.Ignore;
    }

    return RequestType.Other;
  };

  _getQueryParams = url => {
    const regex = /[?&]([^=#]+)=([^&#]*)/g;
    const params = {};
    let match;
    while ((match = regex.exec(url))) {
      params[match[1]] = match[2];
    }
    return params;
  };
}

const adService = new ADService();
export default adService;
export { ADService };
