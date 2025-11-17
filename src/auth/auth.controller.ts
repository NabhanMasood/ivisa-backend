import { Body, Controller, Post, Res, Patch, Param, ParseIntPipe } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeEmailDto } from './dto/change-email.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // CUSTOMER ROUTES (for customer app)
  @Post('customer/register')
  async customerRegister(@Body() dto: RegisterDto, @Res() res: Response) {
    const result = await this.authService.customerRegister(dto);
    
    res.cookie('auth_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'strict',
    });

    res.cookie('admin_info', JSON.stringify({
      id: result.user.id,
      email: result.user.email,
      fullName: result.user.fullname,
    }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'strict',
    });

    return res.json({
      status: true,
      message: result.message,
      token: result.token,
      admin: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullname,
        status: result.user.status,
        role: result.user.role
      }
    });
  }

  @Post('customer/login')
  async customerLogin(@Body() dto: LoginDto, @Res() res: Response) {
    const result = await this.authService.customerLogin(dto);

    res.cookie('auth_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'strict',
    });

    res.cookie('admin_info', JSON.stringify({
      id: result.user.id,
      email: result.user.email,
      fullName: result.user.fullname,
    }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'strict',
    });

    return res.json({
      status: true,
      message: result.message,
      token: result.token,
      admin: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullname,
        status: result.user.status,
        role: result.user.role
      }
    });
  }

  // ADMIN ROUTES (for admin app) - Keep existing
  @Post('register')
  async adminRegister(@Body() dto: RegisterDto, @Res() res: Response) {
    const result = await this.authService.adminRegister(dto);
    // ... existing admin register logic
    return res.json(result);
  }

  @Post('login')
  async adminLogin(@Body() dto: LoginDto, @Res() res: Response) {
    const result = await this.authService.adminLogin(dto);
    
    res.cookie('auth_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'strict',
    });

    res.cookie('admin_info', JSON.stringify({
      id: result.admin.id,
      email: result.admin.email,
      fullName: result.admin.fullName,
    }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'strict',
    });

    return res.json({
      status: true,
      message: result.message,
      token: result.token,
      admin: result.admin
    });
  }

  @Post('logout')
  logout(@Res() res: Response) {
    res.clearCookie('auth_token');
    res.clearCookie('admin_info');
    return res.json({ 
      status: true,
      message: 'Logged out successfully' 
    });
  }

  // Password change endpoint for customers
  @Patch('customer/:customerId/change-password')
  async changePassword(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      customerId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }

  // Email change endpoint for customers
  @Patch('customer/:customerId/change-email')
  async changeEmail(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() changeEmailDto: ChangeEmailDto,
  ) {
    return this.authService.changeEmail(
      customerId,
      changeEmailDto.newEmail,
      changeEmailDto.password,
    );
  }
}