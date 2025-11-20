// src/services/stellarService.js

// Usar import dinámico para evitar problemas de empaquetado en el navegador.
let _cachedLib = null;
let _cachedServer = null;
const HORIZON = 'https://horizon-testnet.stellar.org';

// Normaliza la carga del paquete para devolver el objeto utilizable (lib.default || lib)
async function loadStellar() {
    if (_cachedLib) return _cachedLib;
    const mod = await import('stellar-sdk');
    // Preferir mod.default (CJS interop) si existe, sino el módulo directamente
    _cachedLib = mod && mod.default ? mod.default : mod;
    // Exponer una referencia pública para debugging / compatibilidad
    try { StellarSdk = _cachedLib; } catch (e) {}
    return _cachedLib;
}

// Helper para construir Asset/Keypair/etc. cuando se necesite
async function getLib() {
    return await loadStellar();
}

// Helper para obtener instancia Server cuando se necesite (memoizada)
async function getServer() {
    if (_cachedServer) return _cachedServer;
    const lib = await loadStellar();
    try {
        if (typeof window !== 'undefined' && window.console) {
            console.debug('[stellarService] Stellar lib keys:', Object.keys(lib));
        }
    } catch (e) {
        // ignore
    }

    // Buscar la clase Server en lugares conocidos (top-level, Horizon namespace, etc.)
    const candidates = [
        lib && lib.Server,
        lib && lib.Horizon && lib.Horizon.Server,
        lib && lib.Horizon && lib.Horizon.default && lib.Horizon.default.Server,
        lib && lib.default && lib.default.Server,
    ].filter(Boolean);

    const ServerClass = candidates.find(c => typeof c === 'function');
    if (!ServerClass) {
        console.warn('[stellarService] No Server constructor disponible en stellar-sdk en este entorno. Usaremos fallbacks REST o el backend cuando sea posible.');
        _cachedServer = null;
        return null;
    }

    _cachedServer = new ServerClass(HORIZON);
    return _cachedServer;
}

// Exportar un objeto legacy reducido para compatibilidad (cargado dinámicamente cuando se use)
export let StellarSdk = null;
getLib().then(lib => { StellarSdk = lib; StellarSdk = lib; }).catch(() => {});

// --- CLAVES DE LAS CUENTAS CENTRALES (LEIDAS DESDE VARIABLES DE ENTORNO) ---
// PARA SEGURIDAD: guarda los secretos en un archivo `.env` local y no los subas al repo.
export const TASK_ISSUER_PUBLIC = import.meta.env.VITE_TASK_ISSUER_PUBLIC || 'GCHI5P6ACFPBHZCY4QIZFCB6JEFZYDEAVKLJLN2HGTLTFDG3MDKGSWQM';
export const TASK_ISSUER_SECRET = import.meta.env.VITE_TASK_ISSUER_SECRET || '';

// --- CLAVE DEL VALIDADOR (SEGUNDO FIRMANTE DE NFT, ADMIN) ---
export const VALIDATOR_PUBLIC = import.meta.env.VITE_VALIDATOR_PUBLIC || 'GCY4623I2ZETBWZNGMZX72GUDUINYS2UEDOMTDCMK2OK2T3LETWOHPWZ';
export const VALIDATOR_SECRET = import.meta.env.VITE_VALIDATOR_SECRET || '';

// --- DEFINICIÓN DEL ASSET TASK ---
export const TASK_ASSET_CODE = 'TASK';


/**
 * CONSULTAR BALANCE REAL DEL ESTUDIANTE EN STAGELLAR
 * @param {string} studentPublicKey - Clave pública del estudiante.
 * @returns {number} Balance actual de TASK.
 */
