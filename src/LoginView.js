import React, { PureComponent } from "react";
import { WebView } from "react-native-webview";
import adService from "./ADService";
import { RequestType } from "./Constants";
import { BackHandler, Platform, View } from "react-native";

export default class LoginView extends PureComponent {
  constructor(props) {
    super();
    this._setUri = this._setUri.bind(this);
    this.onNavigationStateChangeAsync = this.onNavigationStateChangeAsync.bind(
      this
    );
    this.onShouldStartLoadWithRequest = this.onShouldStartLoadWithRequest.bind(
      this
    );
    this._handleFlowResultAsync = this._handleFlowResultAsync.bind(this);
    this._backHandler = this._backHandler.bind(this);
    this.onWebViewError = this.onWebViewError.bind(this);

    this.webView = null;
    adService.init(props);
    this.state = {
      uri: adService.getLoginURI(),
      loaded: false,
      renderExitDone: false
    };
  }
  _backHandler() {
    const { uri } = this.state;
    // Check if WebView reference exists to avoid nullpointer expection.
    // Error appens if backPress is pressed before the webView ref has been established.
    // Return true anyways to avoid exiting the app. Check BackHandler doc for reference.
    if (this.webView) {
      if (uri == adService.getPasswordResetURI()) {
        this._handleFlowResultAsync({ requestType: "cancelled" }, uri);
      }
      this.webView.goBack();
    }

    return true;
  }

  async componentDidMount() {
    BackHandler.addEventListener("hardwareBackPress", this._backHandler);
    const isAuthentic = await adService.isAuthenticAsync();
    if (isAuthentic) {
      this.props.onSuccess();
    } else {
      this.setState({ loaded: true, renderExitDone: false });
    }
  }

  componentWillUnmount() {
    BackHandler.removeEventListener("hardwareBackPress", this._backHandler);
  }

  async onNavigationStateChangeAsync(navState) {
    const { url, loading } = navState;
    const { uri: stateUri } = this.state;

    //credits: Thanks to @stevef51 for the suggestion
    if (loading) {
      return false;
    }

    const result = adService.getLoginFlowResult(url);

    if (url.toLowerCase() !== stateUri.toLowerCase()) {
      await this._handleFlowResultAsync(result, stateUri);
    }
  }

  onShouldStartLoadWithRequest(navState) {
    const result = adService.getLoginFlowResult(navState.url);
    const { uri } = this.state;
    if (
      result.requestType === RequestType.Ignore ||
      (result.requestType === RequestType.Code && !navState.loading) ||
      result.requestType === RequestType.PasswordReset ||
      result.requestType === RequestType.Cancelled
    ) {
      this.webView.stopLoading();
      if (Platform.OS === "ios") {
        this._handleFlowResultAsync(result, uri);
      }
      return false;
    }

    return true;
  }

  _setUri(uri) {
    this.setState({ uri });
  }

  _isNewRequest = (currentUri, uri) =>
    currentUri.toLowerCase() !== uri.toLowerCase();

  async _handleFlowResultAsync(result, currentUri) {
    if (result.requestType === RequestType.PasswordReset) {
      const uri = adService.getPasswordResetURI();
      if (this._isNewRequest(currentUri, uri)) {
        this._setUri(uri);
      }
    }

    if (result.requestType === RequestType.Cancelled) {
      const uri = adService.getLoginURI();
      if (this._isNewRequest(currentUri, uri)) {
        this._setUri(uri);
      } else {
        this._setUri(`${uri}&reloadedAt=${Date.now()}`);
      }
    }

    if (result.requestType === RequestType.Code) {
      const policy =
        currentUri.indexOf(adService.passwordResetPolicy) > -1
          ? adService.passwordResetPolicy
          : adService.loginPolicy;
      this.setState({ renderExitDone: true, renderExit: false });
      const reqResult = await adService.fetchAndSetTokenAsync(
        result.data,
        policy
      );
      if (reqResult.isValid) {
        this.props.onSuccess();
      } else {
        this.setState({ renderExitDone: false, renderExit: false });
        this.props.onFail(reqResult.data);
      }
    }
  }

  onWebViewError({ nativeEvent: e }) {
    this.props.onFail(`Error accessing ${e.url}, ${e.description}`);
  }

  setRenderExit = renderExit => {
    const { renderExitDone } = this.state;
    if (!renderExitDone) {
      this.setState({ renderExit });
    }
  };
  render() {
    const { uri, loaded, renderExit } = this.state;
    const {
      renderLoading,
      renderError,
      renderExitButton,
      onFail,
      containerStyle,
      tokenState,
      ...rest
    } = this.props;

    // If there exists a refresh token to not show the login screen
    if (!loaded || tokenState.refresh) {
      return renderLoading();
    }

    return (
      <View style={containerStyle}>
        {renderExitButton(renderExit)}
        <WebView
          userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.2 Safari/605.1.15"
          incognito
          {...rest}
          originWhitelist={["*"]} // refer: https://github.com/facebook/react-native/issues/20917
          source={{ uri }}
          onNavigationStateChange={this.onNavigationStateChangeAsync}
          onShouldStartLoadWithRequest={this.onShouldStartLoadWithRequest}
          renderLoading={renderLoading}
          renderError={renderError}
          startInLoadingState
          onLoad={() => this.setRenderExit(true)}
          onLoadStart={() => this.setRenderExit(false)}
          onError={this.onWebViewError}
          androidLayerType="hardware"
          ref={c => {
            this.webView = c;
          }}
        />
      </View>
    );
  }
}
