'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { Loader2, Lock, Mail, User, Phone, Globe, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    whatsapp: '',
    pais: 'Colombia',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/register', {
        nombre: formData.nombre.trim(),
        email: formData.email.trim().toLowerCase(),
        whatsapp: formData.whatsapp.trim(),
        pais: formData.pais,
        password: formData.password,
      });

      const { access_token, user } = response.data;
      
      // Guardar token y datos del usuario
      Cookies.set('token', access_token, { expires: 7 });
      Cookies.set('user', JSON.stringify(user), { expires: 7 });
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/client/dashboard');
      }, 1200);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (Array.isArray(msg)) {
        setError(msg.join(', '));
      } else if (typeof msg === 'string') {
        setError(msg);
      } else {
        setError('Error al registrar tu cuenta. Por favor verifica tus datos.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md my-4">
      <div className="bg-gray-900/80 border border-gray-800 backdrop-blur-xl rounded-2xl shadow-2xl p-8 transition-all">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white tracking-tight">Crea tu cuenta</h1>
          <p className="text-sm text-gray-400 mt-1">
            Empieza a gestionar y disfrutar tus servicios de streaming
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="flex items-start gap-3 bg-red-950/50 border border-red-800/80 text-red-200 px-4 py-3 rounded-xl text-sm animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-3 bg-emerald-950/50 border border-emerald-800/80 text-emerald-200 px-4 py-3 rounded-xl text-sm animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="flex-1">¡Cuenta creada con éxito! Redirigiendo al portal...</div>
            </div>
          )}

          {/* Nombre Completo */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
              Nombre Completo
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className="w-full bg-gray-950/60 border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
                placeholder="Ej. Juan Pérez"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-gray-950/60 border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
                placeholder="juan@ejemplo.com"
                required
              />
            </div>
          </div>

          {/* WhatsApp */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
              WhatsApp (con código de país)
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="tel"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleChange}
                className="w-full bg-gray-950/60 border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
                placeholder="+57 300 123 4567"
                required
              />
            </div>
            <p className="text-[11px] text-gray-500">Aquí recibirás automáticamente las credenciales de tus cuentas.</p>
          </div>

          {/* País */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
              País
            </label>
            <div className="relative">
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
              <select
                name="pais"
                value={formData.pais}
                onChange={handleChange}
                className="w-full bg-gray-950/60 border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all appearance-none cursor-pointer"
              >
                <option value="Colombia">Colombia</option>
                <option value="México">México</option>
                <option value="Perú">Perú</option>
                <option value="Argentina">Argentina</option>
                <option value="Chile">Chile</option>
                <option value="Ecuador">Ecuador</option>
                <option value="España">España</option>
                <option value="Estados Unidos">Estados Unidos</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>

          {/* Contraseña */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
              Contraseña (mínimo 6 caracteres)
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="password"
                name="password"
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-gray-950/60 border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {/* Botón de Registro */}
          <button
            type="submit"
            disabled={loading || success}
            className="w-full mt-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-medium py-2.5 rounded-xl shadow-lg shadow-red-600/25 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Registrando...</span>
              </>
            ) : (
              <>
                <span>Registrarme</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Link a Login */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            ¿Ya tienes una cuenta registrada?{' '}
            <Link href="/login" className="text-red-500 hover:text-red-400 font-semibold transition-colors">
              Inicia sesión aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
