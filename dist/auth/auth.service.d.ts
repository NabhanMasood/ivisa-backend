import { Repository } from 'typeorm';
import { Admin } from './entities/admin.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly adminRepo;
    constructor(adminRepo: Repository<Admin>);
    register(dto: RegisterDto): Promise<{
        message: string;
        admin: Admin;
    }>;
    login(dto: LoginDto): Promise<{
        message: string;
        token: string;
        admin: Admin;
    }>;
}
