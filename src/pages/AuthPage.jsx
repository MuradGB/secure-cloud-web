import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { generateKeysAndEncryptPrivate } from '../crypto/cryptoService';

function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const navigate = useNavigate();

    // تفعيل الوضع المظلم عند تحميل الصفحة إذا كان محفوظاً مسبقاً
    useEffect(() => {
        if (localStorage.getItem('theme') === 'dark') {
        setDarkMode(true);
        document.documentElement.classList.add('dark');
        }
    },[]);

    // دالة تبديل الوضع المظلم والمضيء
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('جاري المعالجة...');

        try {
        if (isLogin) {
            // --- تسجيل الدخول ---
            const response = await axios.post('https://secure-cloud-api-3x07.onrender.com/api/auth/login', {
            email: formData.email,
            password: formData.password
            });
            
            sessionStorage.setItem('token', response.data.token);
            sessionStorage.setItem('user', JSON.stringify(response.data.user));

            setMessage('✅ تم تسجيل الدخول بنجاح! جاري التوجيه...');
            setTimeout(() => navigate('/dashboard'), 1000);
            
        } else {
            // --- إنشاء الحساب وتوليد مفاتيح RSA ---
            setMessage('⏳ جاري توليد مفاتيح التشفير (RSA-2048)... يرجى الانتظار');
            const keys = await generateKeysAndEncryptPrivate(formData.password);

            await axios.post('https://secure-cloud-api-3x07.onrender.com/api/auth/register', {
            username: formData.username,
            email: formData.email,
            password: formData.password,
            publicKey: keys.publicKey,
            encryptedPrivateKey: keys.encryptedPrivateKey
            });

            setMessage('🎉 تم إنشاء الحساب ومفاتيح التشفير بنجاح! سجل دخولك الآن.');
            setIsLogin(true); // تحويله لصفحة الدخول
        }
        } catch (error) {
        setMessage('❌ خطأ: ' + (error.response?.data?.message || 'حدث خطأ في الاتصال بالخادم'));
        } finally {
        setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300" dir="rtl">
        
        {/* زر الوضع المظلم */}
        <button onClick={toggleTheme} className="absolute top-4 left-4 z-50 p-2 rounded-full bg-white dark:bg-slate-800 text-slate-800 dark:text-yellow-400 shadow-lg hover:scale-110 transition">
            {darkMode ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
            )}
        </button>

        {/* النصف الأيمن: الجانب البصري والتعريفي بالنظام */}
        <div className="md:w-1/2 bg-slate-900 dark:bg-slate-950 text-white flex flex-col justify-center items-center p-8 relative overflow-hidden border-l border-transparent dark:border-slate-800 transition-colors duration-300">
            <div className="absolute inset-0 bg-blue-600 opacity-20 blur-3xl rounded-full w-96 h-96 top-1/4 left-1/4"></div>
            
            <div className="relative z-10 text-center">
            <svg className="w-24 h-24 mx-auto text-blue-400 mb-6 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">التخزين السحابي الآمن</h1>
            <p className="text-slate-300 text-lg max-w-md mx-auto leading-relaxed">
                أول منصة تخزين سحابي تعتمد على المعرفة الصفرية. 
                <span className="text-blue-400 font-semibold px-1">تشفير AES-256</span> و <span className="text-blue-400 font-semibold px-1">RSA-2048</span> من طرف إلى طرف.
            </p>
            {/* زر تحميل التطبيق */}
            <div className="mt-10 flex justify-center">
                <a 
                href="https://github.com/MuradGB/secure-cloud-web/releases/download/v1.0/ZeroCloud.apk" 
                download 
                className="flex items-center gap-3 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all duration-300 text-white font-bold backdrop-blur-sm hover:-translate-y-1"
                
                >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                تنزيل تطبيق الهاتف (APK)
                </a>
            </div>
            </div>
        </div>

        {/* النصف الأيسر: نموذج تسجيل الدخول */}
        <div className="md:w-1/2 flex flex-col items-center justify-center p-8 relative">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 transition-colors duration-300">
            
            {/* أزرار التبديل */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg mb-8 transition-colors duration-300">
                <button onClick={() => setIsLogin(true)} className={`flex-1 py-2 font-bold rounded-md transition ${isLogin ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>تسجيل الدخول</button>
                <button onClick={() => setIsLogin(false)} className={`flex-1 py-2 font-bold rounded-md transition ${!isLogin ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>إنشاء حساب</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {!isLogin && (
                <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">اسم المستخدم</label>
                    <div className="relative">
                    <input type="text" required value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="w-full pl-4 pr-10 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700" placeholder="أدخل اسمك" />
                    <svg className="w-5 h-5 text-slate-400 absolute top-3.5 right-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    </div>
                </div>
                )}

                <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">البريد الإلكتروني</label>
                <div className="relative">
                    <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full pl-4 pr-10 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700" placeholder="أدخل بريدك الإلكتروني" />
                    <svg className="w-5 h-5 text-slate-400 absolute top-3.5 right-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path></svg>
                </div>
                </div>

                <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">كلمة المرور</label>
                <div className="relative">
                    <input type="password" required value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full pl-4 pr-10 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700" placeholder="••••••••" />
                    <svg className="w-5 h-5 text-slate-400 absolute top-3.5 right-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                </div>
                </div>

                <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-blue-500/30 mt-2 flex justify-center items-center gap-2 disabled:opacity-70">
                {isLoading ? 'جاري المعالجة...' : (isLogin ? 'دخول آمن' : 'إنشاء وتوليد المفاتيح')}
                {!isLoading && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>}
                </button>
            </form>
            
            {/* رسائل النظام */}
            {message && (
                <div className={`mt-4 p-3 text-sm rounded-lg text-center font-bold ${message.includes('خطأ') ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                {message}
                </div>
            )}

            <div className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                يتم تشفير وتوليد مفاتيحك محلياً داخل المتصفح (Client-Side)
            </div>
            </div>
        </div>
        </div>
    );
}

export default AuthPage;
