import forge from 'node-forge';

// دالة توليد مفاتيح RSA وتشفير المفتاح الخاص
export const generateKeysAndEncryptPrivate = (password) => {
    return new Promise((resolve, reject) => {
        // توليد مفاتيح RSA بحجم 2048 بت
        forge.pki.rsa.generateKeyPair({ bits: 2048, workers: 2 }, (err, keypair) => {
            if (err) return reject(err);

            // 1. استخراج المفتاح العام بصيغة نصية (PEM)
            const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);

            // 2. تشفير المفتاح الخاص باستخدام كلمة مرور المستخدم
            // (هذه الدالة تستخدم PBKDF2 و AES-256 تلقائياً حسب معايير التشفير العالمية)
            const encryptedPrivateKeyPem = forge.pki.encryptRsaPrivateKey(keypair.privateKey, password);

            // إرجاع المفتاحين
            resolve({
                publicKey: publicKeyPem,
                encryptedPrivateKey: encryptedPrivateKeyPem
            });
        });
    });
};

// 1. دالة استخراج البصمة الرقمية (SHA-256) للتأكد من النزاهة
export const getFileHash = (fileData) => {
    const md = forge.md.sha256.create();
    md.update(fileData);
    return md.digest().toHex();
};

// 2. دالة تشفير الملف باستخدام AES-256
export const encryptFileWithAES = (fileData) => {
    // توليد مفتاح عشوائي 256-bit (32 bytes)
    const aesKey = forge.random.getBytesSync(32);
    // توليد متغير عشوائي IV (16 bytes) مطلوب لتشفير AES
    const iv = forge.random.getBytesSync(16);

    const cipher = forge.cipher.createCipher('AES-CBC', aesKey);
    cipher.start({ iv: iv });
    cipher.update(forge.util.createBuffer(fileData, 'utf8'));
    cipher.finish();

    // تشفير الملف
    const encryptedFile = cipher.output.getBytes();

    return {
        // تحويل البيانات المشفرة إلى نص Base64 لتسهيل نقلها
        encryptedFileBase64: forge.util.encode64(encryptedFile),
        aesKeyBase64: forge.util.encode64(aesKey),
        ivBase64: forge.util.encode64(iv)
    };
};

// 3. دالة تشفير مفتاح الـ AES باستخدام المفتاح العام RSA
export const encryptAESKeyWithRSA = (aesKeyBase64, ivBase64, publicKeyPem) => {
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    
    // ندمج مفتاح AES والـ IV معاً في نص واحد لنشفرهما
    const dataToEncrypt = JSON.stringify({ key: aesKeyBase64, iv: ivBase64 });
    
    // التشفير باستخدام RSA-OAEP (أقوى معايير الأمان)
    const encryptedData = publicKey.encrypt(dataToEncrypt, 'RSA-OAEP');
    
    return forge.util.encode64(encryptedData);
};

// 4. دالة فك تشفير المفتاح الخاص بكلمة المرور، ثم استخدامه لفك تشفير مفتاح AES
export const decryptAESKeyWithRSA = (encryptedAesKeyBase64, encryptedPrivateKeyPem, password) => {
    try {
        // فك تشفير المفتاح الخاص للمستخدم باستخدام كلمة مروره
        const privateKey = forge.pki.decryptRsaPrivateKey(encryptedPrivateKeyPem, password);
        if (!privateKey) throw new Error('كلمة المرور خاطئة!');

        // فك تشفير مفتاح AES
        const encryptedData = forge.util.decode64(encryptedAesKeyBase64);
        const decryptedDataStr = privateKey.decrypt(encryptedData, 'RSA-OAEP');
        
        return JSON.parse(decryptedDataStr); // تُرجع { key, iv }
    } catch (error) {
        throw new Error('فشل فك التشفير: كلمة المرور خاطئة أو الملف تالف');
    }
};

// 5. دالة فك تشفير الملف باستخدام AES
export const decryptFileWithAES = (encryptedFileBase64, aesKeyBase64, ivBase64) => {
    const aesKey = forge.util.decode64(aesKeyBase64);
    const iv = forge.util.decode64(ivBase64);
    const encryptedBytes = forge.util.decode64(encryptedFileBase64);

    const decipher = forge.cipher.createDecipher('AES-CBC', aesKey);
    decipher.start({ iv: iv });
    decipher.update(forge.util.createBuffer(encryptedBytes));
    const result = decipher.finish();

    if (!result) throw new Error('فشل فك تشفير محتوى الملف');

    return decipher.output.getBytes(); // تُرجع البيانات الأصلية للملف
};