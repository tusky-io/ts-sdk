import { AkordWallet, signString } from "@akord/crypto";
import { AuthenticationDetails, CognitoUser, CognitoUserAttribute, CognitoUserPool, CognitoUserSession } from "amazon-cognito-identity-js";
import MemoryStorage from 'memorystorage'
import { Env } from "../env";

export class Auth {
  public static authToken: string
  public static apiKey: string
  public static config: ApiConfig
  public static storage: Storage
  public static pool: CognitoUserPool
  private static user: CognitoUser

  private constructor() { }

  public static configure(options: AuthOptions = defaultAuthOptions) {
    // reset previous configuration
    this.apiKey = undefined;
    this.authToken = undefined;
    const optionsWithDefaults: AuthOptions = {
      ...defaultAuthOptions,
      ...options
    }
    this.config = apiConfig(optionsWithDefaults.env)
    if (optionsWithDefaults.authToken) {
      this.authToken = optionsWithDefaults.authToken
    } else if (optionsWithDefaults.apiKey) {
      this.apiKey = optionsWithDefaults.apiKey
    } else {
      this.storage = optionsWithDefaults.storage
      this.pool = new CognitoUserPool({
        UserPoolId: this.config.userPoolId,
        ClientId: this.config.userPoolsWebClientId,
        Storage: this.storage
      })
    }
  }


  /**
  * @param  {string} email
  * @param  {string} password
  * @returns Promise with AuthSession containing Akord Wallet and jwt token
  */
  public static signIn = async function (email: string, password: string): Promise<AuthSession> {
    const { user, session } = await Auth.authenticateUser(email, password)
    const attributes = await Auth.retrieveUserAttributes(user)
    const wallet = await AkordWallet.importFromEncBackupPhrase(password, attributes["custom:encBackupPhrase"]);
    return { wallet, jwt: session.getIdToken().getJwtToken() }
  };

  /**
  * @param  {string} wallet akord wallet instance
  * @returns  Promise with AuthSession containing Akord Wallet and jwt token
  */
  public static signInWithWallet = async function (wallet: AkordWallet): Promise<AuthSession> {
    const address = await wallet.getAddress();
    const username = address + "@temp.akord.com";
    const cognitoUser = Auth.getCognitoUser(username);
    const authenticationData = {
      Username: username
    };
    const privateKey = wallet.signingPrivateKeyRaw();
    const authenticationDetails = new AuthenticationDetails(authenticationData);
    const { session } = await new Promise((resolve, reject) => {
      cognitoUser.setAuthenticationFlowType("CUSTOM_AUTH");
      cognitoUser.initiateAuth(authenticationDetails, {
        onSuccess: function (result) {
          resolve({ user: cognitoUser, session: result })
        },
        onFailure: function (err) {
          return reject(err);
        },
        customChallenge: async function (challengeParameters: { nonce: string }) {
          const signature = await signString(challengeParameters.nonce, privateKey);
          cognitoUser.sendCustomChallengeAnswer(signature, this);
        },
      })
    }
    ) as {
      user: CognitoUser,
      session: CognitoUserSession
    };
    const attributes = await Auth.retrieveUserAttributes(cognitoUser);
    const timeToLive = attributes["custom:timeToLive"];
    if (timeToLive) {
      const endOfLife = new Date(parseInt(timeToLive) * 1000);
      if (endOfLife < new Date()) {
        throw new Error("User expired")
      }
    }
    const jwt = session.getIdToken().getJwtToken();
    return { wallet, jwt };
  }

  /**
   * @param  {string} confirmationCode
   * @param  {string} password
   * @param  {MfaType} mfaType
   * @returns Promise with AuthSession containing Akord Wallet and jwt token
  */
  public static confirmSignIn = async function (confirmationCode: string, password: string, mfaType: MfaType): Promise<AuthSession> {
    const { user, session } = await Auth.confirmUser(confirmationCode, mfaType)
    const attributes = await Auth.retrieveUserAttributes(user)
    const wallet = await AkordWallet.importFromEncBackupPhrase(password, attributes["custom:encBackupPhrase"]);
    return { wallet, jwt: session.getIdToken().getJwtToken() }
  };

