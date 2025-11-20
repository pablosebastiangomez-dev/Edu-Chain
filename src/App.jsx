// src/App.jsx

import React, { useState, useEffect } from 'react';
import StudentView from './views/StudentView';
import ProfessorDashboard from './views/ProfessorDashboard';
import ValidatorView from './views/ValidatorView';
import RankingView from './views/RankingView';
import AdminTaskManagement from './views/AdminTaskManagement';
import HomeView from './views/HomeView';
import useAdminTasks from './hooks/useAdminTasks';

// Importar servicios de Stellar
import { 
    getStudentTaskBalance, 
    setupStudentAccount, 
    buildTaskPaymentXdr, 
    submitSignedXdr, // ⚠️ Nueva función para el Validador
    fundIssuerAccount, // Nueva función para fondear cuenta del emisor
    verifyStudentAccountActivation, // Verificar activación completa
    getAccountInfo, // Obtener información completa de cuenta
    TASK_ISSUER_PUBLIC,
    TASK_ISSUER_SECRET,
    VALIDATOR_PUBLIC,
    StellarSdk // Para usar en NFT (próximo paso)
} from './services/stellarService';

// --- DATOS INICIALES (CLAVES PÚBLICAS Y SECRETAS DE PRUEBA) ---
// ⚠️ IMPORTANTE: S001 debe ser siempre Alumno1 con esta cuenta específica
const ALUMNO1_WALLET = 'GCNDGMA66QWE5P52YJ4OIX3H6WIA42JDPDSQ7AZOCDEW3KSSVRWNBGA4';
const ALUMNO1_SECRET = 'SD7XL2QLDHH5I7NUD6ETAYAGJOGMT3FXKWSGKMHQOQZTUWW4373VQMBK';

const INITIAL_STUDENTS_DATA = [
    {
        id: 'S001',
        name: 'Alumno1', // ⚠️ S001 = Alumno1 - Cuenta verificada para recibir tokens TASK
        wallet: ALUMNO1_WALLET, // Wallet de Alumno1 - NO CAMBIAR
        secret: ALUMNO1_SECRET, // Secret de Alumno1 - NO CAMBIAR
        accountStatus: 'PENDING', 
        achievements: [],
        nfts: [],
    },
    { 
        id: 'S002', 
        name: 'Carlos Díaz', 
        wallet: 'GDTUXA7KUG5E7D2NC76ACQ7GLQWZGWA5E6H72HPJOU75DUUL6VKYEZY4', 
        secret: 'SDL46MQEIP5DRAVPPTCRKTMRXZXOMWKYEWG7X6JYR7TSVBWPZCTAJ7P3',
        accountStatus: 'PENDING', 
        achievements: [], 
        nfts: [] 
    },
    { 
        id: 'S003', 
        name: 'Laura Gómez', 
        wallet: 'GBA3ZR65YXLKKHATXU52GCF7LQFRJHQOZAVIUTTQ2GCZK27WZIOZLNQD', 
        secret: 'SCPU5AGTWPCITGT6VV2JOQFLIHO4Q5QMJ6N5VOIG3H3DX7SJADCETP6Y',
        accountStatus: 'PENDING', 
        achievements: [], 
        nfts: [] 
    },
    // Añadir claves de los otros estudiantes (PENDIENTES)
    { id: 'S004', name: 'Daniela Castro', wallet: 'GA...', secret: '', accountStatus: 'PENDING', achievements: [], nfts: [] },
    { id: 'S005', name: 'Emilio Núñez', wallet: 'GB...', secret: '', accountStatus: 'PENDING', achievements: [], nfts: [] },
];

const INITIAL_DAILY_TASKS = [
    { id: 'D01', name: 'Lectura Diaria', reward: 10 },
    { id: 'D02', name: 'Participación en Clase', reward: 5 },
];

const INITIAL_CUSTOM_TASKS = [
    { id: 'C01', name: 'Proyecto Final', reward: 100 },
    { id: 'C02', name: 'Colaboración en Debate', reward: 50 },
];

const NFT_ACHIEVEMENT_TYPES = [
    'Colaboración Destacada', 
    'Liderazgo Ejemplar', 
    'Mérito Académico', 
    'Proyecto Innovador'
];

