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
exports.PortalService = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var PortalService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var PortalService = _classThis = /** @class */ (function () {
        function PortalService_1(prisma, ordersService) {
            this.prisma = prisma;
            this.ordersService = ordersService;
        }
        // OBTENER SUSCRIPCIONES ACTIVAS DEL CLIENTE
        PortalService_1.prototype.getMySubscriptions = function (customerId) {
            return __awaiter(this, void 0, void 0, function () {
                var subscriptions, hoy;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.subscription.findMany({
                                where: {
                                    customerId: customerId,
                                    estado: { in: [client_1.SubscriptionStatus.ACTIVA, client_1.SubscriptionStatus.EN_GARANTIA] }
                                },
                                include: {
                                    plan: {
                                        include: {
                                            service: {
                                                select: { nombre: true, logoUrl: true }
                                            }
                                        }
                                    },
                                    account: {
                                        select: {
                                            emailCuenta: true,
                                            passwordCuenta: true,
                                            perfilAsignado: true,
                                            pinPerfil: true,
                                        }
                                    }
                                },
                                orderBy: { fechaVencimiento: 'asc' }
                            })];
                        case 1:
                            subscriptions = _a.sent();
                            hoy = new Date();
                            hoy.setHours(0, 0, 0, 0);
                            return [2 /*return*/, subscriptions.map(function (sub) {
                                    var vencimiento = new Date(sub.fechaVencimiento);
                                    vencimiento.setHours(0, 0, 0, 0);
                                    var diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                                    return {
                                        id: sub.id,
                                        servicio: sub.plan.service.nombre,
                                        logoUrl: sub.plan.service.logoUrl,
                                        plan: sub.plan.nombrePlan,
                                        resolucion: sub.plan.resolucion,
                                        pantallas: sub.plan.pantallasSimultaneas,
                                        fechaInicio: sub.fechaInicio,
                                        fechaVencimiento: sub.fechaVencimiento,
                                        diasRestantes: diasRestantes,
                                        estado: sub.estado,
                                        autoRenovar: sub.autoRenovar,
                                        // Solo mostrar credenciales si está activa
                                        credenciales: sub.estado === client_1.SubscriptionStatus.ACTIVA ? {
                                            email: sub.account.emailCuenta,
                                            password: sub.account.passwordCuenta,
                                            perfil: sub.account.perfilAsignado,
                                            pin: sub.account.pinPerfil,
                                        } : null,
                                    };
                                })];
                    }
                });
            });
        };
        // OBTENER UNA SUSCRIPCIÓN ESPECÍFICA (Con credenciales)
        PortalService_1.prototype.getSubscriptionDetails = function (customerId, subscriptionId) {
            return __awaiter(this, void 0, void 0, function () {
                var subscription, hoy, vencimiento, diasRestantes;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.subscription.findFirst({
                                where: {
                                    id: subscriptionId,
                                    customerId: customerId // Seguridad: solo puede ver la suya
                                },
                                include: {
                                    plan: {
                                        include: {
                                            service: true
                                        }
                                    },
                                    account: true
                                }
                            })];
                        case 1:
                            subscription = _a.sent();
                            if (!subscription) {
                                throw new common_1.NotFoundException('Suscripción no encontrada');
                            }
                            hoy = new Date();
                            vencimiento = new Date(subscription.fechaVencimiento);
                            diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                            return [2 /*return*/, {
                                    id: subscription.id,
                                    servicio: subscription.plan.service.nombre,
                                    logoUrl: subscription.plan.service.logoUrl,
                                    plan: subscription.plan.nombrePlan,
                                    resolucion: subscription.plan.resolucion,
                                    pantallas: subscription.plan.pantallasSimultaneas,
                                    fechaInicio: subscription.fechaInicio,
                                    fechaVencimiento: subscription.fechaVencimiento,
                                    diasRestantes: diasRestantes,
                                    estado: subscription.estado,
                                    autoRenovar: subscription.autoRenovar,
                                    credenciales: {
                                        email: subscription.account.emailCuenta,
                                        password: subscription.account.passwordCuenta,
                                        perfil: subscription.account.perfilAsignado,
                                        pin: subscription.account.pinPerfil,
                                    },
                                    reglasUso: [
                                        'No cambiar la contraseña ni el correo',
                                        'No crear ni modificar el PIN del perfil',
                                        'Usar solo en el país registrado',
                                        'Reportar errores inmediatamente'
                                    ]
                                }];
                    }
                });
            });
        };
        // HISTORIAL DE COMPRAS
        PortalService_1.prototype.getMyOrders = function (customerId) {
            return __awaiter(this, void 0, void 0, function () {
                var orders;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.order.findMany({
                                where: { customerId: customerId },
                                include: {
                                    items: {
                                        include: {
                                            plan: {
                                                include: {
                                                    service: { select: { nombre: true } }
                                                }
                                            }
                                        }
                                    }
                                },
                                orderBy: { createdAt: 'desc' }
                            })];
                        case 1:
                            orders = _a.sent();
                            return [2 /*return*/, orders.map(function (order) { return ({
                                    id: order.id,
                                    fecha: order.createdAt,
                                    total: order.total,
                                    estado: order.estado,
                                    metodoPago: order.metodoPago,
                                    items: order.items.map(function (item) { return ({
                                        servicio: item.plan.service.nombre,
                                        plan: item.plan.nombrePlan,
                                        cantidad: item.cantidad,
                                        precioUnitario: item.precioUnitario,
                                        subtotal: item.subtotal,
                                    }); })
                                }); })];
                    }
                });
            });
        };
        // SOLICITAR GARANTÍA
        PortalService_1.prototype.requestWarranty = function (customerId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var subscription, hoy, fechaCompra, diasDesdeCompra, ticketExistente, ticket;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.subscription.findFirst({
                                where: {
                                    id: dto.subscriptionId,
                                    customerId: customerId
                                },
                                include: { account: true }
                            })];
                        case 1:
                            subscription = _a.sent();
                            if (!subscription) {
                                throw new common_1.NotFoundException('Suscripción no encontrada');
                            }
                            hoy = new Date();
                            fechaCompra = subscription.fechaInicio;
                            diasDesdeCompra = Math.floor((hoy.getTime() - fechaCompra.getTime()) / (1000 * 60 * 60 * 24));
                            if (diasDesdeCompra > subscription.plan.garantiaDias) {
                                throw new common_1.BadRequestException("El per\u00EDodo de garant\u00EDa de ".concat(subscription.plan.garantiaDias, " d\u00EDas ha expirado"));
                            }
                            return [4 /*yield*/, this.prisma.supportTicket.findFirst({
                                    where: {
                                        subscriptionId: dto.subscriptionId,
                                        estado: { in: ['pendiente_revision', 'aprobado_reemplazo'] }
                                    }
                                })];
                        case 2:
                            ticketExistente = _a.sent();
                            if (ticketExistente) {
                                throw new common_1.BadRequestException('Ya existe un ticket abierto para esta suscripción');
                            }
                            return [4 /*yield*/, this.prisma.supportTicket.create({
                                    data: {
                                        subscriptionId: dto.subscriptionId,
                                        customerId: customerId,
                                        motivoReporte: dto.motivoReporte,
                                        evidenciaUrl: dto.evidenciaUrl,
                                        estado: 'pendiente_revision',
                                    },
                                    include: {
                                        subscription: {
                                            include: {
                                                plan: { include: { service: true } },
                                                customer: { include: { user: true } }
                                            }
                                        }
                                    }
                                })];
                        case 3:
                            ticket = _a.sent();
                            // 5. Marcar suscripción como en garantía
                            return [4 /*yield*/, this.prisma.subscription.update({
                                    where: { id: dto.subscriptionId },
                                    data: { estado: client_1.SubscriptionStatus.EN_GARANTIA }
                                })];
                        case 4:
                            // 5. Marcar suscripción como en garantía
                            _a.sent();
                            return [2 /*return*/, {
                                    message: 'Ticket de garantía creado exitosamente',
                                    ticketId: ticket.id,
                                    mensajeCliente: "Hemos recibido tu reporte. Nuestro equipo lo validar\u00E1 en los pr\u00F3ximos 10 minutos. Te enviaremos la nueva cuenta por WhatsApp.",
                                    estadoTicket: ticket.estado
                                }];
                    }
                });
            });
        };
        // VER MIS TICKETS DE GARANTÍA
        PortalService_1.prototype.getMyTickets = function (customerId) {
            return __awaiter(this, void 0, void 0, function () {
                var tickets;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.supportTicket.findMany({
                                where: { customerId: customerId },
                                include: {
                                    subscription: {
                                        include: {
                                            plan: {
                                                include: {
                                                    service: { select: { nombre: true } }
                                                }
                                            }
                                        }
                                    }
                                },
                                orderBy: { createdAt: 'desc' }
                            })];
                        case 1:
                            tickets = _a.sent();
                            return [2 /*return*/, tickets.map(function (ticket) { return ({
                                    id: ticket.id,
                                    servicio: ticket.subscription.plan.service.nombre,
                                    plan: ticket.subscription.plan.nombrePlan,
                                    motivo: ticket.motivoReporte,
                                    estado: ticket.estado,
                                    fechaCreacion: ticket.createdAt,
                                    fechaResolucion: ticket.resolvedAt,
                                }); })];
                    }
                });
            });
        };
        // RENOVACIÓN RÁPIDA (Crear orden basada en suscripción existente)
        PortalService_1.prototype.renewSubscription = function (customerId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var subscription, orderDto, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.subscription.findFirst({
                                where: {
                                    id: dto.subscriptionId,
                                    customerId: customerId
                                },
                                include: {
                                    plan: true
                                }
                            })];
                        case 1:
                            subscription = _a.sent();
                            if (!subscription) {
                                throw new common_1.NotFoundException('Suscripción no encontrada');
                            }
                            orderDto = {
                                customerId: customerId,
                                items: [
                                    {
                                        planId: subscription.planId,
                                        cantidad: 1
                                    }
                                ],
                                metodoPago: dto.metodoPago,
                                comprobanteUrl: dto.comprobanteUrl
                            };
                            return [4 /*yield*/, this.ordersService.createOrder(orderDto)];
                        case 2:
                            result = _a.sent();
                            return [2 /*return*/, {
                                    message: 'Orden de renovación creada',
                                    orderId: result.order.id,
                                    total: result.order.total,
                                    siguientePaso: result.siguientePaso
                                }];
                    }
                });
            });
        };
        // ACTUALIZAR PERFIL DEL CLIENTE
        PortalService_1.prototype.updateProfile = function (customerId, data) {
            return __awaiter(this, void 0, void 0, function () {
                var customer, updated;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.customer.findUnique({
                                where: { id: customerId },
                                include: { user: true }
                            })];
                        case 1:
                            customer = _a.sent();
                            if (!customer) {
                                throw new common_1.NotFoundException('Cliente no encontrado');
                            }
                            return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var updatedCustomer;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                if (!data.nombre) return [3 /*break*/, 2];
                                                return [4 /*yield*/, tx.user.update({
                                                        where: { id: customer.userId },
                                                        data: { nombre: data.nombre }
                                                    })];
                                            case 1:
                                                _a.sent();
                                                _a.label = 2;
                                            case 2: return [4 /*yield*/, tx.customer.update({
                                                    where: { id: customerId },
                                                    data: __assign(__assign({}, (data.whatsapp && { whatsapp: data.whatsapp })), (data.pais && { pais: data.pais })),
                                                    include: { user: true }
                                                })];
                                            case 3:
                                                updatedCustomer = _a.sent();
                                                return [2 /*return*/, updatedCustomer];
                                        }
                                    });
                                }); })];
                        case 2:
                            updated = _a.sent();
                            return [2 /*return*/, {
                                    message: 'Perfil actualizado',
                                    user: {
                                        nombre: updated.user.nombre,
                                        email: updated.user.email,
                                        whatsapp: updated.whatsapp,
                                        pais: updated.pais
                                    }
                                }];
                    }
                });
            });
        };
        // OBTENER RESUMEN DEL CLIENTE (Para el header del portal)
        PortalService_1.prototype.getCustomerSummary = function (customerId) {
            return __awaiter(this, void 0, void 0, function () {
                var customer, suscripcionesActivas, porVencer;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.customer.findUnique({
                                where: { id: customerId },
                                include: { user: true }
                            })];
                        case 1:
                            customer = _a.sent();
                            if (!customer) {
                                throw new common_1.NotFoundException('Cliente no encontrado');
                            }
                            return [4 /*yield*/, this.prisma.subscription.count({
                                    where: {
                                        customerId: customerId,
                                        estado: client_1.SubscriptionStatus.ACTIVA
                                    }
                                })];
                        case 2:
                            suscripcionesActivas = _a.sent();
                            return [4 /*yield*/, this.prisma.subscription.count({
                                    where: {
                                        customerId: customerId,
                                        estado: client_1.SubscriptionStatus.ACTIVA,
                                        fechaVencimiento: {
                                            lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // Próximos 3 días
                                        }
                                    }
                                })];
                        case 3:
                            porVencer = _a.sent();
                            return [2 /*return*/, {
                                    nombre: customer.user.nombre,
                                    email: customer.user.email,
                                    whatsapp: customer.whatsapp,
                                    pais: customer.pais,
                                    suscripcionesActivas: suscripcionesActivas,
                                    porVencer: porVencer,
                                    miembroDesde: customer.createdAt
                                }];
                    }
                });
            });
        };
        return PortalService_1;
    }());
    __setFunctionName(_classThis, "PortalService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PortalService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PortalService = _classThis;
}();
exports.PortalService = PortalService;
