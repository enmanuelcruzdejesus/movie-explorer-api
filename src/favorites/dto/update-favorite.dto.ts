import { IsArray, IsNumber, IsOptional, IsString, IsUrl, MaxLength, ArrayMaxSize } from 'class-validator';

export class UpdateFavoriteDto {
  @IsNumber()
  version!: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsUrl()
  posterUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  overview?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];
}
