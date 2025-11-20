import React from 'react';
import AppLayout from '../components/AppLayout.jsx';
import { COLORS, getButtonStyle } from '../styles/theme.js';

const ValidatorView = ({ pendingTransactions = [], nftValidationQueue = [], processTransaction = () => {}, validateNftIssuance = () => {}, loading = false, result = null }) => {
	const kpis = [
		{ title: 'Transacciones Pendientes', value: pendingTransactions.length, color: COLORS.error },
		{ title: 'NFTs Pendientes', value: nftValidationQueue.length, color: COLORS.secondary },
	];

	return (
		<AppLayout
			title="Validador"
			subtitle="Cola de validación"
			actions={<button style={getButtonStyle(COLORS.primary, loading)} disabled={loading}>Procesar cola</button>}
			kpis={kpis}
		>
			<section style={{ marginTop: 12 }}>
				<h3>Transacciones pendientes ({pendingTransactions.length})</h3>
				<ul>
					{pendingTransactions.map(tx => (
						<li key={tx.id} style={{ marginBottom: 6 }}>
							{tx.id} — {tx.task} — <button onClick={() => processTransaction(tx.id, 'APPROVE')}>Aprobar</button>
						</li>
					))}
				</ul>
			</section>

			<section style={{ marginTop: 12 }}>
				<h3>NFTs pendientes ({nftValidationQueue.length})</h3>
				<ul>
					{nftValidationQueue.map(q => (
						<li key={q.id} style={{ marginBottom: 6 }}>
							{q.id} — {q.metadata?.type} — <button onClick={() => validateNftIssuance(q.id, 'APPROVE')}>Firmar</button>
						</li>
					))}
				</ul>
			</section>

			{result && <div style={{ marginTop: 12 }}>{result.message}</div>}
		</AppLayout>
	);
};

export default ValidatorView;