  /**
  * @returns Promise with AuthSession containing Akord Wallet and jwt token
  */
  public static authenticate = async function (): Promise<AuthSession> {
    const { session, user } = await Auth.getCurrentSessionUser()
    const attributes = await Auth.retrieveUserAttributes(user)
    const wallet = await AkordWallet.importFromKeystore(attributes["custom:encBackupPhrase"]);
    return { wallet, jwt: session.getIdToken().getJwtToken() }
  };

  public static signOut = async function (): Promise<void> {
    const cognitoUser = this.pool.getCurrentUser();
    if (cognitoUser != null) {
      const session = await new Promise((resolve, reject) =>
        cognitoUser.getSession((err, session: CognitoUserSession) => {
          if (err || !session) {
            reject(err || new Error("Invalid session"))
          }
          resolve(session)
        })
      )
      session
      cognitoUser.signOut();
    };
  }

  /**
  * @param  {string} email
  * @param  {string} password
  * @param  {SignUpOptions} options JSON client metadata, ex: { clientType: "CLI" }
  * @returns Promise with Akord Wallet
  */
  public static signUp = async function (email: string, password: string, options: SignUpOptions = {}): Promise<{ wallet: AkordWallet }> {
    let wallet: AkordWallet
    if (options.wallet) {
      wallet = options.wallet
    } else {
      wallet = await AkordWallet.create(password);
    }
    const attributes = [];
    for (const [key, value] of Object.entries({
      email,
      "custom:encBackupPhrase": wallet.encBackupPhrase,
      "custom:publicKey": wallet.publicKey(),
      "custom:publicSigningKey": wallet.signingPublicKey(),
      "custom:address": await wallet.getAddress(),
      "custom:referrerId": options.referrerId,
      "custom:mode": "dark",
      "custom:notifications": "true"
    })) {
      attributes.push(new CognitoUserAttribute({
        Name: key,
        Value: <string>value
      }));
    }
    await new Promise((resolve, reject) =>
      this.pool.signUp(email, password, attributes, null, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }, { verifyUrl: options.verifyUrl, clientType: options.clientType })
    );
    return { wallet };
  };

  /**
  * @param  {AkordWallet} wallet akord wallet instance
  * @param  {SignUpOptions} options JSON client metadata, ex: { clientType: "CLI" }
  * @returns Promise with Akord Wallet
  */
  public static signUpWithWallet = async function (wallet?: AkordWallet, options: SignUpOptions = {}): Promise<{ wallet: AkordWallet }> {
    const random = Math.random().toString(30);
    if (!wallet) {
      wallet = await AkordWallet.create(random);
    }
    const address = await wallet.getAddress();
    const attributes = Auth.jsonToUserAttributes({
      "custom:publicKey": wallet.publicKey(),
      "custom:publicSigningKey": wallet.signingPublicKey(),
      "custom:address": address,
      "custom:referrerId": options.referrerId,
      "custom:mode": "dark",
      "custom:notifications": "true",
      "custom:passwordless": "true"
    });

    await new Promise((resolve, reject) =>
      this.pool.signUp(address + "@temp.akord.com", random, attributes, null, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }, { verifyUrl: options.verifyUrl, clientType: options.clientType })
    );
    return { wallet };
  };

  public static resendCode = async function (email: string, options: ResendSignUpOptions = {}): Promise<Object> {
    const user = Auth.getCognitoUser(email);
    return new Promise((resolve, reject) =>
      user.resendConfirmationCode((err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }, { verifyUrl: options.verifyUrl, clientType: options.clientType })
    );
  }

  /**
  * @param  {string} email
  * @param  {string} code
  * @returns
  */
  public static verifyAccount = async function (email: string, code: string): Promise<Object> {
    const user = Auth.getCognitoUser(email);
    return new Promise((resolve, reject) =>
      user.confirmRegistration(code, false, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      })
    );
  }

  public static changePassword = async function (currentPassword: string, newPassword: string): Promise<AuthSession> {
    const { user } = await Auth.getCurrentSessionUser()
    const attributes = await Auth.retrieveUserAttributes(user)
    const encBackupPhrase = attributes['custom:encBackupPhrase']
    const wallet = await AkordWallet.changePassword(
      currentPassword,
      newPassword,
      encBackupPhrase
    )
    await this.updateUserAttribute('custom:encBackupPhrase', wallet.encBackupPhrase)
    await new Promise((resolve, reject) =>
      user.changePassword(
        currentPassword,
        newPassword,
        (err, result) => {
          if (err) {
            reject(err)
          }
          resolve(result)
        }
      ))
    const jwt = await this.getAuthToken()
    return { wallet, jwt }
  };

  public static changePasswordSubmit = async function (email: string, code: string, password: string): Promise<void> {
    const { user } = await Auth.getCurrentSessionUser()
    await new Promise((resolve, reject) =>
      user.confirmPassword(code, password, {
        onSuccess() {
          resolve('password_changed')
        },
        onFailure(err) {
          reject(err)
        },
      })
    );
  };

  public static forgotPassword = async function (email: string, verifyUrl?: string) {
    const user = Auth.getCognitoUser(email);
    await new Promise((resolve, reject) =>
      user.forgotPassword({
        onSuccess() {
          resolve(user)
        },
        onFailure(err) {
          reject(err)
        },
      },
        { resetPasswordUrl: verifyUrl }
      )
    );
  }

  public static forgotPasswordSubmit = async function (email: string, code: string, backupPhrase: string, newPassword: string) {
    const wallet = await AkordWallet.recover(newPassword, backupPhrase)
    const user = Auth.getCognitoUser(email)
    await new Promise((resolve, reject) =>
      user.confirmPassword(code, newPassword, {
        onSuccess() {
          resolve(user)
        },
        onFailure(err) {
          reject(err)
        },
      })
    );
    await Auth.authenticateUser(email, newPassword)
    await Auth.updateUserAttribute("custom:encBackupPhrase", wallet.encBackupPhrase)
  }

  /**
   * Gets jwt token if available. For SRP auth:
   * 1. Get idToken, accessToken, refreshToken, and clockDrift from storage
   * 2. Validate the tokens if active or expired.
   * 3. If tokens are valid, return current session.
   * 4. If tokens are expired, invoke the refreshToken().
   */
  public static getAuthToken = async function (): Promise<string> {
    if (this.authToken) {
      return this.authToken
    } else if (this.apiKey) {
      return null
    } else {
      const session = (await Auth.getCurrentSessionUser()).session;
      if (!session) {
        return null
      }
      return session.getIdToken().getJwtToken();
    }
  };

  public static getAuthorization = async function (): Promise<string> {
    if (this.apiKey) {
      return this.apiKey
    } else {
      try {
        const token = await this.getAuthToken()
        if (token) {
          return `Bearer ${token}`
        }
      } catch (e) {
        // not authorized
      }
    }
    return null
  }

  public static getUser = async function (bypassCache: boolean = false): Promise<UserData> {
    try {
      const { user } = await Auth.getCurrentSessionUser()
      return await new Promise((resolve, reject) =>
        user.getUserData((err, data) => {
          if (err) {
            reject(err);
          }
          const { Username, PreferredMfaSetting, UserAttributes } = data;
          const attributes = UserAttributes.reduce(function (
            attributesObject,
            attribute
          ) {
            attributesObject[attribute.Name] = attribute.Value;
            return attributesObject;
          }, {});
          let mfaType: MfaType
          if (attributes["custom:backupPhraseMFA"] === "true") {
            mfaType = "BACKUP_PHRASE"
          } else if (PreferredMfaSetting === "SMS_MFA") {
            mfaType = "SMS"
          } else if (PreferredMfaSetting === "SOFTWARE_TOKEN_MFA") {
            mfaType = "TOTP"
          }
          resolve({ username: Username, mfaType: mfaType, attributes: attributes })
        }, { bypassCache: bypassCache })
      )
    } catch (e) {
      return null
    }
  }

  public static getAddress = async function (): Promise<string> {
    const { user } = await Auth.getCurrentSessionUser()
    const attributes = await Auth.retrieveUserAttributes(user)
    return attributes["custom:storageAddress"] || attributes["custom:address"]
  };

  public static getUserAttributes = async function (): Promise<any> {
    try {
      const { user } = await Auth.getCurrentSessionUser()
      return await Auth.retrieveUserAttributes(user)
    } catch (e) {
      return {}
    }
  }

  public static updateUserAttribute = async function (attributeName: string, attributeValue: string): Promise<any> {
    const { user } = await Auth.getCurrentSessionUser();
    const attributeList = [];
    const attribute = new CognitoUserAttribute({
      Name: attributeName,
      Value: attributeValue,
    });
    attributeList.push(attribute);

    await new Promise((resolve, reject) =>
      user.updateAttributes(attributeList, function (err, result) {
        if (err) {
          reject(err);
        }
        resolve(result);
      }))
  }

  public static enableMFA = async function (mfaType: MfaType): Promise<void> {
    const { user } = await Auth.getCurrentSessionUser();
    if (mfaType === "BACKUP_PHRASE") {
      await this.updateUserAttribute("custom:backupPhraseMFA", "true")
    } else {
      const smsMfaSettings = {
        PreferredMfa: false,
        Enabled: false,
      };
      const totpMfaSettings = {
        PreferredMfa: false,
        Enabled: false,
      };
      if (mfaType === "SMS") {
        smsMfaSettings.PreferredMfa = true
        smsMfaSettings.Enabled = true
      }
      else if (mfaType === "TOTP") {
        totpMfaSettings.PreferredMfa = true
        totpMfaSettings.Enabled = true
      };
      await new Promise((resolve, reject) =>
        user.setUserMfaPreference(smsMfaSettings, totpMfaSettings, function (err, result) {
          if (err) {
            reject(err);
          }
          resolve("mfa_enabled");
        })
      );
    }
  }

  public static disableMFA = async function (): Promise<void> {
    const { user } = await Auth.getCurrentSessionUser();
    await this.updateUserAttribute("custom:backupPhraseMFA", "false")
    const smsMfaSettings = {
      PreferredMfa: false,
      Enabled: false,
    };
    const totpMfaSettings = {
      PreferredMfa: false,
      Enabled: false,
    };
    await new Promise((resolve, reject) =>
      user.setUserMfaPreference(smsMfaSettings, totpMfaSettings, function (err, result) {
        if (err) {
          reject(err);
        }
        resolve(user);
      })
    );
  }

  public static registerPhoneNumber = async function (phoneNumber: string): Promise<void> {
    const { user } = await Auth.getCurrentSessionUser();
    await this.updateUserAttribute("phone_number", phoneNumber)
    await new Promise((resolve, reject) =>
      user.getAttributeVerificationCode('phone_number', {
        onSuccess: function (result) {
          resolve(result)
        },
        onFailure: function (err) {
          reject(err);
        }
      })
    );
  }

  public static verifyPhoneNumber = async function (verificationCode: string): Promise<void> {
    const { user } = await Auth.getCurrentSessionUser();
    await new Promise((resolve, reject) =>
      user.verifyAttribute('phone_number', verificationCode, {
        onSuccess: function (result) {
          resolve(result)
        },
        onFailure: function (err) {
          reject(err);
        }
      })
    );
  }

  public static associateSoftwareToken = async function (): Promise<string> {
    const { user } = await Auth.getCurrentSessionUser();
    Auth.user = user;

    return await new Promise((resolve, reject) =>
      Auth.user.associateSoftwareToken({
        associateSecretCode: function (secretCode) {
          resolve(secretCode)
        },
        onFailure: function (err) {
          reject(err);
        }
      })
    );
  }

  public static verifySoftwareToken = async function (totpCode: string, deviceName: string): Promise<void> {
    await new Promise((resolve, reject) =>
      Auth.user.verifySoftwareToken(totpCode, deviceName, {
        onSuccess: function (session) {
          resolve(session)
        },
        onFailure: function (err) {
          reject(err);
        }
      })
    );
  }

  private static retrieveUserAttributes = async function (user: CognitoUser): Promise<Object> {
    await new Promise((resolve, reject) =>
      user.getSession((err, session: CognitoUserSession) => {
        if (err || !session) {
          reject(err || new Error("Invalid session"))
        }
        resolve({ user: user, session })
      })
    )
    return new Promise((resolve, reject) => {
      user.getUserAttributes(async function (err, result) {
        if (err) {
          reject(err);
        }
        const attributes = result.reduce(function (
          attributesObject,
          attribute
        ) {
          attributesObject[attribute.Name] = attribute.Value;
          return attributesObject;
        }, {});
        resolve(attributes);
      })
    })
  }

  public static getCurrentSessionUser = async function (): Promise<{
    user: CognitoUser,
    session: CognitoUserSession
  }> {

    const cognitoUser = this.pool.getCurrentUser();
    if (cognitoUser === null) {
      throw new Error("Invalid session")
    }
    return new Promise((resolve, reject) =>
      cognitoUser.getSession((err, session: CognitoUserSession) => {
        if (err || !session) {
          reject(err || new Error("Invalid session"))
        }
        resolve({ user: cognitoUser, session })
      })
    )
  }

  private static authenticateUser = async function (email: string, password: string): Promise<{
    user: CognitoUser,
    session: CognitoUserSession
  }> {
    const authenticationData = {
      Username: email,
      Password: password,
    };
    Auth.user = this.getCognitoUser(email);
    const authenticationDetails = new AuthenticationDetails(authenticationData);
    return new Promise((resolve, reject) =>
      Auth.user.authenticateUser(authenticationDetails, {
        onSuccess: function (result) {
          resolve({ user: Auth.user, session: result })
        },
        onFailure: function (err) {
          reject(err);
        },
        totpRequired: function (secretCode, challengeParameters) {
          reject({ mfaRequired: true, mfaType: "TOTP", secretCode: secretCode, challengeParameters: challengeParameters })
        },
        mfaRequired: function (_) {
          reject({ mfaRequired: true, mfaType: "SMS" })
        }
      })
    );
  }

  private static confirmUser = async function (verificationCode: string, mfaType?: MfaType): Promise<{
    user: CognitoUser,
    session: CognitoUserSession
  }> {
    const mfa = mfaType === "TOTP" ? "SOFTWARE_TOKEN_MFA" : null
    return new Promise((resolve, reject) =>
      Auth.user.sendMFACode(verificationCode, {
        onSuccess: function (result) {
          resolve({ user: Auth.user, session: result })
        },
        onFailure: function (err) {
          reject(err);
        }
      }, mfa)
    )
  }

  private static getCognitoUser(username: string): CognitoUser {
    const userData = {
      Username: username,
      Pool: this.pool,
      Storage: this.storage
    };
    const cognitoUser = new CognitoUser(userData);
    return cognitoUser;
  }

  private static jsonToUserAttributes(json: any): Array<CognitoUserAttribute> {
    const attributes = [];
    for (const [key, value] of Object.entries(json)) {
      attributes.push(new CognitoUserAttribute({
        Name: key,
        Value: <string>value
      }));
    }
    return attributes;
  }
}

