import { User } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const authService = {
    async login(username: string, password: string): Promise<User | null> {
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (!response.ok) return null;
            const { user, token } = await response.json();
            if (token) sessionStorage.setItem('esprint_token', token);
            return user;
        } catch (error) {
            console.error('API Login Error:', error);
            return null;
        }
    },

    async getUsers(): Promise<User[]> {
        try {
            const response = await fetch(`${API_URL}/users`);
            if (!response.ok) return [];
            return response.json();
        } catch (error) {
            console.error('API GetUsers Error:', error);
            return [];
        }
    },

    async createUser(user: Omit<User, 'id'>): Promise<void> {
        const response = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Error al crear usuario');
        }
    },

    async deleteUser(id: string): Promise<void> {
        const response = await fetch(`${API_URL}/users/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Error al eliminar');
    }
};
