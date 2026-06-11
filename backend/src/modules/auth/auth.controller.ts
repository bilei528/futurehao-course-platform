import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { AuthService } from './auth.service';

class SendCodeDto {
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;
}

class LoginDto {
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @IsOptional()
  @IsString()
  @Length(6, 6, { message: '验证码为6位' })
  code?: string;

  @IsOptional()
  @IsString()
  @Length(2, 20, { message: '孩子姓名长度为 2~20 个字符' })
  childName?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Get('check-phone')
  checkPhone(@Query('phone') phone: string) {
    return this.auth.checkPhone(phone);
  }

  @Post('send-code')
  sendCode(@Body() dto: SendCodeDto) {
    return this.auth.sendCode(dto.phone);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.loginWithCode(dto.phone, dto.code, dto.childName);
  }
}
