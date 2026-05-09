import forge from 'node-forge';

export const generateKeysAndEncryptPrivate = (password) => {
    return new Promise((resolve, reject) => {
        forge.pki.rsa.generateKeyPair({ bits: 2048, workers: 2 }, (err, keypair) => {
            if (err) return reject(err);

            const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);

            const encryptedPrivateKeyPem = forge.pki.encryptRsaPrivateKey(keypair.privateKey, password);

            resolve({
                publicKey: publicKeyPem,
                encryptedPrivateKey: encryptedPrivateKeyPem
            });
        });
    });
};

export const getFileHash = (fileData) => {
    const md = forge.md.sha256.create();
    md.update(fileData);
    return md.digest().toHex();
};

export const encryptFileWithAES = (fileData) => {
    const aesKey = forge.random.getBytesSync(32);
    const iv = forge.random.getBytesSync(16);

    const cipher = forge.cipher.createCipher('AES-CBC', aesKey);
    cipher.start({ iv: iv });
    cipher.update(forge.util.createBuffer(fileData, 'utf8'));
    cipher.finish();

    const encryptedFile = cipher.output.getBytes();

    return {
        encryptedFileBase64: forge.util.encode64(encryptedFile),
        aesKeyBase64: forge.util.encode64(aesKey),
        ivBase64: forge.util.encode64(iv)
    };
};

export const encryptAESKeyWithRSA = (aesKeyBase64, ivBase64, publicKeyPem) => {
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    
    const dataToEncrypt = JSON.stringify({ key: aesKeyBase64, iv: ivBase64 });
    
    const encryptedData = publicKey.encrypt(dataToEncrypt, 'RSA-OAEP');
    
    return forge.util.encode64(encryptedData);
};

export const decryptAESKeyWithRSA = (encryptedAesKeyBase64, encryptedPrivateKeyPem, password) => {
    try {
        const privateKey = forge.pki.decryptRsaPrivateKey(encryptedPrivateKeyPem, password);
        if (!privateKey) throw new Error('كلمة المرور خاطئة!');

        const encryptedData = forge.util.decode64(encryptedAesKeyBase64);
        const decryptedDataStr = privateKey.decrypt(encryptedData, 'RSA-OAEP');
        
        return JSON.parse(decryptedDataStr); 
    } catch (error) {
        throw new Error('فشل فك التشفير: كلمة المرور خاطئة أو الملف تالف');
    }
};

export const decryptFileWithAES = (encryptedFileBase64, aesKeyBase64, ivBase64) => {
    const aesKey = forge.util.decode64(aesKeyBase64);
    const iv = forge.util.decode64(ivBase64);
    const encryptedBytes = forge.util.decode64(encryptedFileBase64);

    const decipher = forge.cipher.createDecipher('AES-CBC', aesKey);
    decipher.start({ iv: iv });
    decipher.update(forge.util.createBuffer(encryptedBytes));
    const result = decipher.finish();

    if (!result) throw new Error('فشل فك تشفير محتوى الملف');

    return decipher.output.getBytes(); 
};
