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
exports.NationalitiesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const nationality_entity_1 = require("./entities/nationality.entity");
const country_entity_1 = require("../countries/entities/country.entity");
const visa_product_entity_1 = require("../visa-product/entities/visa-product.entity");
let NationalitiesService = class NationalitiesService {
    nationalityRepo;
    countryRepo;
    visaProductRepo;
    constructor(nationalityRepo, countryRepo, visaProductRepo) {
        this.nationalityRepo = nationalityRepo;
        this.countryRepo = countryRepo;
        this.visaProductRepo = visaProductRepo;
    }
    async create(dto) {
        const countryExists = await this.countryRepo.findOne({ where: { countryName: dto.nationality } });
        if (!countryExists)
            throw new common_1.BadRequestException('Nationality does not exist');
        const destinationExists = await this.visaProductRepo.findOne({ where: { country: dto.destination, productName: dto.productName } });
        if (!destinationExists)
            throw new common_1.BadRequestException('Product not found for destination');
        const nationality = this.nationalityRepo.create(dto);
        return this.nationalityRepo.save(nationality);
    }
    async getNationalities() {
        const countries = await this.countryRepo.find();
        return countries.map(c => c.countryName);
    }
    async getDestinations() {
        const rawDestinations = await this.visaProductRepo
            .createQueryBuilder('visa')
            .select('visa.country', 'country')
            .where('visa.country IS NOT NULL')
            .distinct(true)
            .orderBy('visa.country', 'ASC')
            .getRawMany();
        return rawDestinations
            .map(d => d.country)
            .filter((c) => !!c);
    }
    async getProducts(destination) {
        const products = await this.visaProductRepo.find({ where: { country: destination } });
        return products.map(p => ({
            productName: p.productName,
            duration: p.duration,
            validity: p.validity,
            govtFee: p.govtFee,
            serviceFee: p.serviceFee,
            totalAmount: p.totalAmount,
        }));
    }
    async listWithDestinationCounts(q) {
        const qb = this.nationalityRepo
            .createQueryBuilder('n')
            .select('n.nationality', 'nationality')
            .addSelect('COUNT(DISTINCT n.destination)', 'destinations');
        if (q && q.trim()) {
            qb.where('LOWER(n.nationality) LIKE :q', { q: `%${q.toLowerCase()}%` });
        }
        const rows = await qb
            .groupBy('n.nationality')
            .orderBy('n.nationality', 'ASC')
            .getRawMany();
        return rows.map(r => ({
            nationality: r.nationality,
            destinations: Number(r.destinations),
        }));
    }
    async listDestinationsWithCounts(filters) {
        const qb = this.nationalityRepo
            .createQueryBuilder('n')
            .select('n.destination', 'destination')
            .addSelect('COUNT(n.productName)', 'products');
        if (filters?.nationality) {
            qb.where('n.nationality = :nat', { nat: filters.nationality });
        }
        if (filters?.q && filters.q.trim()) {
            const like = `%${filters.q.toLowerCase()}%`;
            qb.andWhere('LOWER(n.destination) LIKE :q', { q: like });
        }
        const rows = await qb
            .groupBy('n.destination')
            .orderBy('n.destination', 'ASC')
            .getRawMany();
        return rows.map(r => ({ destination: r.destination, products: Number(r.products) }));
    }
};
exports.NationalitiesService = NationalitiesService;
exports.NationalitiesService = NationalitiesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(nationality_entity_1.Nationality)),
    __param(1, (0, typeorm_1.InjectRepository)(country_entity_1.Country)),
    __param(2, (0, typeorm_1.InjectRepository)(visa_product_entity_1.VisaProduct)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], NationalitiesService);
//# sourceMappingURL=nationalities.service.js.map