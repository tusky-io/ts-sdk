
import { useState } from 'react'
import './App.css';
import 'bootstrap/dist/css/bootstrap.css'
import { useCurrentAccount, useSignPersonalMessage, useCurrentWallet } from "@mysten/dapp-kit";
import { ConnectButton } from "@mysten/dapp-kit";
import { Akord, AkordWallet, Encrypter } from "@akord/carmella-sdk";
window.Buffer = window.Buffer || require("buffer").Buffer;

function App() {

  const [akord, setAkord] = useState<Akord | null>()

  const { mutate: signPersonalMessage } = useSignPersonalMessage();

  const account = useCurrentAccount();
  const wallet = useCurrentWallet();

  const signInWithWalletForm = () => {
    return (
      <button type="submit" onClick={() => handleSignInWithWallet()}>
        Sign in with wallet
      </button>
    )
  }

  const signInWithGoogleForm = () => {
    return (
      <button type="submit" onClick={() => handleSignInWithOAuth("Google")}>
        Sign in with Google
      </button>
    )
  }

  const signOut = () => {
    return (
      <button type="submit" onClick={() => handleSignOut()}>
        Sign out
      </button>
    )
  }

  const handleSignInWithWallet = async () => {
    const akord = Akord
      .withWallet({ walletSignFnClient: signPersonalMessage })
      .withLogger({ debug: true, logToFile: true })
      .env(process.env.ENV as any);

    await akord.signIn();
    console.log("ADDRESS: " + akord.address);

    await handleEncryptionContext(akord);

    setAkord(akord);
  };

  const handleSignInWithOAuth = async (authProvider: string) => {
    const akord = Akord
      .withOAuth({ authProvider: authProvider as any, redirectUri: "http://localhost:3000" })
      .withLogger({ debug: true, logToFile: true })
      .env(process.env.ENV as any);

    await akord.signIn();
    console.log("ADDRESS: " + akord.address);

    await handleEncryptionContext(akord);

    setAkord(akord);
  };


  const handleSignOut = async () => {
    if (akord) {
      akord.signOut();
      console.log("ADDRESS: " + akord.address);
    }
    setAkord(null)
  };

  const handleEncryptionContext = async (akord: Akord) => {
    const user = await akord.me.get();
    // prompt the user for a password
    const password = window.prompt("Please enter your password:");
    if (!password) {
      throw new Error("Password input canceled.");
    }
    if (!user.encPrivateKey) {
      const userWallet = await AkordWallet.create(password);
      const userKeyPair = userWallet.encryptionKeyPair;
      await akord.me.update({ encPrivateKey: userWallet.encBackupPhrase as any });
      akord.withEncrypter(new Encrypter({ keypair: userKeyPair }));
    } else {
      const userWallet = await AkordWallet.importFromEncBackupPhrase(password, user.encPrivateKey as string);
      akord.withEncrypter(new Encrypter({ keypair: userWallet.encryptionKeyPair }));
    }
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
        {akord ? uploadForm() : signInWithWalletForm()}
        {akord ? signOut() : signInWithGoogleForm()}
      </main>
    </div>
    </>
  )
}

export default App;