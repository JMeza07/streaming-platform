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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WarrantyController = void 0;
var common_1 = require("@nestjs/common");
var jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
var roles_guard_1 = require("../auth/guards/roles.guard");
var roles_decorator_1 = require("../../common/decorators/roles.decorator");
var client_1 = require("@prisma/client");
var WarrantyController = function () {
    var _classDecorators = [(0, common_1.Controller)('warranty'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN, client_1.UserRole.SOPORTE)];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _getPendingTickets_decorators;
    var _getAllTickets_decorators;
    var _getTicketStats_decorators;
    var _resolveTicket_decorators;
    var _getAllBatches_decorators;
    var _quarantineBatch_decorators;
    var _reactivateBatch_decorators;
    var WarrantyController = _classThis = /** @class */ (function () {
        function WarrantyController_1(warrantyService) {
            this.warrantyService = (__runInitializers(this, _instanceExtraInitializers), warrantyService);
        }
        // ============================================
        // TICKETS
        // ============================================
        // LISTAR TICKETS PENDIENTES (Vista principal)
        WarrantyController_1.prototype.getPendingTickets = function () {
            return this.warrantyService.getPendingTickets();
        };
        // LISTAR TODOS LOS TICKETS (Con filtros)
        WarrantyController_1.prototype.getAllTickets = function (estado, customerId, motivoReporte) {
            return this.warrantyService.getAllTickets({ estado: estado, customerId: customerId, motivoReporte: motivoReporte });
        };
        // ESTADÍSTICAS DE TICKETS
        WarrantyController_1.prototype.getTicketStats = function () {
            return this.warrantyService.getTicketStats();
        };
        // RESOLVER TICKET (Aprobar o Rechazar)
        WarrantyController_1.prototype.resolveTicket = function (user, dto) {
            return this.warrantyService.resolveTicket(user.userId, dto);
        };
        // ============================================
        // LOTES Y CONTROL DE CALIDAD
        // ============================================
        // LISTAR TODOS LOS LOTES
        WarrantyController_1.prototype.getAllBatches = function () {
            return this.warrantyService.getAllBatches();
        };
        // PONER LOTE EN CUARENTENA
        WarrantyController_1.prototype.quarantineBatch = function (dto) {
            return this.warrantyService.quarantineBatch(dto.batchId, dto.razon);
        };
        // REACTIVAR LOTE
        WarrantyController_1.prototype.reactivateBatch = function (id) {
            return this.warrantyService.reactivateBatch(id);
        };
        return WarrantyController_1;
    }());
    __setFunctionName(_classThis, "WarrantyController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _getPendingTickets_decorators = [(0, common_1.Get)('tickets/pending')];
        _getAllTickets_decorators = [(0, common_1.Get)('tickets')];
        _getTicketStats_decorators = [(0, common_1.Get)('tickets/stats')];
        _resolveTicket_decorators = [(0, common_1.Post)('tickets/resolve')];
        _getAllBatches_decorators = [(0, common_1.Get)('batches'), (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN)];
        _quarantineBatch_decorators = [(0, common_1.Post)('batches/quarantine'), (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN)];
        _reactivateBatch_decorators = [(0, common_1.Post)('batches/:id/reactivate'), (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN)];
        __esDecorate(_classThis, null, _getPendingTickets_decorators, { kind: "method", name: "getPendingTickets", static: false, private: false, access: { has: function (obj) { return "getPendingTickets" in obj; }, get: function (obj) { return obj.getPendingTickets; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getAllTickets_decorators, { kind: "method", name: "getAllTickets", static: false, private: false, access: { has: function (obj) { return "getAllTickets" in obj; }, get: function (obj) { return obj.getAllTickets; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getTicketStats_decorators, { kind: "method", name: "getTicketStats", static: false, private: false, access: { has: function (obj) { return "getTicketStats" in obj; }, get: function (obj) { return obj.getTicketStats; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _resolveTicket_decorators, { kind: "method", name: "resolveTicket", static: false, private: false, access: { has: function (obj) { return "resolveTicket" in obj; }, get: function (obj) { return obj.resolveTicket; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getAllBatches_decorators, { kind: "method", name: "getAllBatches", static: false, private: false, access: { has: function (obj) { return "getAllBatches" in obj; }, get: function (obj) { return obj.getAllBatches; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _quarantineBatch_decorators, { kind: "method", name: "quarantineBatch", static: false, private: false, access: { has: function (obj) { return "quarantineBatch" in obj; }, get: function (obj) { return obj.quarantineBatch; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _reactivateBatch_decorators, { kind: "method", name: "reactivateBatch", static: false, private: false, access: { has: function (obj) { return "reactivateBatch" in obj; }, get: function (obj) { return obj.reactivateBatch; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        WarrantyController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return WarrantyController = _classThis;
}();
exports.WarrantyController = WarrantyController;
