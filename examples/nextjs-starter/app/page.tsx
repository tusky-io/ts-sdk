"use client";

import { useRef, useState } from "react";
import { useEnokiFlow, useZkLogin } from "@mysten/enoki/react";
import { ExternalLink, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { track } from "@vercel/analytics";
import { Akord, File, Folder } from "@akord/carmella-sdk";

// SDK config
export const NETWORK = "devnet" // Sui network config
export const AKORD_CONFIG = "testnet"
export const AUTH_PROVIDER = "google"

export default function Page() {
  const enokiFlow = useEnokiFlow(); // The EnokiFlow instance
  const { address: suiAddress } = useZkLogin(); // The zkLogin instance

  const [loading, setLoading] = useState<boolean>(false);

  const akord = useRef<Akord>(null as any);

  /* Folder create form state */
  const [folderName, setFolderName] = useState<string>("My first folder");

  const getAuthToken = async () => {
    const session = await enokiFlow.getSession();
    console.log("JWT: " + session?.jwt);
    return session?.jwt as string;
  };

  const startLogin = async () => {
    const promise = async () => {
      window.location.href = await enokiFlow.createAuthorizationURL({
        provider: AUTH_PROVIDER,
        clientId: process.env.GOOGLE_CLIENT_ID!,
        redirectUrl: `${window.location.origin}/auth`,
        network: NETWORK,
      });
    };

    toast.promise(promise, {
      loading: "Loggin in...",
    });
  };

  const initAkord = async (): Promise<void> => {
    if (!akord?.current) {
      akord.current = new Akord({ env: AKORD_CONFIG, authTokenProvider: getAuthToken });
    }
  };

  /**
  * Upload file with Carmella SDK
  */
  async function fileUpload(files: FileList | null) {
    const promise = async () => {
      track("File upload");

      if (!files || !files.length) {
        throw new Error('Failed uploading the file')
      }
      const file = files[0]

      setLoading(true);

      await initAkord();

      const vaults = await akord?.current?.vault.listAll();
      let vaultId;
      if (!vaults || !vaults.length) {
        confirm("Creating vault...")
        vaultId = (await akord?.current?.vault.create("Vault", { public: true })).id;
        confirm("Vault created: " + vaultId)
      } else {
        vaultId = vaults[0].id
      }
      confirm("Uploading file in the vault: " + vaultId)
      const fileRes = await akord?.current?.file.upload(vaultId, file);
      console.log(fileRes)
      confirm("Uploaded file: " + fileRes.name);

      return fileRes;
    };

    toast.promise(promise, {
      loading: "Uploading file...",
      success: (file: File) => {
        return (
          <span className="flex flex-row items-center gap-2">
            {`File ${file.name} successfully uploaded! `}
            {/* NOTE: file blobId & refId will come after with subscriptions */}
            {/* <a
              href={`https://suiscan.xyz/${NETWORK}/tx/${file.refId}`}
              target="_blank"
            >
              <ExternalLink width={12} />
            </a> */}
          </span>
        );
      },
      error: (error) => {
        return error.message;
      },
    });
  }

  /**
  * Create folder with Carmella SDK
  */
  async function folderCreate() {
    const promise = async () => {
      track("Create folder");

      setLoading(true);

      await initAkord();

      const vaults = await akord?.current?.vault.listAll();
      let vaultId;
      if (!vaults || !vaults.length) {
        confirm("Creating vault...")
        vaultId = (await akord?.current?.vault.create("Vault", { public: true })).id;
        confirm("Vault created: " + vaultId)
      } else {
        vaultId = vaults[0].id
      }
      confirm("Creating folder in the vault: " + vaultId)
      const folder = await akord?.current?.folder.create(vaultId, folderName)
      confirm("Created folder: " + folder.id)

      alert("Folder created: " + folder.id)
      return folder;
    };

    toast.promise(promise, {
      loading: "Creating folder...",
      success: (folder: Folder) => {
        return (
          <span className="flex flex-row items-center gap-2">
            {`Folder ${folder.name} created successfully! `}
          </span>
        );
      },
      error: (error) => {
        return error.message;
      },
    });
  }

  const appHeader = "Enoki <> Carmella SDK demo";

  if (suiAddress) {
    return (
      <div>
        <h1 className="text-4xl font-bold m-4">{appHeader}</h1>
        <Popover>
          <PopoverTrigger className="absolute top-4 right-4 max-w-sm" asChild>
            <div>
              <Button className="hidden sm:block" variant={"secondary"}>
                {`${suiAddress?.slice(0, 5)}...${suiAddress?.slice(63)}`}
              </Button>
            </div>
          </PopoverTrigger>
          <PopoverContent>
            <Card className="border-none shadow-none">
              {/* <Button variant={'ghost'} size='icon' className="relative top-0 right-0" onClick={getAccountInfo}><RefreshCw width={16} /></Button> */}
              <CardHeader>
                <CardTitle>Account Info</CardTitle>
                <CardDescription>
                  View the account generated by Enoki&apos;s zkLogin flow.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <>
                  <div className="flex flex-row gap-1 items-center">
                    <span>Address: </span>
                    <div className="flex flex-row gap-1">
                      <span>{`${suiAddress?.slice(
                        0,
                        5
                      )}...${suiAddress?.slice(63)}`}</span>
                      <a
                        href={`https://suiscan.xyz/${NETWORK}/account/${suiAddress}`}
                        target="_blank"
                      >
                        <ExternalLink width={12} />
                      </a>
                    </div>
                  </div>
                </>
              </CardContent>
              <CardFooter className="flex flex-row gap-2 items-center justify-between">
                <Button
                  variant={"destructive"}
                  size={"sm"}
                  className="w-full text-center"
                  onClick={async () => {
                    await enokiFlow.logout();
                    window.location.reload();
                  }}
                >
                  Logout
                </Button>
              </CardFooter>
            </Card>
          </PopoverContent>
        </Popover>
        <div className="flex flex-col items-center sm:flex-row gap-4 sm:items-start">

          <Card className="max-w-xs">
            <CardHeader>
              <CardTitle>Folder create</CardTitle>
              <CardDescription>
                Folder create
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col w-full gap-2">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="recipient">Folder name</Label>
                <Input
                  type="text"
                  id="recipient"
                  placeholder="0xdeadbeef"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="w-full flex flex-row items-center justify-center">
              <Button
                className="w-full"
                onClick={folderCreate}
                disabled={loading}
              >
                Create Folder
              </Button>
            </CardFooter>
          </Card>

          <Card className="max-w-xs">
            <CardHeader>
              <CardTitle>File upload</CardTitle>
              <CardDescription>
                File upload
              </CardDescription>
            </CardHeader>
            <CardFooter className="w-full flex flex-row items-center justify-center">
              <form>
                <input
                  type="file"
                  onChange={(e) => fileUpload(e.target.files)}
                />
              </form>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start">
      <a
        href="https://github.com/dantheman8300/enoki-example-app"
        target="_blank"
        className="absolute top-4 right-0 sm:right-4"
        onClick={() => {
          track("github");
        }}
      >
        <Button variant={"link"} size={"icon"}>
          <Github />
        </Button>
      </a>
      <div>
        <h1 className="text-4xl font-bold m-4">{appHeader}</h1>
        <p className="text-md m-4 opacity-50 max-w-md">
          This is a demo app that showcases the{" "}
          <a
            href="https://docs.enoki.mystenlabs.com/"
            target="_blank"
            className="underline cursor-pointer text-blue-700 hover:text-blue-500"
          >
            Enoki
          </a>{" "}
          zkLogin and {" "}
          <a
            href="https://github.com/Akord-com/carmella-sdk"
            target="_blank"
            className="underline cursor-pointer text-blue-700 hover:text-blue-500"
          >
            Carmella SDK
          </a>.
        </p>
      </div>
      <Button onClick={startLogin}>Sign in with Google</Button>
    </div>
  );
}
