import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        message: string;
        admin: import("./entities/admin.entity").Admin;
    }>;
    login(dto: LoginDto): Promise<{
        message: string;
        token: string;
        admin: import("./entities/admin.entity").Admin;
    }>;
}
