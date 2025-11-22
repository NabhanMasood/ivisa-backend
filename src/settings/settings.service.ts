import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSettings } from './entities/app-settings.entity';
import { UpdateAppSettingsDto } from './dto/update-app-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(AppSettings)
    private readonly settingsRepo: Repository<AppSettings>,
  ) {}

  /**
   * Get a setting value by key
   */
  async getSetting(key: string): Promise<string | null> {
    const setting = await this.settingsRepo.findOne({
      where: { key },
    });
    return setting?.value || null;
  }

  /**
   * Get a setting value as number
   */
  async getSettingAsNumber(key: string, defaultValue: number = 0): Promise<number> {
    const value = await this.getSetting(key);
    if (!value) return defaultValue;
    const num = parseInt(value, 10);
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * Get all settings
   */
  async getAllSettings(): Promise<AppSettings[]> {
    return await this.settingsRepo.find({
      order: { key: 'ASC' },
    });
  }

  /**
   * Update or create a setting
   */
  async setSetting(key: string, value: string, description?: string): Promise<AppSettings> {
    let setting = await this.settingsRepo.findOne({
      where: { key },
    });

    if (setting) {
      setting.value = value;
      if (description) {
        setting.description = description;
      }
    } else {
      setting = this.settingsRepo.create({
        key,
        value,
        description,
      });
    }

    return await this.settingsRepo.save(setting);
  }

  /**
   * Update setting by key
   */
  async updateSetting(key: string, updateDto: UpdateAppSettingsDto): Promise<AppSettings> {
    const setting = await this.settingsRepo.findOne({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException(`Setting with key '${key}' not found`);
    }

    setting.value = updateDto.value;
    return await this.settingsRepo.save(setting);
  }

  /**
   * Initialize default settings if they don't exist
   */
  async initializeDefaultSettings(): Promise<void> {
    const defaultSettings = [
      {
        key: 'pending_reminder_hours',
        value: '24',
        description: 'Hours to wait before sending pending application reminder email',
      },
      {
        key: 'coupon_email_hours',
        value: '72',
        description: 'Hours to wait before sending coupon email (after pending reminder)',
      },
      {
        key: 'pending_reminder_coupon_id',
        value: '',
        description: 'Coupon ID to send in pending reminder and coupon emails. Leave empty to disable coupon emails.',
      },
    ];

    for (const defaultSetting of defaultSettings) {
      const existing = await this.settingsRepo.findOne({
        where: { key: defaultSetting.key },
      });

      if (!existing) {
        await this.settingsRepo.save(
          this.settingsRepo.create(defaultSetting),
        );
      }
    }
  }

}

