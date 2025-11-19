// src/App.jsx
// -----------------------------------------------------------
import React, { useState, useEffect, useMemo, useCallback } from 'react';

// Importamos el hook que contiene toda la lógica y datos
import { useEduChainData } from './hooks/useEduChainData'; 

// --- IMPORTACIONES DE COMPONENTES MODULARIZADOS RESTAURADAS ---
// Asegúrate de que estos archivos existan en tu estructura (ej: src/views/...)
import SplashScreen from './components/SplashScreen'; 
import StudentView from './views/StudentView';
import ProfessorDashboard from './views/ProfessorDashboard';
import AdminTaskManagement from './views/AdminTaskManagement';
import RankingView from './views/RankingView'; 
import ValidatorView from './views/ValidatorView'; 

import EduChainSmallLogo from './assets/EduChainLogo.png'; 

// --- COLORES Y ESTILOS AUXILIARES ---
const COLORS = {
    primary: '#0047AB', secondary: '#DAA520', success: '#2ecc71', error: '#e74c3c', 
    background: '#f4f7f9', text: '#34495e', lightText: '#7f8c8d', 
};

// --- KEYFRAMES SIMULADOS PARA EL SPINNER ---
const GlobalStyle = () => (
    <style>
        {`
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        `}
    </style>
);

// --- FUNCIÓN AUXILIAR: ESTILOS DE BOTONES ---
const getButtonStyle = (backgroundColor, disabled) => ({
    backgroundColor: disabled ? '#ccc' : backgroundColor,
    color: 'white',
    padding: '10px 15px',
    border: 'none',
    borderRadius: '4px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 'bold',
    transition: 'background-color 0.3s',
    margin: '5px',
    minWidth: '100px',
});

const primaryBtnStyle = (disabled) => getButtonStyle(COLORS.primary, disabled);
const successBtnStyle = (disabled) => getButtonStyle(COLORS.success, disabled);
const warningBtnStyle = (disabled) => getButtonStyle(COLORS.secondary, disabled);
const errorBtnStyle = (disabled) => getButtonStyle(COLORS.error, disabled);


