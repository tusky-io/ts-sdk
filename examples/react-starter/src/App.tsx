
import { useState } from 'react'
import './App.css';
import 'bootstrap/dist/css/bootstrap.css'
import { useCurrentAccount, useSignPersonalMessage, useCurrentWallet } from "@mysten/dapp-kit";
import { ConnectButton } from "@mysten/dapp-kit";
import { Tusky } from "@tusky/ts-sdk";

function App() {

  const [tusky, setTusky] = useState<Tusky | null>()

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
    const tusky = Tusky
      .withWallet({ walletSignFnClient: signPersonalMessage, walletAccount: account })
      .withLogger({ logLevel: "debug", logToFile: true })
      .withApi({ env: "dev" });

    await tusky.signIn();
    console.log("ADDRESS: " + tusky.address);

    // setting encryption context from password
    await handleEncryptionContext(tusky);

    // setting encryption context from keystore
    await tusky.withEncrypter({ keystore: true });

    setTusky(tusky);
  };

  const handleSignInWithOAuth = async (authProvider: string) => {
    const tusky = Tusky
      .withOAuth({ authProvider: authProvider as any, redirectUri: "http://localhost:3000" })
      .withLogger({ logLevel: "debug", logToFile: true })
      .withApi({ env: "dev" });

    await tusky.signIn();
    console.log("ADDRESS: " + tusky.address);

    await handleEncryptionContext(tusky);

    setTusky(tusky);
  };


  const handleSignOut = async () => {
    if (tusky) {
      tusky.signOut();
      console.log("ADDRESS: " + tusky.address);
    }
    setTusky(null)
  };

  const handleEncryptionContext = async (tusky: Tusky) => {
    // prompt the user for a password
    const password = window.prompt("Please enter your password:");
    if (!password) {
      throw new Error("Password input canceled.");
    }
    // set encryption context from password & use keystore to persist encryption session
    await tusky.withEncrypter({ password: password, keystore: true });
  };

  const handleUpload = async (files: FileList | null) => {
    if (!tusky) {
      throw new Error('Tusky SDK not initialized')
    }
    if (!files || !files.length) {
      throw new Error('Failed uploading the file')
    }
    const file = files[0]
    const vaultName = "from React starter"
    try {
      const vaults = await tusky.vault.listAll();
      const starterVault = vaults.find(vault => vault.name === vaultName);
      let vaultId = starterVault?.id as string;
      if (!starterVault) {
        alert("Creating starter vault: " + vaultName)
        const { id } = await tusky.vault.create(vaultName, { encrypted: true });
        vaultId = id;
      }
      alert("Uploading file to vault: " + vaultId);
      console.log(file);
      const fileId = await tusky.file.upload(vaultId, file);
      alert("Uploaded file: " + fileId)
      alert("Downloading file: " + fileId)
      console.log("Downloading file: " + fileId)
      await tusky.file.download(fileId);
      setTusky(null)
    } catch (error) {
      console.error(error);
      alert();
    } finally {
      setTusky(null)
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
        <title>Tusky SDK &lt;&gt; React starter</title><meta name="viewport" content="width=device-width, initial-scale=1" /><link rel="icon" href="/favicon.ico" />
      </header>
      <main className="vh-100 d-flex justify-content-center align-items-center">
        <ConnectButton id="connect_button" />
        {tusky ? uploadForm() : signInWithWalletForm()}
        {tusky ? signOut() : signInWithGoogleForm()}
      </main>
    </div>
    </>
  )
}

export default App;