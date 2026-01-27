import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { ShieldCheck, Lock, User, Loader2, AlertCircle } from 'lucide-react';

export const LoginScreen: React.FC = () => {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);
        try {
            const success = await login(username, password);
            if (!success) {
                setError("Credenciales incorrectas. Intente nuevamente.");
            }
        } catch (e) {
            setError("Error al iniciar sesión.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center p-4 bg-esprint-600 rounded-2xl shadow-lg shadow-esprint-500/30 mb-6">
                        <ShieldCheck className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Esprint Notarial</h1>
                    <p className="text-slate-500 mt-2 font-medium">Sistema de Seguridad Local</p>
                </div>

                <div className="glass-panel p-8 rounded-3xl shadow-xl border border-white/50 backdrop-blur-xl bg-white/60">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Usuario</label>
                            <div className="relative">
                                <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-white/50 border border-slate-200 focus:border-esprint-500 focus:ring-4 focus:ring-esprint-500/10 rounded-xl outline-none transition-all font-bold text-slate-700"
                                    placeholder="admin"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-white/50 border border-slate-200 focus:border-esprint-500 focus:ring-4 focus:ring-esprint-500/10 rounded-xl outline-none transition-all font-bold text-slate-700"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-lg flex items-center gap-2 animate-pulse">
                                <AlertCircle className="w-4 h-4" /> {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3.5 bg-gradient-to-r from-esprint-600 to-esprint-500 text-white font-bold rounded-xl shadow-lg shadow-esprint-500/20 hover:shadow-esprint-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Iniciar Sesión"}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-xs text-slate-400 font-medium">
                            Si olvidó su contraseña, contacte al administrador del sistema para restablecerla.
                        </p>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-xs text-slate-400">
                        &copy; {new Date().getFullYear()} Esprint Notarial <br />
                        <span className="text-slate-500 font-medium">
                            ● Sistema de Sincronización Centralizado
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
};
