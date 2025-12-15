import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CardInfoService } from './card-info.service';
import { CreateCardInfoDto } from './dto/create-card-info.dto';
import { UpdateCardInfoDto } from './dto/update-card-info.dto';

@Controller('card-info')
export class CardInfoController {
  constructor(private readonly cardInfoService: CardInfoService) {}

  /**
   * Create a new card for a customer
   * POST /card-info
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createCardInfoDto: CreateCardInfoDto) {
    return this.cardInfoService.create(createCardInfoDto);
  }

  /**
   * Get all cards for a customer
   * GET /card-info/customer/:customerId
   */
  @Get('customer/:customerId')
  findByCustomer(@Param('customerId', ParseIntPipe) customerId: number) {
    return this.cardInfoService.findByCustomer(customerId);
  }

  /**
   * Get default card for a customer
   * GET /card-info/customer/:customerId/default
   */
  @Get('customer/:customerId/default')
  getDefaultCard(@Param('customerId', ParseIntPipe) customerId: number) {
    return this.cardInfoService.getDefaultCard(customerId);
  }

  /**
   * Get a single card by ID
   * GET /card-info/:id
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cardInfoService.findOne(id);
  }

  /**
   * Update a card
   * PATCH /card-info/:id
   */
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCardInfoDto: UpdateCardInfoDto,
  ) {
    return this.cardInfoService.update(id, updateCardInfoDto);
  }

  /**
   * Set a card as default
   * PATCH /card-info/:id/set-default
   */
  @Patch(':id/set-default')
  setDefault(@Param('id', ParseIntPipe) id: number) {
    return this.cardInfoService.setDefault(id);
  }

  /**
   * Delete a card
   * DELETE /card-info/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cardInfoService.remove(id);
  }
}

