import React, { useState, useEffect } from 'react';
import { X, Save, Settings } from 'lucide-react';
import { AppSettings, saveSettings } from '../services/persistenceService';

interface ConfigPanelProps {
    isOpen: boolean;
    onClose: () => void;
    currentSettings: AppSettings;
    onSave: (newSettings: AppSettings) => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ isOpen, onClose, currentSettings, onSave }) => {
    const [formData, setFormData] = useState<AppSettings>(currentSettings);

    useEffect(() => {
        setFormData(currentSettings);
    }, [currentSettings]);

    if (!isOpen) return null;

    const handleSave = async () => {
        await saveSettings(formData);
        onSave(formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">

                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-gray-600" />
                        Configuración del Sistema
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">

                    {/* Notary Code Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Código de Notaría (Base)</label>
                        <p className="text-xs text-gray-500">
                            El sistema generará automáticamente las variaciones (OCR flexible) para este código.
                        </p>
                        <input
                            type="text"
                            value={formData.notaryCode}
                            onChange={(e) => setFormData({ ...formData, notaryCode: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-esprint-500 focus:border-transparent font-mono text-lg"
                            placeholder="Ej: 1101007"
                        />
                    </div>

                    {/* Theme Selector */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Tema de Color</label>
                        <div className="grid grid-cols-3 gap-3">
                            {(['violet', 'blue', 'emerald'] as const).map((color) => (
                                <button
                                    key={color}
                                    onClick={() => setFormData({ ...formData, themeColor: color })}
                                    className={`
                    p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2
                    ${formData.themeColor === color ? 'border-gray-900 bg-gray-50' : 'border-transparent hover:bg-gray-50'}
                  `}
                                >
                                    <div className={`w-6 h-6 rounded-full ${color === 'violet' ? 'bg-violet-600' :
                                            color === 'blue' ? 'bg-blue-600' : 'bg-emerald-600'
                                        }`} />
                                    <span className="text-xs font-medium capitalize">{color}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Save className="w-4 h-4" />
                        Guardar Cambios
                    </button>
                </div>

            </div>
        </div>
    );
};
