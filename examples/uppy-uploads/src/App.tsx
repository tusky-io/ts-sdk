import { useState, useEffect } from 'react'
import './App.css';
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import { Akord } from "@akord/carmella-sdk";
import Uppy from '@uppy/core';
import { Dashboard, DashboardModal, DragDrop } from '@uppy/react';
import Tus from '@uppy/tus';
import Webcam from '@uppy/webcam';
import Audio from '@uppy/audio';
import ScreenCapture from '@uppy/screen-capture';
import Compressor from '@uppy/compressor';
import Informer from '@uppy/informer';

import '@uppy/core/dist/style.min.css';
import '@uppy/dashboard/dist/style.min.css';
import '@uppy/webcam/dist/style.min.css';
import '@uppy/status-bar/dist/style.css';
import '@uppy/drag-drop/dist/style.css';

const API_KEY = "07cfddad-71b3-44c1-94ef-bc234036650c"

function Page1({ uppy }: { uppy: Uppy }) {
  return (
    <div className="d-flex justify-content-center align-items-center h-100">

      <Dashboard 
        uppy={uppy}

        //those attributes are optional of course, they are added here just to show quickly what you can do easily
        proudlyDisplayPoweredByUppy={false} 
        showSelectedFiles={true} //put false if you don't want to show selected files in the uploader
        showRemoveButtonAfterComplete={true}
        showProgressDetails={true}
        hideUploadButton={false}
        hideCancelButton={false}
        hideRetryButton={false}
        hidePauseResumeButton={false}
        showLinkToFileUploadResult={false}
        note={null}
        metaFields={[]}
        disableStatusBar={false}
        disableInformer={false}
        disableThumbnailGenerator={true}
        theme="light"
        fileManagerSelectionType="files"
        disableLocalFiles={false}
        
      />
    </div>
  )
}

function Page2({ uppy }: { uppy: Uppy }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="d-flex justify-content-center align-items-center h-100">
      <button onClick={() => setIsModalOpen(true)}>Upload</button>
      <DashboardModal
        uppy={uppy}
        open={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        proudlyDisplayPoweredByUppy={false}
        showSelectedFiles={false}
        closeModalOnClickOutside={true}
      />
    </div>
  )
}

function Page3({ uppy }: { uppy: Uppy }) {
  return (
    <div className="d-flex justify-content-center align-items-center h-100">
      <DragDrop
        uppy={uppy}
        locale={{
          strings: {
            dropHereOr: 'Drop files to Akord or %{browse}',
            browse: 'browse',
          },
          pluralize: (count: number) => count,
        }}
      />
    </div>
  )
}

