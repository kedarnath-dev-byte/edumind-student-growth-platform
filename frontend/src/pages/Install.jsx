import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
export default function Install() {
  const [prompt,setPrompt]=useState(window.edumindInstallPrompt || null)
  const [installed,setInstalled]=useState(window.matchMedia('(display-mode: standalone)').matches)
  useEffect(()=>{
    const ready=e=>{e.preventDefault();window.edumindInstallPrompt=e;setPrompt(e)}
    const done=()=>{setInstalled(true);setPrompt(null);window.edumindInstallPrompt=null}
    window.addEventListener('beforeinstallprompt',ready);window.addEventListener('appinstalled',done)
    return()=>{window.removeEventListener('beforeinstallprompt',ready);window.removeEventListener('appinstalled',done)}
  },[])
  const install=async()=>{await prompt.prompt();await prompt.userChoice;setPrompt(null);window.edumindInstallPrompt=null}
  return <div className="growth-page"><h1>EduMind on your phone</h1><p>Keep your learning a tap away.</p><section className="panel space-y-4">{installed?<p className="notice">EduMind is running as an installed app.</p>:prompt?<button className="primary" onClick={install}>Install EduMind</button>:<><h2>Install from Android Chrome</h2><ol className="list-decimal pl-5 space-y-3"><li>Open this page in Chrome.</li><li>Open Chrome’s three-dot menu.</li><li>Choose “Install app” or “Add to Home screen”.</li><li>Open EduMind from your home screen and sign in.</li></ol></>}<p>This installs the web app. Internet is required to sign in, load learning records and submit work.</p><p>Using a parent’s phone? Leave “Keep me signed in” unchecked and sign out when finished.</p><Link to="/login">Go to sign in</Link></section></div>
}
