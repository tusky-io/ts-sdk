import { AxiosRequestHeaders } from "axios";
import { Unauthorized } from "../errors/unauthorized";

export class Auth {
  public static authTokenProvider: () => Promise<string>
  public static apiKey: string

  private constructor() { }

  public static configure(options: AuthOptions = {}) {
    // reset previous configuration
    this.apiKey = options.apiKey;
    this.authTokenProvider = options.authTokenProvider;
  }

  public static async getAuthorizationHeader(): Promise<AxiosRequestHeaders> {
    if (this.apiKey) {
      return {
        "Api-Key": this.apiKey
      }
    } else if (this.authTokenProvider) {
      try {
        const token = await this.authTokenProvider();
        // return token
        if (token) {
          return {
            "Authorization": `Bearer ${token}`
          }
        }
        throw new Unauthorized("Please add authTokenProvider or apiKey into config.")
      } catch (e) {
        throw new Unauthorized("Invalid authorization.")
      }
    } else {
      throw new Unauthorized("Please add authTokenProvider or apiKey into config.")
    }
  }
}

type AuthOptions = {
  authTokenProvider?: () => Promise<string>
  apiKey?: string
}

Auth.configure()
