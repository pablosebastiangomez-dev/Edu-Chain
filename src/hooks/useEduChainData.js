// src/hooks/useEduChainData.js

import { useState, useEffect, useMemo, useCallback } from 'react';

// --- DATOS SIMULADOS INICIALES ---

const initialStudents = [
    { id: 'S001', name: 'Alicia Pérez', balance: 0, isActive: false, achievements: [] },
    { id: 'S002', name: 'Roberto Gómez', balance: 50, isActive: false, achievements: [] },
    { id: 'S003', name: 'Carlos Díaz', balance: 5, isActive: false, achievements: [] },
];

const initialTransactions = [
    { id: 'TXI001', type: 'Initial Mock', task: 'Simulación de Bono', origin: 'System', destination: 'S003 - Carlos Díaz (S003)', amount: 5, status: 'PENDING' },
];

const initialProfessors = [
    { id: 'P001', name: 'Prof. Elena Soto' },
    { id: 'P002', name: 'Prof. Juan Lopez' },
];

// Recompensas Académicas que podrían ser NFTs (ahora las usamos para el NFT de Mérito)
const initialCustomTasks = [
    { id: 'C001', name: 'Ensayo de Historia', reward: 30, type: 'Academic' },
    { id: 'C002', name: 'Proyecto de Tecnología', reward: 50, type: 'Academic' },
];

const dailyTasks = [
    { id: 'D001', name: 'Lectura Diaria', reward: 10, type: 'Daily' },
    { id: 'D002', name: 'Ejercicio Matemático', reward: 20, type: 'Daily' },
];

// --- HOOK PRINCIPAL ---

