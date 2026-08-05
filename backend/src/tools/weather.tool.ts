import { Injectable } from '@nestjs/common';
import { JsonSchemaObject, Tool } from '../common/tool.interface';

interface WeatherInput {
  city: string;
}

interface WeatherOutput {
  forecast: string;
}

@Injectable()
export class WeatherTool implements Tool<WeatherInput, WeatherOutput> {
  name = 'get_weather';
  description = 'Devuelve el pronóstico del clima actual para una ciudad.';
  inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      city: {
        type: 'string',
        description: 'Nombre de la ciudad, ej: Bariloche',
      },
    },
    required: ['city'],
  };

  async execute(input: WeatherInput): Promise<WeatherOutput> {
    return {
      forecast: `En ${input.city}: 18°C, parcialmente nublado.`,
    };
  }
}
