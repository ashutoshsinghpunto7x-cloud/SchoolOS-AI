// Re-export shared types
export type { ApiResponse, PaginatedResponse, BaseEntity, SoftDeletableEntity } from '@schoolos/types';

// App-specific types
export type AppEnv = 'development' | 'staging' | 'production';

export interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_ENV: AppEnv;
}
