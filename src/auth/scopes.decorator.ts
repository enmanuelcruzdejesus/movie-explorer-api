import { SetMetadata } from '@nestjs/common';

export const SCOPES_METADATA_KEY = 'required_scopes';
export const Scopes = (...scopes: string[]) => SetMetadata(SCOPES_METADATA_KEY, scopes);