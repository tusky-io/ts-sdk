
import { useState } from 'react'
import './App.css';
import 'bootstrap/dist/css/bootstrap.css'
import { useCurrentAccount, useSignPersonalMessage, useCurrentWallet } from "@mysten/dapp-kit";
import { ConnectButton } from "@mysten/dapp-kit";
import { Akord, Encrypter, AkordWallet } from "@akord/carmella-sdk";
import { SignedPersonalMessage } from "@mysten/wallet-standard";
window.Buffer = window.Buffer || require("buffer").Buffer;

function App() {

  const [akord, setAkord] = useState<Akord | null>()

  const { mutate: signPersonalMessage } = useSignPersonalMessage();

  const account = useCurrentAccount();
  const wallet = useCurrentWallet();

  const signInForm = () => {
    return (
      <button type="submit" onClick={() => handleSignIn()}>
        Sign in with wallet
      </button>
    )
  }

  const handleSignIn = () => {
    console.log(wallet)
    console.log(account)
    signPersonalMessage(
      {
        message: new TextEncoder().encode("hello"),
      },
      {
        onSuccess: async (data: SignedPersonalMessage) => {
          console.log("Message signed: " + data.signature);
          const noAuthAkord = new Akord({ debug: true, logToFile: true, env: process.env.ENV as any });
          const jwt = await noAuthAkord.api.generateJWT({ signature: data.signature });
          const authTokenProvider = async () => jwt;
          console.log("JWT: " + jwt)
          const akord = new Akord({ debug: true, logToFile: true, env: process.env.ENV as any, authTokenProvider });
          const user = await akord.me.get();
          let encrypter;
          if (!user.encPrivateKey) {
            const userWallet = await AkordWallet.create("passakordpass");
            const userKeyPair = userWallet.encryptionKeyPair;
            console.log(userKeyPair)

            const akord = new Akord({ debug: true, logToFile: true, env: process.env.ENV as any, authTokenProvider });

            console.log(userWallet.encBackupPhrase)
            await akord.me.update({ encPrivateKey: userWallet.encBackupPhrase as any });
            encrypter = new Encrypter({ keypair: userKeyPair });
          } else {
            const user = await akord.me.get();
            console.log(user)
            const userKeyPair = (await AkordWallet.importFromEncBackupPhrase("passakordpass", user.encPrivateKey as string)).encryptionKeyPair;
            encrypter = new Encrypter({ keypair: userKeyPair });
          }
          const akordPriv = new Akord({ encrypter: encrypter, debug: true, logToFile: true, env: process.env.ENV as any, authTokenProvider });
          setAkord(akordPriv);
        },
        onError: (error: Error) => {
          console.log(error);
        },
      },
    );
  };

  const handleUpload = async (files: FileList | null) => {
    if (!akord) {
      throw new Error('Carmella SDK not initialized')
    }
    if (!files || !files.length) {
      throw new Error('Failed uploading the file')
    }
    const file = files[0]
    const vaultName = "Sui wallet demo"
    alert("Creating vault: " + vaultName)
    try {
      const { id } = await akord.vault.create(vaultName, { public: false });
      alert("Uploading file to vault: " + id)
      console.log(file)
      const { id: fileId } = await akord.file.upload(id, file)
      alert("Uploaded file: " + fileId)
      alert("Downloading file: " + fileId)
      const fileRes = await akord.file.download(fileId);
      console.log(fileRes)
      const a = document.createElement("a");
      a.download = file.name;
      a.href = window.URL.createObjectURL(new Blob([fileRes as ArrayBuffer]));
      a.click();
      setAkord(null)
    } catch (error) {
      console.error(error);
      alert();
    } finally {
      setAkord(null)
    }
  }

  const uploadForm = () => {
    return <div className={'p-3'}>
      <h1 className="display-6 mb-3">Upload</h1>
      <form>
        <input
          type="file"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </form>
    </div>
  }

  return (
    <><div className="App">
      <header>
        <title>Carmella SDK &lt;&gt; Sui wallet starter</title><meta name="viewport" content="width=device-width, initial-scale=1" /><link rel="icon" href="/favicon.ico" />
      </header>
      <main className="vh-100 d-flex justify-content-center align-items-center">
        <ConnectButton id="connect_button" />
        {akord ? uploadForm() : signInForm()}
      </main>
    </div>
    </>
  )
}

export default App;