import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { User, UserRole } from '../types';
import { useAuth } from './AuthContext';
import { Plus, Trash2, Shield, User as UserIcon, X, Save, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

export const UserManagement: React.FC = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // New User State
    const [newUserValues, setNewUserValues] = useState({ username: '', password: '', role: 'operator' as UserRole, name: '' });

    const loadUsers = async () => {
        setLoading(true);
        const list = await authService.getUsers();
        setUsers(list);
        setLoading(false);
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await authService.createUser(newUserValues);
            setIsCreating(false);
            setNewUserValues({ username: '', password: '', role: 'operator', name: '' });
            loadUsers();
        } catch (e: any) {
            alert(e.message || "Error al crear usuario");
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("¿Seguro que desea eliminar este usuario?")) return;
        try {
            await authService.deleteUser(id);
            loadUsers();
        } catch (e: any) {
            alert(e.message);
        }
    };

    if (user?.role !== 'admin') return <div className="p-4 text-red-500 font-bold">Acceso Denegado</div>;

    return (
        <div className="glass-panel p-6 rounded-2xl bg-white/80">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-esprint-600" />
                    Gestión de Usuarios
                </h3>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-esprint-600 text-white rounded-lg hover:bg-esprint-700 font-bold shadow-md transition-all"
                >
                    <Plus className="w-4 h-4" /> Nuevo Usuario
                </button>
            </div>

            {isCreating && (
                <div className="mb-6 p-4 bg-esprint-50 border border-esprint-100 rounded-xl animate-fade-in-up">
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nombre Completo</label>
                                <input
                                    className="glass-input w-full p-2.5 rounded-xl border border-slate-200"
                                    value={newUserValues.name}
                                    onChange={e => setNewUserValues({ ...newUserValues, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Usuario</label>
                                <input
                                    className="glass-input w-full p-2.5 rounded-xl border border-slate-200"
                                    value={newUserValues.username}
                                    onChange={e => setNewUserValues({ ...newUserValues, username: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Contraseña</label>
                                <input
                                    type="password"
                                    className="glass-input w-full p-2.5 rounded-xl border border-slate-200"
                                    value={newUserValues.password}
                                    onChange={e => setNewUserValues({ ...newUserValues, password: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Rol</label>
                                <select
                                    className="glass-input w-full p-2.5 rounded-xl border border-slate-200"
                                    value={newUserValues.role}
                                    onChange={e => setNewUserValues({ ...newUserValues, role: e.target.value as UserRole })}
                                >
                                    <option value="operator">Operador (Restringido)</option>
                                    <option value="admin">Administrador (Total)</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">Cancelar</button>
                            <button type="submit" className="px-4 py-2 bg-esprint-600 text-white font-bold rounded-lg shadow-lg shadow-esprint-500/20 hover:bg-esprint-700">Guardar Usuario</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-4 text-xs font-extrabold text-slate-400 uppercase">Usuario</th>
                            <th className="p-4 text-xs font-extrabold text-slate-400 uppercase">Rol</th>
                            <th className="p-4 text-xs font-extrabold text-slate-400 uppercase text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className={clsx("p-2 rounded-lg", u.role === 'admin' ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600")}>
                                            {u.role === 'admin' ? <Shield className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-700">{u.name}</p>
                                            <p className="text-xs text-slate-400">@{u.username}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={clsx("px-2 py-1 rounded-md text-xs font-bold border", u.role === 'admin' ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200")}>
                                        {u.role === 'admin' ? 'Administrador' : 'Operador'}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    {u.username !== 'admin' && (
                                        <button onClick={() => handleDelete(u.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