export async function getStudentTaskBalance(studentPublicKey) {
    try {
        // Validate public key format quickly to avoid bad requests
        const pkValid = typeof studentPublicKey === 'string' && /^[G][A-Z2-7]{55}$/.test(studentPublicKey);
        if (!pkValid) {
            console.warn('[stellarService] getStudentTaskBalance: clave pública inválida:', studentPublicKey);
            return 0;
        }

        // Use Horizon REST endpoint directly to avoid depending on Server class for simple balance queries
        const res = await fetch(`${HORIZON}/accounts/${studentPublicKey}`);
        if (!res.ok) {
            if (res.status === 404) {
                // Cuenta no existe -> balance 0
                return 0;
            }
            // Otros códigos (400, 500, etc.) devuelven 0 pero se reportan suavemente
            const text = await res.text().catch(() => '');
            console.warn(`[stellarService] Horizon responded ${res.status} for ${studentPublicKey}: ${text}`);
            return 0;
        }

        const account = await res.json();
        const taskBalance = (account.balances || []).find(b => 
            b.asset_code === TASK_ASSET_CODE && b.asset_issuer === TASK_ISSUER_PUBLIC
        );
        return parseFloat(taskBalance?.balance || 0);
    } catch (e) {
        if (e.response && e.response.status === 404) {
            return 0;
        }
        console.error("Error al cargar el balance:", e);
        return 0;
    }
}

/**
 * FONDEAR CUENTA DEL EMISOR CON FRIENDBOT
 * @param {string} publicKey - Clave pública de la cuenta a fondear.
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
export async function fundIssuerAccount(publicKey) {
    try {
        const response = await fetch(`https://friendbot.stellar.org/?addr=${publicKey}`);
        if (!response.ok) {
            const text = await response.text();
            // Friendbot puede devolver 400 si la cuenta ya está fondeada, eso está bien
            if (response.status === 400 && text.includes('already funded')) {
                return { success: true, message: 'La cuenta ya está fondeada.' };
            }
            return { success: false, error: `Friendbot respondió con ${response.status}: ${text}` };
        }
        const data = await response.json();
        return { success: true, message: 'Cuenta fondeada exitosamente con Friendbot.' };
    } catch (e) {
        console.error('Error al fondear cuenta con Friendbot:', e);
        return { success: false, error: e.message || 'Error desconocido al fondear cuenta.' };
    }
}

/**
 * VERIFICAR SI UNA CUENTA ESTÁ FONDEADA
 * @param {string} publicKey - Clave pública de la cuenta.
 * @returns {Promise<boolean>}
 */
export async function isAccountFunded(publicKey) {
    try {
        const res = await fetch(`${HORIZON}/accounts/${publicKey}`);
        return res.ok; // Si la respuesta es OK (200), la cuenta existe y está fondeada
    } catch (e) {
        return false;
    }
}

/**
 * VERIFICAR SI EL TRUSTLINE TASK ESTÁ ESTABLECIDO
 * @param {string} studentPublicKey - Clave pública del estudiante.
 * @returns {Promise<{success: boolean, hasTrustline: boolean, message?: string}>}
 */
export async function verifyTaskTrustline(studentPublicKey) {
    try {
        const res = await fetch(`${HORIZON}/accounts/${studentPublicKey}`);
        if (!res.ok) {
            return { success: false, hasTrustline: false, message: 'La cuenta no existe o no está fondeada.' };
        }
        
        const account = await res.json();
        const taskBalance = (account.balances || []).find(b => 
            b.asset_code === TASK_ASSET_CODE && b.asset_issuer === TASK_ISSUER_PUBLIC
        );
        
        const hasTrustline = !!taskBalance;
        return { 
            success: true, 
            hasTrustline,
            message: hasTrustline 
                ? 'Trustline TASK establecido correctamente.' 
                : 'Trustline TASK no encontrado.'
        };
    } catch (e) {
        return { success: false, hasTrustline: false, message: `Error al verificar trustline: ${e.message}` };
    }
}

/**
 * OBTENER INFORMACIÓN COMPLETA DE UNA CUENTA STELLAR
 * @param {string} publicKey - Clave pública de la cuenta.
 * @returns {Promise<{success: boolean, account?: object, error?: string, explorerUrl?: string}>}
 */