export const useEduChainData = () => {
    
    // --- ESTADOS PRINCIPALES ---
    const [studentsList, setStudentsList] = useState(initialStudents);
    const [professorsList] = useState(initialProfessors);
    const [customTasks, setCustomTasks] = useState(initialCustomTasks);
    const [pendingTransactions, setPendingTransactions] = useState(initialTransactions);

    // --- ESTADOS DE UI/CONTROL ---
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [selectedStudentId, setSelectedStudentId] = useState(studentsList[0]?.id || '');
    const [activeTab, setActiveTab] = useState('daily');
    const [studentBalance, setStudentBalance] = useState(0);

    // NUEVO ESTADO PARA LA COLA DE VALIDACIÓN MULTI-FIRMA DE NFTS
    const [nftValidationQueue, setNftValidationQueue] = useState([]);


    // --- COMPUTED STATES ---
    const activeStudent = useMemo(() => 
        studentsList.find(s => s.id === selectedStudentId) || null, 
        [studentsList, selectedStudentId]
    );

    const rankedStudents = useMemo(() => 
        [...studentsList].sort((a, b) => b.balance - a.balance), 
        [studentsList]
    );

    // --- FUNCIONES CORE ---

    const updateStudentBalance = useCallback((student) => {
        // Simulación: en un entorno real, esto llamaría a Horizon para obtener el balance del Asset
        setStudentBalance(student?.balance || 0);
    }, []);

    const fetchAndRankStudents = useCallback(() => {
        // Simulación de refetch de datos
        setResult({ type: 'info', message: 'Ranking actualizado.' });
    }, [setResult]);

    const handleActivateStudent = useCallback((student) => {
        setResult({ type: 'info', message: `Estudiante activo: ${student.name}` });
        updateStudentBalance(student);
    }, [setResult, updateStudentBalance]);

    // Función para emitir Tokens de Tarea (Transacción simple)
    const handleSendReward = useCallback((student, task) => {
        setLoading(true);
        setResult(null);

        // Simulación de transacción de pago de TASK
        const newTx = {
            id: `TX${Date.now()}`,
            type: 'Payment',
            task: task.name,
            origin: 'P001 - Prof. Elena Soto',
            destination: `${student.name} (${student.id})`,
            amount: task.reward,
            status: 'PENDING'
        };

        setPendingTransactions(prev => [...prev, newTx]);
        
        setTimeout(() => {
            setLoading(false);
            setResult({ type: 'success', message: `Recompensa de ${task.reward} TASK enviada a cola de validación.` });
        }, 500);
        
    }, [setResult]);

    // Función del Validador para procesar Tokens de Tarea (Transacción simple)
    const processTransaction = useCallback((txId, action) => {
        setLoading(true);
        const txIndex = pendingTransactions.findIndex(tx => tx.id === txId);
        
        if (txIndex === -1) {
            setResult({ type: 'error', message: 'Transacción no encontrada.' });
            setLoading(false);
            return;
        }

        let txToProcess = pendingTransactions[txIndex];

        if (action === 'APPROVE') {
            // Actualizar Balance del Estudiante (Simulación de ejecución de la TX en Stellar)
            const updatedStudents = studentsList.map(s => {
                if (s.id === txToProcess.destination.split('(')[1].replace(')', '').trim()) {
                    return { ...s, balance: s.balance + txToProcess.amount };
                }
                return s;
            });
            setStudentsList(updatedStudents);

            setResult({ type: 'success', message: `Transacción ${txId} aprobada. Balance actualizado.` });
        } else {
            setResult({ type: 'error', message: `Transacción ${txId} rechazada.` });
        }

        // Remover de la cola de pendientes
        setPendingTransactions(prev => prev.filter(tx => tx.id !== txId));
        setLoading(false);

    }, [pendingTransactions, studentsList, setResult]);
    
    // --- 🔑 NUEVAS FUNCIONES PARA LA LÓGICA MULTI-FIRMA DE NFT ---

    // 1. FUNCIÓN QUE INICIA LA EMISIÓN DE NFT (Paso del Profesor)
    const initiateNftIssuance = useCallback((studentId, achievementMetadata) => {
        setLoading(true);
        setResult(null);

        const student = studentsList.find(s => s.id === studentId);

        if (!student) {
            setResult({ type: 'error', message: 'Error: Estudiante no encontrado.' });
            setLoading(false);
            return;
        }

        // SIMULACIÓN DE CREACIÓN DE XDR Y FIRMA PARCIAL (Profesor 1)
        const newPendingNftTx = {
            id: `NFT${Date.now()}`,
            type: 'NFT_MERIT',
            xdr_token: `XDR_PENDING_NFT_${Date.now()}_P1`, // XDR parcialmente firmado
            origin: 'P001 - Profesor Principal',
            destination: `${student.name} (${student.id})`,
            metadata: achievementMetadata,
            signed_by: ['Profesor Principal (P1)'], // Firma 1 de 2
            required_signatures: 2, 
            status: 'PENDING_VALIDATION',
            timestamp: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        };

        // Agregar a la nueva cola de validación del Validador
        setNftValidationQueue(prevQueue => [...prevQueue, newPendingNftTx]);
        
        setTimeout(() => {
            setLoading(false);
            setResult({ 
                type: 'success', 
                message: `NFT de Mérito (ID: ${newPendingNftTx.id}) iniciado. Requiere la firma de un Validador (P2).` 
            });
        }, 800);

    }, [studentsList, setResult]);


    // 2. FUNCIÓN PARA EL VALIDADOR (Paso del Validador/Prof. 2)
    const validateNftIssuance = useCallback((nftTxId, action) => {
        setLoading(true);

        const txIndex = nftValidationQueue.findIndex(tx => tx.id === nftTxId);
        if (txIndex === -1) {
            setResult({ type: 'error', message: 'Transacción NFT no encontrada.' });
            setLoading(false);
            return;
        }

        let txToProcess = nftValidationQueue[txIndex];

        if (action === 'REJECT') {
            // Rechazar: remover de la cola y notificar.
            setNftValidationQueue(prev => prev.filter(tx => tx.id !== nftTxId));
            setResult({ type: 'error', message: `NFT de Mérito ID ${nftTxId} RECHAZADO por el Validador.` });
        } else { // Aprobar
            // SIMULACIÓN DE FIRMA Y EJECUCIÓN EXITOSA
            // Aquí se añade la firma del Validador (P2) y se envía el XDR final a Stellar.
            
            // 1. Simular la emisión del NFT al estudiante.
            const newAchievement = {
                date: new Date().toLocaleDateString('es-ES'),
                name: `NFT: ${txToProcess.metadata.type}`,
                description: txToProcess.metadata.description,
                isNft: true,
                txId: txToProcess.id
            };
            
            // 2. Actualizar la lista de estudiantes (simulación: agregamos el logro)
            const updatedStudents = studentsList.map(s => 
                s.id === txToProcess.destination.split('(')[1].replace(')', '').trim()
                    ? { ...s, achievements: [...(s.achievements || []), newAchievement] }
                    : s
            );
            setStudentsList(updatedStudents);
            
            // 3. Remover de la cola de validación
            setNftValidationQueue(prev => prev.filter(tx => tx.id !== nftTxId));

            setResult({ 
                type: 'success', 
                message: `NFT de Mérito ID ${nftTxId} APROBADO por el Validador. El logro ya es inmutable en la red (simulado).` 
            });
        }

        setTimeout(() => {
            setLoading(false);
        }, 800);
        
    }, [nftValidationQueue, studentsList, setResult]);


    return {
        // Datos y Listas
        studentsList, professorsList, customTasks, rankedStudents, pendingTransactions, dailyTasks,
        
        // NUEVOS ESTADOS DE NFT
        nftValidationQueue, 

        // Estados de UI/Control
        selectedStudentId, setSelectedStudentId, activeTab, setActiveTab,
        loading, result, setResult, studentBalance, activeStudent,
        
        // Funciones de Gestión
        handleActivateStudent, handleSendReward, fetchAndRankStudents,
        updateStudentBalance, processTransaction,
        
        // NUEVAS FUNCIONES DE NFT
        initiateNftIssuance, 
        validateNftIssuance, 
    };
};