function App() {
    // --- ESTADO GLOBAL ---
    const [studentsList, setStudentsList] = useState(INITIAL_STUDENTS_DATA);
    const [activeUserRole, setActiveUserRole] = useState('HOME'); 
    const [selectedUserId, setSelectedUserId] = useState(INITIAL_STUDENTS_DATA[0].id);
    const [result, setResult] = useState(null); 
    
    // Usar el hook compartido para las tareas (compartido entre Admin y Profesor)
    const { tasks: allTasks, tasksByType, createTask, deleteTask } = useAdminTasks();
    
    // Convertir tareas del formato del hook al formato esperado por el Profesor
    // dailyTasks: tareas con type: 'daily' o sin type
    // customTasks: tareas con type: 'academic' (logros académicos)
    const dailyTasks = (tasksByType.daily || []).map(task => ({
        id: task.id,
        name: task.name,
        reward: task.amount || task.reward || 0
    }));
    
    const customTasks = (tasksByType.academic || []).map(task => ({
        id: task.id,
        name: task.name,
        reward: task.amount || task.reward || 0
    }));
    
    const [pendingTransactions, setPendingTransactions] = useState([]); // Almacena XDRs para el Validador
    const [nftValidationQueue, setNftValidationQueue] = useState([]); 
    const [balances, setBalances] = useState({}); // Almacena los balances reales de Stellar


    // --- SINCRONIZACIÓN DE BALANCES CON STELLAR ---
    const fetchBalances = async () => {
        const newBalances = {};
        for (const student of studentsList) {
            newBalances[student.id] = await getStudentTaskBalance(student.wallet);
            // Si la cuenta tiene balance > 0, asumimos que está activa (Trustline hecho)
            if (newBalances[student.id] > 0) {
                 setStudentsList(prev => prev.map(s => 
                    s.id === student.id ? { ...s, accountStatus: 'ACTIVE' } : s
                ));
            }
        }
        setBalances(newBalances);
    };

    useEffect(() => {
        fetchBalances(); 
        const intervalId = setInterval(fetchBalances, 15000); 
        return () => clearInterval(intervalId);
    }, [studentsList]);


    // --- DATOS DERIVADOS ---
    const activeStudent = studentsList.find(s => s.id === selectedUserId);
    const studentBalance = balances[selectedUserId] || 0; 
    
    const rankedStudents = [...studentsList].map(s => ({
        ...s,
        balance: balances[s.id] || 0 
    })).sort((a, b) => b.balance - a.balance);


    // --- LÓGICA DE NAVEGACIÓN Y ACTIVACIÓN ---
    const handleLoginSelection = (role, userId = null) => {
        setActiveUserRole(role);
        if (userId) {
            setSelectedUserId(userId);
        }
        setResult(null); 
    };

    const handleActivateStudent = async (student) => {
        setResult({ type: 'info', message: `Activando cuenta y Trustline para ${student.name}...` });
        
        if (!student.secret || student.secret.trim() === '') {
             setResult({ type: 'error', message: `ERROR: Falta la clave secreta del alumno ${student.id} para firmar la Trustline.` });
             return;
        }

        // Validar formato de clave secreta
        if (!/^S[0-9A-Z]{55}$/.test(student.secret.trim())) {
            setResult({ type: 'error', message: `ERROR: Formato de clave secreta inválido. Debe empezar con 'S' y tener 56 caracteres.` });
            return;
        }

        // Si el estudiante generó una nueva clave, actualizar el wallet también
        let walletToUse = student.wallet;
        try {
            const StellarSdk = await import('stellar-sdk');
            const lib = StellarSdk.default || StellarSdk;
            const keypair = lib.Keypair.fromSecret(student.secret.trim());
            walletToUse = keypair.publicKey();
            
            // Si el wallet cambió, actualizarlo en el estado
            if (walletToUse !== student.wallet) {
                setStudentsList(prev => prev.map(s => 
                    s.id === student.id ? { ...s, wallet: walletToUse, secret: student.secret.trim() } : s
                ));
            }
        } catch (e) {
            setResult({ type: 'error', message: `ERROR: Clave secreta inválida. ${e.message}` });
            return;
        }

        // Paso 1: Ejecutar setup de la cuenta
        setResult({ type: 'info', message: `Paso 1/2: Fondeando cuenta y estableciendo Trustline para ${student.name}...` });
        const result = await setupStudentAccount(student.secret.trim(), walletToUse);

        if (!result.success) {
            setResult({ type: 'error', message: `Error al activar la cuenta: ${result.error}` });
            return;
        }

        // Paso 2: Verificar que la activación fue exitosa
        setResult({ type: 'info', message: `Paso 2/2: Verificando que la cuenta esté correctamente activada...` });
        const verification = await verifyStudentAccountActivation(walletToUse, 5, 2000);

        if (verification.success && verification.funded && verification.trustline) {
            // Activación exitosa y verificada
            setStudentsList(prev => prev.map(s => 
                s.id === student.id ? { 
                    ...s, 
                    accountStatus: 'ACTIVE',
                    secret: student.secret.trim(),
                    wallet: walletToUse
                } : s
            ));
            setResult({ 
                type: 'success', 
                message: `¡Éxito! ${verification.message} Tu cuenta está activa y lista para recibir recompensas TASK.` 
            });
            fetchBalances(); 
        } else {
            // La activación falló o no se pudo verificar
            let errorMessage = `Error en la verificación: ${verification.message}`;
            if (!verification.funded) {
                errorMessage += ' La cuenta no está fondeada. Intenta activar nuevamente.';
            } else if (!verification.trustline) {
                errorMessage += ' El Trustline TASK no está establecido. Intenta activar nuevamente.';
            }
            
            setResult({ type: 'error', message: errorMessage });
            // No actualizamos el estado a ACTIVE si la verificación falló
        }
       
    };

    // --- LÓGICA DE FONDEO DE CUENTA DEL EMISOR (PROFESSOR) ---
    const handleFundIssuerAccount = async () => {
        setResult({ type: 'info', message: `Fondeando cuenta del emisor (${TASK_ISSUER_PUBLIC.substring(0, 8)}...) con Friendbot...` });
        const result = await fundIssuerAccount(TASK_ISSUER_PUBLIC);
        
        if (result.success) {
            setResult({ type: 'success', message: `¡Éxito! ${result.message}` });
        } else {
            setResult({ type: 'error', message: `Error al fondear cuenta del emisor: ${result.error}` });
        }
    };

    // --- LÓGICA DE VERIFICACIÓN DE CUENTA (STUDENT) ---
    const handleCheckAccountStatus = async (student) => {
        if (!student || !student.wallet) {
            setResult({ type: 'error', message: 'No hay información de cuenta disponible.' });
            return;
        }

        setResult({ type: 'info', message: `Verificando estado de la cuenta ${student.wallet.substring(0, 8)}...` });
        const accountInfo = await getAccountInfo(student.wallet);
        
        if (accountInfo.success) {
            const account = accountInfo.account;
            const balances = account.balances || [];
            const xlmBalance = balances.find(b => b.asset_type === 'native')?.balance || '0';
            const taskBalance = balances.find(b => 
                b.asset_code === 'TASK' && b.asset_issuer === TASK_ISSUER_PUBLIC
            );
            
            let message = `✅ Cuenta verificada:\n`;
            message += `- Balance XLM: ${xlmBalance}\n`;
            message += `- Trustline TASK: ${taskBalance ? '✅ Establecido' : '❌ No establecido'}\n`;
            if (taskBalance) {
                message += `- Balance TASK: ${taskBalance.balance}\n`;
            }
            message += `\n🔗 Ver en explorador: ${accountInfo.explorerUrl}`;
            
            setResult({ 
                type: 'success', 
                message: message,
                explorerUrl: accountInfo.explorerUrl
            });
        } else {
            setResult({ 
                type: 'error', 
                message: `❌ ${accountInfo.error}\n\n🔗 Ver en explorador: ${accountInfo.explorerUrl}`,
                explorerUrl: accountInfo.explorerUrl
            });
        }
    };

    // --- LÓGICA DE EMISIÓN DE TOKEN TASK (PROFESSOR) ---
    const handleSendReward = async (student, task) => {
        if (activeStudent.accountStatus !== 'ACTIVE' && studentBalance === 0) {
            setResult({ type: 'error', message: `Error: La cuenta de ${student.name} no está activa o Trustline pendiente. El alumno debe hacer click en "Activar mi cuenta" primero.` });
            return;
        }
        
        // Validación: Asegurar que S001 (Alumno1) siempre use el wallet correcto
        if (student.id === 'S001') {
            // Forzar el uso del wallet correcto para Alumno1
            if (student.wallet !== ALUMNO1_WALLET) {
                console.warn(`⚠️ S001 wallet incorrecto. Actualizando a wallet de Alumno1...`);
                setStudentsList(prev => prev.map(s => 
                    s.id === 'S001' ? { 
                        ...s, 
                        wallet: ALUMNO1_WALLET,
                        secret: ALUMNO1_SECRET,
                        name: 'Alumno1'
                    } : s
                ));
                // Usar el wallet correcto para la transacción
                student.wallet = ALUMNO1_WALLET;
            }
        }
        
        // ⚠️ PASO 1: PROFESOR CONSTRUYE Y FIRMA LA TRANSACCIÓN (XDR)
        setResult({ type: 'info', message: `Construyendo transacción de ${task.reward} TASK para ${student.name} (${student.wallet.substring(0, 8)}...) y enviándola a cola de Validador...` });
        
        try {
            const xdr = await buildTaskPaymentXdr(student.wallet, task.reward);

            if (!xdr) {
                setResult({ type: 'error', message: 'Error interno al construir la transacción Stellar. La cuenta del emisor puede no estar fondeada. Usa el botón "Fondear Cuenta del Emisor" para solucionarlo.' });
                return;
            }

            const newTx = {
                id: `TX${Date.now()}`,
                task: task.name,
                origin: TASK_ISSUER_PUBLIC, 
                destination: student.wallet,
                amount: task.reward,
                type: 'Payment_TASK',
                xdr: xdr, // Guardamos la transacción firmada
                status: 'PENDING_VALIDATOR',
            };

            setPendingTransactions(prev => [...prev, newTx]);
            setResult({ type: 'info', message: `XDR de pago TASK enviado a la cola de validación. Requiere que el Validador la ejecute.` });
        } catch (error) {
            // Manejar errores específicos de buildTaskPaymentXdr
            if (error.message && error.message.includes('no está fondeada')) {
                setResult({ type: 'error', message: `Error: ${error.message} Usa el botón "Fondear Cuenta del Emisor" para solucionarlo.` });
            } else {
                setResult({ type: 'error', message: `Error al construir la transacción: ${error.message || 'Error desconocido'}` });
            }
        }
    };

    // --- LÓGICA DE VALIDACIÓN DE TASK (VALIDATOR) ---
    const processTransaction = async (txId, action) => {
        const tx = pendingTransactions.find(t => t.id === txId);
        if (!tx) return;

        setPendingTransactions(prev => prev.filter(t => t.id !== txId)); // Sacar de la cola inmediatamente

        if (action === 'APPROVE') {
            setResult({ type: 'info', message: `Enviando Transacción ${txId} a Stellar...` });
            
            // ⚠️ PASO 2: VALIDADOR TOMA EL XDR Y LO ENVÍA A LA RED
            const submissionResult = await submitSignedXdr(tx.xdr);

            if (submissionResult.success) {
                // Actualizar logros (para el historial del alumno, aunque el balance es real)
                setStudentsList(prev => prev.map(s => {
                    if (s.wallet === tx.destination) {
                        return {
                            ...s,
                            achievements: [...s.achievements, { id: txId, task: tx.task, amount: tx.amount, date: new Date().toLocaleDateString() }]
                        };
                    }
                    return s;
                }));
                
                setResult({ 
                    type: 'success', 
                    message: `Transacción TASK APROBADA y ejecutada en Stellar. ID: ${submissionResult.result.hash.substring(0, 10)}...`
                });
                fetchBalances(); // Recargar balances reales (¡Confirmación en vivo!)

            } else {
                setResult({ 
                    type: 'error', 
                    message: `Error al ejecutar en Stellar: ${submissionResult.error}.`
                });
            }
        } else {
             setResult({ type: 'error', message: `Transacción ${txId} RECHAZADA.` });
        }
    };


    // --- LÓGICA DE EMISIÓN DE NFT (Multi-Firma - Aún simulado, próximo paso) ---
    const handleInitiateNftIssuance = (student, achievementType, description) => {
        // La lógica de NFT XDR es compleja. Aquí solo registramos la petición para que el Validator la firme.
        const newNftRequest = {
            id: `NFT${Date.now()}`,
            studentId: student.id,
            studentName: student.name,
            issuer: TASK_ISSUER_PUBLIC, // Emisor del NFT
            achievementType: achievementType,
            description: description,
            status: 'PENDING_MULTI_SIG', 
            nftId: `ASSET${Date.now()}`, 
            // ⚠️ Aquí iría el XDR con la primera firma del Emisor
        };

        setNftValidationQueue(prev => [...prev, newNftRequest]);
        setResult({ 
            type: 'info', 
            message: `Solicitud de NFT para ${student.name} enviada. Requiere firma del Validador.` 
        });
    };
    
    // --- LÓGICA DE VALIDACIÓN DE NFT (VALIDATOR - Aún simulado) ---
    const handleProcessNftValidation = (nftRequestId, action, validatorId = VALIDATOR_PUBLIC) => {
        // Por ahora, esta función simula el éxito de la validación.
        const req = nftValidationQueue.find(r => r.id === nftRequestId);
        if (!req) return;

        setNftValidationQueue(prev => prev.filter(r => r.id !== nftRequestId));

        if (action === 'APPROVE') {
            // Simular éxito y registro inmutable
            setStudentsList(prev => prev.map(s => {
                if (s.id === req.studentId) {
                    return {
                        ...s,
                        nfts: [...s.nfts, { 
                            id: req.nftId, 
                            metadata: { type: req.achievementType, description: req.description },
                            stellar_explorer_url: `https://testnet.stellar.expert/tx/${req.nftId}` 
                        }]
                    };
                }
                return s;
            }));
            
            setResult({ 
                type: 'success', 
                message: `NFT de Mérito APROBADO por Multi-Firma y EMITIDO. Trazabilidad simulada en: https://testnet.stellar.expert/tx/${req.nftId}` 
            });

        } else {
             setResult({ type: 'error', message: `Solicitud de NFT ${nftRequestId} RECHAZADA.` });
        }
    };


    // ... (El resto del renderView y el return JSX permanecen iguales)
    const renderView = () => {
        switch (activeUserRole) {
            case 'HOME':
                return <HomeView studentsList={studentsList} handleLoginSelection={handleLoginSelection} />; 
            case 'STUDENT':
                return (
                    <StudentView 
                        student={activeStudent}
                        handleActivateStudent={handleActivateStudent}
                        handleCheckAccountStatus={handleCheckAccountStatus}
                        result={result}
                        studentBalance={studentBalance} 
                    />
                );
            case 'PROFESSOR':
                return (
                    <ProfessorDashboard
                        studentsList={rankedStudents}
                        selectedStudentId={selectedUserId}
                        setSelectedStudentId={setSelectedUserId}
                        activeStudent={activeStudent}
                        handleSendReward={handleSendReward}
                        handleFundIssuerAccount={handleFundIssuerAccount}
                        result={result}
                        setResult={setResult}
                        dailyTasks={dailyTasks}
                        customTasks={customTasks}
                        nftTypes={NFT_ACHIEVEMENT_TYPES}
                        handleInitiateNftIssuance={handleInitiateNftIssuance}
                    />
                );
            case 'VALIDATOR':
                return (
                    <ValidatorView
                        result={result}
                        setResult={setResult}
                        pendingTransactions={pendingTransactions}
                        processTransaction={processTransaction}
                        nftValidationQueue={nftValidationQueue} 
                        handleProcessNftValidation={handleProcessNftValidation}
                    />
                );
            case 'ADMIN':
                return (
                    <AdminTaskManagement
                        tasks={allTasks}
                        onCreate={createTask}
                        onDelete={deleteTask}
                    />
                );
            case 'RANKING': 
                return (
                    <RankingView
                        rankedStudents={rankedStudents}
                        loading={false}
                        result={result}
                        handleRefreshRanking={fetchBalances}
                    />
                );
            default:
                return <div>Página no encontrada.</div>;
        }
    };

    return (
        <div style={{ padding: '20px', backgroundColor: '#f4f7f9', minHeight: '100vh' }}>
            <div style={{ marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '15px', display: 'flex', justifyContent: 'space-between' }}>
                <h1 style={{ color: '#0047AB', cursor: 'pointer' }} onClick={() => setActiveUserRole('HOME')}>EDU & CHAIN Dashboard</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <label>Vista Actual:</label>
                    <select value={activeUserRole} onChange={(e) => setActiveUserRole(e.target.value)} style={{ padding: '8px', borderRadius: '4px' }}>
                        <option value="HOME">Inicio/Login Rápido</option>
                        <option value="STUDENT">Estudiante</option>
                        <option value="PROFESSOR">Profesor</option>
                        <option value="VALIDATOR">Validador</option>
                        <option value="ADMIN">Administrador</option>
                        <option value="RANKING">Ranking Global</option>
                    </select>
                    {(activeUserRole === 'STUDENT' && activeStudent) && (
                        <p style={{ margin: 0 }}>Usuario: <strong>{activeStudent.name}</strong> (Balance: {studentBalance.toFixed(2)} TASK)</p>
                    )}
                    {activeUserRole === 'PROFESSOR' && (
                         <p style={{ margin: 0 }}>Usuario: <strong>Prof. Elena Soto (Emisor: {TASK_ISSUER_PUBLIC.substring(0, 4)}...)</strong></p>
                    )}
                    {activeUserRole === 'VALIDATOR' && (
                         <p style={{ margin: 0 }}>Usuario: <strong>Nodo Validador (V001: {VALIDATOR_PUBLIC.substring(0, 4)}...)</strong></p>
                    )}
                </div>
            </div>
            
            {renderView()}

        </div>
    );
}

export default App;