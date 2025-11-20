import React from 'react';
import AppLayout from '../components/AppLayout.jsx';
import { COLORS, getButtonStyle } from '../styles/theme.js';

const StudentView = ({ student = null, handleActivateStudent = () => {}, result = null }) => {
	if (!student) return <div style={{ padding: 24 }}>Seleccione un estudiante</div>;

	const isActive = student.accountStatus === 'ACTIVE';

	const kpis = [
		{ title: `Balance de ${student.name}`, value: `${student.balance ?? 0} TASK`, color: COLORS.success },
		{ title: 'Estado de Cuenta', value: isActive ? 'ACTIVA' : 'INACTIVA', color: isActive ? COLORS.success : COLORS.error },
	];

	return (
		<AppLayout
			title={student.name}
			subtitle="Perfil del estudiante"
			actions={<button style={getButtonStyle(COLORS.primary, false)}>Enviar Mensaje</button>}
			kpis={kpis}
		>
			<p style={{ marginTop: 0 }}>ID: <strong>{student.id}</strong></p>
			<p>Balance: <strong>{student.balance ?? 0} TASK</strong></p>

			<div style={{ marginTop: 12 }}>
				<p style={{ margin: '6px 0' }}>Estado de la cuenta: <strong>{isActive ? 'ACTIVA' : 'INACTIVA'}</strong></p>
				{!isActive && (
					<button onClick={() => handleActivateStudent(student)} style={getButtonStyle(COLORS.primary, false)}>
						Activar mi Cuenta
					</button>
				)}
			</div>

			{result && (
				<div style={{ marginTop: 16, padding: 10, borderRadius: 6, background: result.type === 'success' ? '#e6ffed' : '#ffecec' }}>
					{result.message}
				</div>
			)}
		</AppLayout>
	);
};

export default StudentView;