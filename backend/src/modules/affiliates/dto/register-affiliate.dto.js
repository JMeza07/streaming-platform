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
exports.RegisterAffiliateDto = void 0;
var class_validator_1 = require("class-validator");
var RegisterAffiliateDto = function () {
    var _a;
    var _userId_decorators;
    var _userId_initializers = [];
    var _userId_extraInitializers = [];
    var _codigoReferido_decorators;
    var _codigoReferido_initializers = [];
    var _codigoReferido_extraInitializers = [];
    var _codigoReferidor_decorators;
    var _codigoReferidor_initializers = [];
    var _codigoReferidor_extraInitializers = [];
    return _a = /** @class */ (function () {
            function RegisterAffiliateDto() {
                this.userId = __runInitializers(this, _userId_initializers, void 0);
                this.codigoReferido = (__runInitializers(this, _userId_extraInitializers), __runInitializers(this, _codigoReferido_initializers, void 0)); // Ej: JUAN2024
                this.codigoReferidor = (__runInitializers(this, _codigoReferido_extraInitializers), __runInitializers(this, _codigoReferidor_initializers, void 0)); // Código del afiliado que lo invitó (Nivel 2)
                __runInitializers(this, _codigoReferidor_extraInitializers);
            }
            return RegisterAffiliateDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _userId_decorators = [(0, class_validator_1.IsUUID)()];
            _codigoReferido_decorators = [(0, class_validator_1.IsString)()];
            _codigoReferidor_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _userId_decorators, { kind: "field", name: "userId", static: false, private: false, access: { has: function (obj) { return "userId" in obj; }, get: function (obj) { return obj.userId; }, set: function (obj, value) { obj.userId = value; } }, metadata: _metadata }, _userId_initializers, _userId_extraInitializers);
            __esDecorate(null, null, _codigoReferido_decorators, { kind: "field", name: "codigoReferido", static: false, private: false, access: { has: function (obj) { return "codigoReferido" in obj; }, get: function (obj) { return obj.codigoReferido; }, set: function (obj, value) { obj.codigoReferido = value; } }, metadata: _metadata }, _codigoReferido_initializers, _codigoReferido_extraInitializers);
            __esDecorate(null, null, _codigoReferidor_decorators, { kind: "field", name: "codigoReferidor", static: false, private: false, access: { has: function (obj) { return "codigoReferidor" in obj; }, get: function (obj) { return obj.codigoReferidor; }, set: function (obj, value) { obj.codigoReferidor = value; } }, metadata: _metadata }, _codigoReferidor_initializers, _codigoReferidor_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.RegisterAffiliateDto = RegisterAffiliateDto;
