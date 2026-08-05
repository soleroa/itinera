import { Injectable } from '@nestjs/common';
import { Tool, ToolDefinition } from '../common/tool.interface';
import { WeatherTool } from './weather.tool';

@Injectable()
export class ToolRegistryService {
  private readonly tools: Tool[];

  constructor(weatherTool: WeatherTool) {
    this.tools = [weatherTool];
  }

  getDefinitions(): ToolDefinition[] {
    return this.tools.map(({ name, description, inputSchema }) => ({
      name,
      description,
      inputSchema,
    }));
  }

  async execute(toolName: string, input: unknown): Promise<unknown> {
    const tool = this.tools.find((t) => t.name === toolName);
    if (!tool) {
      throw new Error(`No existe una tool registrada con nombre "${toolName}"`);
    }
    return tool.execute(input);
  }
}