export async function getAccountInfo(publicKey) {
    try {
        const res = await fetch(`${HORIZON}/accounts/${publicKey}`);
        if (!res.ok) {
            if (res.status === 404) {
                return {
                    success: false,
                    error: 'La cuenta no existe o no está fondeada.',
                    explorerUrl: `https://testnet.stellar.expert/account/${publicKey}`
                };
            }
            const text = await res.text();
            return {
                success: false,
                error: `Error al consultar cuenta: ${res.status} - ${text}`,
                explorerUrl: `https://testnet.stellar.expert/account/${publicKey}`
            };
        }
        
        const account = await res.json();
        const explorerUrl = `https://testnet.stellar.expert/account/${publicKey}`;
        
        return {
            success: true,
            account,
            explorerUrl
        };
    } catch (e) {
        return {
            success: false,
            error: `Error al consultar cuenta: ${e.message}`,
            explorerUrl: `https://testnet.stellar.expert/account/${publicKey}`
        };
    }
}

/**
 * VERIFICAR ACTIVACIÓN COMPLETA DE CUENTA ESTUDIANTE
 * Verifica que la cuenta esté fondeada y el trustline establecido
 * @param {string} studentPublicKey - Clave pública del estudiante.
 * @param {number} maxRetries - Número máximo de intentos (default: 5)
 * @param {number} delayMs - Delay entre intentos en ms (default: 2000)
 * @returns {Promise<{success: boolean, funded: boolean, trustline: boolean, message: string, explorerUrl?: string}>}
 */
export async function verifyStudentAccountActivation(studentPublicKey, maxRetries = 5, delayMs = 2000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Verificar que la cuenta esté fondeada
            const funded = await isAccountFunded(studentPublicKey);
            if (!funded) {
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    continue;
                }
                return {
                    success: false,
                    funded: false,
                    trustline: false,
                    message: 'La cuenta no está fondeada después de varios intentos. Intenta nuevamente.'
                };
            }

            // Verificar que el trustline esté establecido
            const trustlineCheck = await verifyTaskTrustline(studentPublicKey);
            if (!trustlineCheck.hasTrustline) {
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    continue;
                }
                return {
                    success: false,
                    funded: true,
                    trustline: false,
                    message: 'La cuenta está fondeada pero el Trustline TASK no está establecido. Intenta activar nuevamente.'
                };
            }

            // Todo está correcto
            const explorerUrl = `https://testnet.stellar.expert/account/${studentPublicKey}`;
            return {
                success: true,
                funded: true,
                trustline: true,
                message: 'Cuenta activada correctamente. La cuenta está fondeada y el Trustline TASK está establecido.',
                explorerUrl
            };

        } catch (e) {
            if (attempt === maxRetries) {
                return {
                    success: false,
                    funded: false,
                    trustline: false,
                    message: `Error al verificar la activación: ${e.message}`
                };
            }
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    return {
        success: false,
        funded: false,
        trustline: false,
        message: 'No se pudo verificar la activación después de varios intentos.'
    };
}

/**
 * CONSTRUIR TRANSACCIÓN DE PAGO DE TASK (XDR)
 * @param {string} studentPublicKey - Destino del pago.
 * @param {number} amount - Cantidad de TASK a enviar.
 * @returns {string|null} - La transacción firmada por el emisor, serializada en XDR.
 */
