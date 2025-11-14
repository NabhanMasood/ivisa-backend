import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as jwt from 'jsonwebtoken';
import { Admin } from '../entities/admin.entity';

// Extend Express Request to include admin property
declare global {
  namespace Express {
    interface Request {
      admin?: Admin;
    }
  }
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Get token from cookies
      const token = req.cookies?.auth_token;

      if (!token) {
        throw new UnauthorizedException('No authentication token found');
      }

      // Verify JWT token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'SECRET_KEY',
      ) as { id: number; email: string };

      // Fetch admin from database
      const admin = await this.adminRepo.findOne({ 
        where: { id: decoded.id } 
      });

      if (!admin) {
        throw new UnauthorizedException('Admin not found');
      }

      // Attach admin to request object
      req.admin = admin;

      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      }
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token expired');
      }
      throw error;
    }
  }
}
