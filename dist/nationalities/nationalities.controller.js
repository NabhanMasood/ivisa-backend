"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NationalitiesController = void 0;
const common_1 = require("@nestjs/common");
const nationalities_service_1 = require("./nationalities.service");
const create_nationality_dto_1 = require("./dto/create-nationality.dto");
const http_exception_filter_1 = require("./http-exception.filter");
let NationalitiesController = class NationalitiesController {
    service;
    constructor(service) {
        this.service = service;
    }
    async create(dto) {
        try {
            const result = await this.service.create(dto);
            return { status: true, message: 'Nationality created successfully', data: result };
        }
        catch (err) {
            throw new common_1.BadRequestException({ message: err.message });
        }
    }
    async nationalityDropdown() {
        const result = await this.service.getNationalities();
        return { status: true, data: result };
    }
    async destinationDropdown() {
        const result = await this.service.getDestinations();
        return { status: true, data: result };
    }
    async products(destination) {
        if (!destination || !destination.trim()) {
            throw new common_1.BadRequestException({ message: 'Query parameter "destination" is required' });
        }
        const result = await this.service.getProducts(destination);
        return { status: true, message: 'Products fetched successfully', data: result };
    }
    async list(q) {
        const result = await this.service.listWithDestinationCounts(q);
        return { status: true, message: 'Nationalities fetched successfully', data: result };
    }
    async destinations(nationality, q) {
        const result = await this.service.listDestinationsWithCounts({ nationality, q });
        return { status: true, message: 'Destinations fetched successfully', data: result };
    }
};
exports.NationalitiesController = NationalitiesController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_nationality_dto_1.CreateNationalityDto]),
    __metadata("design:returntype", Promise)
], NationalitiesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('nationality-dropdown'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NationalitiesController.prototype, "nationalityDropdown", null);
__decorate([
    (0, common_1.Get)('destination-dropdown'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NationalitiesController.prototype, "destinationDropdown", null);
__decorate([
    (0, common_1.Get)('products'),
    __param(0, (0, common_1.Query)('destination')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NationalitiesController.prototype, "products", null);
__decorate([
    (0, common_1.Get)('list'),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NationalitiesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('destinations'),
    __param(0, (0, common_1.Query)('nationality')),
    __param(1, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], NationalitiesController.prototype, "destinations", null);
exports.NationalitiesController = NationalitiesController = __decorate([
    (0, common_1.Controller)('nationalities'),
    (0, common_1.UseFilters)(http_exception_filter_1.NationalitiesHttpExceptionFilter),
    __metadata("design:paramtypes", [nationalities_service_1.NationalitiesService])
], NationalitiesController);
//# sourceMappingURL=nationalities.controller.js.map