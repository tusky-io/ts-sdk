import "reflect-metadata";
import { EncryptedVaultKeyPair } from "../../types";
import Encrypter, { Ed25519EncryptedPayload } from "../../encrypter";
import { arrayToString, base64ToJson } from "../encoding";
import { decryptWithPrivateKey } from "../../crypto-lib";

export abstract class Encryptable {
    constructor(keys: Array<EncryptedVaultKeyPair>) {
        this.__keys__ = keys;
    }
    __keys__: Array<EncryptedVaultKeyPair>
    __encryptProps__: Set<string>;
    [key: string]: any
    
    async decrypt(encrypter?: Encrypter): Promise<void> {
        if (this.__encryptProps__) {
            await Promise.all(
                Array.from(this.__encryptProps__.values()).map(async (prop) => {
                    if (!this[prop]) {
                        return this[prop]
                    }
                    const payload = base64ToJson(this.name) as Ed25519EncryptedPayload;
                    const vaultEncPrivateKey = this.__keys__.find((key) => key.publicKey === payload.publicKey).encPrivateKey;
                    const privateKey = await encrypter.decrypt(vaultEncPrivateKey);
                    const decryptedArray = await decryptWithPrivateKey(privateKey, payload);
                    const decrypted = arrayToString(decryptedArray);
                    this[prop] = decrypted
                    return decrypted
                })
            )
        }
        await Promise.all(Object.keys(this).map(async prop => {
            if (this[prop]) {
                if (this[prop].__keys__ && this[prop].__keys__.length && this[prop].decrypt) {
                    await this[prop].decrypt()
                }
                else if (Array.isArray(this[prop])) {
                    await Promise.all(this[prop].map(async (el: any)=> {
                        if (el && el.__keys__ && el.__keys__.length && el.decrypt)
                            await el.decrypt()
                        })
                    )
                }
            }
        }))
        return Promise.resolve()
    }

    async encrypt(): Promise<void> {
        if (this.__encryptProps__) {
            // Crypto.encrypter().setKeys(this.__keys__);
            // Crypto.encrypter().setPublicKey(this.__publicKey__);
            await Promise.all(
                Array.from(this.__encryptProps__.values()).map(async (prop) => {
                    if (!this[prop]) {
                        return this[prop]
                    }
                    // const encrypt = await Crypto.encrypt(this[prop])
                    // this[prop] = encrypt
                    // return encrypt
                })
            )
        }
        await Promise.all(Object.keys(this).map(async prop => {
            if (this[prop]) {
                if (this[prop].__keys__ && this[prop].__keys__.length && this[prop].encrypt) {
                    await this[prop].encrypt()
                }
                else if (Array.isArray(this[prop])) {
                    await Promise.all(this[prop].map(async (el: any)=> {
                        if (el && el.__keys__ && el.__keys__.length && el.encrypt)
                            await el.encrypt()
                        })
                    )
                }
            }
        }))
        return Promise.resolve()
    }
}

/**
 * 
 * De/-Encrypt class attribute(s).
 * @example
```
class Foo extends Encryptable {
    constructor(bar, _keys) {
        super(_keys)
        this.bar = bar
    }

    @encrypted()
    bar: string // attr will be de/-encrypted
}
const foo = new Foo("test")
await foo.encrypt()
await foo.decrypt()
```
 */
export function encrypted() {
    return function (target: any, propertyKey: string) {
        if (!target.__encryptProps__) {
            target.__encryptProps__ = new Set()
        }
        target.__encryptProps__.add(propertyKey)
    }
}
