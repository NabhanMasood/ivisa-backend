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
exports.CountriesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const country_entity_1 = require("./entities/country.entity");
let CountriesService = class CountriesService {
    countryRepo;
    constructor(countryRepo) {
        this.countryRepo = countryRepo;
    }
    async create(createDto) {
        try {
            const existing = await this.countryRepo.findOne({
                where: { countryName: createDto.countryName },
            });
            if (existing) {
                throw new common_1.BadRequestException('Country already exists');
            }
            const country = this.countryRepo.create(createDto);
            return this.countryRepo.save(country);
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message || 'Error creating country');
        }
    }
    async findAll(search) {
        const query = this.countryRepo.createQueryBuilder('country');
        if (search) {
            query.where('country.countryName ILIKE :search', { search: `%${search}%` });
        }
        const countries = await query.getMany();
        return countries.map(c => ({
            id: c.id,
            countryName: c.countryName,
            createdAt: c.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
            updatedAt: c.updatedAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
        }));
    }
};
exports.CountriesService = CountriesService;
exports.CountriesService = CountriesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(country_entity_1.Country)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CountriesService);
//# sourceMappingURL=countries.service.js.map