type AuthOptions = {
  env?: Env
  storage?: Storage
  authToken?: string
  apiKey?: string
}

const defaultAuthOptions: AuthOptions = {
  env: "v2",
  storage: getDefaultStorage(),
}

export type ResendSignUpOptions = {
  clientType?: "WEB" | "CLI"
  verifyUrl?: string
}

export type SignUpOptions = {
  clientType?: "WEB" | "CLI"
  verifyUrl?: string
  referrerId?: string
  wallet?: AkordWallet
}

export type AuthSession = {
  wallet: AkordWallet
  jwt: string
}

export type UserData = {
  username: string
  attributes: any
  mfaType?: MfaType
}

export type MfaType = "BACKUP_PHRASE" | "SMS" | "TOTP"

function apiConfig(env?: string): ApiConfig {
  switch (env) {
    case "dev":
      return {
        apiurl: "https://api.akord.link",
        userPoolId: "eu-central-1_FOAlZvgHo",
        userPoolsWebClientId: "3m7t2tk3dpldemk3geq0otrtt9"
      };
    case "v2":
      return {
        apiurl: "https://api.akord.com",
        userPoolId: "eu-central-1_glTrP1Kin",
        userPoolsWebClientId: "7u2a1pf5i6shfo7enci6bagk7u"
      };
    case "carmella":
    default:
      return {
        apiurl: "https://carmella-storage.akord.link",
        userPoolId: "eu-central-1_OYZKJtYYh",
        userPoolsWebClientId: "63p48n9qihc1v9a6nctv4k2tif"
      };
  }
};

interface ApiConfig {
  apiurl: string,
  userPoolId: string,
  userPoolsWebClientId: string
}

function getDefaultStorage() {
  return isServer() ? new MemoryStorage('akord') : window.sessionStorage
}

function isServer() {
  return isNode() || isDeno()
}

function isNode() {
  return (typeof process !== 'undefined') && (process.release?.name === 'node')
}


function isDeno() {
  return window && ("Deno" in window)
}

Auth.configure()
