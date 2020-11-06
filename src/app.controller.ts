import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { AsrDto } from './modules/asr/asr.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { platform } from 'os';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  @ApiTags('asr')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['url', 'platform'],
      description: 'input record file and return words',
      properties: {
        url: {
          type: 'string',
        },
        platform: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
    },
  })
  @Post('/asr')
  @HttpCode(200)
  async asr(@Body() asrDtl: AsrDto): Promise<any> {
    return await this.appService.asr(asrDtl.url, asrDtl.platform);
    // return;
  }
}