export async function buildTaskPaymentXdr(studentPublicKey, amount) {
    try {
        // If a server backend is configured (API key via env), use it to build+sign securely
        const serverApiKey = import.meta.env.VITE_SERVER_API_KEY;
        const serverUrl = import.meta.env.VITE_SERVER_URL || '';
        if (serverApiKey && serverUrl) {
            try {
                const resp = await fetch(`${serverUrl.replace(/\/$/, '')}/api/payment/build`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-api-key': serverApiKey },
                    body: JSON.stringify({ destination: studentPublicKey, amount }),
                });
                if (!resp.ok) {
                    console.error('[stellarService] server /api/payment/build failed', await resp.text());
                    return null;
                }
                const body = await resp.json();
                return body.xdr || null;
            } catch (e) {
                console.error('[stellarService] Error calling backend build:', e);
                return null;
            }
        }

        // Fallback (in-browser) -- not recommended for production because it requires issuer secret in frontend
        const lib = await getLib();
        const { Keypair, TransactionBuilder, BASE_FEE, Operation, Networks, Asset } = lib;
        if (!TASK_ISSUER_SECRET) {
            console.error('TASK_ISSUER_SECRET no está definida. Define VITE_TASK_ISSUER_SECRET en tu .env');
            return null;
        }
        // Necesitamos un Server (o backend). Si no está disponible, indicar al caller que use el backend.
        const server = await getServer();
        if (!server) {
            console.error('No hay constructor Server disponible en este entorno; configura VITE_SERVER_URL & VITE_SERVER_API_KEY para que el backend construya la transacción de forma segura.');
            return null;
        }
        
        const issuerKeypair = Keypair.fromSecret(TASK_ISSUER_SECRET);
        const issuerPublicKey = issuerKeypair.publicKey();
        
        // Verificar si la cuenta del emisor está fondeada
        const isFunded = await isAccountFunded(issuerPublicKey);
        if (!isFunded) {
            console.log('La cuenta del emisor no está fondeada. Intentando fondear con Friendbot...');
            const fundResult = await fundIssuerAccount(issuerPublicKey);
            if (!fundResult.success) {
                console.error('Error al fondear cuenta del emisor:', fundResult.error);
                // Intentar continuar de todas formas, puede que la cuenta se haya fondeado
            } else {
                console.log('Cuenta del emisor fondeada:', fundResult.message);
                // Esperar un momento para que la cuenta se propague en la red
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        // Intentar cargar la cuenta del emisor
        let sourceAccount;
        try {
            sourceAccount = await server.loadAccount(issuerPublicKey);
        } catch (e) {
            // Si aún falla después de fondear, lanzar un error más descriptivo
            if (e.response && e.response.status === 404) {
                throw new Error('La cuenta del emisor no está fondeada. Por favor, fondéala manualmente usando Friendbot o el botón "Fondear Cuenta del Emisor" en el panel del profesor.');
            }
            throw e;
        }
        
        const taskAsset = new Asset(TASK_ASSET_CODE, TASK_ISSUER_PUBLIC);
        const transaction = new TransactionBuilder(sourceAccount, {
            fee: BASE_FEE,
            networkPassphrase: Networks.TESTNET
        })
        .addOperation(Operation.payment({ destination: studentPublicKey, asset: taskAsset, amount: String(amount) }))
        .setTimeout(30)
        .build();
        transaction.sign(issuerKeypair);
        return transaction.toXDR();

    } catch (e) {
        console.error("Error al construir la transacción de pago TASK:", e.response ? e.response.data.extras.result_codes : e);
        // Retornar un mensaje de error más descriptivo
        if (e.message && e.message.includes('no está fondeada')) {
            throw new Error(e.message);
        }
        throw new Error(`Error al construir la transacción: ${e.message || 'Error desconocido'}`);
    }
}


/**
 * INICIALIZAR CUENTA Y TRUSTLINE (Para el alumno)
 * Esto fondear la cuenta con Friendbot y establece el Trustline para el Asset TASK.
 * @param {string} studentSecretKey - Clave secreta del alumno.
 * @param {string} studentPublicKey - Clave pública del alumno.
 */
export async function setupStudentAccount(studentSecretKey, studentPublicKey) {
    try {
        const lib = await getLib();
        const { Keypair, TransactionBuilder, BASE_FEE, Operation, Networks, Asset } = lib;
        const studentKeypair = Keypair.fromSecret(studentSecretKey);
        
        // 1. Fondear la cuenta (Si no existe)
        await fetch(`https://friendbot.stellar.org/?addr=${studentPublicKey}`);
        
        // 2. Establecer Trustline (Firma del estudiante)
        // Esperar un momento para asegurar que la cuenta se haya creado por Friendbot
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const server = await getServer();
        if (!server) {
            console.error('No hay Server disponible en este entorno para establecer Trustline. Ejecuta este paso desde el backend o configura el backend para hacerlo por ti.');
            return { success: false, error: 'Server no disponible en el entorno. Usa el backend.' };
        }
        const account = await server.loadAccount(studentPublicKey);

        const taskAsset = new Asset(TASK_ASSET_CODE, TASK_ISSUER_PUBLIC);

        const transaction = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: Networks.TESTNET
        })
        .addOperation(Operation.changeTrust({
            asset: taskAsset,
            limit: Asset.MAX_AMOUNT
        }))
        .setTimeout(30)
        .build();

        transaction.sign(studentKeypair);

        await server.submitTransaction(transaction);

        return { success: true, message: 'Cuenta fondeada y Trustline TASK establecido.' };

    } catch (e) {
        console.error("Error en setupStudentAccount:", e.response ? e.response.data.extras.result_codes : e);
        return { success: false, error: e.response?.data?.extras?.result_codes?.transaction || 'Error desconocido.' };
    }
}


