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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestWarrantyDto = void 0;
var class_validator_1 = require("class-validator");
var RequestWarrantyDto = function () {
    var _a;
    var _subscriptionId_decorators;
    var _subscriptionId_initializers = [];
    var _subscriptionId_extraInitializers = [];
    var _motivoReporte_decorators;
    var _motivoReporte_initializers = [];
    var _motivoReporte_extraInitializers = [];
    var _descripcionAdicional_decorators;
    var _descripcionAdicional_initializers = [];
    var _descripcionAdicional_extraInitializers = [];
    var _evidenciaUrl_decorators;
    var _evidenciaUrl_initializers = [];
    var _evidenciaUrl_extraInitializers = [];
    return _a = /** @class */ (function () {
            function RequestWarrantyDto() {
                this.subscriptionId = __runInitializers(this, _subscriptionId_initializers, void 0);
                this.motivoReporte = (__runInitializers(this, _subscriptionId_extraInitializers), __runInitializers(this, _motivoReporte_initializers, void 0));
                this.descripcionAdicional = (__runInitializers(this, _motivoReporte_extraInitializers), __runInitializers(this, _descripcionAdicional_initializers, void 0));
                this.evidenciaUrl = (__runInitializers(this, _descripcionAdicional_extraInitializers), __runInitializers(this, _evidenciaUrl_initializers, void 0)); // URL de la imagen/video del error
                __runInitializers(this, _evidenciaUrl_extraInitializers);
            }
            return RequestWarrantyDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _subscriptionId_decorators = [(0, class_validator_1.IsUUID)()];
            _motivoReporte_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsIn)([
                    'clave_incorrecta',
                    'pantalla_bloqueada',
                    'perfil_borrado',
                    'error_sistema',
                    'otro'
                ])];
            _descripcionAdicional_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _evidenciaUrl_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _subscriptionId_decorators, { kind: "field", name: "subscriptionId", static: false, private: false, access: { has: function (obj) { return "subscriptionId" in obj; }, get: function (obj) { return obj.subscriptionId; }, set: function (obj, value) { obj.subscriptionId = value; } }, metadata: _metadata }, _subscriptionId_initializers, _subscriptionId_extraInitializers);
            __esDecorate(null, null, _motivoReporte_decorators, { kind: "field", name: "motivoReporte", static: false, private: false, access: { has: function (obj) { return "motivoReporte" in obj; }, get: function (obj) { return obj.motivoReporte; }, set: function (obj, value) { obj.motivoReporte = value; } }, metadata: _metadata }, _motivoReporte_initializers, _motivoReporte_extraInitializers);
            __esDecorate(null, null, _descripcionAdicional_decorators, { kind: "field", name: "descripcionAdicional", static: false, private: false, access: { has: function (obj) { return "descripcionAdicional" in obj; }, get: function (obj) { return obj.descripcionAdicional; }, set: function (obj, value) { obj.descripcionAdicional = value; } }, metadata: _metadata }, _descripcionAdicional_initializers, _descripcionAdicional_extraInitializers);
            __esDecorate(null, null, _evidenciaUrl_decorators, { kind: "field", name: "evidenciaUrl", static: false, private: false, access: { has: function (obj) { return "evidenciaUrl" in obj; }, get: function (obj) { return obj.evidenciaUrl; }, set: function (obj, value) { obj.evidenciaUrl = value; } }, metadata: _metadata }, _evidenciaUrl_initializers, _evidenciaUrl_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.RequestWarrantyDto = RequestWarrantyDto;
