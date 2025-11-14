import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    const result = await this.authService.login(dto);

    // Set cookies
    res.cookie('auth_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure in production
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'strict',
    });

    res.cookie('admin_info', JSON.stringify({
      id: result.admin.id,
      email: result.admin.email,
      fullName: result.admin.fullName,
    }), {
      httpOnly: false, // Make accessible to client-side JS if needed
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'strict',
    });

    return res.json({
      message: result.message,
      token: result.token, 
      admin: result.admin,
    });
  }

  @Post('logout')
  logout(@Res() res: Response) {
    res.clearCookie('auth_token');
    res.clearCookie('admin_info');
    return res.json({ message: 'Logged out successfully' });
  }
}