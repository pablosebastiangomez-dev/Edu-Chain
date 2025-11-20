import React, { useState } from 'react';
import AppLayout from '../components/AppLayout.jsx';
import { COLORS, getButtonStyle } from '../styles/theme.js';
import useAdminTasks from '../hooks/useAdminTasks.js';

const AdminTaskManagement = (props) => {
	const provided = Object.prototype.hasOwnProperty.call(props, 'tasks');
	const { tasks: propTasks = [], onCreate = null, onDelete = null } = props;

	const { tasks: hookTasks, createTask, deleteTask } = useAdminTasks();
	const tasks = provided ? propTasks : hookTasks;

	const [showFormDaily, setShowFormDaily] = useState(false);
	const [showFormAcademic, setShowFormAcademic] = useState(false);
	const [formDaily, setFormDaily] = useState({ name: '', amount: 0 });
	const [formAcademic, setFormAcademic] = useState({ name: '', amount: 0 });

	const handleCreate = (type) => {
		const form = type === 'academic' ? formAcademic : formDaily;
		if (provided) {
			if (typeof onCreate === 'function') onCreate({ ...form, type });
		} else {
			createTask({ name: form.name, amount: Number(form.amount), type });
		}
		if (type === 'academic') setFormAcademic({ name: '', amount: 0 });
		else setFormDaily({ name: '', amount: 0 });
		if (type === 'academic') setShowFormAcademic(false);
		else setShowFormDaily(false);
	};

	const handleDelete = (id) => {
		if (provided) {
			if (typeof onDelete === 'function') onDelete(id);
		} else {
			deleteTask(id);
		}
	};

	const kpis = [
		{ title: 'Tareas Sociales', value: (tasks || []).filter(t => !t.type || t.type === 'daily').length, color: COLORS.primary },
		{ title: 'Logros Académicos', value: (tasks || []).filter(t => t.type === 'academic').length, color: COLORS.gold },
	];

	return (
		<AppLayout
			title="Administración"
			subtitle="Gestión de tareas"
			actions={
				<div>
					<button style={getButtonStyle(COLORS.secondary, false)} onClick={() => setShowFormDaily((s) => !s)}>
						{showFormDaily ? 'Cancelar' : 'Crear nueva tarea'}
					</button>
				</div>
			}
			kpis={kpis}
		>
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
				{/* Social / Daily tasks */}
				<section>
					<h3>Tareas Sociales</h3>
					<div style={{ marginBottom: 12 }}>
						<button style={getButtonStyle(COLORS.primary, false)} onClick={() => setShowFormDaily(s => !s)}>
							{showFormDaily ? 'Cancelar' : 'Crear tarea social'}
						</button>
					</div>
					{showFormDaily && (
						<div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
							<input placeholder="Nombre" value={formDaily.name} onChange={(e) => setFormDaily(f => ({ ...f, name: e.target.value }))} />
							<input type="number" placeholder="Amount" value={formDaily.amount} onChange={(e) => setFormDaily(f => ({ ...f, amount: e.target.value }))} style={{ width: 120 }} />
							<button onClick={() => handleCreate('daily')} style={getButtonStyle(COLORS.primary, false)}>Crear</button>
						</div>
					)}

					<ul style={{ marginTop: 12 }}>
						{Array.isArray(tasks) && tasks.filter(t => !t.type || t.type === 'daily').map((t) => (
							<li key={t.id} style={{ marginBottom: 8 }}>
								{t.name} — <strong>{t.amount ?? 0} TASK</strong> — <button onClick={() => handleDelete(t.id)}>Eliminar</button>
							</li>
						))}
					</ul>
				</section>

				{/* Academic rewards */}
				<section>
					<h3>Logros Académicos</h3>
					<div style={{ marginBottom: 12 }}>
						<button style={getButtonStyle(COLORS.secondary, false)} onClick={() => setShowFormAcademic(s => !s)}>
							{showFormAcademic ? 'Cancelar' : 'Crear logro académico'}
						</button>
					</div>
					{showFormAcademic && (
						<div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
							<input placeholder="Nombre" value={formAcademic.name} onChange={(e) => setFormAcademic(f => ({ ...f, name: e.target.value }))} />
							<input type="number" placeholder="Amount" value={formAcademic.amount} onChange={(e) => setFormAcademic(f => ({ ...f, amount: e.target.value }))} style={{ width: 120 }} />
							<button onClick={() => handleCreate('academic')} style={getButtonStyle(COLORS.primary, false)}>Crear</button>
						</div>
					)}

					<ul style={{ marginTop: 12 }}>
						{Array.isArray(tasks) && tasks.filter(t => t.type === 'academic').map((t) => (
							<li key={t.id} style={{ marginBottom: 8 }}>
								{t.name} — <strong>{t.amount ?? 0} TASK</strong> — <button onClick={() => handleDelete(t.id)}>Eliminar</button>
							</li>
						))}
					</ul>
				</section>
			</div>
		</AppLayout>
	);
};

export default AdminTaskManagement;