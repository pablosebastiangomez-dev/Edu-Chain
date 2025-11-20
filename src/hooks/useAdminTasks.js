import { useCallback } from 'react';
import useLocalStorage from './useLocalStorage.js';
import { dailyTasks, academicRewards } from '../data/mockData.js';

// Combine seed tasks into a single list with stable ids
const seedTasks = () => {
    const all = [];
    if (Array.isArray(dailyTasks)) all.push(...dailyTasks);
    if (Array.isArray(academicRewards)) all.push(...academicRewards);
    return all.map(t => ({ ...t }));
};

export default function useAdminTasks() {
    const [tasks, setTasks] = useLocalStorage('edu:admin:tasks', seedTasks());

    const createTask = useCallback((task) => {
        // simple id guard: if no id, create one
        const id = task.id || `T-${Date.now().toString(36)}`;
        const t = { ...task, id };
        setTasks((prev = []) => [t, ...prev]);
        return t;
    }, [setTasks]);

    const deleteTask = useCallback((id) => {
        setTasks((prev = []) => prev.filter(t => t.id !== id));
    }, [setTasks]);

    const refresh = useCallback(() => {
        setTasks(seedTasks());
    }, [setTasks]);

    const tasksByType = {
        daily: (tasks || []).filter(t => !t.type || t.type === 'daily'),
        academic: (tasks || []).filter(t => t.type === 'academic'),
    };

    return { tasks: tasks || [], tasksByType, createTask, deleteTask, refresh };
}
