"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
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
exports.WhatsappController = void 0;
var common_1 = require("@nestjs/common");
var jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
var roles_guard_1 = require("../auth/guards/roles.guard");
var roles_decorator_1 = require("../../common/decorators/roles.decorator");
var client_1 = require("@prisma/client");
var WhatsappController = function () {
    var _classDecorators = [(0, common_1.Controller)('whatsapp')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _handleWebhook_decorators;
    var _createInstance_decorators;
    var _getQrCode_decorators;
    var _getConnectionState_decorators;
    var _logout_decorators;
    var _sendMessage_decorators;
    var _getConfig_decorators;
    var _updateConfig_decorators;
    var _toggleNotifications_decorators;
    var _testReminders_decorators;
    var WhatsappController = _classThis = /** @class */ (function () {
        function WhatsappController_1(whatsappService) {
            this.whatsappService = (__runInitializers(this, _instanceExtraInitializers), whatsappService);
        }
        // ============================================
        // ENDPOINTS PÚBLICOS (Webhooks)
        // ============================================
        // WEBHOOK PARA RECIBIR MENSAJES ENTRANTES
        WhatsappController_1.prototype.handleWebhook = function (body) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    // Aquí procesarías los mensajes que envían los clientes
                    // Por ejemplo: "YA PAGUÉ", "NO FUNCIONA", etc.
                    console.log('Webhook recibido:', body);
                    // TODO: Implementar lógica de chatbot
                    return [2 /*return*/, { success: true }];
                });
            });
        };
        // ============================================
        // ENDPOINTS PROTEGIDOS (Admin)
        // ============================================
        // CREAR INSTANCIA DE WHATSAPP
        WhatsappController_1.prototype.createInstance = function () {
            return this.whatsappService.createInstance();
        };
        // OBTENER QR PARA CONECTAR
        WhatsappController_1.prototype.getQrCode = function () {
            return this.whatsappService.getQrCode();
        };
        // VERIFICAR ESTADO DE CONEXIÓN
        WhatsappController_1.prototype.getConnectionState = function () {
            return this.whatsappService.getConnectionState();
        };
        // DESCONECTAR INSTANCIA
        WhatsappController_1.prototype.logout = function () {
            return this.whatsappService.logout();
        };
        // ENVIAR MENSAJE MANUAL
        WhatsappController_1.prototype.sendMessage = function (dto) {
            return this.whatsappService.sendTextMessage(dto.numero, dto.mensaje);
        };
        // OBTENER CONFIGURACIÓN
        WhatsappController_1.prototype.getConfig = function () {
            return this.whatsappService.getConfig();
        };
        // ACTUALIZAR CONFIGURACIÓN
        WhatsappController_1.prototype.updateConfig = function (dto) {
            return this.whatsappService.updateConfig(dto);
        };
        // ACTIVAR/DESACTIVAR NOTIFICACIONES
        WhatsappController_1.prototype.toggleNotifications = function (activar) {
            return this.whatsappService.toggleNotifications(activar);
        };
        // EJECUTAR RECORDATORIOS MANUALMENTE (Para pruebas)
        WhatsappController_1.prototype.testReminders = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    // Este método es privado en el service, lo exponemos solo para pruebas
                    // En producción deberías eliminarlo o protegerlo mejor
                    return [2 /*return*/, { message: 'Usa el endpoint de configuración para activar notificaciones' }];
                });
            });
        };
        return WhatsappController_1;
    }());
    __setFunctionName(_classThis, "WhatsappController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _handleWebhook_decorators = [(0, common_1.Post)('webhook'), (0, common_1.HttpCode)(200)];
        _createInstance_decorators = [(0, common_1.Post)('instance/create'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN)];
        _getQrCode_decorators = [(0, common_1.Get)('instance/qr'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN)];
        _getConnectionState_decorators = [(0, common_1.Get)('instance/status'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN)];
        _logout_decorators = [(0, common_1.Post)('instance/logout'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN)];
        _sendMessage_decorators = [(0, common_1.Post)('send'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN, client_1.UserRole.SOPORTE)];
        _getConfig_decorators = [(0, common_1.Get)('config'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN)];
        _updateConfig_decorators = [(0, common_1.Patch)('config'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN)];
        _toggleNotifications_decorators = [(0, common_1.Post)('toggle-notifications'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN)];
        _testReminders_decorators = [(0, common_1.Post)('test-reminders'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN)];
        __esDecorate(_classThis, null, _handleWebhook_decorators, { kind: "method", name: "handleWebhook", static: false, private: false, access: { has: function (obj) { return "handleWebhook" in obj; }, get: function (obj) { return obj.handleWebhook; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createInstance_decorators, { kind: "method", name: "createInstance", static: false, private: false, access: { has: function (obj) { return "createInstance" in obj; }, get: function (obj) { return obj.createInstance; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getQrCode_decorators, { kind: "method", name: "getQrCode", static: false, private: false, access: { has: function (obj) { return "getQrCode" in obj; }, get: function (obj) { return obj.getQrCode; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getConnectionState_decorators, { kind: "method", name: "getConnectionState", static: false, private: false, access: { has: function (obj) { return "getConnectionState" in obj; }, get: function (obj) { return obj.getConnectionState; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _logout_decorators, { kind: "method", name: "logout", static: false, private: false, access: { has: function (obj) { return "logout" in obj; }, get: function (obj) { return obj.logout; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _sendMessage_decorators, { kind: "method", name: "sendMessage", static: false, private: false, access: { has: function (obj) { return "sendMessage" in obj; }, get: function (obj) { return obj.sendMessage; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getConfig_decorators, { kind: "method", name: "getConfig", static: false, private: false, access: { has: function (obj) { return "getConfig" in obj; }, get: function (obj) { return obj.getConfig; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateConfig_decorators, { kind: "method", name: "updateConfig", static: false, private: false, access: { has: function (obj) { return "updateConfig" in obj; }, get: function (obj) { return obj.updateConfig; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _toggleNotifications_decorators, { kind: "method", name: "toggleNotifications", static: false, private: false, access: { has: function (obj) { return "toggleNotifications" in obj; }, get: function (obj) { return obj.toggleNotifications; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _testReminders_decorators, { kind: "method", name: "testReminders", static: false, private: false, access: { has: function (obj) { return "testReminders" in obj; }, get: function (obj) { return obj.testReminders; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        WhatsappController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return WhatsappController = _classThis;
}();
exports.WhatsappController = WhatsappController;
