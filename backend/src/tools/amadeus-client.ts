import { Injectable } from '@nestjs/common';

interface AmadeusToken {
  accessToken: string;
  expiresAt: number;
}

@Injectable()
export class AmadeusClient {
  private readonly baseUrl =
    process.env.AMADEUS_BASE_URL ?? 'https://test.api.amadeus.com';
  private readonly apiKey = process.env.AMADEUS_API_KEY;
  private readonly apiSecret = process.env.AMADEUS_API_SECRET;
  private token: AmadeusToken | null = null;

  private async getAccessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now()) {
      return this.token.accessToken;
    }
    if (!this.apiKey || !this.apiSecret) {
      throw new Error(
        'Faltan AMADEUS_API_KEY / AMADEUS_API_SECRET en las variables de entorno.',
      );
    }

    const response = await fetch(`${this.baseUrl}/v1/security/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.apiKey,
        client_secret: this.apiSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Amadeus auth respondió ${response.status}: ${await response.text()}`,
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.token = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 30) * 1000,
    };
    return this.token.accessToken;
  }

  async get<T>(path: string, params: Record<string, string>): Promise<T> {
    const token = await this.getAccessToken();
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${this.baseUrl}${path}?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(
        `Amadeus respondió ${response.status}: ${await response.text()}`,
      );
    }

    return response.json() as Promise<T>;
  }
}
