import { Controller, Post, Body, UseInterceptors, UploadedFile, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  /**
   * Verificación / enrolamiento facial definitivo.
   * Content-Type: multipart/form-data
   * fields: dni (string 8 dígitos), photo (file image/jpeg|png)
   * query: reenroll=true para forzar re-registro del rostro
   */
  @Post('verify-biometric')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype?.startsWith('image/')) {
          return cb(new Error('Solo se permiten imágenes'), false);
        }
        cb(null, true);
      },
    }),
  )
  async verifyBiometric(
    @Body('dni') dni: string,
    @UploadedFile() photo: Express.Multer.File,
    @Query('reenroll') reenroll?: string,
    @Body('reenroll') reenrollBody?: string,
  ) {
    const allowReenroll =
      reenroll === 'true' ||
      reenroll === '1' ||
      reenrollBody === 'true' ||
      reenrollBody === '1';
    return this.authService.verifyBiometric(dni, photo, allowReenroll);
  }
}
