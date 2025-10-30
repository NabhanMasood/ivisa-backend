"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NationalitiesHttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let NationalitiesHttpExceptionFilter = class NationalitiesHttpExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        if (exception instanceof common_1.HttpException) {
            const status = exception.getStatus();
            const res = exception.getResponse();
            const message = typeof res === 'string' ? res : res?.message || 'Request failed';
            const errors = typeof res === 'object' ? res?.errors || res?.message : undefined;
            response.status(status).json({ status: false, message, errors });
            return;
        }
        response
            .status(common_1.HttpStatus.INTERNAL_SERVER_ERROR)
            .json({ status: false, message: 'Internal server error' });
    }
};
exports.NationalitiesHttpExceptionFilter = NationalitiesHttpExceptionFilter;
exports.NationalitiesHttpExceptionFilter = NationalitiesHttpExceptionFilter = __decorate([
    (0, common_1.Catch)()
], NationalitiesHttpExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map