import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getFileHash, encryptFileWithAES, encryptAESKeyWithRSA, decryptAESKeyWithRSA, decryptFileWithAES } from '../crypto/cryptoService';

function Dashboard() {
    const [user, setUser] = useState(null);
    const [file, setFile] = useState(null);
    const [filesList, setFilesList] = useState([]);
    const[sharedFilesList, setSharedFilesList] = useState([]); 
    const[status, setStatus] = useState('');
    const[darkMode, setDarkMode] = useState(false);
    
    const[activeTab, setActiveTab] = useState('my_files'); 
    const [viewMode, setViewMode] = useState('grid'); 
    const [searchQuery, setSearchQuery] = useState('');

    const [modal, setModal] = useState({ isOpen: false, type: '', fileId: null, title: '', desc: '' });
    const [modalInputs, setModalInputs] = useState({ password: '', email: '' });
    
    const navigate = useNavigate();

    useEffect(() => {
        if (localStorage.getItem('theme') === 'dark' || document.documentElement.classList.contains('dark')) {
        setDarkMode(true);
        document.documentElement.classList.add('dark');
        }
    },[]);

    const toggleTheme = () => {
        if (darkMode) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        setDarkMode(false);
        } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        setDarkMode(true);
        }
    };

    const fetchAllFiles = async (token) => {
        try {
            const resMyFiles = await axios.get('https://secure-cloud-api-3x07.onrender.com/api/files/list', { headers: { 'Authorization': `Bearer ${token}` } });
            setFilesList(resMyFiles.data); 

            const resSharedFiles = await axios.get('https://secure-cloud-api-3x07.onrender.com/api/files/shared', { headers: { 'Authorization': `Bearer ${token}` } });
            setSharedFilesList(resSharedFiles.data); 
            } catch (err) { 
            console.error('فشل جلب الملفات', err); 
            // 💡 التعديل الأمني هنا: إذا انتهت صلاحية التوكن (بعد 24 ساعة)، اطرد المستخدم فوراً!
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                sessionStorage.clear(); // تنظيف الذاكرة الوهمية
                navigate('/auth'); // تحويله لصفحة تسجيل الدخول
            }
        }
    };

    useEffect(() => {
        const userData = sessionStorage.getItem('user');
        const token = sessionStorage.getItem('token');
        if (!userData || !token) { navigate('/auth'); } 
        else { setUser(JSON.parse(userData)); fetchAllFiles(token); }
    },[navigate]);

    const handleUpload = async () => {
        if (!file) { setStatus('⚠️ يرجى اختيار ملف أولاً'); return; }
        try {
        setStatus('⏳ جاري قراءة الملف وتجهيزه...');
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const fileData = reader.result;
            setStatus('🔒 جاري التشفير المعقد (AES-256 + RSA-2048)...');
            const fileHash = getFileHash(fileData);
            const { encryptedFileBase64, aesKeyBase64, ivBase64 } = encryptFileWithAES(fileData);
            const encryptedAesKey = encryptAESKeyWithRSA(aesKeyBase64, ivBase64, user.publicKey);
            setStatus('☁️ جاري الإرسال للسحابة...');
            const token = sessionStorage.getItem('token');
            const blob = new Blob([encryptedFileBase64], { type: 'text/plain' });
            const formData = new FormData();
            formData.append('myFile', blob, file.name + '.enc');
            formData.append('fileName', file.name);
            formData.append('fileHash', fileHash);
            formData.append('encryptedAesKey', encryptedAesKey);
            await axios.post('https://secure-cloud-api-3x07.onrender.com/api/files/upload', formData, { headers: { 'Authorization': `Bearer ${token}` } });
            setStatus('✅ تم تشفير ورفع الملف بنجاح!');
            setFile(null);
            fetchAllFiles(token);
            setTimeout(() => setStatus(''), 5000);
        };
        } catch (error) { 
            const serverMessage = error.response?.data?.message;
            setStatus(serverMessage ? `🚨 ${serverMessage}` : `❌ حدث خطأ أثناء التشفير أو الرفع`); 
        }
    };

    const openDownloadModal = (fileId) => {
        setModalInputs({ password: '', email: '' });
        setModal({ isOpen: true, type: 'download', fileId, title: 'فك تشفير الملف', desc: 'لضمان أمان بياناتك، يرجى إدخال كلمة مرور حسابك لفك التشفير محلياً.' });
    };

    const openShareModal = (fileId) => {
        setModalInputs({ password: '', email: '' });
        setModal({ isOpen: true, type: 'share', fileId, title: 'مشاركة ملف مشفر', desc: 'أدخل بريد المستلم وكلمة مرورك لتشفير الصلاحية له بشكل آمن.' });
    };

    const closeModal = () => setModal({ isOpen: false, type: '', fileId: null, title: '', desc: '' });

    const submitModal = async (e) => {
        e.preventDefault();
        const { type, fileId } = modal;
        const { password, email } = modalInputs;
        closeModal(); 

        if (type === 'download') {
        try {
            setStatus('☁️ جاري التنزيل من السحابة...');
            const token = sessionStorage.getItem('token');
            const response = await axios.get(`https://secure-cloud-api-3x07.onrender.com/api/files/download/${fileId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const { fileName, fileHash, encryptedAesKey, encryptedContent } = response.data;
            setStatus('🔓 جاري فك التشفير محلياً...');
            const { key: aesKeyBase64, iv: ivBase64 } = decryptAESKeyWithRSA(encryptedAesKey, user.encryptedPrivateKey, password);
            const decryptedFileData = decryptFileWithAES(encryptedContent, aesKeyBase64, ivBase64);
            setStatus('🛡️ جاري التحقق من بصمة الملف...');
            if (getFileHash(decryptedFileData) !== fileHash) { setStatus('🚨 تحذير: تم التلاعب بالملف!'); return; }
            setStatus('✅ تم فك التشفير بنجاح!');
            const a = document.createElement("a");
            a.href = decryptedFileData; a.download = fileName;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setTimeout(() => setStatus(''), 3000);
        } catch (error) { 
            const serverMessage = error.response?.data?.message;
            setStatus(serverMessage ? `🚨 ${serverMessage}` : `❌ كلمة المرور خاطئة أو فشل التنزيل`); 
        }
        } 
        else if (type === 'share') {
        try {
            setStatus('🔍 جاري البحث عن المستخدم...');
            const token = sessionStorage.getItem('token');
            const userRes = await axios.post('https://secure-cloud-api-3x07.onrender.com/api/files/search-user', { email: email }, { headers: { 'Authorization': `Bearer ${token}` } });
            const receiver = userRes.data;
            setStatus('🔄 جاري إعادة تشفير المفتاح للمستلم...');
            const fileRes = await axios.get(`https://secure-cloud-api-3x07.onrender.com/api/files/download/${fileId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const { key: aesKeyBase64, iv: ivBase64 } = decryptAESKeyWithRSA(fileRes.data.encryptedAesKey, user.encryptedPrivateKey, password);
            const newEncryptedAesKey = encryptAESKeyWithRSA(aesKeyBase64, ivBase64, receiver.public_key);
            setStatus('☁️ جاري إرسال الصلاحيات...');
            await axios.post('https://secure-cloud-api-3x07.onrender.com/api/files/share', { fileId, receiverId: receiver.id, encryptedAesKeyForReceiver: newEncryptedAesKey }, { headers: { 'Authorization': `Bearer ${token}` } });
            setStatus(`✅ تمت مشاركة الملف بنجاح مع ${receiver.username}!`);
            fetchAllFiles(token); 
            setTimeout(() => setStatus(''), 5000);
        } catch (error) { setStatus(`❌ فشلت المشاركة: تأكد من الإيميل أو كلمة المرور`); }
        }

    else if (type === 'delete') {
        try {
            setStatus('🗑️ جاري الحذف...');
            const token = sessionStorage.getItem('token');
            await axios.delete(`https://secure-cloud-api-3x07.onrender.com/api/files/delete/${fileId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            setStatus('✅ تم حذف الملف نهائياً بنجاح!');
            fetchAllFiles(token);
            setTimeout(() => setStatus(''), 4000);
        } catch (error) { setStatus('❌ حدث خطأ أثناء الحذف'); }
    }
    };

    if (!user) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-white">جاري التحميل...</div>;

    const currentFiles = activeTab === 'my_files' ? filesList : sharedFilesList;
    const filteredFiles = currentFiles.filter(f => 
        f.file_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (f.other_person && f.other_person.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 relative" dir="rtl">
        
        {modal.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-opacity">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 transform transition-all animate-in zoom-in duration-200">
                <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${modal.type === 'share' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'}`}>
                    {modal.type === 'share' ? '🤝' : '🔓'}
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">{modal.title}</h2>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{modal.desc}</p>
                
                <form onSubmit={submitModal} className="space-y-4">
                    {modal.type === 'share' && (
                        <div>
                        <label className="block text-sm font-semibold mb-1.5">بريد المستلم</label>
                        <input type="email" required autoFocus value={modalInputs.email} onChange={(e) => setModalInputs({...modalInputs, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="example@test.com" />
                        </div>
                    )}
                    {/* إخفاء حقل كلمة المرور إذا كانت العملية "حذف" */}
                    {modal.type !== 'delete' && (
                        <div>
                        <label className="block text-sm font-semibold mb-1.5">كلمة مرور حسابك (للتأكيد)</label>
                        <input type="password" required autoFocus={modal.type === 'download'} value={modalInputs.password} onChange={(e) => setModalInputs({...modalInputs, password: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="••••••••" />
                        </div>
                    )}
                    
                    <div className="flex gap-3 mt-6 pt-2">
                        <button type="button" onClick={closeModal} className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 transition">إلغاء</button>
                        <button type="submit" className={`flex-1 px-4 py-3 rounded-xl font-bold text-white shadow-lg transition hover:-translate-y-0.5 ${modal.type === 'delete' ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30' : modal.type === 'share' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/30' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'}`}>
                        {modal.type === 'delete' ? 'حذف نهائي 🗑️' : 'تأكيد وتنفيذ'}
                        </button>
                    </div>
            </form>
            </div>
            </div>
        )}

        <aside className="w-64 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-l border-slate-200 dark:border-slate-800 flex flex-col hidden md:flex transition-colors duration-300 shadow-sm z-10">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <img 
                src="https://images.emojiterra.com/google/noto-emoji/unicode-17.0/color/svg/1f6e1.svg" 
                alt="Shield Emoji" 
                style={{ width: '100px', height: '100px' }} 
                />
                {/* <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v7z"></path></svg> */}
            </div>
            <div>
                <h1 className="font-bold text-lg">سحابة آمنة</h1>
                <p className="text-xs text-slate-500">Zero-Knowledge</p>
            </div>
            </div>
            
            <nav className="flex-1 p-4 space-y-2">
            <button onClick={() => {setActiveTab('my_files'); setSearchQuery('');}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${activeTab === 'my_files' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
                ملفاتي الخاصة
            </button>
            <button onClick={() => {setActiveTab('shared_files'); setSearchQuery('');}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${activeTab === 'shared_files' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                الملفات المشتركة
            </button>
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <a href="/ZeroCloud.apk" download className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition font-medium mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            تنزيل تطبيق الهاتف
            </a>
            <button onClick={() => { sessionStorage.clear(); navigate('/auth'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                تسجيل الخروج
            </button>
            </div>
        </aside>

        <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-20 sticky top-0">
            <div className="flex-1 max-w-xl relative hidden sm:block">
                <svg className="w-5 h-5 text-slate-400 absolute top-3 right-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <input 
                type="text" 
                placeholder="ابحث في ملفاتي..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-12 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-none outline-none text-sm transition focus:ring-2 focus:ring-blue-500" 
                />
            </div>
            <div className="flex items-center gap-4">
                <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                {darkMode ? <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg> 
                            : <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>}
                </button>
                <div className="flex items-center gap-3 border-r pr-4 border-slate-200 dark:border-slate-700">
                <div className="text-left hidden sm:block">
                    <p className="text-sm font-bold">{user.username}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-400 flex items-center justify-center text-white font-bold text-lg shadow-md">{user.username.charAt(0)}</div>
                </div>
            </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 relative z-0">
            {status && (
                <div className={`mb-6 p-4 rounded-xl font-bold shadow-sm transition-all flex items-center gap-2 ${status.includes('❌') || status.includes('🚨') ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800' : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800'}`}>
                {status}
                </div>
            )}

            {activeTab === 'my_files' && !searchQuery && (
                <div className="mb-10 bg-white dark:bg-slate-900 p-1 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <div className="p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all duration-300 flex flex-col items-center justify-center relative min-h-[200px]">
                    <input type="file" id="file-upload" onChange={(e) => setFile(e.target.files[0])} className="hidden" />
                    {!file ? (
                    <label htmlFor="file-upload" className="flex flex-col items-center justify-center cursor-pointer w-full h-full">
                        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4 text-blue-500 shadow-inner transition-transform hover:scale-110 duration-300">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">اختر ملفاً لرفعه بأمان</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 text-center">يتم تشفيره بـ AES-256 قبل إرساله للسحابة.</p>
                    </label>
                    ) : (
                    <div className="flex flex-col items-center w-full animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4 text-emerald-500 shadow-inner">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 truncate max-w-xs" dir="ltr">{file.name}</h3>
                        <div className="flex gap-3 mt-4">
                        <button onClick={() => setFile(null)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition">إلغاء</button>
                        <button onClick={handleUpload} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/30 flex items-center gap-2 transition hover:-translate-y-0.5">
                            تشفير ورفع 🚀
                        </button>
                        </div>
                    </div>
                    )}
                </div>
                </div>
            )}

            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                {searchQuery ? 'نتائج البحث' : (activeTab === 'my_files' ? 'ملفاتي الخاصة' : 'الملفات المشتركة')} 
                <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs py-1 px-2 rounded-full">{filteredFiles.length}</span>
                </h2>
                <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg shadow-inner">
                {/* 💡 أزرار التبديل بنظام SVG الاحترافي */}
                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                </button>
                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
                </button>
                </div>
            </div>

            {filteredFiles.length === 0 ? (
                <div className="text-center py-20 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                {searchQuery ? `لم يتم العثور على ملف يطابق "${searchQuery}"` : 'لا يوجد ملفات هنا.'}
                </div>
            ) : (
                <>
                {viewMode === 'grid' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
                    {filteredFiles.map((f, index) => (
                        <div key={`${f.id}_${index}`} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 dark:hover:shadow-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col group relative">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20"></div>
                        <div className="h-32 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-blue-500/5 dark:bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:scale-110 transition-all duration-300 relative z-10">
                            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                            </div>
                            
                            {activeTab === 'shared_files' && f.share_type && (
                            <div className={`absolute top-3 left-3 px-2 py-1 text-xs rounded-lg font-bold flex gap-1 z-20 shadow-sm ${f.share_type === 'received' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-300'}`}>
                                {f.share_type === 'received' ? 'مستلم من: ' : 'مُرسل إلى: '} {f.other_person}
                            </div>
                            )}
                            <div className="absolute top-3 right-3 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 p-1.5 rounded-lg z-20 shadow-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                            </div>
                        </div>
                        
                        <div className="p-5 flex-1 flex flex-col relative z-10 bg-white dark:bg-slate-900">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" title={f.file_name}>{f.file_name}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            {new Date(f.created_at).toLocaleDateString('ar-EG')}
                            </p>
                            
                            <div className="mt-auto flex gap-2">
                            <button onClick={() => openDownloadModal(f.id)} className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-300 py-2 rounded-xl text-sm font-bold transition flex items-center justify-center gap-1.5 hover:-translate-y-0.5">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                تنزيل
                            </button>
                            {activeTab === 'my_files' && (
                                <>
                                <button onClick={() => openShareModal(f.id)} className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-300 py-2 rounded-xl text-sm font-bold transition flex items-center justify-center gap-1.5 hover:-translate-y-0.5">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                                مشاركة
                                </button>
                                {/* 💡 زر الحذف الجديد 🗑️ */}
                                <button onClick={() => setModal({ isOpen: true, type: 'delete', fileId: f.id, title: 'حذف الملف', desc: '⚠️ هل أنت متأكد أنك تريد حذف هذا الملف نهائياً؟ لا يمكن التراجع عن هذا الإجراء.' })} className="bg-red-50 text-red-500 hover:bg-red-600 hover:text-white dark:bg-red-900/20 dark:hover:bg-red-600 p-2 rounded-xl transition flex items-center justify-center" title="حذف الملف">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                                </>
                            )}
                            </div>
                        </div>
                        </div>
                    ))}
                    </div>
                )}

                {viewMode === 'list' && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            <th className="p-4 font-bold text-sm text-slate-600 dark:text-slate-300">اسم الملف</th>
                            {activeTab === 'shared_files' && <th className="p-4 font-bold text-sm text-slate-600 dark:text-slate-300">الطرف الآخر</th>}
                            <th className="p-4 font-bold text-sm text-slate-600 dark:text-slate-300">تاريخ الرفع</th>
                            <th className="p-4 font-bold text-sm text-slate-600 dark:text-slate-300 w-56">الإجراءات</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredFiles.map((f, index) => (
                            <tr key={`${f.id}_${index}`} className="hover:bg-blue-50/50 dark:hover:bg-slate-800 transition-colors group">
                            <td className="p-4 font-bold flex items-center gap-3 text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                </div>
                                {f.file_name}
                            </td>
                            {activeTab === 'shared_files' && (
                                <td className="p-4 text-sm font-medium">
                                <span className={`px-3 py-1.5 rounded-lg ${f.share_type === 'received' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                                    {f.share_type === 'received' ? 'مستلم من: ' : 'مُرسل إلى: '} {f.other_person}
                                </span>
                                </td>
                            )}
                            <td className="p-4 text-sm text-slate-500 dark:text-slate-400 font-medium">{new Date(f.created_at).toLocaleDateString('ar-EG')}</td>
                            <td className="p-4 flex gap-2">
                                <button onClick={() => openDownloadModal(f.id)} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-600 hover:text-white px-4 py-1.5 rounded-lg text-sm font-bold transition shadow-sm hover:-translate-y-0.5">تنزيل 🔓</button>
                                {activeTab === 'my_files' && (
                                <>
                                <button onClick={() => openShareModal(f.id)} className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white px-4 py-1.5 rounded-lg text-sm font-bold transition shadow-sm hover:-translate-y-0.5">مشاركة 🤝</button>
                                {/* 💡 زر الحذف الجديد 🗑️ */}
                                <button onClick={() => setModal({ isOpen: true, type: 'delete', fileId: f.id, title: 'حذف الملف', desc: '⚠️ هل أنت متأكد أنك تريد حذف هذا الملف نهائياً؟ لا يمكن التراجع عن هذا الإجراء.' })} className="bg-red-50 text-red-500 hover:bg-red-600 hover:text-white dark:bg-red-900/20 dark:hover:bg-red-600 px-3 py-1.5 rounded-lg transition shadow-sm hover:-translate-y-0.5" title="حذف">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                                </>
                                )}
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
                )}
                </>
            )}
            </div>
        </main>
        </div>
    );
}

export default Dashboard;