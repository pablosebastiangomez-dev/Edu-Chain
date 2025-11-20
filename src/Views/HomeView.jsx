import React, { useState } from 'react';
import AppLayout from '../components/AppLayout.jsx';
import { COLORS } from '../styles/theme.js';
import { registeredStudents } from '../data/mockData.js';
import EduChainLogo from '../assets/EduChainLogo.png';

const HomeView = ({ children = null }) => {
	const [role, setRole] = useState('professor');
	const [selectedStudent, setSelectedStudent] = useState(registeredStudents[0]?.id ?? '');

	const kpis = [
		{ title: 'Balance Emisor (TASK)', value: '1,200', color: COLORS.success },
		{ title: 'Estudiantes Registrados', value: registeredStudents.length, color: COLORS.primary },
		{ title: 'Balance de Profesor', value: '540', color: COLORS.secondary },
	];

	const titleNode = (
		<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
			<img src={EduChainLogo} alt="Edu&Chain" style={{ width: 56, height: 'auto' }} />
			<div>
				<div style={{ fontSize: '1.25rem', color: COLORS.primary, fontWeight: '700' }}>Edu & Chain</div>
				<div style={{ fontSize: '0.9rem', color: COLORS.lightText }}>Panel de gestión educativa</div>
			</div>
		</div>
	);

	const actions = (
		<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
			<select value={role} onChange={(e) => setRole(e.target.value)}>
				<option value="professor">Profesor</option>
				<option value="validator">Validador</option>
				<option value="student">Alumno</option>
			</select>
			{role === 'student' && (
				<select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)}>
					{registeredStudents.map(s => (
						<option key={s.id} value={s.id}>{s.name}</option>
					))}
				</select>
			)}
		</div>
	);

	return (
		<AppLayout
			title={titleNode}
			subtitle={null}
			actions={actions}
			kpis={kpis}
		>
			{children}
		</AppLayout>
	);
};

export default HomeView;