const App = () => {
    // 1. ESTADO DE UI
    const [currentUser, setCurrentUser] = useState('general_viewer');
    // --- ESTADO RESTAURADO PARA EL SPLASH SCREEN ---
    const [showSplash, setShowSplash] = useState(true); 

    // 2. HOOK DE DATOS (Centralizado)
    // Usamos el operador spread (...) para obtener todo lo que necesitamos del hook
    const eduChainData = useEduChainData();
    
    // Desestructuramos las variables y funciones para un uso limpio
    const {
        studentsList, rankedStudents, pendingTransactions, activeStudent,
        selectedStudentId, setSelectedStudentId,
        activeTab, setActiveTab,
        loading, result, setResult, issuerBalance, studentBalance,
        handleActivateStudent, handleSendReward, fetchAndRankStudents,
        updateStudentBalance, processTransaction, 
        selectedDailyTaskId, setSelectedDailyTaskId, 
        selectedAcademicRewardId, setSelectedAcademicRewardId, 
        customTasks,
        // La función handleAddCustomTask en el hook se llama handleSetCustomTasks en tu código original, 
        // asumiré que la función de gestión de tareas es handleAddCustomTask, como la definimos.
        // Si no existe handleSetCustomTasks, usa handleAddCustomTask.
        handleAddCustomTask, 
    } = eduChainData; 
    

    // --- Lógica del Splash Screen RESTAURADA ---
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowSplash(false);
        }, 1500); 
        return () => clearTimeout(timer);
    }, []);


    // --- Lógica de Vistas (Balance) ---
    useEffect(() => {
        if (activeStudent) {
            updateStudentBalance(activeStudent); 
        }
    }, [activeStudent, updateStudentBalance, studentsList]); 

    
    const handleUserChange = (e) => {
        const newRole = e.target.value;
        setCurrentUser(newRole);
        
        // Reset de estados al cambiar de rol
        setSelectedStudentId(studentsList[0]?.id || ''); 
        setActiveTab('daily'); 
        setResult(null); 
    };

    // --- RENDERIZADO CONDICIONAL DE VISTAS (CASOS RESTAURADOS) ---
    let mainView;
    switch (currentUser) {
        case 'general_viewer': // <-- CASO RANKING/ESPECTADOR RESTAURADO
            mainView = (
                <RankingView
                    rankedStudents={rankedStudents} 
                    loading={loading}
                    result={result}
                    handleRefreshRanking={fetchAndRankStudents}
                    warningBtnStyle={warningBtnStyle}
                />
            );
            break;
        case 'admin':
            mainView = (
                <AdminTaskManagement
                    customTasks={customTasks}
                    handleAddCustomTask={handleAddCustomTask} // Usamos la función correcta
                    studentsList={studentsList}
                    issuerBalance={issuerBalance}
                    setResult={setResult} 
                    result={result}
                    primaryBtnStyle={primaryBtnStyle}
                    errorBtnStyle={errorBtnStyle}
                    successBtnStyle={successBtnStyle}
                />
            );
            break;
        case 'professor':
            mainView = (
                <ProfessorDashboard
                    studentsList={studentsList}
                    selectedStudentId={selectedStudentId}
                    setSelectedStudentId={setSelectedStudentId}
                    loading={loading}
                    studentBalance={studentBalance}
                    activeStudent={activeStudent}
                    handleActivateStudent={handleActivateStudent}
                    handleSendReward={handleSendReward} // Pasamos la función directamente
                    warningBtnStyle={warningBtnStyle}
                    primaryBtnStyle={primaryBtnStyle}
                    successBtnStyle={successBtnStyle} 
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    selectedDailyTaskId={selectedDailyTaskId}
                    setSelectedDailyTaskId={setSelectedDailyTaskId}
                    selectedAcademicRewardId={selectedAcademicRewardId}
                    setSelectedAcademicRewardId={setSelectedAcademicRewardId}
                    customTasks={customTasks}
                    result={result}
                    setResult={setResult} 
                />
            );
            break;
        case 'student': // <-- CASO ESTUDIANTE RESTAURADO
            if (!activeStudent) {
                mainView = <p style={{ textAlign: 'center', marginTop: '50px', color: COLORS.error, fontWeight: 'bold' }}>Selecciona un estudiante primero en el selector de rol.</p>;
            } else {
                mainView = (
                    <StudentView
                        activeStudent={activeStudent}
                        studentBalance={studentBalance}
                        result={result}
                        handleActivateStudent={() => handleActivateStudent(activeStudent)}
                        warningBtnStyle={warningBtnStyle}
                        loading={loading}
                    />
                );
            }
            break;
        case 'validator': 
            mainView = (
                <ValidatorView
                    loading={loading}
                    result={result}
                    setResult={setResult}
                    successBtnStyle={successBtnStyle}
                    errorBtnStyle={errorBtnStyle}
                    pendingTransactions={pendingTransactions}
                    processTransaction={processTransaction}
                />
            );
            break;
        default:
            mainView = <p style={{ textAlign: 'center', marginTop: '50px' }}>Selecciona un rol para empezar.</p>;
            break;
    }


    // --- RENDERIZADO CONDICIONAL DEL SPLASH SCREEN ---
    if (showSplash) {
        return <SplashScreen onClose={() => setShowSplash(false)} />;
    }

    // --- VISTA PRINCIPAL DE LA APP ---
    return (
        <>
            <GlobalStyle />
            <div style={{ backgroundColor: COLORS.background, minHeight: '100vh', padding: '20px' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    
                    {/* --- CABECERA --- */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <img src={EduChainSmallLogo} alt="EduChain Logo" style={{ height: '50px', marginRight: '15px' }} />
                            <h1 style={{ color: COLORS.primary, fontSize: '1.8em', margin: 0 }}>Edu & Chain Dashboard</h1>
                        </div>
                        
                        {/* Selector de Rol */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                            <label htmlFor="role-select" style={{ fontSize: '12px', color: COLORS.lightText, marginBottom: '-5px' }}>Cambiar Rol:</label>
                            <select 
                                id="role-select" 
                                value={currentUser} 
                                onChange={handleUserChange}
                                style={{ padding: '8px', borderRadius: '4px' }}
                            >
                                <option value="general_viewer">Espectador General (Ranking)</option>
                                <option value="admin">Administrador (Gestor)</option>
                                <option value="professor">Profesor (Pagos)</option>
                                <option value="student">Estudiante</option>
                                <option value="validator">Validador (Transacciones)</option>
                            </select>
                            <p style={{ margin: 0, fontSize: '12px', color: COLORS.text }}>
                                <strong style={{ marginRight: '5px' }}>Usuario:</strong> {currentUser}
                            </p>
                        </div>
                    </div>
                    
                    <hr style={{ borderColor: COLORS.primary, marginBottom: '20px' }} />

                    {/* --- RENDERIZADO CONDICIONAL --- */}
                    {mainView}
                    
                </div>
            </div>
        </>
    );
}

export default App;