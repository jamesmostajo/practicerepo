import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './style.css';
const hostTheme=document.createElement('link');hostTheme.rel='stylesheet';hostTheme.href=new URL('host-theme.css',new URL('.',location.href)).href;document.head.append(hostTheme);
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