function UploadeManager({ uppy }: { uppy: Uppy }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'uploading' | 'complete' | 'incomplete'>('all');
  const [allUploads, setAllUploads] = useState<any[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<any[]>([]);
  const [completeUploads, setCompleteUploads] = useState<any[]>([]);
  const [incompleteUploads, setIncompleteUploads] = useState<any[]>([]);
  const [totalProgress, setTotalProgress] = useState(0);
  const [pausedFiles, setPausedFiles] = useState<any[]>([]);
  const [cancelledFiles, setCancelledFiles] = useState<any[]>([]);

  useEffect(() => {
    const onUploadProgress = (file: any, progress: any) => {
      const percentage = ((progress.bytesUploaded / progress.bytesTotal) * 100).toFixed(2)
      console.log(percentage)
      setAllUploads(prev => {
        const updatedUploads = prev.filter(f => f.id !== file.id);
        return [...updatedUploads, { ...file, progress: { ...progress, percentage } }];
      });
      setUploadingFiles(prev => {
        const updatedUploads = prev.filter(f => f.id !== file.id);
        return [...updatedUploads, { ...file, progress: { ...progress, percentage } }];
      });
    };

    const onUploadSuccess = (file: any, response: any) => {
      setCompleteUploads(prev => {
        if (!prev.some(f => f.id === file.id)) {
          return [...prev, file];
        }
        return prev;
      });
      setUploadingFiles(prev => prev.filter(f => f.id !== file.id));
      setPausedFiles(prev => prev.filter(f => f.id !== file.id));
    };

    const onUploadError = (file: any, error: any, response: any) => {
      setIncompleteUploads(prev => {
        if (!prev.some(f => f.id === file.id)) {
          return [...prev, { file, error }];
        }
        return prev;
      });
      setUploadingFiles(prev => prev.filter(f => f.id !== file.id));
      setPausedFiles(prev => prev.filter(f => f.id !== file.id));
    };

    const onTotalProgress = (progress: number) => {
      setTotalProgress(progress);
    };

    const onFilePaused = (file: any) => {
      setPausedFiles(prev => {
        if (!prev.some(f => f.id === file.id)) {
          return [...prev, file];
        }
        return prev;
      });
    };

    const onStateChanged = (prevState: any, nextState: any) => {
      console.log("state chagned", prevState, nextState)
      const resumedFiles = Object.values(nextState.files).filter((file: any) => 
        prevState.files[file.id]?.isPaused && !file.isPaused
      );
      console.log("resumed files", resumedFiles)
      console.log("paused files", pausedFiles)
      resumedFiles.forEach((file: any) => {
        setPausedFiles(prev => prev.filter(f => f.id !== file.id));
      });
    };

    const onCancelAll = () => {
      setCancelledFiles(prev => [...prev, ...uploadingFiles, ...pausedFiles]);
      setUploadingFiles([]);
      setPausedFiles([]);
    };

    uppy.on('upload-progress', onUploadProgress);
    uppy.on('upload-success', onUploadSuccess);
    uppy.on('upload-error', onUploadError);
    uppy.on('progress', onTotalProgress);
    uppy.on('upload-pause', onFilePaused);
    uppy.on('state-update', onStateChanged);
    uppy.on('cancel-all', onCancelAll);

    // Cleanup function
    return () => {
      uppy.off('upload-progress', onUploadProgress);
      uppy.off('upload-success', onUploadSuccess);
      uppy.off('upload-error', onUploadError);
      uppy.off('progress', onTotalProgress);
      uppy.off('upload-pause', onFilePaused);
      uppy.off('state-update', onStateChanged);
      uppy.off('cancel-all', onCancelAll);
    };
  }, [uppy]);

  const retryUpload = (fileId: string) => {
    uppy.retryUpload(fileId);
    setIncompleteUploads(prev => prev.filter(item => item.file.id !== fileId));
    setCancelledFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const cancelAllUploads = () => {
    //uppy.cancelAll();
    uppy.pauseAll(); //using pause instead of cancel to have possibility to resume later
  };

  const pauseAllUploads = () => {
    uppy.pauseAll();
  };

  const togglePause = (fileId: string) => {
    uppy.pauseResume(fileId);
    // const file = uppy.getFile(fileId);
    // if (file.isPaused) {
    //   setPausedFiles(prev => prev.filter(f => f.id !== fileId));
    // } else {
    //   setPausedFiles(prev => [...prev, file]);
    // }
  };

  const cancelUpload = (fileId: string) => {
    const file = uppy.getFile(fileId);
    uppy.pauseResume(fileId); // Pause the upload instead of removing it
    setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
    setPausedFiles(prev => [...prev, file]);
    setCancelledFiles(prev => [...prev, file]);
    setIncompleteUploads(prev => [...prev, { file, error: { message: 'Cancelled' } }]);
    setAllUploads(prev => prev.map(f => f.id === fileId ? { ...f, status: 'cancelled' } : f));
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className={`uploads-window ${isOpen ? 'open' : ''}`}>
      <div className="uploads-header" onClick={() => setIsOpen(!isOpen)}>
        Uploads ({completeUploads.length}/{allUploads.length}) - {totalProgress.toFixed(0)}% | Paused: {pausedFiles.length} | Cancelled: {cancelledFiles.length}
      </div>
      {isOpen && (
        <div className="uploads-content">
          <div className="d-flex justify-content-between align-items-center">
            <nav className="nav nav-tabs flex-grow-1">
              <button className={`nav-link ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All</button>
              <button className={`nav-link ${activeTab === 'uploading' ? 'active' : ''}`} onClick={() => setActiveTab('uploading')}>Uploading</button>
              <button className={`nav-link ${activeTab === 'complete' ? 'active' : ''}`} onClick={() => setActiveTab('complete')}>Complete</button>
              <button className={`nav-link ${activeTab === 'incomplete' ? 'active' : ''}`} onClick={() => setActiveTab('incomplete')}>Incomplete</button>
            </nav>
            <div className="upload-actions">
              <button className="btn btn-link" onClick={pauseAllUploads} title="Pause All">
                <i className="bi bi-pause-circle"></i>
              </button>
              <button className="btn btn-link" onClick={cancelAllUploads} title="Cancel All">
                <i className="bi bi-x-circle"></i>
              </button>
            </div>
          </div>
          <div className="uploads-tab-content">
            {activeTab === 'all' && (
              <ul className="list-group">
                {allUploads.map((file, index) => (
                  <li key={file.id} className="list-group-item">
                    {file.status === 'cancelled' ? (
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span>{file.name} - Cancelled</span>
                        <button className="btn btn-sm btn-link text-secondary" onClick={() => retryUpload(file.id)} title="Retry">
                          <i className="bi bi-arrow-clockwise"></i>
                        </button>
                      </div>
                    ) : file.progress.percentage < 100 ? (
                      <>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div className="d-flex align-items-center">
                            <span>{file.name}</span>
                          </div>
                          <div className="d-flex align-items-center justify-content-end">
                            <span>{formatBytes(file.progress.bytesUploaded)} / {formatBytes(file.progress.bytesTotal)}</span>
                            <div className="d-flex align-items-center justify-content-end">
                              <button className="btn btn-sm btn-link me-1 pe-0" onClick={() => togglePause(file.id)}>
                                <i className={`bi ${pausedFiles.some(f => f.id === file.id) ? 'bi-play-circle' : 'bi-pause-circle'}`}></i>
                              </button>
                              <button className="btn btn-sm btn-link pe-0" onClick={() => cancelUpload(file.id)}>
                                <i className="bi bi-x-circle"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="progress" style={{ height: '5px' }}>
                          <div 
                            className="progress-bar" 
                            role="progressbar" 
                            style={{ width: `${file.progress.percentage}%` }} 
                            aria-valuenow={parseFloat(file.progress.percentage)} 
                            aria-valuemin={0} 
                            aria-valuemax={100}
                          ></div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span>{file.name}</span>
                          <div className="d-flex align-items-center">
                            <span className="me-3">{formatBytes(file.size)}</span>
                            <i className="bi bi-check-circle-fill text-success"></i>
                          </div>
                        </div>
                        <div className="progress" style={{ height: '10px' }}>
                          <div 
                            className="progress-bar bg-success" 
                            role="progressbar" 
                            style={{ width: '100%' }} 
                            aria-valuenow={100} 
                            aria-valuemin={0} 
                            aria-valuemax={100}
                          ></div>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {activeTab === 'uploading' && (
              <ul className="list-group">
                {uploadingFiles.map((file, index) => (
                  <li key={file.id} className="list-group-item">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="d-flex align-items-center">
                        <span>{file.name}</span>
                      </div>
                      <div className="d-flex align-items-center justify-content-end">
                        <span>{formatBytes(file.progress.bytesUploaded)} / {formatBytes(file.progress.bytesTotal)}</span>
                        <div className="d-flex align-items-center justify-content-end">
                          <button className="btn btn-sm btn-link me-1 pe-0" onClick={() => togglePause(file.id)}>
                            <i className={`bi ${pausedFiles.some(f => f.id === file.id) ? 'bi-play-circle' : 'bi-pause-circle'}`}></i>
                          </button>
                          <button className="btn btn-sm btn-link pe-0" onClick={() => cancelUpload(file.id)}>
                            <i className="bi bi-x-circle"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="progress" style={{ height: '5px' }}>
                      <div 
                        className="progress-bar" 
                        role="progressbar" 
                        style={{ width: `${file.progress.percentage}%` }} 
                        aria-valuenow={parseFloat(file.progress.percentage)} 
                        aria-valuemin={0} 
                        aria-valuemax={100}
                      ></div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {activeTab === 'complete' && (
              <ul className="list-group">
                {completeUploads.map((file, index) => (
                  <li key={file.id} className="list-group-item">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span>{file.name}</span>
                      <div className="d-flex align-items-center">
                        <span className="me-3">{formatBytes(file.size)}</span>
                        <i className="bi bi-check-circle-fill text-success"></i>
                      </div>
                    </div>
                    <div className="progress" style={{ height: '10px' }}>
                      <div 
                        className="progress-bar bg-success" 
                        role="progressbar" 
                        style={{ width: '100%' }} 
                        aria-valuenow={100} 
                        aria-valuemin={0} 
                        aria-valuemax={100}
                      ></div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {activeTab === 'incomplete' && (
              <ul className="list-group">
                {incompleteUploads.map((item, index) => (
                  <li key={item.file.id} className="list-group-item d-flex justify-content-between align-items-center">
                    <span>{item.file.name} - {item.error.message === 'Cancelled' ? 'Cancelled' : 'Failed'}</span>
                    <button className="btn btn-sm btn-link text-secondary" onClick={() => retryUpload(item.file.id)} title="Retry">
                        <i className="bi bi-arrow-clockwise"></i>
                      </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function App() {
  const [akord] = useState<Akord>(new Akord({ debug: true, logToFile: true, env: 'testnet' as any, apiKey: API_KEY }));
  const [vaultId] = useState<string>("a5d42a41-d4de-48b7-a85d-50880a8a9102");
  const [uppy] = useState<Uppy>(
    new Uppy({
        autoProceed: false, //put this to true if you want to upload files automatically without mid-step
      }) // keep this in app context so it doesn't get recreated on every page
      .use(Webcam)
      .use(Audio)
      .use(ScreenCapture)
      .use(Compressor)
      .use(Informer)
      .use(Tus, { endpoint: '/' }) //put anything as endpoint, it will be overridden with proper API url over uploader.options
      
  );
  const [activeTab, setActiveTab] = useState<'page1' | 'page2' | 'page3'>('page1');
  
  useEffect(() => {
    const configureUploaderForCurrentVault = async () => {
      const uploader = await akord.file.uploader(vaultId);
      uppy  // update this for every vault
        .getPlugin('Tus')!
        .setOptions(uploader.options)
      uppy.setMeta({ vaultId: vaultId }) 
    }
    
    if (akord && vaultId && uppy) {
      configureUploaderForCurrentVault();
    }
  }, [akord, vaultId, uppy]);

  return (
    <div className="App">
      <header>
        <title>Carmella SDK &lt;&gt; Uppy uploads starter</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </header>
      <main className="vh-100 d-flex flex-column">
        <nav className="nav nav-tabs">
          <button className={`nav-link ${activeTab === 'page1' ? 'active' : ''}`} onClick={() => setActiveTab('page1')}>Page 1</button>
          <button className={`nav-link ${activeTab === 'page2' ? 'active' : ''}`} onClick={() => setActiveTab('page2')}>Page 2</button>
          <button className={`nav-link ${activeTab === 'page3' ? 'active' : ''}`} onClick={() => setActiveTab('page3')}>Page 3</button>
        </nav>
        <div className="flex-grow-1 position-relative">
          {activeTab === 'page1' && <Page1 uppy={uppy} />}
          {activeTab === 'page2' && <Page2 uppy={uppy} />}
          {activeTab === 'page3' && <Page3 uppy={uppy} />}
        </div>
        <UploadeManager uppy={uppy} />
        <div id="informer"></div>
      </main>
      <style>{`
        .uploads-window {
          z-index: 10000;
          position: fixed;
          bottom: 0;
          right: 20px;
          width: 50%;
          height: 5%;
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
          border-top-left-radius: 0.25rem;
          border-top-right-radius: 0.25rem;
          box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
          transition: height 0.3s ease-in-out;
        }
        .uploads-window.open {
          height: 40%;
        }
        .uploads-header {
          padding: 10px;
          background-color: #e9ecef;
          border-bottom: 1px solid #dee2e6;
          cursor: pointer;
          font-weight: bold;
        }
        .uploads-content {
          height: calc(100% - 41px);
          overflow-y: auto;
        }
        .uploads-tab-content {
          height: calc(100% - 40px);
          overflow-y: auto;
          padding: 10px;
        }
        .nav-tabs {
          background-color: #f1f3f5;
        }
        .nav-link {
          padding: 5px 10px;
          font-size: 0.9rem;
        }
        .upload-actions {
          display: flex;
          align-items: center;
        }
        .upload-actions button {
          padding: 0.25rem 0.5rem;
          font-size: 1.25rem;
          line-height: 1;
          color: #6c757d;
        }
        .upload-actions button:hover {
          color: #343a40;
        }
      `}</style>
    </div>
  )
}

export default App;
