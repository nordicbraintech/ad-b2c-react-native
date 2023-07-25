
[![codecov](https://img.shields.io/codecov/c/github/GSingh01/ad-b2c-react-native)](https://codecov.io/gh/GSingh01/ad-b2c-react-native)

React Native Azure AD B2C solution using Pure JS. If you are using expo you dont need to eject.

Thanks to https://github.com/sonyarouje/react-native-ad-b2c and https://github.com/wkh237/react-native-azure-ad packages for the inspiration.

Feel free to contribute or sponsor. :)

## Guide to change user email in Brain Twin

The following is meant as a guide to change user emails in the Azure B2C tenant (Brain Twin).


Register a new App in App registration in AD B2C Tenant. Note the App_Client_ID for later
Give the new registered app permission to read/write all users by adding Microsoft Graph API permission (given with Application rights and not delegated)
Create a new secret (in Certs & secrets pane). Note the Secret_Value for later
Find the application endpoint with (Tenant_Obj_ID)
Use the newly registered app to get a token from BT endpoint by calling from a terminal:


`curl --location --request POST 'https://login.microsoftonline.com/Tenant_Obj_ID/oauth2/v2.0/token' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'client_id=App_Client_ID' \
--data-urlencode 'scope=https://graph.microsoft.com/.default' \
--data-urlencode 'client_secret=Secret_Value' \
--data-urlencode 'grant_type=client_credentials'`

This should print a bearer token "ey … ….. … ."

Copy token and insert in next step

We change the email by sending a PATCH request.
Find the Object_ID of the user you want to change in Users pane in Azure AD B2C. The list can be searched by typing the full email.
Find the New_Mail and insert the Token_String in the following call:

´curl -X PATCH 'https://graph.microsoft.com/v1.0/users/Object_ID' \
 -H 'Content-Type: application/json'
     -H 'Accept: application/json'
--header 'Authorization: Bearer Token_String \
--data '{
    "identities": [
        {
            "signInType": "emailAddress",
            "issuer": "devbraintwin.onmicrosoft.com",
            "issuerAssignedId": "New_Mail"
        }
    ]
}' ´

NB: Some formating can be off when copy/pasting the above call. Check all the apostrophes ‘’ and “” symbols.

This should change the email address for the user. Can also be checked by trying to log in with the new user in BT.

To clean up you should probably withdraw the permisions and delete the registered application we created in step 1.

## Installation

> Don't forget to **install peer dependencies** "react": "^16.8.3", "react-native-webview": "^7.0.1"
```
npm i ad-b2c-react-native -S
```

## Usage
> The **code** below is just **a sample implementation** to just demonstrate the API of the components. As-Is **copy paste** of below **will not work**.

### Login screen
```
import React from 'react';
import { Alert } from 'react-native';
import { LoginView } from 'ad-b2c-react-native';
import * as SecureStore from 'expo-secure-store';

export default class Login extends React.PureComponent {
  static navigationOptions = { header: null };

  constructor(props) {
    super(props);
    this.onLogin = this.onLogin.bind(this);
    this.onFail = this.onFail.bind(this);
    this.spinner = this.spinner.bind(this);
  }

  onLogin() {
    const { navigation } = this.props;
    navigation.navigate('App');
  }

  onFail(reason) {
    Alert.alert(reason);
  }

  spinner() {
  //this is just a sample implementation, so copy pasting will not work as the components used below are custom
  //and are not in imports above. Please replace it with your implementation.
  return (
        <CView> //custom wrapper around View
            <Spinner /> //component wrapping loading status symbol(e.g spinner)
        </CView>
    );
  }

  render() {
      //apart from these props you can use any webview props

      //for *secureStore*, you can pass expo's secure store or create your own wrapper,
      //which implements deleteItemAsync(key), getItemAsync(key), setItemAsync(key, data)

      //*scope is optional*,if provided will overwrite the default scope {appId offline_access}
      //*Suggestion*: with custom scope, id and refresh tokens will not be returned,
      //so consider using format 'openid offline_access {your scope} '

    return (
      <LoginView
        appId="myAppId"
        redirectURI="myRedirectURI"
        tenant="myTenant"
        loginPolicy="B2C_1_SignUpSignIn"
        passwordResetPolicy="B2C_1_PasswordReset"
        profileEditPolicy="B2C_1_ProfileEdit"
        onSuccess={this.onLogin}
        onFail={this.onFail}
        secureStore={MySecureStore}
        renderLoading={this.spinner}
        scope="openid offline_access myScope1 myScope2 ...." //optional, but see the notes above
      />
    );
  }
}

```

### Logout screen
```
import React from 'react';
import { Alert } from 'react-native';
import {LogoutView} from 'ad-b2c-react-native';

export default class Logout extends React.PureComponent {
  static navigationOptions = { header: null };

  constructor(props) {
    super(props);
    this.onSuccess = this.onSuccess.bind(this);
    this.onFail = this.onFail.bind(this);
    this.spinner = this.spinner.bind(this);
  }

  onSuccess() {
    const { navigation } = this.props;
    navigation.navigate('Auth');
  }

  onFail(reason) {
    Alert.alert(reason);
  }

  spinner() {
  //this is just a sample implementation, so copy pasting will not work as the components used below are custom
  //and are not in imports above. Please replace it with your implementation.
      return (
        <CView>
            <Spinner />
        </CView>
    );  
  }

  render() {
    return <LogoutView 
             onSuccess={this.onSuccess}
             onFail={this.onFail}
             renderLoading={this.spinner}
            />;
  }
}
```

### Profile Edit screen
```
import React from 'react';
import { Alert } from 'react-native';
import { EditView } from 'ad-b2c-react-native';

export default class EditProfile extends React.PureComponent {
  static navigationOptions = { header: null };

  constructor(props) {
    super(props);
    this.onSuccess = this.onSuccess.bind(this);
    this.onFail = this.onFail.bind(this);
    this.spinner = this.spinner.bind(this);
  }

  onSuccess() {
    const { navigation } = this.props;
    navigation.navigate('Auth');
  }

  onFail(reason) {
    Alert.alert(reason);
  }

  spinner() {
  //this is just a sample implementation, so copy pasting will not work as the components used below are custom
  //and are not in imports above. Please replace it with your implementation.
      return (
        <CView>
            <Spinner />
        </CView>
    );  
  }

  render() {
    return <EditView 
             onSuccess={this.onSuccess}
             onFail={this.onFail}
             renderLoading={this.spinner}
            />;
  }
}
```

### Routes
```
import {
  createStackNavigator,
  createAppContainer,
  createSwitchNavigator,
} from 'react-navigation';

import Home from './Home';
import Login from './Login';
import Logout from './Logout';
import EditProfile from './EditProfile';

const AuthStack = createStackNavigator({ Login });
const AppStack = createStackNavigator(
  {
    Home,
    EditProfile,
    Logout,
  }
);

const navigator = createSwitchNavigator(
  {
    App: AppStack,
    Auth: AuthStack,
  },
  {
    initialRouteName: 'Auth',
  },
);
const routes = createAppContainer(navigator);
```

### Get Access Token

Call  adService.getAccessTokenAsync() anywhere in your solution to get latest access token. The token is cached and if expired will use refresh token to get new one seamlessly. Make sure to await or use promise api to use the method.

```
import { adService } from 'ad-b2c-react-native';

const tokenResult = await adService.getAccessTokenAsync(); 
//tokenResult: {isValid: bool, data: string}
//tokenResult.data: string of format 'type accessToken', e.g Bearer sampleAccessToken
```

### Get ID Token

The idToken is retrievable only after a successful login. Decode it using the library of choice to get user info

```
import { adService } from 'ad-b2c-react-native';

await adService.getIdToken();
```
