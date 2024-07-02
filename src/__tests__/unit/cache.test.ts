import { AkordWallet, generateKeyPair } from "@akord/crypto";
import { Akord } from "../../akord";
import { AkordApi } from "../../api";
import { CacheBusters } from "../../types/cacheable";
import { Service } from "../../service";

let akord: Akord;


beforeEach(async () => {
    CacheBusters.profile.next("clear-cache")
});

it("should query the profile with cache disabled", async () => {
    jest.spyOn(Service.prototype as any, 'encodeTransaction').mockImplementation(() => { });
    const getProfileDetails = jest.spyOn(Service.prototype as any, 'getProfileDetails').mockImplementation(() => {
        return {
            publicSigningKey: "test",
            email: "any@akord.com"
        }
    });

    akord = new Akord(
        undefined,
        undefined,
        {
            cache: false
        }
    );

    const profile1 = await akord.profile.get();
    const profile2 = await akord.profile.get();

    expect(getProfileDetails).toHaveBeenCalledTimes(2);
    expect(profile2).toEqual(profile1);
});

it("should query the profile with cache disabled by default", async () => {
    const getProfileDetails = jest.spyOn(Service.prototype as any, 'getProfileDetails').mockImplementation(() => {
        return {
            publicSigningKey: "test",
            email: "any@akord.com"
        }
    });

    akord = new Akord(undefined, undefined, {});

    const profile1 = await akord.profile.get();
    const profile2 = await akord.profile.get();

    expect(getProfileDetails).toHaveBeenCalledTimes(2);
    expect(profile2).toEqual(profile1);
});

it("should query the profile and cache the result", async () => {
    const getProfileDetails = jest.spyOn(Service.prototype as any, 'getProfileDetails').mockImplementation(() => {
        return {
            publicSigningKey: "test",
            email: "any@akord.com"
        }
    });

    akord = new Akord(undefined, undefined,
        {
            cache: true
        });

    const profile = await akord.profile.get();
    const cachedProfile = await akord.profile.get();

    expect(getProfileDetails).toHaveBeenCalledTimes(1);
    expect(cachedProfile).toEqual(profile);
});

it("should bust the profile cache on profile update", async () => {
    const getProfileDetails = jest.spyOn(Service.prototype as any, 'getProfileDetails').mockImplementation(() => {
        return {
            publicSigningKey: "test",
            email: "any@akord.com"
        }
    });

    AkordApi.prototype.getProfile = jest.fn().mockImplementation(() => {
        return {
            state: {
                profileDetails: {
                    name: "any"
                }
            }
        };
    });

    AkordApi.prototype.uploadData = jest.fn().mockImplementation(() => {
        return [{
            resourceId: "any"
        }];
    });

    AkordApi.prototype.getMemberships = jest.fn().mockImplementation(() => {
        return [];
    });

    jest.spyOn(Service.prototype as any, 'encodeTransaction').mockImplementation(() => { });

    const wallet = new AkordWallet("any");

    const keyPair = await generateKeyPair();
    wallet.signingPrivateKeyRaw = jest.fn().mockImplementation(() => {
        return keyPair.privateKey;
    });

    akord = new Akord(wallet, undefined,
        {
            cache: true
        });



    await akord.profile.get();
    await akord.profile.get();

    expect(getProfileDetails).toHaveBeenCalledTimes(1);

    await akord.profile.update("", "");
    await akord.profile.get();

    expect(getProfileDetails).toHaveBeenCalledTimes(2);
});
