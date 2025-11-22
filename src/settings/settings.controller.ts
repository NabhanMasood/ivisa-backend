import { Controller, Get, Patch, Param, Body, BadRequestException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateAppSettingsDto } from './dto/update-app-settings.dto';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getAllSettings() {
    try {
      const settings = await this.settingsService.getAllSettings();
      return {
        status: true,
        message: 'Settings retrieved successfully',
        data: settings,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to fetch settings',
      });
    }
  }

  @Get(':key')
  async getSetting(@Param('key') key: string) {
    try {
      const value = await this.settingsService.getSetting(key);
      return {
        status: true,
        message: 'Setting retrieved successfully',
        data: { key, value },
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to fetch setting',
      });
    }
  }

  @Patch(':key')
  async updateSetting(
    @Param('key') key: string,
    @Body() updateDto: UpdateAppSettingsDto,
  ) {
    try {
      const setting = await this.settingsService.updateSetting(key, updateDto);
      return {
        status: true,
        message: 'Setting updated successfully',
        data: setting,
      };
    } catch (error) {
      throw new BadRequestException({
        status: false,
        message: error.message || 'Failed to update setting',
      });
    }
  }
}

