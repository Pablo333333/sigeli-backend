import { Controller, Get, Post, Body, Param } from '@nestjs/common';

@Controller('chat')
export class ChatController {
  private messages: any[] = [
    {
      id: '1',
      text: 'Hola, hemos recibido tu postulación para Operador. ¿Tienes disponibilidad para una entrevista mañana?',
      senderId: 'employer_123',
      senderName: 'Minera Antamina - RRHH',
      receiverId: 'user-test-id',
      timestamp: new Date(Date.now() - 3600000),
      status: 'read',
    },
  ];

  @Get(':chatId')
  async getMessages(@Param('chatId') chatId: string) {
    return this.messages;
  }

  @Post('send')
  async sendMessage(@Body() body: any) {
    const newMessage = {
      id: Date.now().toString(),
      ...body,
      timestamp: new Date(),
      status: 'sent',
    };
    this.messages.push(newMessage);
    return newMessage;
  }
}
