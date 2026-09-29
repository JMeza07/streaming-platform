"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AffiliatesService = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var AffiliatesService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AffiliatesService = _classThis = /** @class */ (function () {
        function AffiliatesService_1(prisma, whatsappService) {
            this.prisma = prisma;
            this.whatsappService = whatsappService;
            this.logger = new common_1.Logger(AffiliatesService.name);
            // Configuración de comisiones por rango
            this.COMMISSION_RATES = {
                bronce: { nivel1: 0.10, nivel2: 0.03 }, // 10% directa, 3% indirecta
                plata: { nivel1: 0.15, nivel2: 0.05 }, // 15% directa, 5% indirecta
                oro: { nivel1: 0.20, nivel2: 0.07 }, // 20% directa, 7% indirecta
                diamante: { nivel1: 0.25, nivel2: 0.10 }, // 25% directa, 10% indirecta
            };
            // Umbrales para subir de rango (ventas mensuales en USD)
            this.RANK_THRESHOLDS = {
                bronce: 0,
                plata: 200,
                oro: 800,
                diamante: 2000,
            };
        }
        // ============================================
        // REGISTRO Y GESTIÓN DE AFILIADOS
        // ============================================
        // REGISTRAR NUEVO AFILIADO
        AffiliatesService_1.prototype.registerAffiliate = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var user, existingAffiliate, referidorId, referidor, affiliate;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.user.findUnique({
                                where: { id: dto.userId },
                            })];
                        case 1:
                            user = _a.sent();
                            if (!user)
                                throw new common_1.NotFoundException('Usuario no encontrado');
                            return [4 /*yield*/, this.prisma.affiliate.findUnique({
                                    where: { codigoReferido: dto.codigoReferido },
                                })];
                        case 2:
                            existingAffiliate = _a.sent();
                            if (existingAffiliate) {
                                throw new common_1.BadRequestException('Este código de referido ya está en uso');
                            }
                            referidorId = null;
                            if (!dto.codigoReferidor) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.prisma.affiliate.findUnique({
                                    where: { codigoReferido: dto.codigoReferidor },
                                })];
                        case 3:
                            referidor = _a.sent();
                            if (referidor) {
                                referidorId = referidor.id;
                            }
                            _a.label = 4;
                        case 4: return [4 /*yield*/, this.prisma.affiliate.create({
                                data: {
                                    userId: dto.userId,
                                    codigoReferido: dto.codigoReferido,
                                    referidoPor: referidorId,
                                    rango: 'bronce',
                                    walletBalance: 0,
                                },
                                include: {
                                    user: { select: { nombre: true, email: true } },
                                },
                            })];
                        case 5:
                            affiliate = _a.sent();
                            return [2 /*return*/, {
                                    message: 'Afiliado registrado exitosamente',
                                    affiliate: {
                                        id: affiliate.id,
                                        codigoReferido: affiliate.codigoReferido,
                                        nombre: affiliate.user.nombre,
                                        email: affiliate.user.email,
                                        rango: affiliate.rango,
                                        linkReferido: "https://tu-marca.com/ref/".concat(affiliate.codigoReferido),
                                    },
                                }];
                    }
                });
            });
        };
        // OBTENER PERFIL DEL AFILIADO (Con estadísticas)
        AffiliatesService_1.prototype.getAffiliateProfile = function (affiliateId) {
            return __awaiter(this, void 0, void 0, function () {
                var affiliate, inicioMes, ventasDelMes, totalGanado, referidosDirectos, ventasMensuales, rangoCalculado;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.prisma.affiliate.findUnique({
                                where: { id: affiliateId },
                                include: {
                                    user: { select: { nombre: true, email: true, phone: true } },
                                    commissions: {
                                        where: { estado: 'disponible' },
                                        select: { montoComision: true },
                                    },
                                },
                            })];
                        case 1:
                            affiliate = _c.sent();
                            if (!affiliate)
                                throw new common_1.NotFoundException('Afiliado no encontrado');
                            inicioMes = new Date();
                            inicioMes.setDate(1);
                            inicioMes.setHours(0, 0, 0, 0);
                            return [4 /*yield*/, this.prisma.commission.aggregate({
                                    where: {
                                        affiliateId: affiliateId,
                                        createdAt: { gte: inicioMes },
                                    },
                                    _sum: { montoComision: true },
                                })];
                        case 2:
                            ventasDelMes = _c.sent();
                            return [4 /*yield*/, this.prisma.commission.aggregate({
                                    where: { affiliateId: affiliateId },
                                    _sum: { montoComision: true },
                                })];
                        case 3:
                            totalGanado = _c.sent();
                            return [4 /*yield*/, this.prisma.affiliate.count({
                                    where: { referidoPor: affiliateId },
                                })];
                        case 4:
                            referidosDirectos = _c.sent();
                            ventasMensuales = ((_a = ventasDelMes._sum.montoComision) === null || _a === void 0 ? void 0 : _a.toNumber()) || 0;
                            rangoCalculado = this.calcularRango(ventasMensuales);
                            if (!(rangoCalculado !== affiliate.rango)) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.prisma.affiliate.update({
                                    where: { id: affiliateId },
                                    data: { rango: rangoCalculado },
                                })];
                        case 5:
                            _c.sent();
                            _c.label = 6;
                        case 6: return [2 /*return*/, {
                                id: affiliate.id,
                                nombre: affiliate.user.nombre,
                                email: affiliate.user.email,
                                whatsapp: affiliate.user.phone,
                                codigoReferido: affiliate.codigoReferido,
                                linkReferido: "https://tu-marca.com/ref/".concat(affiliate.codigoReferido),
                                rango: rangoCalculado,
                                walletBalance: affiliate.walletBalance.toNumber(),
                                totalGanado: ((_b = totalGanado._sum.montoComision) === null || _b === void 0 ? void 0 : _b.toNumber()) || 0,
                                ventasMesActual: ventasMensuales,
                                referidosDirectos: referidosDirectos,
                                progresoRango: this.calcularProgresoRango(ventasMensuales, rangoCalculado),
                            }];
                    }
                });
            });
        };
        // LISTAR TODOS LOS AFILIADOS (Admin)
        AffiliatesService_1.prototype.getAllAffiliates = function () {
            return __awaiter(this, void 0, void 0, function () {
                var affiliates;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.affiliate.findMany({
                                include: {
                                    user: { select: { nombre: true, email: true, phone: true } },
                                    _count: {
                                        select: {
                                            commissions: true,
                                        },
                                    },
                                },
                                orderBy: { createdAt: 'desc' },
                            })];
                        case 1:
                            affiliates = _a.sent();
                            return [2 /*return*/, affiliates.map(function (aff) { return ({
                                    id: aff.id,
                                    nombre: aff.user.nombre,
                                    email: aff.user.email,
                                    whatsapp: aff.user.phone,
                                    codigoReferido: aff.codigoReferido,
                                    rango: aff.rango,
                                    walletBalance: aff.walletBalance.toNumber(),
                                    totalComisiones: aff._count.commissions,
                                    fechaRegistro: aff.createdAt,
                                }); })];
                    }
                });
            });
        };
        // ============================================
        // CÁLCULO Y ASIGNACIÓN DE COMISIONES
        // ============================================
        // CALCULAR Y ASIGNAR COMISIONES POR UNA VENTA
        AffiliatesService_1.prototype.calculateAndAssignCommissions = function (orderId) {
            return __awaiter(this, void 0, void 0, function () {
                var order;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.order.findUnique({
                                where: { id: orderId },
                                include: {
                                    customer: true,
                                    items: { include: { plan: true } },
                                },
                            })];
                        case 1:
                            order = _a.sent();
                            if (!order || order.estado !== client_1.OrderStatus.PAGADO) {
                                throw new common_1.BadRequestException('Orden no válida o no pagada');
                            }
                            // Buscar si el cliente fue referido por alguien
                            // (Aquí asumimos que hay un campo "referidoPor" en la tabla customers)
                            // Por simplicidad, buscaremos en los logs de notificación o en un campo adicional
                            // En producción, deberías tener un campo "affiliateId" en la tabla customers
                            // Para este ejemplo, asumimos que el cliente NO fue referido
                            // Si lo fuera, buscarías el afiliado y calcularías la comisión
                            // TODO: Implementar lógica para detectar si el cliente fue referido
                            // Por ahora, solo retornamos sin hacer nada
                            return [2 /*return*/, {
                                    message: 'Comisiones calculadas (implementar lógica de referido)',
                                    comisionesGeneradas: 0,
                                }];
                    }
                });
            });
        };
        // MÉTODO MANUAL PARA ASIGNAR COMISIÓN (Para pruebas o correcciones)
        AffiliatesService_1.prototype.manuallyAssignCommission = function (affiliateId, orderId, tipo) {
            return __awaiter(this, void 0, void 0, function () {
                var affiliate, order, rates, porcentaje, montoComision, commission;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.affiliate.findUnique({
                                where: { id: affiliateId },
                            })];
                        case 1:
                            affiliate = _a.sent();
                            if (!affiliate)
                                throw new common_1.NotFoundException('Afiliado no encontrado');
                            return [4 /*yield*/, this.prisma.order.findUnique({
                                    where: { id: orderId },
                                    include: { items: true },
                                })];
                        case 2:
                            order = _a.sent();
                            if (!order)
                                throw new common_1.NotFoundException('Orden no encontrada');
                            rates = this.COMMISSION_RATES[affiliate.rango];
                            porcentaje = tipo === 'directa' ? rates.nivel1 : rates.nivel2;
                            montoComision = order.total.toNumber() * porcentaje;
                            return [4 /*yield*/, this.prisma.commission.create({
                                    data: {
                                        affiliateId: affiliateId,
                                        orderId: orderId,
                                        tipo: tipo,
                                        porcentaje: porcentaje,
                                        montoComision: montoComision,
                                        estado: 'disponible',
                                    },
                                })];
                        case 3:
                            commission = _a.sent();
                            // Actualizar wallet del afiliado
                            return [4 /*yield*/, this.prisma.affiliate.update({
                                    where: { id: affiliateId },
                                    data: {
                                        walletBalance: { increment: montoComision },
                                    },
                                })];
                        case 4:
                            // Actualizar wallet del afiliado
                            _a.sent();
                            return [2 /*return*/, {
                                    message: 'Comisión asignada exitosamente',
                                    commission: {
                                        id: commission.id,
                                        monto: montoComision,
                                        porcentaje: "".concat((porcentaje * 100).toFixed(0), "%"),
                                        tipo: tipo,
                                    },
                                }];
                    }
                });
            });
        };
        // ============================================
        // SOLICITUDES DE RETIRO
        // ============================================
        // SOLICITAR RETIRO DE FONDO
        AffiliatesService_1.prototype.requestWithdrawal = function (affiliateId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var affiliate, withdrawal;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.affiliate.findUnique({
                                where: { id: affiliateId },
                            })];
                        case 1:
                            affiliate = _a.sent();
                            if (!affiliate)
                                throw new common_1.NotFoundException('Afiliado no encontrado');
                            // Verificar saldo suficiente
                            if (affiliate.walletBalance.toNumber() < dto.monto) {
                                throw new common_1.BadRequestException('Saldo insuficiente en tu billetera');
                            }
                            // Verificar monto mínimo
                            if (dto.monto < 20) {
                                throw new common_1.BadRequestException('El monto mínimo de retiro es $20');
                            }
                            return [4 /*yield*/, this.prisma.walletWithdrawal.create({
                                    data: {
                                        affiliateId: affiliateId,
                                        monto: dto.monto,
                                        metodoPago: dto.metodoPago,
                                        datosPago: dto.datosPago,
                                        estado: 'pendiente',
                                    },
                                    include: {
                                        affiliate: {
                                            include: { user: { select: { nombre: true, email: true } } },
                                        },
                                    },
                                })];
                        case 2:
                            withdrawal = _a.sent();
                            // Congelar el monto en la wallet (restar del saldo disponible)
                            return [4 /*yield*/, this.prisma.affiliate.update({
                                    where: { id: affiliateId },
                                    data: {
                                        walletBalance: { decrement: dto.monto },
                                    },
                                })];
                        case 3:
                            // Congelar el monto en la wallet (restar del saldo disponible)
                            _a.sent();
                            return [2 /*return*/, {
                                    message: 'Solicitud de retiro creada exitosamente',
                                    withdrawal: {
                                        id: withdrawal.id,
                                        monto: withdrawal.monto,
                                        metodoPago: withdrawal.metodoPago,
                                        estado: withdrawal.estado,
                                        fechaSolicitud: withdrawal.createdAt,
                                    },
                                }];
                    }
                });
            });
        };
        // LISTAR SOLICITUDES DE RETIRO (Admin)
        AffiliatesService_1.prototype.getAllWithdrawals = function (filters) {
            return __awaiter(this, void 0, void 0, function () {
                var withdrawals;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.walletWithdrawal.findMany({
                                where: __assign(__assign({}, (filters.estado && { estado: filters.estado })), (filters.affiliateId && { affiliateId: filters.affiliateId })),
                                include: {
                                    affiliate: {
                                        include: { user: { select: { nombre: true, email: true, phone: true } } },
                                    },
                                },
                                orderBy: { createdAt: 'desc' },
                            })];
                        case 1:
                            withdrawals = _a.sent();
                            return [2 /*return*/, withdrawals.map(function (w) { return ({
                                    id: w.id,
                                    afiliado: {
                                        nombre: w.affiliate.user.nombre,
                                        email: w.affiliate.user.email,
                                        whatsapp: w.affiliate.user.phone,
                                    },
                                    monto: w.monto.toNumber(),
                                    metodoPago: w.metodoPago,
                                    datosPago: JSON.parse(w.datosPago || '{}'),
                                    estado: w.estado,
                                    fechaSolicitud: w.createdAt,
                                }); })];
                    }
                });
            });
        };
        // APROBAR O RECHAZAR RETIRO
        AffiliatesService_1.prototype.approveWithdrawal = function (adminId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var withdrawal, error_1, error_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.walletWithdrawal.findUnique({
                                where: { id: dto.withdrawalId },
                                include: {
                                    affiliate: {
                                        include: { user: { select: { nombre: true, phone: true } } },
                                    },
                                },
                            })];
                        case 1:
                            withdrawal = _a.sent();
                            if (!withdrawal)
                                throw new common_1.NotFoundException('Solicitud no encontrada');
                            if (withdrawal.estado !== 'pendiente') {
                                throw new common_1.BadRequestException('Esta solicitud ya fue procesada');
                            }
                            if (!(dto.decision === 'pagado')) return [3 /*break*/, 7];
                            // Marcar como pagado
                            return [4 /*yield*/, this.prisma.walletWithdrawal.update({
                                    where: { id: dto.withdrawalId },
                                    data: { estado: 'pagado' },
                                })];
                        case 2:
                            // Marcar como pagado
                            _a.sent();
                            _a.label = 3;
                        case 3:
                            _a.trys.push([3, 5, , 6]);
                            return [4 /*yield*/, this.whatsappService.sendTextMessage(withdrawal.affiliate.user.phone, "\u00A1Hola ".concat(withdrawal.affiliate.user.nombre, "! \u2705\n\nTu retiro de $").concat(withdrawal.monto.toNumber(), " ha sido procesado exitosamente.\n\nM\u00E9todo: ").concat(withdrawal.metodoPago, "\n\n\u00A1Gracias por vender con nosotros! \uD83D\uDE80"))];
                        case 4:
                            _a.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            error_1 = _a.sent();
                            this.logger.error("Error notificando retiro aprobado: ".concat(error_1.message));
                            return [3 /*break*/, 6];
                        case 6: return [2 /*return*/, { message: 'Retiro aprobado y afiliado notificado' }];
                        case 7:
                            if (!(dto.decision === 'rechazado')) return [3 /*break*/, 14];
                            if (!dto.motivoRechazo) {
                                throw new common_1.BadRequestException('Debes proporcionar un motivo de rechazo');
                            }
                            // Marcar como rechazado
                            return [4 /*yield*/, this.prisma.walletWithdrawal.update({
                                    where: { id: dto.withdrawalId },
                                    data: { estado: 'rechazado' },
                                })];
                        case 8:
                            // Marcar como rechazado
                            _a.sent();
                            // Devolver el dinero a la wallet
                            return [4 /*yield*/, this.prisma.affiliate.update({
                                    where: { id: withdrawal.affiliateId },
                                    data: {
                                        walletBalance: { increment: withdrawal.monto.toNumber() },
                                    },
                                })];
                        case 9:
                            // Devolver el dinero a la wallet
                            _a.sent();
                            _a.label = 10;
                        case 10:
                            _a.trys.push([10, 12, , 13]);
                            return [4 /*yield*/, this.whatsappService.sendTextMessage(withdrawal.affiliate.user.phone, "Hola ".concat(withdrawal.affiliate.user.nombre, ", tu solicitud de retiro de $").concat(withdrawal.monto.toNumber(), " fue rechazada.\n\nMotivo: ").concat(dto.motivoRechazo, "\n\nEl monto ha sido devuelto a tu billetera. Si tienes dudas, responde este mensaje."))];
                        case 11:
                            _a.sent();
                            return [3 /*break*/, 13];
                        case 12:
                            error_2 = _a.sent();
                            this.logger.error("Error notificando retiro rechazado: ".concat(error_2.message));
                            return [3 /*break*/, 13];
                        case 13: return [2 /*return*/, { message: 'Retiro rechazado y dinero devuelto a la wallet' }];
                        case 14: return [2 /*return*/];
                    }
                });
            });
        };
        // ============================================
        // HISTORIAL Y ESTADÍSTICAS
        // ============================================
        // HISTORIAL DE COMISIONES DEL AFILIADO
        AffiliatesService_1.prototype.getCommissionHistory = function (affiliateId) {
            return __awaiter(this, void 0, void 0, function () {
                var commissions;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.commission.findMany({
                                where: { affiliateId: affiliateId },
                                include: {
                                    order: {
                                        include: {
                                            items: {
                                                include: {
                                                    plan: {
                                                        include: { service: { select: { nombre: true } } },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                                orderBy: { createdAt: 'desc' },
                            })];
                        case 1:
                            commissions = _a.sent();
                            return [2 /*return*/, commissions.map(function (c) { return ({
                                    id: c.id,
                                    tipo: c.tipo,
                                    porcentaje: "".concat((c.porcentaje * 100).toFixed(0), "%"),
                                    monto: c.montoComision.toNumber(),
                                    estado: c.estado,
                                    fecha: c.createdAt,
                                    orden: {
                                        id: c.order.id,
                                        total: c.order.total.toNumber(),
                                        productos: c.order.items.map(function (i) { return ({
                                            servicio: i.plan.service.nombre,
                                            plan: i.plan.nombrePlan,
                                            cantidad: i.cantidad,
                                        }); }),
                                    },
                                }); })];
                    }
                });
            });
        };
        // HISTORIAL DE RETIROS DEL AFILIADO
        AffiliatesService_1.prototype.getWithdrawalHistory = function (affiliateId) {
            return __awaiter(this, void 0, void 0, function () {
                var withdrawals;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.walletWithdrawal.findMany({
                                where: { affiliateId: affiliateId },
                                orderBy: { createdAt: 'desc' },
                            })];
                        case 1:
                            withdrawals = _a.sent();
                            return [2 /*return*/, withdrawals.map(function (w) { return ({
                                    id: w.id,
                                    monto: w.monto.toNumber(),
                                    metodoPago: w.metodoPago,
                                    estado: w.estado,
                                    fechaSolicitud: w.createdAt,
                                }); })];
                    }
                });
            });
        };
        // ESTADÍSTICAS GLOBALES DE AFILIADOS (Admin)
        AffiliatesService_1.prototype.getAffiliateStats = function () {
            return __awaiter(this, void 0, void 0, function () {
                var totalAfiliados, totalPagado, totalPendiente, comisionesDelMes, afiliadosPorRango;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, this.prisma.affiliate.count()];
                        case 1:
                            totalAfiliados = _d.sent();
                            return [4 /*yield*/, this.prisma.walletWithdrawal.aggregate({
                                    where: { estado: 'pagado' },
                                    _sum: { monto: true },
                                })];
                        case 2:
                            totalPagado = _d.sent();
                            return [4 /*yield*/, this.prisma.walletWithdrawal.aggregate({
                                    where: { estado: 'pendiente' },
                                    _sum: { monto: true },
                                })];
                        case 3:
                            totalPendiente = _d.sent();
                            return [4 /*yield*/, this.prisma.commission.aggregate({
                                    where: {
                                        createdAt: {
                                            gte: new Date(new Date().setDate(1)),
                                        },
                                    },
                                    _sum: { montoComision: true },
                                })];
                        case 4:
                            comisionesDelMes = _d.sent();
                            return [4 /*yield*/, this.prisma.affiliate.groupBy({
                                    by: ['rango'],
                                    _count: true,
                                })];
                        case 5:
                            afiliadosPorRango = _d.sent();
                            return [2 /*return*/, {
                                    totalAfiliados: totalAfiliados,
                                    totalPagadoEnRetiros: ((_a = totalPagado._sum.monto) === null || _a === void 0 ? void 0 : _a.toNumber()) || 0,
                                    totalPendienteDePago: ((_b = totalPendiente._sum.monto) === null || _b === void 0 ? void 0 : _b.toNumber()) || 0,
                                    comisionesGeneradasEsteMes: ((_c = comisionesDelMes._sum.montoComision) === null || _c === void 0 ? void 0 : _c.toNumber()) || 0,
                                    afiliadosPorRango: afiliadosPorRango.map(function (r) { return ({
                                        rango: r.rango,
                                        cantidad: r._count,
                                    }); }),
                                }];
                    }
                });
            });
        };
        // ============================================
        // UTILIDADES
        // ============================================
        // CALCULAR RANGO BASADO EN VENTAS MENSUALES
        AffiliatesService_1.prototype.calcularRango = function (ventasMensuales) {
            if (ventasMensuales >= this.RANK_THRESHOLDS.diamante)
                return 'diamante';
            if (ventasMensuales >= this.RANK_THRESHOLDS.oro)
                return 'oro';
            if (ventasMensuales >= this.RANK_THRESHOLDS.plata)
                return 'plata';
            return 'bronce';
        };
        // CALCULAR PROGRESO HACIA EL SIGUIENTE RANGO
        AffiliatesService_1.prototype.calcularProgresoRango = function (ventasMensuales, rangoActual) {
            var rangos = ['bronce', 'plata', 'oro', 'diamante'];
            var indiceActual = rangos.indexOf(rangoActual);
            if (indiceActual === rangos.length - 1) {
                return {
                    actual: rangoActual,
                    siguiente: 'Máximo alcanzado',
                    progreso: 100,
                    faltante: 0,
                };
            }
            var rangoSiguiente = rangos[indiceActual + 1];
            var umbralSiguiente = this.RANK_THRESHOLDS[rangoSiguiente];
            var umbralActual = this.RANK_THRESHOLDS[rangoActual];
            var progreso = ((ventasMensuales - umbralActual) / (umbralSiguiente - umbralActual)) * 100;
            var faltante = umbralSiguiente - ventasMensuales;
            return {
                actual: rangoActual,
                siguiente: rangoSiguiente,
                progreso: Math.min(100, Math.max(0, progreso)),
                faltante: Math.max(0, faltante),
            };
        };
        return AffiliatesService_1;
    }());
    __setFunctionName(_classThis, "AffiliatesService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AffiliatesService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AffiliatesService = _classThis;
}();
exports.AffiliatesService = AffiliatesService;
