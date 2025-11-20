import React from 'react';
import AppLayout from '../components/AppLayout.jsx';
import { COLORS, getButtonStyle } from '../styles/theme.js';

const RankingView = ({ rankedStudents = [], loading = false, result = null, handleRefreshRanking = () => {}, warningBtnStyle }) => {
	const students = Array.isArray(rankedStudents) ? rankedStudents : [];

	const kpis = [
		{ title: 'Total Estudiantes', value: students.length, color: COLORS.primary },
		{ title: 'Top Balance', value: `${(students[0]?.balance ?? 0)} TASK`, color: COLORS.gold },
	];

	return (
		<AppLayout
			title="Ranking"
			subtitle="Top de estudiantes"
			actions={<button style={getButtonStyle(COLORS.primary, loading)} onClick={handleRefreshRanking} disabled={loading}>{loading ? 'Cargando...' : 'Actualizar'}</button>}
			kpis={kpis}
		>
			{result && <div style={{ margin: '8px 0' }}>{result.message}</div>}

			<ol>
				{students.map((s, i) => (
					<li key={s.id} style={{ margin: '6px 0' }}>
						{s.name} — <strong>{s.balance ?? 0} TASK</strong>
					</li>
				))}
			</ol>
		</AppLayout>
	);
};

export default RankingView;