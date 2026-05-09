import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';

function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [continueToWeb, setContinueToWeb] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())) {
      setIsMobile(true);
    }
    
    if (!localStorage.getItem('theme')) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
  },[]);

  if (isMobile && !continueToWeb) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-6" dir="rtl">
        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(37,99,235,0.5)]">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
        </div>
        
        <h1 className="text-3xl font-bold text-center mb-4">التخزين السحابي الآمن</h1>
        <p className="text-slate-400 text-center mb-10 text-lg leading-relaxed">
          اكتشفنا أنك تستخدم هاتفاً محمولاً للحصول على تجربة إستخدام أفضل ننصحك بتحميل تطبيقنا المخصص للهواتف.
        </p>

   
        <a 
          href="https://github.com/MuradGB/secure-cloud-web/releases/download/v1.0/ZeroCloud.apk" 
          className="w-full max-w-sm bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 mb-4 transition-transform hover:-translate-y-1"
          
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          تحميل التطبيق (APK)
        </a>

        <button 
          onClick={() => setContinueToWeb(true)} 
          className="w-full max-w-sm bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-4 rounded-xl transition-colors"
        >
          الاستمرار إلى موقع الويب
        </button>
      </div>
    );
  }

  return (
    <Router>
      <div className="font-sans min-h-screen text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 transition-colors duration-300" dir="rtl">
        <Routes>
          <Route path="/" element={<Navigate to="/auth" />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
