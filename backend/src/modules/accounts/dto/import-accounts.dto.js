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
exports.ImportAccountsDto = void 0;
var class_validator_1 = require("class-validator");
var class_transformer_1 = require("class-transformer");
var AccountImportItem = function () {
    var _a;
    var _emailCuenta_decorators;
    var _emailCuenta_initializers = [];
    var _emailCuenta_extraInitializers = [];
    var _passwordCuenta_decorators;
    var _passwordCuenta_initializers = [];
    var _passwordCuenta_extraInitializers = [];
    var _perfilAsignado_decorators;
    var _perfilAsignado_initializers = [];
    var _perfilAsignado_extraInitializers = [];
    var _pinPerfil_decorators;
    var _pinPerfil_initializers = [];
    var _pinPerfil_extraInitializers = [];
    return _a = /** @class */ (function () {
            function AccountImportItem() {
                this.emailCuenta = __runInitializers(this, _emailCuenta_initializers, void 0);
                this.passwordCuenta = (__runInitializers(this, _emailCuenta_extraInitializers), __runInitializers(this, _passwordCuenta_initializers, void 0));
                this.perfilAsignado = (__runInitializers(this, _passwordCuenta_extraInitializers), __runInitializers(this, _perfilAsignado_initializers, void 0));
                this.pinPerfil = (__runInitializers(this, _perfilAsignado_extraInitializers), __runInitializers(this, _pinPerfil_initializers, void 0));
                __runInitializers(this, _pinPerfil_extraInitializers);
            }
            return AccountImportItem;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _emailCuenta_decorators = [(0, class_validator_1.IsString)()];
            _passwordCuenta_decorators = [(0, class_validator_1.IsString)()];
            _perfilAsignado_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _pinPerfil_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _emailCuenta_decorators, { kind: "field", name: "emailCuenta", static: false, private: false, access: { has: function (obj) { return "emailCuenta" in obj; }, get: function (obj) { return obj.emailCuenta; }, set: function (obj, value) { obj.emailCuenta = value; } }, metadata: _metadata }, _emailCuenta_initializers, _emailCuenta_extraInitializers);
            __esDecorate(null, null, _passwordCuenta_decorators, { kind: "field", name: "passwordCuenta", static: false, private: false, access: { has: function (obj) { return "passwordCuenta" in obj; }, get: function (obj) { return obj.passwordCuenta; }, set: function (obj, value) { obj.passwordCuenta = value; } }, metadata: _metadata }, _passwordCuenta_initializers, _passwordCuenta_extraInitializers);
            __esDecorate(null, null, _perfilAsignado_decorators, { kind: "field", name: "perfilAsignado", static: false, private: false, access: { has: function (obj) { return "perfilAsignado" in obj; }, get: function (obj) { return obj.perfilAsignado; }, set: function (obj, value) { obj.perfilAsignado = value; } }, metadata: _metadata }, _perfilAsignado_initializers, _perfilAsignado_extraInitializers);
            __esDecorate(null, null, _pinPerfil_decorators, { kind: "field", name: "pinPerfil", static: false, private: false, access: { has: function (obj) { return "pinPerfil" in obj; }, get: function (obj) { return obj.pinPerfil; }, set: function (obj, value) { obj.pinPerfil = value; } }, metadata: _metadata }, _pinPerfil_initializers, _pinPerfil_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
var ImportAccountsDto = function () {
    var _a;
    var _planId_decorators;
    var _planId_initializers = [];
    var _planId_extraInitializers = [];
    var _batchId_decorators;
    var _batchId_initializers = [];
    var _batchId_extraInitializers = [];
    var _accounts_decorators;
    var _accounts_initializers = [];
    var _accounts_extraInitializers = [];
    return _a = /** @class */ (function () {
            function ImportAccountsDto() {
                this.planId = __runInitializers(this, _planId_initializers, void 0);
                this.batchId = (__runInitializers(this, _planId_extraInitializers), __runInitializers(this, _batchId_initializers, void 0));
                this.accounts = (__runInitializers(this, _batchId_extraInitializers), __runInitializers(this, _accounts_initializers, void 0));
                __runInitializers(this, _accounts_extraInitializers);
            }
            return ImportAccountsDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _planId_decorators = [(0, class_validator_1.IsUUID)()];
            _batchId_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsUUID)()];
            _accounts_decorators = [(0, class_validator_1.IsArray)(), (0, class_validator_1.ValidateNested)({ each: true }), (0, class_transformer_1.Type)(function () { return AccountImportItem; })];
            __esDecorate(null, null, _planId_decorators, { kind: "field", name: "planId", static: false, private: false, access: { has: function (obj) { return "planId" in obj; }, get: function (obj) { return obj.planId; }, set: function (obj, value) { obj.planId = value; } }, metadata: _metadata }, _planId_initializers, _planId_extraInitializers);
            __esDecorate(null, null, _batchId_decorators, { kind: "field", name: "batchId", static: false, private: false, access: { has: function (obj) { return "batchId" in obj; }, get: function (obj) { return obj.batchId; }, set: function (obj, value) { obj.batchId = value; } }, metadata: _metadata }, _batchId_initializers, _batchId_extraInitializers);
            __esDecorate(null, null, _accounts_decorators, { kind: "field", name: "accounts", static: false, private: false, access: { has: function (obj) { return "accounts" in obj; }, get: function (obj) { return obj.accounts; }, set: function (obj, value) { obj.accounts = value; } }, metadata: _metadata }, _accounts_initializers, _accounts_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.ImportAccountsDto = ImportAccountsDto;
