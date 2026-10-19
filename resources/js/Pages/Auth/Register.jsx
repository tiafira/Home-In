import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
    const navigate = useNavigate();
    const { register } = useAuth();

    const [form, setForm] = useState({
        fullName: '',
        email: '',
        mobileNo: '',
        password: '',
    });

    const [errors, setErrors] = useState({});
    const [generalError, setGeneralError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: null }));
        }
        setGeneralError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setGeneralError('');
        setSubmitting(true);

        try {
            const user = await register({
                nama: form.fullName,
                email: form.email,
                no_hp: form.mobileNo,
                password: form.password,
            });

            if (['pemilik', 'admin'].includes(user.role)) {
                navigate('/admin/dashboard');
            } else {
                navigate('/unauthorized');
            }
        } catch (err) {
            if (err.response && err.response.data) {
                if (err.response.data.errors) {
                    const serverErrors = err.response.data.errors;
                    const mappedErrors = {};
                    if (serverErrors.nama) mappedErrors.fullName = serverErrors.nama[0];
                    if (serverErrors.email) mappedErrors.email = serverErrors.email[0];
                    if (serverErrors.no_hp) mappedErrors.mobileNo = serverErrors.no_hp[0];
                    if (serverErrors.password) mappedErrors.password = serverErrors.password[0];
                    setErrors(mappedErrors);
                } else if (err.response.data.message) {
                    setGeneralError(err.response.data.message);
                }
            } else {
                setGeneralError('Terjadi kesalahan koneksi. Silakan coba lagi.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 md:p-10 bg-[#EAF1FC]">
            <main className="w-full max-w-[1200px] min-h-[680px] bg-white rounded-[32px] shadow-card-xl p-4 flex flex-col lg:flex-row items-stretch overflow-hidden">
                <section className="w-full lg:w-1/2 rounded-[24px] bg-gradient-to-b from-[#2166d4] to-[#1a55b6] text-white p-8 md:p-10 flex flex-col justify-between relative overflow-hidden shrink-0">
                    <div aria-hidden="true" className="absolute inset-0 pointer-events-none select-none overflow-hidden">
                        <div className="absolute -top-16 -left-16 w-72 h-72 rounded-full bg-white/10 blur-2xl"></div>
                        <div className="absolute top-1/4 right-0 w-80 h-80 rounded-full bg-blue-400/20 blur-3xl"></div>
                        <div className="absolute top-20 right-12 w-28 h-8 rounded-full bg-white/10 blur-[1px]"></div>
                        <div className="absolute top-28 right-24 w-16 h-6 rounded-full bg-white/10"></div>
                        <div className="absolute top-44 left-8 w-20 h-7 rounded-full bg-white/10"></div>
                    </div>

                    <div className="relative z-10">
                        <a href="/" className="inline-flex items-center space-x-3 mb-6 hover:opacity-90 transition">
                            <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shrink-0">
                                <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 20 20">
                                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
                                </svg>
                            </div>
                            <span className="font-semibold text-white text-[20px] tracking-tight">Home-In</span>
                        </a>
                        <h1 className="text-[32px] font-bold leading-tight text-white max-w-md tracking-tight">
                            Kelola kost lebih mudah, semua dalam satu klik.
                        </h1>
                    </div>

                    <div className="relative z-10 w-full flex justify-center items-end mt-8 pb-2">
                        <div className="w-[92%] max-w-[460px] flex flex-col items-center justify-end relative">
                            
<svg className="w-full h-auto drop-shadow-xl" viewBox="0 0 500 360" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="250" cy="346" rx="240" ry="14" fill="rgba(0,0,0,0.15)"></ellipse>
    <rect x="20" y="338" width="460" height="12" rx="6" fill="#38BDF8" opacity="0.4"></rect>
    <rect x="25" y="340" width="450" height="8" rx="4" fill="#E2E8F0"></rect>
    <g opacity="0.25">
        <ellipse cx="90" cy="52" rx="34" ry="12" fill="white"></ellipse>
        <ellipse cx="110" cy="46" rx="22" ry="14" fill="white"></ellipse>
        <ellipse cx="390" cy="40" rx="36" ry="11" fill="white"></ellipse>
        <ellipse cx="412" cy="35" rx="20" ry="13" fill="white"></ellipse>
    </g>
    <g>
        <path d="M38 340 L52 260 L66 340 Z" fill="#34D399" opacity="0.85"></path>
        <path d="M44 340 L52 275 L60 340 Z" fill="#10B981"></path>
        <rect x="50" y="335" width="4" height="8" fill="#78350F"></rect>
        <circle cx="435" cy="300" r="26" fill="#34D399" opacity="0.9"></circle>
        <circle cx="445" cy="290" r="18" fill="#6EE7B7"></circle>
        <rect x="433" y="322" width="5" height="18" fill="#78350F"></rect>
        <path d="M412 340 Q425 320 440 340" fill="#10B981"></path>
        <path d="M445 340 Q455 324 468 340" fill="#059669"></path>
        <circle cx="75" cy="336" r="9" fill="#10B981"></circle>
        <circle cx="88" cy="338" r="7" fill="#34D399"></circle>
    </g>
    <rect x="95" y="110" width="310" height="230" rx="16" fill="#F8FAFC" stroke="#FFFFFF" strokeWidth="4"></rect>
    <rect x="110" y="105" width="280" height="12" rx="4" fill="#1E293B"></rect>
    <rect x="235" y="88" width="145" height="22" rx="4" fill="#0EA5E9"></rect>
    <text x="307" y="103" fill="#FFFFFF" fontSize="11" fontFamily="Montserrat, sans-serif" fontWeight="700" textAnchor="middle" letterSpacing="1.5">KOST HOME-IN</text>
    <rect x="95" y="215" width="310" height="8" fill="#E2E8F0"></rect>
    <line x1="245" y1="117" x2="245" y2="340" stroke="#CBD5E1" strokeWidth="3" strokeDasharray="6 4"></line>
    <rect x="122" y="132" width="48" height="52" rx="6" fill="#FEF08A" stroke="#E2E8F0" strokeWidth="2"></rect>
    <line x1="146" y1="132" x2="146" y2="184" stroke="#CBD5E1" strokeWidth="2"></line>
    <line x1="122" y1="158" x2="170" y2="158" stroke="#CBD5E1" strokeWidth="2"></line>
    <rect x="182" y="132" width="48" height="52" rx="6" fill="#BAE6FD" stroke="#E2E8F0" strokeWidth="2"></rect>
    <line x1="206" y1="132" x2="206" y2="184" stroke="#93C5FD" strokeWidth="2"></line>
    <line x1="182" y1="158" x2="230" y2="158" stroke="#93C5FD" strokeWidth="2"></line>
    <rect x="255" y="128" width="54" height="87" fill="#BAE6FD" rx="4"></rect>
    <circle cx="282" cy="142" r="7" fill="#FDE047"></circle>
    <path d="M278 152 C275 160 273 172 273 182 H291 C291 172 289 160 286 152 Z" fill="#EF4444"></path>
    <path d="M273 154 L264 140" stroke="#EF4444" strokeWidth="3" strokeLinecap="round"></path>
    <circle cx="263" cy="138" r="3" fill="#FCD5BD"></circle>
    <rect x="245" y="172" width="74" height="43" rx="4" fill="none" stroke="#94A3B8" strokeWidth="3"></rect>
    <line x1="255" y1="172" x2="255" y2="215" stroke="#94A3B8" strokeWidth="2"></line>
    <line x1="270" y1="172" x2="270" y2="215" stroke="#94A3B8" strokeWidth="2"></line>
    <line x1="285" y1="172" x2="285" y2="215" stroke="#94A3B8" strokeWidth="2"></line>
    <line x1="300" y1="172" x2="300" y2="215" stroke="#94A3B8" strokeWidth="2"></line>
    <line x1="315" y1="172" x2="315" y2="215" stroke="#94A3B8" strokeWidth="2"></line>
    <rect x="332" y="132" width="52" height="52" rx="6" fill="#FEF08A" stroke="#E2E8F0" strokeWidth="2"></rect>
    <line x1="358" y1="132" x2="358" y2="184" stroke="#CBD5E1" strokeWidth="2"></line>
    <line x1="332" y1="158" x2="384" y2="158" stroke="#CBD5E1" strokeWidth="2"></line>
    <rect x="116" y="206" width="120" height="9" rx="3" fill="#0284C7"></rect>
    <rect x="122" y="238" width="48" height="52" rx="6" fill="#BAE6FD" stroke="#E2E8F0" strokeWidth="2"></rect>
    <line x1="146" y1="238" x2="146" y2="290" stroke="#93C5FD" strokeWidth="2"></line>
    <line x1="122" y1="264" x2="170" y2="264" stroke="#93C5FD" strokeWidth="2"></line>
    <rect x="182" y="238" width="48" height="52" rx="6" fill="#FEF08A" stroke="#E2E8F0" strokeWidth="2"></rect>
    <line x1="206" y1="238" x2="206" y2="290" stroke="#CBD5E1" strokeWidth="2"></line>
    <line x1="182" y1="264" x2="230" y2="264" stroke="#CBD5E1" strokeWidth="2"></line>
    <rect x="252" y="226" width="70" height="8" rx="3" fill="#334155"></rect>
    <rect x="258" y="234" width="58" height="106" rx="4" fill="#0F172A"></rect>
    <rect x="263" y="240" width="48" height="96" rx="2" fill="#1E293B"></rect>
    <rect x="267" y="246" width="40" height="44" rx="2" fill="#FEF08A" opacity="0.7"></rect>
    <circle cx="303" cy="294" r="3.5" fill="#F59E0B"></circle>
    <rect x="252" y="335" width="70" height="5" fill="#94A3B8"></rect>
    <rect x="332" y="238" width="52" height="52" rx="6" fill="#BAE6FD" stroke="#E2E8F0" strokeWidth="2"></rect>
    <line x1="358" y1="238" x2="358" y2="290" stroke="#93C5FD" strokeWidth="2"></line>
    <line x1="332" y1="264" x2="384" y2="264" stroke="#93C5FD" strokeWidth="2"></line>
    <path d="M260 340 L248 360 H324 L312 340 Z" fill="#CBD5E1" opacity="0.8"></path>
    <circle cx="350" cy="330" r="14" stroke="#0F172A" strokeWidth="3.5" fill="#FFFFFF"></circle>
    <circle cx="388" cy="330" r="14" stroke="#0F172A" strokeWidth="3.5" fill="#FFFFFF"></circle>
    <path d="M350 330 L366 312 H378 L388 330" stroke="#EF4444" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
    <path d="M362 316 L372 328 H388" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"></path>
    <rect x="360" y="306" width="18" height="6" rx="2" fill="#0F172A"></rect>
    <path d="M384 314 L380 298 H372" stroke="#334155" strokeWidth="3" strokeLinecap="round"></path>
    <circle cx="384" cy="300" r="3.5" fill="#FEF08A"></circle>
    <path d="M235 340 Q239 316 244 340" fill="#10B981"></path>
    <rect x="237" y="332" width="8" height="8" rx="2" fill="#F59E0B"></rect>
    <circle cx="241" cy="326" r="6" fill="#34D399"></circle>
</svg>

                        </div>
                    </div>
                </section>

                <section className="w-full lg:w-1/2 bg-white flex items-center justify-center p-6 md:p-8 shrink-0">
                    <div className="w-full max-w-[420px] flex flex-col justify-center">
                        <h2 className="text-[28px] font-bold text-[#1F2A44] tracking-tight mb-5">
                            Sign up
                        </h2>

                        {generalError && (
                            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-[10px] flex items-center gap-2">
                                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <span>{generalError}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-3.5">
                            <div>
                                <label className="block text-[13px] font-medium text-[#8A94A6] mb-1" htmlFor="fullName">
                                    Full Name
                                </label>
                                <input
                                    className={'w-full h-[48px] bg-[#F4F6FA] border ' + (errors.fullName ? 'border-rose-400 focus:ring-rose-500' : 'border-[#E2E8F0] focus:ring-[#1E5FC9]') + ' rounded-[10px] px-4 text-[15px] text-[#1F2A44] placeholder-[#8A94A6] focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-colors'}
                                    id="fullName"
                                    name="fullName"
                                    placeholder="Budi Santoso"
                                    required
                                    type="text"
                                    value={form.fullName}
                                    onChange={handleChange}
                                />
                                {errors.fullName && (
                                    <p className="text-rose-500 text-xs mt-1">{errors.fullName}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-[13px] font-medium text-[#8A94A6] mb-1" htmlFor="email">
                                    Email Address
                                </label>
                                <input
                                    className={'w-full h-[48px] bg-[#F4F6FA] border ' + (errors.email ? 'border-rose-400 focus:ring-rose-500' : 'border-[#E2E8F0] focus:ring-[#1E5FC9]') + ' rounded-[10px] px-4 text-[15px] text-[#1F2A44] placeholder-[#8A94A6] focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-colors'}
                                    id="email"
                                    name="email"
                                    placeholder="nama@email.com"
                                    required
                                    type="email"
                                    value={form.email}
                                    onChange={handleChange}
                                />
                                {errors.email && (
                                    <p className="text-rose-500 text-xs mt-1">{errors.email}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-[13px] font-medium text-[#8A94A6] mb-1" htmlFor="mobileNo">
                                    Mobile No
                                </label>
                                <input
                                    className={'w-full h-[48px] bg-[#F4F6FA] border ' + (errors.mobileNo ? 'border-rose-400 focus:ring-rose-500' : 'border-[#E2E8F0] focus:ring-[#1E5FC9]') + ' rounded-[10px] px-4 text-[15px] text-[#1F2A44] placeholder-[#8A94A6] focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-colors'}
                                    id="mobileNo"
                                    name="mobileNo"
                                    placeholder="08123456789"
                                    required
                                    type="tel"
                                    value={form.mobileNo}
                                    onChange={handleChange}
                                />
                                {errors.mobileNo && (
                                    <p className="text-rose-500 text-xs mt-1">{errors.mobileNo}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-[13px] font-medium text-[#8A94A6] mb-1" htmlFor="password">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        className={'w-full h-[48px] bg-[#F4F6FA] border ' + (errors.password ? 'border-rose-400 focus:ring-rose-500' : 'border-[#E2E8F0] focus:ring-[#1E5FC9]') + ' rounded-[10px] px-4 pr-11 text-[15px] text-[#1F2A44] placeholder-[#8A94A6] focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-colors'}
                                        id="password"
                                        name="password"
                                        placeholder="Minimal 8 karakter"
                                        required
                                        type={showPassword ? 'text' : 'password'}
                                        value={form.password}
                                        onChange={handleChange}
                                    />
                                    <button
                                        type="button"
                                        aria-label="Toggle password visibility"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8A94A6] hover:text-[#1E5FC9] transition-colors focus:outline-none cursor-pointer"
                                    >
                                        {showPassword ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="text-rose-500 text-xs mt-1">{errors.password}</p>
                                )}
                            </div>

                            <p className="text-[13px] text-[#8A94A6] leading-relaxed my-3">
                                You are agreeing to the{' '}
                                <a className="text-[#1E5FC9] hover:underline font-medium" href="#!">
                                    Terms of Services
                                </a>{' '}
                                and{' '}
                                <a className="text-[#1E5FC9] hover:underline font-medium" href="#!">
                                    Privacy Policy
                                </a>
                            </p>

                            <div className="pt-1">
                                <button
                                    className="w-full h-[50px] bg-[#1E5FC9] hover:bg-[#184ea8] text-white font-semibold text-[16px] rounded-[10px] shadow-md transition duration-200 ease-in-out flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1E5FC9] disabled:opacity-70 cursor-pointer"
                                    type="submit"
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Mendaftarkan...</span>
                                        </div>
                                    ) : (
                                        'Get Started'
                                    )}
                                </button>
                            </div>
                        </form>

                        <p className="mt-[18px] text-center text-[14px] text-[#8A94A6]">
                            Already a member?{' '}
                            <Link to="/login" className="font-semibold text-[#1E5FC9] hover:underline ml-1">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </section>
            </main>
        </div>
    );
}
