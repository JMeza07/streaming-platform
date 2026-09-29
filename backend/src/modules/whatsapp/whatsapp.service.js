"use strict";
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
exports.WhatsappService = void 0;
var common_1 = require("@nestjs/common");
var axios_1 = require("axios");
var cron = require("node-cron");
var WhatsappService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var WhatsappService = _classThis = /** @class */ (function () {
        function WhatsappService_1(configService, prisma) {
            this.configService = configService;
            this.prisma = prisma;
            this.logger = new common_1.Logger(WhatsappService.name);
            this.instanceName = 'streaming-platform';
            // Inicializar cliente de Evolution API
            var apiUrl = this.configService.get('EVOLUTION_API_URL');
            var apiKey = this.configService.get('EVOLUTION_API_KEY');
            this.evolutionApi = axios_1.default.create({
                baseURL: apiUrl,
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': apiKey,
                },
            });
            // Programar tareas automáticas
            this.scheduleAutomaticTasks();
        }
        // ============================================
        // MÉTODOS DE ENVÍO DE MENSAJES
        // ============================================
        // ENVIAR MENSAJE DE TEXTO SIMPLE
        WhatsappService_1.prototype.sendTextMessage = function (numero, mensaje) {
            return __awaiter(this, void 0, void 0, function () {
                var response, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 6, , 8]);
                            return [4 /*yield*/, this.isWithinSendingHours()];
                        case 1:
                            if (!!(_a.sent())) return [3 /*break*/, 3];
                            this.logger.warn("Mensaje a ".concat(numero, " encolado (fuera de horario)"));
                            return [4 /*yield*/, this.enqueueMessage(numero, mensaje, 'texto')];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { success: false, message: 'Mensaje encolado (fuera de horario)' }];
                        case 3: return [4 /*yield*/, this.evolutionApi.post("/message/sendText/".concat(this.instanceName), {
                                number: numero,
                                text: mensaje,
                            })];
                        case 4:
                            response = _a.sent();
                            // Registrar en logs
                            return [4 /*yield*/, this.logNotification(numero, mensaje, 'whatsapp', 'enviado')];
                        case 5:
                            // Registrar en logs
                            _a.sent();
                            return [2 /*return*/, { success: true, data: response.data }];
                        case 6:
                            error_1 = _a.sent();
                            this.logger.error("Error enviando mensaje a ".concat(numero, ":"), error_1.message);
                            return [4 /*yield*/, this.logNotification(numero, mensaje, 'whatsapp', 'fallido')];
                        case 7:
                            _a.sent();
                            throw new common_1.BadRequestException('Error al enviar mensaje por WhatsApp');
                        case 8: return [2 /*return*/];
                    }
                });
            });
        };
        // ENVIAR MENSAJE CON IMAGEN
        WhatsappService_1.prototype.sendImageMessage = function (numero, imagenUrl, caption) {
            return __awaiter(this, void 0, void 0, function () {
                var response, error_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 6, , 7]);
                            return [4 /*yield*/, this.isWithinSendingHours()];
                        case 1:
                            if (!!(_a.sent())) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.enqueueMessage(numero, caption, 'imagen', imagenUrl)];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { success: false, message: 'Mensaje encolado (fuera de horario)' }];
                        case 3: return [4 /*yield*/, this.evolutionApi.post("/message/sendMedia/".concat(this.instanceName), {
                                number: numero,
                                mediatype: 'image',
                                mediaUrl: imagenUrl,
                                caption: caption,
                            })];
                        case 4:
                            response = _a.sent();
                            return [4 /*yield*/, this.logNotification(numero, caption, 'whatsapp', 'enviado')];
                        case 5:
                            _a.sent();
                            return [2 /*return*/, { success: true, data: response.data }];
                        case 6:
                            error_2 = _a.sent();
                            this.logger.error("Error enviando imagen a ".concat(numero, ":"), error_2.message);
                            throw new common_1.BadRequestException('Error al enviar imagen por WhatsApp');
                        case 7: return [2 /*return*/];
                    }
                });
            });
        };
        // ENVIAR MENSAJE CON BOTONES (Para interacción)
        WhatsappService_1.prototype.sendButtonMessage = function (numero, mensaje, botones) {
            return __awaiter(this, void 0, void 0, function () {
                var response, error_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 6, , 7]);
                            return [4 /*yield*/, this.isWithinSendingHours()];
                        case 1:
                            if (!!(_a.sent())) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.enqueueMessage(numero, mensaje, 'botones')];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { success: false, message: 'Mensaje encolado (fuera de horario)' }];
                        case 3: return [4 /*yield*/, this.evolutionApi.post("/message/sendButtons/".concat(this.instanceName), {
                                number: numero,
                                text: mensaje,
                                buttons: botones.map(function (b) { return ({
                                    buttonId: b.id,
                                    buttonText: { displayText: b.texto },
                                    type: 1,
                                }); }),
                            })];
                        case 4:
                            response = _a.sent();
                            return [4 /*yield*/, this.logNotification(numero, mensaje, 'whatsapp', 'enviado')];
                        case 5:
                            _a.sent();
                            return [2 /*return*/, { success: true, data: response.data }];
                        case 6:
                            error_3 = _a.sent();
                            this.logger.error("Error enviando botones a ".concat(numero, ":"), error_3.message);
                            throw new common_1.BadRequestException('Error al enviar botones por WhatsApp');
                        case 7: return [2 /*return*/];
                    }
                });
            });
        };
        // ============================================
        // MÉTODOS ESPECÍFICOS DEL NEGOCIO
        // ============================================
        // ENVIAR MENSAJE DE ENTREGA DE CUENTAS
        WhatsappService_1.prototype.sendDeliveryMessage = function (whatsapp, nombreCliente, suscripciones) {
            return __awaiter(this, void 0, void 0, function () {
                var config, mensaje, cuentasTexto;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getConfig()];
                        case 1:
                            config = _a.sent();
                            mensaje = config.plantillaEntrega || this.getDefaultDeliveryTemplate();
                            // Reemplazar variables
                            mensaje = mensaje.replace('{nombre_cliente}', nombreCliente);
                            mensaje = mensaje.replace('{nombre_marca}', 'Tu Marca');
                            cuentasTexto = '';
                            suscripciones.forEach(function (sub, i) {
                                cuentasTexto += "\n\n*".concat(i + 1, ". ").concat(sub.plan.service.nombre, " - ").concat(sub.plan.nombrePlan, "*");
                                cuentasTexto += "\n\uD83D\uDCE7 Email: ".concat(sub.account.emailCuenta);
                                cuentasTexto += "\n\uD83D\uDD11 Contrase\u00F1a: ".concat(sub.account.passwordCuenta);
                                if (sub.account.perfilAsignado) {
                                    cuentasTexto += "\n\uD83D\uDC64 Perfil: ".concat(sub.account.perfilAsignado);
                                }
                                if (sub.account.pinPerfil) {
                                    cuentasTexto += "\n\uD83D\uDD22 PIN: ".concat(sub.account.pinPerfil);
                                }
                                cuentasTexto += "\n\uD83D\uDCC5 Vence: ".concat(new Date(sub.fechaVencimiento).toLocaleDateString());
                            });
                            mensaje = mensaje.replace('{lista_cuentas}', cuentasTexto);
                            return [2 /*return*/, this.sendTextMessage(whatsapp, mensaje)];
                    }
                });
            });
        };
        // ENVIAR RECORDATORIO DE RENOVACIÓN (7 días antes)
        WhatsappService_1.prototype.sendRenewalReminder7d = function (whatsapp, nombreCliente, servicio, fechaVencimiento) {
            return __awaiter(this, void 0, void 0, function () {
                var config, mensaje;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getConfig()];
                        case 1:
                            config = _a.sent();
                            mensaje = config.plantillaRecordatorio7d || this.getDefaultReminder7dTemplate();
                            mensaje = mensaje.replace('{nombre_cliente}', nombreCliente);
                            mensaje = mensaje.replace('{servicio}', servicio);
                            mensaje = mensaje.replace('{fecha_vencimiento}', fechaVencimiento.toLocaleDateString());
                            mensaje = mensaje.replace('{link_renovacion}', 'https://tu-marca.com/renovar');
                            return [2 /*return*/, this.sendTextMessage(whatsapp, mensaje)];
                    }
                });
            });
        };
        // ENVIAR ALERTA CRÍTICA (1 día antes)
        WhatsappService_1.prototype.sendRenewalReminder1d = function (whatsapp, nombreCliente, servicio, fechaVencimiento) {
            return __awaiter(this, void 0, void 0, function () {
                var config, mensaje;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getConfig()];
                        case 1:
                            config = _a.sent();
                            mensaje = config.plantillaRecordatorio1d || this.getDefaultReminder1dTemplate();
                            mensaje = mensaje.replace('{nombre_cliente}', nombreCliente);
                            mensaje = mensaje.replace('{servicio}', servicio);
                            mensaje = mensaje.replace('{fecha_vencimiento}', fechaVencimiento.toLocaleDateString());
                            mensaje = mensaje.replace('{link_renovacion}', 'https://tu-marca.com/renovar');
                            return [2 /*return*/, this.sendTextMessage(whatsapp, mensaje)];
                    }
                });
            });
        };
        // ENVIAR MENSAJE DE REEMPLAZO (Garantía)
        WhatsappService_1.prototype.sendWarrantyReplacementMessage = function (whatsapp, nombreCliente, nuevaSuscripcion) {
            return __awaiter(this, void 0, void 0, function () {
                var mensaje;
                return __generator(this, function (_a) {
                    mensaje = "\u00A1Hola ".concat(nombreCliente, "! \u2705\n\nTu cuenta ha sido reemplazada exitosamente:\n\n*").concat(nuevaSuscripcion.plan.service.nombre, " - ").concat(nuevaSuscripcion.plan.nombrePlan, "*\n\uD83D\uDCE7 Email: ").concat(nuevaSuscripcion.account.emailCuenta, "\n\uD83D\uDD11 Contrase\u00F1a: ").concat(nuevaSuscripcion.account.passwordCuenta, "\n\uD83D\uDC64 Perfil: ").concat(nuevaSuscripcion.account.perfilAsignado || 'N/A', "\n\n\u26A0\uFE0F Recuerda no cambiar la contrase\u00F1a ni el PIN.\n\n\u00A1A disfrutar! \uD83C\uDF7F");
                    return [2 /*return*/, this.sendTextMessage(whatsapp, mensaje)];
                });
            });
        };
        // ============================================
        // GESTIÓN DE CONFIGURACIÓN
        // ============================================
        // OBTENER CONFIGURACIÓN DE WHATSAPP
        WhatsappService_1.prototype.getConfig = function () {
            return __awaiter(this, void 0, void 0, function () {
                var config;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.whatsappConfig.findFirst()];
                        case 1:
                            config = _a.sent();
                            if (!config) {
                                // Crear configuración por defecto si no existe
                                return [2 /*return*/, this.prisma.whatsappConfig.create({
                                        data: {
                                            nombreConfig: 'Principal',
                                            zonaHoraria: 'America/Bogota',
                                            horaInicio: '09:00:00',
                                            horaFin: '20:00:00',
                                            notificacionesActivas: false,
                                            plantillaEntrega: this.getDefaultDeliveryTemplate(),
                                            plantillaRecordatorio7d: this.getDefaultReminder7dTemplate(),
                                            plantillaRecordatorio1d: this.getDefaultReminder1dTemplate(),
                                            plantillaRecuperacion3d: this.getDefaultRecoveryTemplate(),
                                        },
                                    })];
                            }
                            return [2 /*return*/, config];
                    }
                });
            });
        };
        // ACTUALIZAR CONFIGURACIÓN
        WhatsappService_1.prototype.updateConfig = function (data) {
            return __awaiter(this, void 0, void 0, function () {
                var config;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getConfig()];
                        case 1:
                            config = _a.sent();
                            return [2 /*return*/, this.prisma.whatsappConfig.update({
                                    where: { id: config.id },
                                    data: data,
                                })];
                    }
                });
            });
        };
        // ACTIVAR/DESACTIVAR NOTIFICACIONES
        WhatsappService_1.prototype.toggleNotifications = function (activar) {
            return __awaiter(this, void 0, void 0, function () {
                var config;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getConfig()];
                        case 1:
                            config = _a.sent();
                            return [2 /*return*/, this.prisma.whatsappConfig.update({
                                    where: { id: config.id },
                                    data: { notificacionesActivas: activar },
                                })];
                    }
                });
            });
        };
        // ============================================
        // CONEXIÓN Y ESTADO
        // ============================================
        // CREAR INSTANCIA DE WHATSAPP (Primera vez)
        WhatsappService_1.prototype.createInstance = function () {
            return __awaiter(this, void 0, void 0, function () {
                var response, error_4;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, this.evolutionApi.post('/instance/create', {
                                    instanceName: this.instanceName,
                                    qrcode: true,
                                })];
                        case 1:
                            response = _a.sent();
                            return [2 /*return*/, response.data];
                        case 2:
                            error_4 = _a.sent();
                            this.logger.error('Error creando instancia:', error_4.message);
                            throw new common_1.BadRequestException('Error al crear instancia de WhatsApp');
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        // OBTENER QR PARA CONECTAR
        WhatsappService_1.prototype.getQrCode = function () {
            return __awaiter(this, void 0, void 0, function () {
                var response, error_5;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, this.evolutionApi.get("/instance/connect/".concat(this.instanceName))];
                        case 1:
                            response = _a.sent();
                            return [2 /*return*/, response.data];
                        case 2:
                            error_5 = _a.sent();
                            this.logger.error('Error obteniendo QR:', error_5.message);
                            throw new common_1.BadRequestException('Error al obtener código QR');
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        // VERIFICAR ESTADO DE CONEXIÓN
        WhatsappService_1.prototype.getConnectionState = function () {
            return __awaiter(this, void 0, void 0, function () {
                var response, error_6;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, this.evolutionApi.get("/instance/connectionState/".concat(this.instanceName))];
                        case 1:
                            response = _a.sent();
                            return [2 /*return*/, response.data];
                        case 2:
                            error_6 = _a.sent();
                            return [2 /*return*/, { state: 'disconnected' }];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        // DESCONECTAR INSTANCIA
        WhatsappService_1.prototype.logout = function () {
            return __awaiter(this, void 0, void 0, function () {
                var error_7;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, this.evolutionApi.delete("/instance/logout/".concat(this.instanceName))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, { success: true, message: 'Sesión cerrada' }];
                        case 2:
                            error_7 = _a.sent();
                            throw new common_1.BadRequestException('Error al cerrar sesión');
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        // ============================================
        // TAREAS AUTOMÁTICAS (CRON JOBS)
        // ============================================
        // PROGRAMAR TAREAS AUTOMÁTICAS
        WhatsappService_1.prototype.scheduleAutomaticTasks = function () {
            var _this = this;
            // Enviar recordatorios de renovación cada día a las 10:00 AM
            cron.schedule('0 10 * * *', function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.logger.log('Ejecutando recordatorios de renovación...');
                            return [4 /*yield*/, this.sendRenewalReminders()];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            // Procesar cola de mensajes cada 5 minutos
            cron.schedule('*/5 * * * *', function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.processMessageQueue()];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
        };
        // ENVIAR RECORDATORIOS DE RENOVACIÓN
        WhatsappService_1.prototype.sendRenewalReminders = function () {
            return __awaiter(this, void 0, void 0, function () {
                var config, hoy, en7Dias, suscripciones7d, _i, suscripciones7d_1, sub, error_8, en1Dia, suscripciones1d, _a, suscripciones1d_1, sub, error_9;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getConfig()];
                        case 1:
                            config = _b.sent();
                            if (!config.notificacionesActivas) {
                                this.logger.log('Notificaciones desactivadas, omitiendo recordatorios');
                                return [2 /*return*/];
                            }
                            hoy = new Date();
                            hoy.setHours(0, 0, 0, 0);
                            en7Dias = new Date(hoy);
                            en7Dias.setDate(en7Dias.getDate() + 7);
                            return [4 /*yield*/, this.prisma.subscription.findMany({
                                    where: {
                                        estado: 'ACTIVA',
                                        fechaVencimiento: en7Dias,
                                    },
                                    include: {
                                        customer: { include: { user: true } },
                                        plan: { include: { service: true } },
                                    },
                                })];
                        case 2:
                            suscripciones7d = _b.sent();
                            _i = 0, suscripciones7d_1 = suscripciones7d;
                            _b.label = 3;
                        case 3:
                            if (!(_i < suscripciones7d_1.length)) return [3 /*break*/, 9];
                            sub = suscripciones7d_1[_i];
                            if (sub.customer.optOutWhatsapp)
                                return [3 /*break*/, 8];
                            _b.label = 4;
                        case 4:
                            _b.trys.push([4, 7, , 8]);
                            return [4 /*yield*/, this.sendRenewalReminder7d(sub.customer.whatsapp, sub.customer.user.nombre, sub.plan.service.nombre, sub.fechaVencimiento)];
                        case 5:
                            _b.sent();
                            // Delay aleatorio para simular comportamiento humano
                            return [4 /*yield*/, this.delay(Math.random() * 30000 + 15000)];
                        case 6:
                            // Delay aleatorio para simular comportamiento humano
                            _b.sent(); // 15-45 segundos
                            return [3 /*break*/, 8];
                        case 7:
                            error_8 = _b.sent();
                            this.logger.error("Error enviando recordatorio 7d a ".concat(sub.customer.whatsapp));
                            return [3 /*break*/, 8];
                        case 8:
                            _i++;
                            return [3 /*break*/, 3];
                        case 9:
                            en1Dia = new Date(hoy);
                            en1Dia.setDate(en1Dia.getDate() + 1);
                            return [4 /*yield*/, this.prisma.subscription.findMany({
                                    where: {
                                        estado: 'ACTIVA',
                                        fechaVencimiento: en1Dia,
                                    },
                                    include: {
                                        customer: { include: { user: true } },
                                        plan: { include: { service: true } },
                                    },
                                })];
                        case 10:
                            suscripciones1d = _b.sent();
                            _a = 0, suscripciones1d_1 = suscripciones1d;
                            _b.label = 11;
                        case 11:
                            if (!(_a < suscripciones1d_1.length)) return [3 /*break*/, 17];
                            sub = suscripciones1d_1[_a];
                            if (sub.customer.optOutWhatsapp)
                                return [3 /*break*/, 16];
                            _b.label = 12;
                        case 12:
                            _b.trys.push([12, 15, , 16]);
                            return [4 /*yield*/, this.sendRenewalReminder1d(sub.customer.whatsapp, sub.customer.user.nombre, sub.plan.service.nombre, sub.fechaVencimiento)];
                        case 13:
                            _b.sent();
                            return [4 /*yield*/, this.delay(Math.random() * 30000 + 15000)];
                        case 14:
                            _b.sent();
                            return [3 /*break*/, 16];
                        case 15:
                            error_9 = _b.sent();
                            this.logger.error("Error enviando recordatorio 1d a ".concat(sub.customer.whatsapp));
                            return [3 /*break*/, 16];
                        case 16:
                            _a++;
                            return [3 /*break*/, 11];
                        case 17:
                            this.logger.log("Recordatorios enviados: ".concat(suscripciones7d.length, " (7d) + ").concat(suscripciones1d.length, " (1d)"));
                            return [2 /*return*/];
                    }
                });
            });
        };
        // ============================================
        // COLA DE MENSAJES
        // ============================================
        // ENCOLAR MENSAJE (Cuando está fuera de horario)
        WhatsappService_1.prototype.enqueueMessage = function (numero, mensaje, tipo, imagenUrl) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: 
                        // Aquí podrías usar Redis o una tabla en BD para la cola
                        // Por simplicidad, usamos la tabla notification_logs con estado "encolado"
                        return [4 /*yield*/, this.prisma.notificationLog.create({
                                data: {
                                    customerId: '', // Se buscará por número
                                    tipoEvento: "encolado_".concat(tipo),
                                    canal: 'whatsapp',
                                    mensajeEnviado: mensaje,
                                    estadoEnvio: 'encolado',
                                },
                            })];
                        case 1:
                            // Aquí podrías usar Redis o una tabla en BD para la cola
                            // Por simplicidad, usamos la tabla notification_logs con estado "encolado"
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        // PROCESAR COLA DE MENSAJES
        WhatsappService_1.prototype.processMessageQueue = function () {
            return __awaiter(this, void 0, void 0, function () {
                var mensajesEncolados, _i, mensajesEncolados_1, msg, error_10;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.notificationLog.findMany({
                                where: { estadoEnvio: 'encolado' },
                                take: 10, // Procesar de 10 en 10
                            })];
                        case 1:
                            mensajesEncolados = _a.sent();
                            _i = 0, mensajesEncolados_1 = mensajesEncolados;
                            _a.label = 2;
                        case 2:
                            if (!(_i < mensajesEncolados_1.length)) return [3 /*break*/, 9];
                            msg = mensajesEncolados_1[_i];
                            _a.label = 3;
                        case 3:
                            _a.trys.push([3, 7, , 8]);
                            return [4 /*yield*/, this.sendTextMessage(msg.customerId, msg.mensajeEnviado)];
                        case 4:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.notificationLog.update({
                                    where: { id: msg.id },
                                    data: { estadoEnvio: 'enviado' },
                                })];
                        case 5:
                            _a.sent();
                            return [4 /*yield*/, this.delay(5000)];
                        case 6:
                            _a.sent(); // 5 segundos entre cada envío
                            return [3 /*break*/, 8];
                        case 7:
                            error_10 = _a.sent();
                            this.logger.error("Error procesando mensaje encolado ".concat(msg.id));
                            return [3 /*break*/, 8];
                        case 8:
                            _i++;
                            return [3 /*break*/, 2];
                        case 9: return [2 /*return*/];
                    }
                });
            });
        };
        // ============================================
        // UTILIDADES
        // ============================================
        // VERIFICAR HORARIO DE ENVÍO
        WhatsappService_1.prototype.isWithinSendingHours = function () {
            return __awaiter(this, void 0, void 0, function () {
                var config, now, horaActual;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getConfig()];
                        case 1:
                            config = _a.sent();
                            now = new Date();
                            horaActual = now.toTimeString().split(' ')[0];
                            return [2 /*return*/, horaActual >= config.horaInicio && horaActual <= config.horaFin];
                    }
                });
            });
        };
        // REGISTRAR NOTIFICACIÓN EN LOGS
        WhatsappService_1.prototype.logNotification = function (numero, mensaje, canal, estado) {
            return __awaiter(this, void 0, void 0, function () {
                var customer;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.customer.findFirst({
                                where: { whatsapp: numero },
                            })];
                        case 1:
                            customer = _a.sent();
                            return [4 /*yield*/, this.prisma.notificationLog.create({
                                    data: {
                                        customerId: (customer === null || customer === void 0 ? void 0 : customer.id) || '',
                                        tipoEvento: 'mensaje_manual',
                                        canal: canal,
                                        mensajeEnviado: mensaje,
                                        estadoEnvio: estado,
                                    },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        // DELAY HELPER
        WhatsappService_1.prototype.delay = function (ms) {
            return new Promise(function (resolve) { return setTimeout(resolve, ms); });
        };
        // ============================================
        // PLANTILLAS POR DEFECTO
        // ============================================
        WhatsappService_1.prototype.getDefaultDeliveryTemplate = function () {
            return "\u00A1Hola {nombre_cliente}! \uD83C\uDF89 Gracias por tu compra en {nombre_marca}.\n\nAqu\u00ED tienes los datos de tu suscripci\u00F3n:\n{lista_cuentas}\n\n\u26A0\uFE0F *REGLAS IMPORTANTES PARA MANTENER TU GARANT\u00CDA:*\n1\uFE0F\u20E3 No cambies el correo ni la contrase\u00F1a.\n2\uFE0F\u20E3 No crees ni modifiques el PIN del perfil.\n3\uFE0F\u20E3 Si la plataforma pide verificar identidad, av\u00EDsanos de inmediato.\n\n\u00BFTienes dudas? Responde a este mensaje y te atendemos. \u00A1A disfrutar! \uD83C\uDF7F";
        };
        WhatsappService_1.prototype.getDefaultReminder7dTemplate = function () {
            return "\u00A1Hola {nombre_cliente}! \uD83D\uDC4B Esperamos que est\u00E9s disfrutando tu *{servicio}*.\n\nTe recordamos que tu suscripci\u00F3n vence el pr\u00F3ximo *{fecha_vencimiento}* (en 7 d\u00EDas).\n\nPara que no pierdas el acceso ni tu perfil, puedes renovar f\u00E1cilmente aqu\u00ED:\n\uD83D\uDD17 {link_renovacion}\n\nSi ya realizaste el pago, ignora este mensaje. \u00A1Gracias por preferirnos! \u2728";
        };
        WhatsappService_1.prototype.getDefaultReminder1dTemplate = function () {
            return "\u26A0\uFE0F *ATENCI\u00D3N {nombre_cliente}* \u26A0\uFE0F\n\nTu cuenta de *{servicio}* vence HOY a las 23:59.\nPara evitar que el sistema libere la cuenta y pierdas tu perfil, realiza tu renovaci\u00F3n ahora:\n\n\uD83D\uDD17 {link_renovacion}\n\nResponde \"YA PAGU\u00C9\" y env\u00EDa tu comprobante para extender tu acceso de inmediato. \u23F3";
        };
        WhatsappService_1.prototype.getDefaultRecoveryTemplate = function () {
            return "Hola {nombre_cliente}, notamos que tu suscripci\u00F3n a *{servicio}* venci\u00F3 hace 3 d\u00EDas y el sistema est\u00E1 a punto de reasignar tu perfil. \uD83E\uDD7A\n\n\u00BFDeseas recuperarlo? A\u00FAn podemos reactivarlo por el mismo precio si renuevas en las pr\u00F3ximas 24 horas:\n\uD83D\uDD17 {link_renovacion}\n\nSi no deseas continuar, no hay problema. \u00A1Esperamos verte de nuevo pronto! \uD83D\uDC4B";
        };
        return WhatsappService_1;
    }());
    __setFunctionName(_classThis, "WhatsappService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        WhatsappService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return WhatsappService = _classThis;
}();
exports.WhatsappService = WhatsappService;
