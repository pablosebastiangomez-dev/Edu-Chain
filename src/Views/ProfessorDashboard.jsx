import React, { useState } from 'react';
import AppLayout from '../components/AppLayout.jsx';
import { COLORS, getButtonStyle } from '../styles/theme.js';

const ProfessorDashboard = ({
	studentsList = [],
	selectedStudentId = '',
	setSelectedStudentId = () => {},
	activeStudent = null,
	handleSendReward = () => {},
	result = null,
	setResult = () => {},
	dailyTasks = [],
	customTasks = [],
	nftTypes = [],
	handleInitiateNftIssuance = () => {},
}) => {
	const [activeTab, setActiveTab] = useState('daily');
	const [nftForm, setNftForm] = useState({ achievementType: '', description: '' });

	// Calcular balance del estudiante seleccionado
	// studentsList ya viene como rankedStudents con balance incluido
	const selectedStudentBalance = activeStudent 
		? (studentsList.find(s => s.id === activeStudent.id)?.balance || 0)
		: 0;

	const kpis = [
		{ title: 'Estudiantes Registrados', value: studentsList.length, color: COLORS.primary },
		{ title: 'Balance Estudiante Seleccionado', value: `${selectedStudentBalance.toFixed(2)} TASK`, color: COLORS.secondary },
		{ title: 'Tareas Diarias', value: dailyTasks.length, color: COLORS.success },
		{ title: 'Tareas Personalizadas', value: customTasks.length, color: COLORS.error },
	];

	const handleTaskReward = async (task) => {
		if (!activeStudent) {
			setResult({ type: 'error', message: 'Por favor, selecciona un estudiante primero.' });
			return;
		}
		await handleSendReward(activeStudent, task);
	};

	const handleNftSubmit = () => {
		if (!activeStudent) {
			setResult({ type: 'error', message: 'Por favor, selecciona un estudiante primero.' });
			return;
		}
		if (!nftForm.achievementType || !nftForm.description) {
			setResult({ type: 'error', message: 'Por favor, completa todos los campos del NFT.' });
			return;
		}
		handleInitiateNftIssuance(activeStudent, nftForm.achievementType, nftForm.description);
		setNftForm({ achievementType: '', description: '' });
	};

	const getResultStyle = () => {
		if (!result) return {};
		const baseStyle = {
			padding: '12px 16px',
			borderRadius: '8px',
			marginBottom: '16px',
			fontSize: '14px',
		};
		switch (result.type) {
			case 'success':
				return { ...baseStyle, backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' };
			case 'error':
				return { ...baseStyle, backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' };
			case 'info':
				return { ...baseStyle, backgroundColor: '#d1ecf1', color: '#0c5460', border: '1px solid #bee5eb' };
			default:
				return baseStyle;
		}
	};

	return (
		<AppLayout
			title="Panel del Profesor"
			subtitle="Gestiona recompensas y logros de estudiantes"
			kpis={kpis}
		>
			{/* Selección de Estudiante */}
			<div style={{ 
				marginBottom: '24px', 
				padding: '16px', 
				backgroundColor: COLORS.background, 
				borderRadius: '8px',
				border: `1px solid ${COLORS.tabInactive}`
			}}>
				<label htmlFor="student-select" style={{ 
					display: 'block', 
					marginBottom: '8px', 
					fontWeight: 'bold',
					color: COLORS.text 
				}}>
					Estudiante:
				</label>
				<select
					id="student-select"
					value={selectedStudentId}
					onChange={(e) => setSelectedStudentId(e.target.value)}
					style={{ 
						width: '100%',
						padding: '10px',
						borderRadius: '6px',
						border: `1px solid ${COLORS.tabInactive}`,
						fontSize: '14px',
						backgroundColor: COLORS.cardBackground
					}}
				>
					{studentsList.map((s) => (
						<option key={s.id} value={s.id}>
							{s.name} - Balance: {(s.balance || 0).toFixed(2)} TASK
						</option>
					))}
				</select>
				{activeStudent && (
					<div style={{ marginTop: '12px', fontSize: '13px', color: COLORS.lightText }}>
						<strong>Estado:</strong> {activeStudent.accountStatus || 'PENDING'} | 
						<strong> Wallet:</strong> {activeStudent.wallet?.substring(0, 20)}...
					</div>
				)}
			</div>

			{/* Mensajes de Resultado */}
			{result && (
				<div style={getResultStyle()}>
					{result.message}
				</div>
			)}

			{/* Pestañas */}
			<div style={{ 
				display: 'flex', 
				gap: '8px', 
				marginBottom: '20px',
				borderBottom: `2px solid ${COLORS.tabInactive}`
			}}>
				<button
					onClick={() => setActiveTab('daily')}
					style={{
						...getButtonStyle(activeTab === 'daily' ? COLORS.primary : COLORS.tabInactive, false),
						borderRadius: '8px 8px 0 0',
						marginBottom: '-2px'
					}}
				>
					Tareas Diarias
				</button>
				<button
					onClick={() => setActiveTab('custom')}
					style={{
						...getButtonStyle(activeTab === 'custom' ? COLORS.primary : COLORS.tabInactive, false),
						borderRadius: '8px 8px 0 0',
						marginBottom: '-2px'
					}}
				>
					Tareas Personalizadas
				</button>
				<button
					onClick={() => setActiveTab('nft')}
					style={{
						...getButtonStyle(activeTab === 'nft' ? COLORS.primary : COLORS.tabInactive, false),
						borderRadius: '8px 8px 0 0',
						marginBottom: '-2px'
					}}
				>
					Emitir NFT
				</button>
			</div>

			{/* Contenido de Pestañas */}
			<div style={{ minHeight: '300px' }}>
				{/* Tareas Diarias */}
				{activeTab === 'daily' && (
					<div>
						<h3 style={{ color: COLORS.primary, marginBottom: '16px' }}>Tareas Diarias</h3>
						{dailyTasks.length === 0 ? (
							<p style={{ color: COLORS.lightText }}>No hay tareas diarias configuradas.</p>
						) : (
							<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
								{dailyTasks.map((task) => (
									<div
										key={task.id}
										style={{
											padding: '16px',
											border: `1px solid ${COLORS.tabInactive}`,
											borderRadius: '8px',
											display: 'flex',
											justifyContent: 'space-between',
											alignItems: 'center',
											backgroundColor: COLORS.cardBackground
										}}
									>
										<div>
											<h4 style={{ margin: 0, color: COLORS.text }}>{task.name}</h4>
											<p style={{ margin: '4px 0 0 0', color: COLORS.lightText, fontSize: '14px' }}>
												Recompensa: <strong>{task.reward} TASK</strong>
											</p>
										</div>
										<button
											onClick={() => handleTaskReward(task)}
											disabled={!activeStudent}
											style={getButtonStyle(COLORS.success, !activeStudent)}
										>
											Asignar Recompensa
										</button>
									</div>
								))}
							</div>
						)}
					</div>
				)}

				{/* Tareas Personalizadas */}
				{activeTab === 'custom' && (
					<div>
						<h3 style={{ color: COLORS.primary, marginBottom: '16px' }}>Tareas Personalizadas</h3>
						{customTasks.length === 0 ? (
							<p style={{ color: COLORS.lightText }}>No hay tareas personalizadas configuradas.</p>
						) : (
							<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
								{customTasks.map((task) => (
									<div
										key={task.id}
										style={{
											padding: '16px',
											border: `1px solid ${COLORS.tabInactive}`,
											borderRadius: '8px',
											display: 'flex',
											justifyContent: 'space-between',
											alignItems: 'center',
											backgroundColor: COLORS.cardBackground
										}}
									>
										<div>
											<h4 style={{ margin: 0, color: COLORS.text }}>{task.name}</h4>
											<p style={{ margin: '4px 0 0 0', color: COLORS.lightText, fontSize: '14px' }}>
												Recompensa: <strong>{task.reward} TASK</strong>
											</p>
										</div>
										<button
											onClick={() => handleTaskReward(task)}
											disabled={!activeStudent}
											style={getButtonStyle(COLORS.success, !activeStudent)}
										>
											Asignar Recompensa
										</button>
									</div>
								))}
							</div>
						)}
					</div>
				)}

				{/* Emisión de NFT */}
				{activeTab === 'nft' && (
					<div>
						<h3 style={{ color: COLORS.primary, marginBottom: '16px' }}>Emitir NFT de Logro</h3>
						<div style={{
							padding: '20px',
							border: `1px solid ${COLORS.tabInactive}`,
							borderRadius: '8px',
							backgroundColor: COLORS.cardBackground
						}}>
							<div style={{ marginBottom: '16px' }}>
								<label style={{ 
									display: 'block', 
									marginBottom: '8px', 
									fontWeight: 'bold',
									color: COLORS.text 
								}}>
									Tipo de Logro:
								</label>
								<select
									value={nftForm.achievementType}
									onChange={(e) => setNftForm({ ...nftForm, achievementType: e.target.value })}
									style={{
										width: '100%',
										padding: '10px',
										borderRadius: '6px',
										border: `1px solid ${COLORS.tabInactive}`,
										fontSize: '14px',
										backgroundColor: COLORS.cardBackground
									}}
								>
									<option value="">Selecciona un tipo...</option>
									{nftTypes.map((type, idx) => (
										<option key={idx} value={type}>{type}</option>
									))}
								</select>
							</div>

							<div style={{ marginBottom: '16px' }}>
								<label style={{ 
									display: 'block', 
									marginBottom: '8px', 
									fontWeight: 'bold',
									color: COLORS.text 
								}}>
									Descripción:
								</label>
								<textarea
									value={nftForm.description}
									onChange={(e) => setNftForm({ ...nftForm, description: e.target.value })}
									placeholder="Describe el logro del estudiante..."
									style={{
										width: '100%',
										padding: '10px',
										borderRadius: '6px',
										border: `1px solid ${COLORS.tabInactive}`,
										fontSize: '14px',
										minHeight: '100px',
										fontFamily: 'inherit',
										backgroundColor: COLORS.cardBackground,
										resize: 'vertical'
									}}
								/>
							</div>

							<button
								onClick={handleNftSubmit}
								disabled={!activeStudent || !nftForm.achievementType || !nftForm.description}
								style={getButtonStyle(
									COLORS.secondary, 
									!activeStudent || !nftForm.achievementType || !nftForm.description
								)}
							>
								Emitir NFT
							</button>

							{activeStudent && (
								<p style={{ 
									marginTop: '12px', 
									fontSize: '13px', 
									color: COLORS.lightText 
								}}>
									NFT será emitido para: <strong>{activeStudent.name}</strong>
								</p>
							)}
						</div>
					</div>
				)}
			</div>
		</AppLayout>
	);
};

export default ProfessorDashboard;