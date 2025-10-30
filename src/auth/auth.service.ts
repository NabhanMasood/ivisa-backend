import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { Admin } from './entities/admin.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
  ) {}

  async register(dto: RegisterDto) {
    const { fullName, email, password } = dto;

    const existing = await this.adminRepo.findOne({ where: { email } });
    if (existing) throw new BadRequestException('Email already exists');

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = this.adminRepo.create({ fullName, email, password: hashedPassword });
    await this.adminRepo.save(admin);

    return { message: 'Admin registered successfully', admin };
  }

  async login(dto: LoginDto) {
    const { email, password } = dto;

    const admin = await this.adminRepo.findOne({ where: { email } });
    if (!admin) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      process.env.JWT_SECRET || 'SECRET_KEY',
      { expiresIn: '7d' },
    );

    return { message: 'Login successful', token, admin };
  }
}
