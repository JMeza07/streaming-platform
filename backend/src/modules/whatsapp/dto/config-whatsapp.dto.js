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
exports.ConfigWhatsappDto = void 0;
var class_validator_1 = require("class-validator");
var ConfigWhatsappDto = function () {
    var _a;
    var _nombreConfig_decorators;
    var _nombreConfig_initializers = [];
    var _nombreConfig_extraInitializers = [];
    var _zonaHoraria_decorators;
    var _zonaHoraria_initializers = [];
    var _zonaHoraria_extraInitializers = [];
    var _horaInicio_decorators;
    var _horaInicio_initializers = [];
    var _horaInicio_extraInitializers = [];
    var _horaFin_decorators;
    var _horaFin_initializers = [];
    var _horaFin_extraInitializers = [];
    var _notificacionesActivas_decorators;
    var _notificacionesActivas_initializers = [];
    var _notificacionesActivas_extraInitializers = [];
    var _plantillaEntrega_decorators;
    var _plantillaEntrega_initializers = [];
    var _plantillaEntrega_extraInitializers = [];
    var _plantillaRecordatorio7d_decorators;
    var _plantillaRecordatorio7d_initializers = [];
    var _plantillaRecordatorio7d_extraInitializers = [];
    var _plantillaRecordatorio1d_decorators;
    var _plantillaRecordatorio1d_initializers = [];
    var _plantillaRecordatorio1d_extraInitializers = [];
    var _plantillaRecuperacion3d_decorators;
    var _plantillaRecuperacion3d_initializers = [];
    var _plantillaRecuperacion3d_extraInitializers = [];
    return _a = /** @class */ (function () {
            function ConfigWhatsappDto() {
                this.nombreConfig = __runInitializers(this, _nombreConfig_initializers, void 0);
                this.zonaHoraria = (__runInitializers(this, _nombreConfig_extraInitializers), __runInitializers(this, _zonaHoraria_initializers, void 0));
                this.horaInicio = (__runInitializers(this, _zonaHoraria_extraInitializers), __runInitializers(this, _horaInicio_initializers, void 0));
                this.horaFin = (__runInitializers(this, _horaInicio_extraInitializers), __runInitializers(this, _horaFin_initializers, void 0));
                this.notificacionesActivas = (__runInitializers(this, _horaFin_extraInitializers), __runInitializers(this, _notificacionesActivas_initializers, void 0));
                this.plantillaEntrega = (__runInitializers(this, _notificacionesActivas_extraInitializers), __runInitializers(this, _plantillaEntrega_initializers, void 0));
                this.plantillaRecordatorio7d = (__runInitializers(this, _plantillaEntrega_extraInitializers), __runInitializers(this, _plantillaRecordatorio7d_initializers, void 0));
                this.plantillaRecordatorio1d = (__runInitializers(this, _plantillaRecordatorio7d_extraInitializers), __runInitializers(this, _plantillaRecordatorio1d_initializers, void 0));
                this.plantillaRecuperacion3d = (__runInitializers(this, _plantillaRecordatorio1d_extraInitializers), __runInitializers(this, _plantillaRecuperacion3d_initializers, void 0));
                __runInitializers(this, _plantillaRecuperacion3d_extraInitializers);
            }
            return ConfigWhatsappDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _nombreConfig_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _zonaHoraria_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _horaInicio_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _horaFin_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _notificacionesActivas_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)()];
            _plantillaEntrega_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _plantillaRecordatorio7d_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _plantillaRecordatorio1d_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _plantillaRecuperacion3d_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _nombreConfig_decorators, { kind: "field", name: "nombreConfig", static: false, private: false, access: { has: function (obj) { return "nombreConfig" in obj; }, get: function (obj) { return obj.nombreConfig; }, set: function (obj, value) { obj.nombreConfig = value; } }, metadata: _metadata }, _nombreConfig_initializers, _nombreConfig_extraInitializers);
            __esDecorate(null, null, _zonaHoraria_decorators, { kind: "field", name: "zonaHoraria", static: false, private: false, access: { has: function (obj) { return "zonaHoraria" in obj; }, get: function (obj) { return obj.zonaHoraria; }, set: function (obj, value) { obj.zonaHoraria = value; } }, metadata: _metadata }, _zonaHoraria_initializers, _zonaHoraria_extraInitializers);
            __esDecorate(null, null, _horaInicio_decorators, { kind: "field", name: "horaInicio", static: false, private: false, access: { has: function (obj) { return "horaInicio" in obj; }, get: function (obj) { return obj.horaInicio; }, set: function (obj, value) { obj.horaInicio = value; } }, metadata: _metadata }, _horaInicio_initializers, _horaInicio_extraInitializers);
            __esDecorate(null, null, _horaFin_decorators, { kind: "field", name: "horaFin", static: false, private: false, access: { has: function (obj) { return "horaFin" in obj; }, get: function (obj) { return obj.horaFin; }, set: function (obj, value) { obj.horaFin = value; } }, metadata: _metadata }, _horaFin_initializers, _horaFin_extraInitializers);
            __esDecorate(null, null, _notificacionesActivas_decorators, { kind: "field", name: "notificacionesActivas", static: false, private: false, access: { has: function (obj) { return "notificacionesActivas" in obj; }, get: function (obj) { return obj.notificacionesActivas; }, set: function (obj, value) { obj.notificacionesActivas = value; } }, metadata: _metadata }, _notificacionesActivas_initializers, _notificacionesActivas_extraInitializers);
            __esDecorate(null, null, _plantillaEntrega_decorators, { kind: "field", name: "plantillaEntrega", static: false, private: false, access: { has: function (obj) { return "plantillaEntrega" in obj; }, get: function (obj) { return obj.plantillaEntrega; }, set: function (obj, value) { obj.plantillaEntrega = value; } }, metadata: _metadata }, _plantillaEntrega_initializers, _plantillaEntrega_extraInitializers);
            __esDecorate(null, null, _plantillaRecordatorio7d_decorators, { kind: "field", name: "plantillaRecordatorio7d", static: false, private: false, access: { has: function (obj) { return "plantillaRecordatorio7d" in obj; }, get: function (obj) { return obj.plantillaRecordatorio7d; }, set: function (obj, value) { obj.plantillaRecordatorio7d = value; } }, metadata: _metadata }, _plantillaRecordatorio7d_initializers, _plantillaRecordatorio7d_extraInitializers);
            __esDecorate(null, null, _plantillaRecordatorio1d_decorators, { kind: "field", name: "plantillaRecordatorio1d", static: false, private: false, access: { has: function (obj) { return "plantillaRecordatorio1d" in obj; }, get: function (obj) { return obj.plantillaRecordatorio1d; }, set: function (obj, value) { obj.plantillaRecordatorio1d = value; } }, metadata: _metadata }, _plantillaRecordatorio1d_initializers, _plantillaRecordatorio1d_extraInitializers);
            __esDecorate(null, null, _plantillaRecuperacion3d_decorators, { kind: "field", name: "plantillaRecuperacion3d", static: false, private: false, access: { has: function (obj) { return "plantillaRecuperacion3d" in obj; }, get: function (obj) { return obj.plantillaRecuperacion3d; }, set: function (obj, value) { obj.plantillaRecuperacion3d = value; } }, metadata: _metadata }, _plantillaRecuperacion3d_initializers, _plantillaRecuperacion3d_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.ConfigWhatsappDto = ConfigWhatsappDto;
