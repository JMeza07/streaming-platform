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
exports.WarrantyService = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var WarrantyService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var WarrantyService = _classThis = /** @class */ (function () {
        function WarrantyService_1(prisma, whatsappService) {
            this.prisma = prisma;
            this.whatsappService = whatsappService;
            this.logger = new common_1.Logger(WarrantyService.name);
        }
        // ============================================
        // LISTAR TICKETS
        // ============================================
        // OBTENER TODOS LOS TICKETS (Con filtros)
        WarrantyService_1.prototype.getAllTickets = function (filters) {
            return __awaiter(this, void 0, void 0, function () {
                var tickets, ahora;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.supportTicket.findMany({
                                where: __assign(__assign(__assign({}, (filters.estado && { estado: filters.estado })), (filters.customerId && { customerId: filters.customerId })), (filters.motivoReporte && { motivoReporte: filters.motivoReporte })),
                                include: {
                                    customer: {
                                        include: {
                                            user: { select: { nombre: true, email: true, phone: true } },
                                        },
                                    },
                                    subscription: {
                                        include: {
                                            plan: {
                                                include: {
                                                    service: { select: { nombre: true, logoUrl: true } },
                                                },
                                            },
                                            account: {
                                                select: {
                                                    emailCuenta: true,
                                                    perfilAsignado: true,
                                                    batchId: true,
                                                },
                                            },
                                        },
                                    },
                                },
                                orderBy: { createdAt: 'asc' }, // Los más antiguos primero (prioridad)
                            })];
                        case 1:
                            tickets = _a.sent();
                            ahora = new Date();
                            return [2 /*return*/, tickets.map(function (ticket) { return ({
                                    id: ticket.id,
                                    cliente: {
                                        nombre: ticket.customer.user.nombre,
                                        email: ticket.customer.user.email,
                                        whatsapp: ticket.customer.whatsapp,
                                    },
                                    servicio: ticket.subscription.plan.service.nombre,
                                    logoUrl: ticket.subscription.plan.service.logoUrl,
                                    plan: ticket.subscription.plan.nombrePlan,
                                    cuentaActual: {
                                        email: ticket.subscription.account.emailCuenta,
                                        perfil: ticket.subscription.account.perfilAsignado,
                                        batchId: ticket.subscription.account.batchId,
                                    },
                                    motivo: ticket.motivoReporte,
                                    evidenciaUrl: ticket.evidenciaUrl,
                                    estado: ticket.estado,
                                    tiempoEnCola: _this.calcularTiempoEnCola(ticket.createdAt, ahora),
                                    fechaCreacion: ticket.createdAt,
                                    fechaResolucion: ticket.resolvedAt,
                                    resueltoPor: ticket.resueltoPor,
                                }); })];
                    }
                });
            });
        };
        // OBTENER TICKETS PENDIENTES (Vista rápida del admin)
        WarrantyService_1.prototype.getPendingTickets = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.getAllTickets({ estado: 'pendiente_revision' })];
                });
            });
        };
        // OBTENER ESTADÍSTICAS DE TICKETS
        WarrantyService_1.prototype.getTicketStats = function () {
            return __awaiter(this, void 0, void 0, function () {
                var pendientes, aprobados, rechazados, hoy, creadosHoy, resueltosHoy, ticketsResueltos, tiempoPromedio, motivos;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.supportTicket.count({
                                where: { estado: 'pendiente_revision' },
                            })];
                        case 1:
                            pendientes = _a.sent();
                            return [4 /*yield*/, this.prisma.supportTicket.count({
                                    where: { estado: 'aprobado_reemplazo' },
                                })];
                        case 2:
                            aprobados = _a.sent();
                            return [4 /*yield*/, this.prisma.supportTicket.count({
                                    where: { estado: 'rechazado' },
                                })];
                        case 3:
                            rechazados = _a.sent();
                            hoy = new Date();
                            hoy.setHours(0, 0, 0, 0);
                            return [4 /*yield*/, this.prisma.supportTicket.count({
                                    where: { createdAt: { gte: hoy } },
                                })];
                        case 4:
                            creadosHoy = _a.sent();
                            return [4 /*yield*/, this.prisma.supportTicket.count({
                                    where: { resolvedAt: { gte: hoy } },
                                })];
                        case 5:
                            resueltosHoy = _a.sent();
                            return [4 /*yield*/, this.prisma.supportTicket.findMany({
                                    where: { resolvedAt: { not: null } },
                                    select: { createdAt: true, resolvedAt: true },
                                    take: 100, // Últimos 100 para el promedio
                                })];
                        case 6:
                            ticketsResueltos = _a.sent();
                            tiempoPromedio = ticketsResueltos.length > 0
                                ? ticketsResueltos.reduce(function (sum, t) {
                                    var diff = t.resolvedAt.getTime() - t.createdAt.getTime();
                                    return sum + diff / (1000 * 60); // En minutos
                                }, 0) / ticketsResueltos.length
                                : 0;
                            return [4 /*yield*/, this.prisma.supportTicket.groupBy({
                                    by: ['motivoReporte'],
                                    _count: true,
                                    where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
                                })];
                        case 7:
                            motivos = _a.sent();
                            return [2 /*return*/, {
                                    pendientes: pendientes,
                                    aprobados: aprobados,
                                    rechazados: rechazados,
                                    creadosHoy: creadosHoy,
                                    resueltosHoy: resueltosHoy,
                                    tiempoPromedioResolucion: Math.round(tiempoPromedio),
                                    motivos: motivos.map(function (m) { return ({
                                        motivo: m.motivoReporte,
                                        cantidad: m._count,
                                    }); }),
                                }];
                    }
                });
            });
        };
        // ============================================
        // RESOLVER TICKET (Aprobar o Rechazar)
        // ============================================
        WarrantyService_1.prototype.resolveTicket = function (adminId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var ticket;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.supportTicket.findUnique({
                                where: { id: dto.ticketId },
                                include: {
                                    subscription: {
                                        include: {
                                            plan: { include: { service: true } },
                                            account: true,
                                            customer: { include: { user: true } },
                                        },
                                    },
                                },
                            })];
                        case 1:
                            ticket = _a.sent();
                            if (!ticket)
                                throw new common_1.NotFoundException('Ticket no encontrado');
                            if (ticket.estado !== 'pendiente_revision') {
                                throw new common_1.BadRequestException('Este ticket ya fue resuelto');
                            }
                            if (dto.decision === 'rechazado') {
                                return [2 /*return*/, this.rejectTicket(ticket, adminId, dto.motivoRechazo)];
                            }
                            if (dto.decision === 'aprobado_reemplazo') {
                                return [2 /*return*/, this.approveAndReplace(ticket, adminId)];
                            }
                            return [2 /*return*/];
                    }
                });
            });
        };
        // APROBAR Y REEMPLAZAR AUTOMÁTICAMENTE
        WarrantyService_1.prototype.approveAndReplace = function (ticket, adminId) {
            return __awaiter(this, void 0, void 0, function () {
                var subscription, resultado, error_1, error_2;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            subscription = ticket.subscription;
                            return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var nuevaCuenta;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: 
                                            // 1. Marcar ticket como aprobado
                                            return [4 /*yield*/, tx.supportTicket.update({
                                                    where: { id: ticket.id },
                                                    data: {
                                                        estado: 'aprobado_reemplazo',
                                                        resueltoPor: adminId,
                                                        resolvedAt: new Date(),
                                                    },
                                                })];
                                            case 1:
                                                // 1. Marcar ticket como aprobado
                                                _a.sent();
                                                // 2. Marcar cuenta antigua como defectuosa
                                                return [4 /*yield*/, tx.account.update({
                                                        where: { id: subscription.account.id },
                                                        data: { estado: client_1.AccountStatus.DEFECTUOSA },
                                                    })];
                                            case 2:
                                                // 2. Marcar cuenta antigua como defectuosa
                                                _a.sent();
                                                return [4 /*yield*/, tx.account.findFirst({
                                                        where: {
                                                            planId: subscription.planId,
                                                            estado: client_1.AccountStatus.DISPONIBLE,
                                                        },
                                                        orderBy: { createdAt: 'asc' }, // FIFO
                                                    })];
                                            case 3:
                                                nuevaCuenta = _a.sent();
                                                if (!!nuevaCuenta) return [3 /*break*/, 5];
                                                // No hay stock: Marcar suscripción como cancelada temporalmente
                                                return [4 /*yield*/, tx.subscription.update({
                                                        where: { id: subscription.id },
                                                        data: { estado: client_1.SubscriptionStatus.CANCELADA },
                                                    })];
                                            case 4:
                                                // No hay stock: Marcar suscripción como cancelada temporalmente
                                                _a.sent();
                                                return [2 /*return*/, {
                                                        exito: false,
                                                        motivo: 'sin_stock',
                                                        mensaje: "No hay cuentas disponibles de ".concat(subscription.plan.service.nombre, " - ").concat(subscription.plan.nombrePlan, ". El cliente fue notificado."),
                                                    }];
                                            case 5: 
                                            // 4. Asignar nueva cuenta a la suscripción
                                            return [4 /*yield*/, tx.subscription.update({
                                                    where: { id: subscription.id },
                                                    data: {
                                                        accountId: nuevaCuenta.id,
                                                        estado: client_1.SubscriptionStatus.ACTIVA,
                                                    },
                                                })];
                                            case 6:
                                                // 4. Asignar nueva cuenta a la suscripción
                                                _a.sent();
                                                // 5. Marcar nueva cuenta como ocupada
                                                return [4 /*yield*/, tx.account.update({
                                                        where: { id: nuevaCuenta.id },
                                                        data: { estado: client_1.AccountStatus.OCUPADA },
                                                    })];
                                            case 7:
                                                // 5. Marcar nueva cuenta como ocupada
                                                _a.sent();
                                                if (!subscription.account.batchId) return [3 /*break*/, 9];
                                                return [4 /*yield*/, this.actualizarTasaFallo(tx, subscription.account.batchId)];
                                            case 8:
                                                _a.sent();
                                                _a.label = 9;
                                            case 9: return [2 /*return*/, {
                                                    exito: true,
                                                    nuevaCuenta: {
                                                        email: nuevaCuenta.emailCuenta,
                                                        password: nuevaCuenta.passwordCuenta,
                                                        perfil: nuevaCuenta.perfilAsignado,
                                                        pin: nuevaCuenta.pinPerfil,
                                                    },
                                                    subscriptionId: subscription.id,
                                                }];
                                        }
                                    });
                                }); })];
                        case 1:
                            resultado = _a.sent();
                            if (!resultado.exito) return [3 /*break*/, 6];
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, this.whatsappService.sendWarrantyReplacementMessage(subscription.customer.whatsapp, subscription.customer.user.nombre, {
                                    plan: subscription.plan,
                                    account: resultado.nuevaCuenta,
                                })];
                        case 3:
                            _a.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            error_1 = _a.sent();
                            this.logger.error("Error enviando WhatsApp de reemplazo: ".concat(error_1.message));
                            return [3 /*break*/, 5];
                        case 5: return [3 /*break*/, 9];
                        case 6:
                            _a.trys.push([6, 8, , 9]);
                            return [4 /*yield*/, this.whatsappService.sendTextMessage(subscription.customer.whatsapp, "Hola ".concat(subscription.customer.user.nombre, ", lamentamos informarte que tu cuenta de ").concat(subscription.plan.service.nombre, " fue dada de baja y actualmente no tenemos stock disponible para reemplazarla. Te contactaremos en cuanto tengamos nuevas cuentas disponibles. Si deseas, podemos procesar un reembolso. \uD83D\uDE4F"))];
                        case 7:
                            _a.sent();
                            return [3 /*break*/, 9];
                        case 8:
                            error_2 = _a.sent();
                            this.logger.error("Error notificando sin stock: ".concat(error_2.message));
                            return [3 /*break*/, 9];
                        case 9: return [2 /*return*/, {
                                message: resultado.exito
                                    ? 'Ticket aprobado y cuenta reemplazada exitosamente'
                                    : resultado.mensaje,
                                resultado: resultado,
                            }];
                    }
                });
            });
        };
        // RECHAZAR TICKET
        WarrantyService_1.prototype.rejectTicket = function (ticket, adminId, motivo) {
            return __awaiter(this, void 0, void 0, function () {
                var error_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!motivo) {
                                throw new common_1.BadRequestException('Debes proporcionar un motivo para rechazar el ticket');
                            }
                            // 1. Marcar ticket como rechazado
                            return [4 /*yield*/, this.prisma.supportTicket.update({
                                    where: { id: ticket.id },
                                    data: {
                                        estado: 'rechazado',
                                        resueltoPor: adminId,
                                        resolvedAt: new Date(),
                                    },
                                })];
                        case 1:
                            // 1. Marcar ticket como rechazado
                            _a.sent();
                            // 2. Restaurar suscripción a activa (si estaba en garantía)
                            return [4 /*yield*/, this.prisma.subscription.update({
                                    where: { id: ticket.subscriptionId },
                                    data: { estado: client_1.SubscriptionStatus.ACTIVA },
                                })];
                        case 2:
                            // 2. Restaurar suscripción a activa (si estaba en garantía)
                            _a.sent();
                            _a.label = 3;
                        case 3:
                            _a.trys.push([3, 5, , 6]);
                            return [4 /*yield*/, this.whatsappService.sendTextMessage(ticket.subscription.customer.whatsapp, "Hola ".concat(ticket.subscription.customer.user.nombre, ", hemos revisado tu reporte sobre ").concat(ticket.subscription.plan.service.nombre, " y determinamos que no aplica para garant\u00EDa.\n\nMotivo: ").concat(motivo, "\n\nRecuerda las reglas de uso:\n1\uFE0F\u20E3 No cambiar contrase\u00F1a ni correo\n2\uFE0F\u20E3 No crear ni modificar el PIN\n3\uFE0F\u20E3 No exceder pantallas simult\u00E1neas\n\nSi tienes dudas, responde este mensaje."))];
                        case 4:
                            _a.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            error_3 = _a.sent();
                            this.logger.error("Error notificando rechazo: ".concat(error_3.message));
                            return [3 /*break*/, 6];
                        case 6: return [2 /*return*/, {
                                message: 'Ticket rechazado y cliente notificado',
                                ticketId: ticket.id,
                            }];
                    }
                });
            });
        };
        // ============================================
        // CONTROL DE CALIDAD DE LOTES
        // ============================================
        // ACTUALIZAR TASA DE FALLO DE UN LOTE
        WarrantyService_1.prototype.actualizarTasaFallo = function (tx, batchId) {
            return __awaiter(this, void 0, void 0, function () {
                var batch, defectuosas, tasaFallo;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, tx.supplierBatch.findUnique({
                                where: { id: batchId },
                            })];
                        case 1:
                            batch = _a.sent();
                            if (!batch)
                                return [2 /*return*/];
                            return [4 /*yield*/, tx.account.count({
                                    where: { batchId: batchId, estado: client_1.AccountStatus.DEFECTUOSA },
                                })];
                        case 2:
                            defectuosas = _a.sent();
                            tasaFallo = (defectuosas / batch.cantidadCuentas) * 100;
                            // Actualizar tasa
                            return [4 /*yield*/, tx.supplierBatch.update({
                                    where: { id: batchId },
                                    data: { tasaFalloActual: tasaFallo },
                                })];
                        case 3:
                            // Actualizar tasa
                            _a.sent();
                            if (!(tasaFallo > 15 && batch.estadoLote === 'activo')) return [3 /*break*/, 6];
                            return [4 /*yield*/, tx.supplierBatch.update({
                                    where: { id: batchId },
                                    data: { estadoLote: 'cuarentena' },
                                })];
                        case 4:
                            _a.sent();
                            // Pausar todas las cuentas disponibles del lote
                            return [4 /*yield*/, tx.account.updateMany({
                                    where: { batchId: batchId, estado: client_1.AccountStatus.DISPONIBLE },
                                    data: { estado: client_1.AccountStatus.VENCIDA }, // Usamos VENCIDA como "pausada"
                                })];
                        case 5:
                            // Pausar todas las cuentas disponibles del lote
                            _a.sent();
                            this.logger.warn("\u26A0\uFE0F LOTE ".concat(batchId, " EN CUARENTENA: Tasa de fallo ").concat(tasaFallo.toFixed(1), "%"));
                            _a.label = 6;
                        case 6: return [2 /*return*/];
                    }
                });
            });
        };
        // OBTENER TODOS LOS LOTES CON SU ESTADO
        WarrantyService_1.prototype.getAllBatches = function () {
            return __awaiter(this, void 0, void 0, function () {
                var batches;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.supplierBatch.findMany({
                                include: {
                                    accounts: {
                                        select: { estado: true },
                                    },
                                },
                                orderBy: { fechaCompra: 'desc' },
                            })];
                        case 1:
                            batches = _a.sent();
                            return [2 /*return*/, batches.map(function (batch) {
                                    var estadoCounts = batch.accounts.reduce(function (acc, a) {
                                        acc[a.estado] = (acc[a.estado] || 0) + 1;
                                        return acc;
                                    }, {});
                                    return {
                                        id: batch.id,
                                        proveedor: batch.proveedorNombre,
                                        fechaCompra: batch.fechaCompra,
                                        costoTotal: batch.costoTotalLote,
                                        cantidadCuentas: batch.cantidadCuentas,
                                        tasaFallo: batch.tasaFalloActual,
                                        estado: batch.estadoLote,
                                        desglose: {
                                            disponibles: estadoCounts['DISPONIBLE'] || 0,
                                            ocupadas: estadoCounts['OCUPADA'] || 0,
                                            defectuosas: estadoCounts['DEFECTUOSA'] || 0,
                                            vencidas: estadoCounts['VENCIDA'] || 0,
                                        },
                                    };
                                })];
                    }
                });
            });
        };
        // PONER LOTE EN CUARENTENA MANUALMENTE
        WarrantyService_1.prototype.quarantineBatch = function (batchId, razon) {
            return __awaiter(this, void 0, void 0, function () {
                var batch;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.supplierBatch.findUnique({
                                where: { id: batchId },
                            })];
                        case 1:
                            batch = _a.sent();
                            if (!batch)
                                throw new common_1.NotFoundException('Lote no encontrado');
                            return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, tx.supplierBatch.update({
                                                    where: { id: batchId },
                                                    data: { estadoLote: 'cuarentena' },
                                                })];
                                            case 1:
                                                _a.sent();
                                                return [4 /*yield*/, tx.account.updateMany({
                                                        where: { batchId: batchId, estado: client_1.AccountStatus.DISPONIBLE },
                                                        data: { estado: client_1.AccountStatus.VENCIDA },
                                                    })];
                                            case 2:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 2:
                            _a.sent();
                            this.logger.warn("Lote ".concat(batchId, " puesto en cuarentena: ").concat(razon));
                            return [2 /*return*/, {
                                    message: "Lote puesto en cuarentena. Raz\u00F3n: ".concat(razon),
                                    batchId: batchId,
                                }];
                    }
                });
            });
        };
        // REACTIVAR LOTE (Después de resolver con el proveedor)
        WarrantyService_1.prototype.reactivateBatch = function (batchId) {
            return __awaiter(this, void 0, void 0, function () {
                var batch;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.supplierBatch.findUnique({
                                where: { id: batchId },
                            })];
                        case 1:
                            batch = _a.sent();
                            if (!batch)
                                throw new common_1.NotFoundException('Lote no encontrado');
                            if (batch.estadoLote !== 'cuarentena') {
                                throw new common_1.BadRequestException('Este lote no está en cuarentena');
                            }
                            return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var cuentasPausadas, _i, cuentasPausadas_1, cuenta;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, tx.supplierBatch.update({
                                                    where: { id: batchId },
                                                    data: { estadoLote: 'activo' },
                                                })];
                                            case 1:
                                                _a.sent();
                                                return [4 /*yield*/, tx.account.findMany({
                                                        where: {
                                                            batchId: batchId,
                                                            estado: client_1.AccountStatus.VENCIDA,
                                                            subscription: null,
                                                        },
                                                        select: { id: true },
                                                    })];
                                            case 2:
                                                cuentasPausadas = _a.sent();
                                                _i = 0, cuentasPausadas_1 = cuentasPausadas;
                                                _a.label = 3;
                                            case 3:
                                                if (!(_i < cuentasPausadas_1.length)) return [3 /*break*/, 6];
                                                cuenta = cuentasPausadas_1[_i];
                                                return [4 /*yield*/, tx.account.update({
                                                        where: { id: cuenta.id },
                                                        data: { estado: client_1.AccountStatus.DISPONIBLE },
                                                    })];
                                            case 4:
                                                _a.sent();
                                                _a.label = 5;
                                            case 5:
                                                _i++;
                                                return [3 /*break*/, 3];
                                            case 6: return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, {
                                    message: 'Lote reactivado y cuentas disponibles restauradas',
                                    batchId: batchId,
                                }];
                    }
                });
            });
        };
        // ============================================
        // UTILIDADES
        // ============================================
        WarrantyService_1.prototype.calcularTiempoEnCola = function (createdAt, ahora) {
            var diffMs = ahora.getTime() - createdAt.getTime();
            var diffMin = Math.floor(diffMs / (1000 * 60));
            if (diffMin < 60)
                return "".concat(diffMin, " min");
            var horas = Math.floor(diffMin / 60);
            var mins = diffMin % 60;
            if (horas < 24)
                return "".concat(horas, "h ").concat(mins, "m");
            var dias = Math.floor(horas / 24);
            return "".concat(dias, "d ").concat(horas % 24, "h");
        };
        return WarrantyService_1;
    }());
    __setFunctionName(_classThis, "WarrantyService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        WarrantyService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return WarrantyService = _classThis;
}();
exports.WarrantyService = WarrantyService;
