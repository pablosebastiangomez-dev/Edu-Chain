// src/hooks/useLocalStorage.js
import { useState, useEffect } from 'react';

function useLocalStorage(key, initialValue) {
    // Función para obtener el valor almacenado en localStorage o usar el valor inicial
    const getStoredValue = () => {
        try {
            const item = window.localStorage.getItem(key);
            // Si hay un valor, lo parseamos (JSON.parse)
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error reading localStorage key "${key}":`, error);
            // Si hay error (navegador no soporta, etc.), devolvemos el valor inicial
            return initialValue;
        }
    };

    // 1. Inicializa el estado con el valor de localStorage o el valor inicial
    const [storedValue, setStoredValue] = useState(getStoredValue);

    // 2. useEffect para escribir el estado en localStorage cada vez que cambia
    useEffect(() => {
        try {
            // No guardar si el valor es null/undefined, aunque el hook maneja bien el initialValue.
            if (storedValue !== undefined) {
                window.localStorage.setItem(key, JSON.stringify(storedValue));
            }
        } catch (error) {
            console.error(`Error setting localStorage key "${key}":`, error);
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue];
}

export default useLocalStorage;