/**
 * ENVIAR TRANSACCIÓN YA FIRMADA (VALIDATOR)
 * El Validador toma el XDR (ya firmado por el profesor) y lo envía a la red Stellar.
 * @param {string} xdr - La transacción serializada en XDR (firmada por el emisor).
 * @returns {object} El resultado de la transacción.
 */
export async function submitSignedXdr(xdr) {
    try {
        const serverApiKey = import.meta.env.VITE_SERVER_API_KEY;
        const serverUrl = import.meta.env.VITE_SERVER_URL || '';
        if (serverApiKey && serverUrl) {
            // Ask backend to sign (validator) and submit the XDR securely
            const resp = await fetch(`${serverUrl.replace(/\/$/, '')}/api/payment/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': serverApiKey },
                body: JSON.stringify({ xdr }),
            });
            if (!resp.ok) {
                const txt = await resp.text();
                console.error('[stellarService] backend submit failed', txt);
                return { success: false, error: txt };
            }
            const body = await resp.json();
            return { success: true, result: body };
        }

        // Fallback (in-browser or env without Server)
        // Primero intentar usar Transaction.fromXDR si está disponible y Server
        const lib = await getLib();
        const TransactionCtor = lib && lib.Transaction ? lib.Transaction : null;
        const server = await getServer();
        if (TransactionCtor && server) {
            const transaction = TransactionCtor.fromXDR(xdr, 'base64');
            const result = await server.submitTransaction(transaction);
            return { success: true, result };
        }

        // Último recurso: enviar XDR directamente al endpoint Horizon (form-encoded)
        try {
            const formBody = `tx=${encodeURIComponent(xdr)}`;
            const res = await fetch(`${HORIZON}/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formBody,
            });
            if (!res.ok) {
                const txt = await res.text().catch(() => '');
                console.error('[stellarService] Horizon submit (REST) failed:', res.status, txt);
                return { success: false, error: txt || `Horizon ${res.status}` };
            }
            const body = await res.json();
            return { success: true, result: body };
        } catch (e) {
            console.error('Error al enviar XDR vía REST a Horizon:', e);
            return { success: false, error: e.message || e };
        }

    } catch (e) {
        console.error("Error al enviar XDR a Stellar:", e.response ? e.response.data.extras : e);
        return { 
            success: false, 
            error: e.response?.data?.extras?.result_codes?.transaction || 'Error desconocido al enviar a Stellar.' 
        };
    }
}