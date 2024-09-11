
import { useState, useEffect } from 'react'
import './App.css';
import 'bootstrap/dist/css/bootstrap.css'


//import { Akord } from "@akord/carmella-sdk";

import Uppy from '@uppy/core';
import Tus, { TusOptions } from '@uppy/tus';
import { Dashboard } from '@uppy/react';
import Webcam from '@uppy/webcam';

import '@uppy/core/dist/style.min.css';
import '@uppy/dashboard/dist/style.min.css';
import '@uppy/webcam/dist/style.min.css';

const akord = null;
window.Buffer = window.Buffer || require("buffer").Buffer;

const API_KEY = "07cfddad-71b3-44c1-94ef-bc234036650c"

function App() {

  //const [akord] = useState<Akord>(new Akord({ debug: true, logToFile: true, env: process.env.ENV as any, apiKey: API_KEY }));
  const [vaultId] = useState<string>("a5d42a41-d4de-48b7-a85d-50880a8a9102");
  const [uppy] = useState(() => 
    new Uppy()
      .use(Webcam) // common uploader config: all plugins go here; uploader is configured per vault (encryption)
  );
  
  // useEffect(() => {
  //   const configureUploaderForCurrentVault = async () => {
  //     const uploader = await akord.file.uploader(vaultId);
  //     uppy
  //       .use(Tus, uploader.options as TusOptions<any, any>)
  //   }
  //   if (akord && vaultId) {
  //     configureUploaderForCurrentVault();
  //   }
  // }, [akord, vaultId, uppy]);

  return (
    <><div className="App">
      <header>
        <title>Carmella SDK &lt;&gt; Sui wallet starter</title><meta name="viewport" content="width=device-width, initial-scale=1" /><link rel="icon" href="/favicon.ico" />
      </header>
      <main className="vh-100 d-flex justify-content-center align-items-center">
        <Dashboard uppy={uppy} />
      </main>
    </div>
    </>
  )
}

export default App;