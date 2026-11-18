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
  description = 'Returns the current weather forecast for a city.';
  inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      city: {
        type: 'string',
        description: 'City name, e.g. Bariloche',
      },
    },
    required: ['city'],
  };

  async execute(input: WeatherInput): Promise<WeatherOutput> {
    return {
      forecast: `In ${input.city}: 18°C, partly cloudy.`,
    };
  }
}
