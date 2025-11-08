export enum ConnectionState {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

export enum Role {
  USER = 'user',
  MODEL = 'model',
}

export interface WeatherData {
  location: string;
  temperature: string;
  condition: 'sunny' | 'rainy' | 'cloudy';
  forecast: {
    day: string;
    temperature: string;
    condition: 'sunny' | 'rainy' | 'cloudy';
  }[];
}

export interface Turn {
  role: Role;
  text?: string;
  weather?: WeatherData;
  isFinal?: boolean;
}
